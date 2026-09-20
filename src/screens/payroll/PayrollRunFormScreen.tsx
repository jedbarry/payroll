import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeContext';
import { usePayrollStore } from '../../store/payrollStore';
import { getEmployeeById } from '../../db/queries/employees';
import { getPayrollRunById, getPayrollRunsByEmployee } from '../../db/queries/payrollRuns';
import { getLineItemsByRun } from '../../db/queries/lineItems';
import { getDb } from '../../db/index';
import { Employee, PayrollRun, LineItem } from '../../domain/types';
import { getPayPeriods, getBaseAmount } from '../../domain/payPeriod';
import { calculatePayroll } from '../../domain/calculatePayroll';
import { LineItemRow } from '../../components/LineItemRow';

function formatCurrency(amount: number): string {
  return `PHP ${amount.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatPeriod(start: string, end: string): string {
  const fmt = (iso: string) => {
    const d = new Date(iso + 'T00:00:00');
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };
  return `${fmt(start)} – ${fmt(end)}`;
}

export function PayrollRunFormScreen({ route, navigation }: any) {
  const { theme } = useTheme();
  const { employeeId: paramEmployeeId, runId: paramRunId } = route.params || {};
  const { saveDraft, commitRun, deleteDraft } = usePayrollStore();

  type AvailablePeriod = {
    start: string;
    end: string;
    month: number;
    year: number;
    used: boolean;
  };

  const periodScrollRef = useRef<ScrollView>(null);
  const chipOffsetsRef = useRef<Record<string, number>>({});

  const [loading, setLoading] = useState(true);
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [currentRun, setCurrentRun] = useState<PayrollRun | null>(null);
  const [availablePeriods, setAvailablePeriods] = useState<AvailablePeriod[]>([]);

  const [periodStart, setPeriodStart] = useState('');
  const [periodEnd, setPeriodEnd] = useState('');
  const [baseAmount, setBaseAmount] = useState(0);

  type DraftItem = Omit<LineItem, 'id' | 'payroll_run_id'> & { id?: string };
  const [lineItems, setLineItems] = useState<DraftItem[]>([]);

  // Add line item state
  const [itemType, setItemType] = useState<'inclusion' | 'deduction'>('inclusion');
  const [itemLabel, setItemLabel] = useState('');
  const [itemAmount, setItemAmount] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      setLoading(true);
      try {
        if (paramRunId) {
          // Existing run
          const run = await getPayrollRunById(paramRunId);
          if (!run) {
            Alert.alert('Error', 'Payroll run not found');
            navigation.goBack();
            return;
          }
          if (!isMounted) return;
          setCurrentRun(run);
          setPeriodStart(run.period_start);
          setPeriodEnd(run.period_end);
          setBaseAmount(run.base_amount);

          const emp = await getEmployeeById(run.employee_id);
          if (isMounted) setEmployee(emp);

          const items = await getLineItemsByRun(run.id);
          if (isMounted) setLineItems(items);

        } else if (paramEmployeeId) {
          // New run
          const emp = await getEmployeeById(paramEmployeeId);
          if (!emp) {
            Alert.alert('Error', 'Employee not found');
            navigation.goBack();
            return;
          }
          if (!isMounted) return;
          setEmployee(emp);

          // Build full list of available periods for this year, tagged with used status
          const existingRuns = await getPayrollRunsByEmployee(paramEmployeeId);
          const existingPeriodKeys = new Set(
            existingRuns.map((r) => `${r.period_start}_${r.period_end}`),
          );

          const now = new Date();
          const currentYear = now.getFullYear();

          // Determine year range: from employee start_date year (or current year) up to current year
          const startYear = emp.start_date
            ? parseInt(emp.start_date.substring(0, 4), 10)
            : currentYear;
          const endYear = currentYear;

          const all: AvailablePeriod[] = [];

          for (let yr = startYear; yr <= endYear; yr++) {
            for (let m = 0; m < 12; m++) {
              const periods = getPayPeriods(emp.pay_schedule, emp.pay_day_config, m, yr);
              for (const p of periods) {
                // Filter by start_date: period end must be >= employee start_date
                if (emp.start_date && p.end < emp.start_date) continue;
                // Filter by archive_date: period start must be <= employee archive_date
                if (emp.archive_date && p.start > emp.archive_date) continue;
                all.push({
                  ...p,
                  month: m,
                  year: yr,
                  used: existingPeriodKeys.has(`${p.start}_${p.end}`),
                });
              }
            }
          }

          // Default selection priority:
          // 1. A period that contains today (mid-week, weekday)
          // 2. The next upcoming unused period (today is a weekend / between periods)
          // 3. The most recent past unused period
          // 4. Any unused period
          // 5. null (all used)
          const todayStr = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}-${String(now.getUTCDate()).padStart(2, '0')}`;
          const currentPeriod =
            // 1. Contains today
            all.find((p) => !p.used && p.start <= todayStr && p.end >= todayStr) ??
            // 2. Next upcoming (start is in the future — weekend gap or between periods)
            all.find((p) => !p.used && p.start > todayStr) ??
            // 3. Most recent past — find last unused with end < today
            [...all].reverse().find((p) => !p.used && p.end < todayStr) ??
            // 4. Any unused
            all.find((p) => !p.used) ??
            null;

          if (isMounted) {
            setAvailablePeriods(all);
            if (currentPeriod) {
              setPeriodStart(currentPeriod.start);
              setPeriodEnd(currentPeriod.end);
              setBaseAmount(
                getBaseAmount(emp.monthly_rate, emp.pay_schedule, currentPeriod.month, currentPeriod.year),
              );
            }
            setLineItems([]);
          }
        }
      } catch (err: any) {
        Alert.alert('Error', err.message || 'Failed to load payroll run');
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadData();
    return () => {
      isMounted = false;
    };
  }, [paramRunId, paramEmployeeId, navigation]);

  const isCommitted = currentRun?.status === 'committed';

  const handleSelectPeriod = useCallback(
    (p: { start: string; end: string; month: number; year: number; used: boolean }) => {
      if (p.used || !employee) return;
      setPeriodStart(p.start);
      setPeriodEnd(p.end);
      setBaseAmount(
        getBaseAmount(employee.monthly_rate, employee.pay_schedule, p.month, p.year),
      );
    },
    [employee],
  );

  const payrollCalc = useMemo(() => {
    return calculatePayroll(baseAmount, lineItems);
  }, [baseAmount, lineItems]);

  const handleAddLineItem = () => {
    const trimmedLabel = itemLabel.trim();
    const parsedAmount = parseFloat(itemAmount);

    if (!trimmedLabel) {
      Alert.alert('Validation Error', 'Item label is required.');
      return;
    }
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      Alert.alert('Validation Error', 'Item amount must be greater than 0.');
      return;
    }

    setLineItems((prev) => [
      ...prev,
      {
        type: itemType,
        label: trimmedLabel,
        amount: parsedAmount,
      },
    ]);

    setItemLabel('');
    setItemAmount('');
  };

  const handleRemoveLineItem = (index: number) => {
    setLineItems((prev) => prev.filter((_, i) => i !== index));
  };

  const isSelectedPeriodUsed = availablePeriods.some(
    (p) => p.used && p.start === periodStart && p.end === periodEnd,
  );

  const handleSaveDraft = async () => {
    if (!employee) return;
    if (isSelectedPeriodUsed) {
      Alert.alert('Duplicate Period', 'A payroll run already exists for this period.');
      return;
    }
    setActionLoading(true);
    try {
      await saveDraft(
        {
          id: currentRun?.id,
          employee_id: employee.id,
          period_start: periodStart,
          period_end: periodEnd,
          base_amount: baseAmount,
          gross_pay: payrollCalc.grossPay,
          net_pay: payrollCalc.netPay,
          status: 'draft',
        },
        lineItems,
      );
      navigation.goBack();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to save draft');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCommit = () => {
    if (!employee) return;
    if (isSelectedPeriodUsed) {
      Alert.alert('Duplicate Period', 'A payroll run already exists for this period.');
      return;
    }
    Alert.alert(
      'Commit Payroll Run',
      `Commit payroll for ${employee.name} (${formatCurrency(payrollCalc.netPay)})? This will generate a permanent payslip.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Commit',
          style: 'default',
          onPress: async () => {
            setActionLoading(true);
            try {
              // First ensure draft is saved
              const savedRun = await saveDraft(
                {
                  id: currentRun?.id,
                  employee_id: employee.id,
                  period_start: periodStart,
                  period_end: periodEnd,
                  base_amount: baseAmount,
                  gross_pay: payrollCalc.grossPay,
                  net_pay: payrollCalc.netPay,
                  status: 'draft',
                },
                lineItems,
              );

              // Then commit it
              await commitRun(savedRun.id);

              // Query the newly inserted payslip id
              const db = getDb();
              const payslipRow = await db.getFirstAsync<{ id: string }>(
                'SELECT id FROM payslips WHERE payroll_run_id = ?;',
                [savedRun.id],
              );

              if (payslipRow) {
                navigation.navigate('PayslipDetail', {
                  payslipId: payslipRow.id,
                  employeeId: employee.id,
                  employeeName: employee.name,
                });
              } else {
                navigation.goBack();
              }
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Failed to commit payroll run');
            } finally {
              setActionLoading(false);
            }
          },
        },
      ],
    );
  };

  const handleDeleteDraft = () => {
    if (!currentRun?.id) return;
    Alert.alert('Delete Draft', 'Are you sure you want to delete this draft?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          setActionLoading(true);
          try {
            await deleteDraft(currentRun.id);
            navigation.goBack();
          } catch (err: any) {
            Alert.alert('Error', err.message || 'Failed to delete draft');
          } finally {
            setActionLoading(false);
          }
        },
      },
    ]);
  };

  const screenTitle = currentRun
    ? currentRun.status === 'committed' ? 'Committed Run' : 'Draft Run'
    : employee ? `New Run: ${employee.name}` : 'Payroll';

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.bg }]}>
        <ActivityIndicator color={theme.accent} size="large" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={[styles.container, { backgroundColor: theme.bg }]}
    >
      <SafeAreaView style={{ backgroundColor: theme.bg }}>
        <View style={[styles.customHeader, { backgroundColor: theme.bg }]}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            activeOpacity={0.6}
          >
            <Ionicons name="chevron-back" size={28} color={theme.text} />
          </TouchableOpacity>
          <Text style={[styles.customHeaderTitle, { color: theme.text }]}>{screenTitle}</Text>
          <View style={{ width: 28 }} />
        </View>
      </SafeAreaView>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Employee / Period tile */}
        <View
          style={[
            styles.infoCard,
            { backgroundColor: theme.surface, borderColor: theme.border },
          ]}
        >
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: theme.textMuted }]}>Employee</Text>
            <Text style={[styles.infoValue, { color: theme.text }]}>{employee?.name}</Text>
          </View>

          {/* Pay Period — plain text for existing runs (draft or committed), picker for new only */}
          {currentRun ? (
            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, { color: theme.textMuted }]}>Pay Period</Text>
              <Text style={[styles.infoValue, { color: theme.text }]}>
                {formatPeriod(periodStart, periodEnd)}
              </Text>
            </View>
          ) : (
            <View style={styles.periodPickerSection}>
              <Text style={[styles.infoLabel, { color: theme.textMuted, marginBottom: 8 }]}>
                Pay Period
              </Text>
              <ScrollView
                ref={periodScrollRef}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.periodChipsRow}
              >
                {availablePeriods.map((p) => {
                  const isSelected = p.start === periodStart && p.end === periodEnd;
                  const chipKey = `${p.start}_${p.end}`;
                  return (
                    <TouchableOpacity
                      key={chipKey}
                      onLayout={(e) => {
                        chipOffsetsRef.current[chipKey] = e.nativeEvent.layout.x;
                        // Once the selected chip lays out, scroll to it
                        if (isSelected && e.nativeEvent.layout.x > 0) {
                          periodScrollRef.current?.scrollTo({
                            x: Math.max(0, e.nativeEvent.layout.x - 16),
                            animated: false,
                          });
                        }
                      }}
                      style={[
                        styles.periodChip,
                        {
                          backgroundColor: isSelected ? theme.accent : theme.surfaceAlt,
                          borderColor: isSelected ? theme.accent : theme.border,
                          opacity: p.used && !isSelected ? 0.4 : 1,
                        },
                      ]}
                      onPress={() => handleSelectPeriod(p)}
                      disabled={p.used}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.periodChipDate,
                          { color: isSelected ? theme.accentText : theme.text },
                        ]}
                      >
                        {p.start}
                      </Text>
                      <Text
                        style={[
                          styles.periodChipSep,
                          { color: isSelected ? theme.accentText : theme.textMuted },
                        ]}
                      >
                        → {p.end}
                      </Text>
                      {p.used && (
                        <Text style={[styles.periodChipUsed, { color: theme.textFaint }]}>
                          used
                        </Text>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          )}

          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: theme.textMuted }]}>Base Pay</Text>
            <Text style={[styles.infoValue, { color: theme.text }]}>
              {formatCurrency(baseAmount)}
            </Text>
          </View>
          {isCommitted && (
            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, { color: theme.textMuted }]}>Status</Text>
              <View
                style={[
                  styles.committedBadge,
                  {
                    backgroundColor: theme.badgeCommittedBg,
                    borderColor: theme.badgeCommittedText,
                  },
                ]}
              >
                <Text style={[styles.committedBadgeText, { color: theme.badgeCommittedText }]}>
                  Committed (Read-Only)
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* Live Pay Summary */}
        <View
          style={[
            styles.summaryCard,
            { backgroundColor: theme.surfaceAlt, borderColor: theme.border },
          ]}
        >
          <Text style={[styles.summaryTitle, { color: theme.text }]}>Pay Summary</Text>

          <View style={styles.summaryLine}>
            <Text style={[styles.summaryLabel, { color: theme.textMuted }]}>Base Pay</Text>
            <Text style={[styles.summaryAmount, { color: theme.text }]}>
              {formatCurrency(baseAmount)}
            </Text>
          </View>

          {payrollCalc.totalInclusions > 0 && (
            <View style={styles.summaryLine}>
              <Text style={[styles.summaryLabel, { color: theme.textMuted }]}>Inclusions</Text>
              <Text style={[styles.summaryAmount, { color: theme.inclusion }]}>
                +{formatCurrency(payrollCalc.totalInclusions)}
              </Text>
            </View>
          )}

          {payrollCalc.totalDeductions > 0 && (
            <View style={styles.summaryLine}>
              <Text style={[styles.summaryLabel, { color: theme.textMuted }]}>Deductions</Text>
              <Text style={[styles.summaryAmount, { color: theme.deduction }]}>
                -{formatCurrency(payrollCalc.totalDeductions)}
              </Text>
            </View>
          )}

          <View style={[styles.divider, { backgroundColor: theme.border }]} />

          <View style={styles.summaryLine}>
            <Text style={[styles.netPayLabel, { color: theme.text }]}>Net Pay</Text>
            <Text style={[styles.netPayAmount, { color: theme.accent }]}>
              {formatCurrency(payrollCalc.netPay)}
            </Text>
          </View>
        </View>

        {/* Line Items List */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Line Items</Text>
        </View>

        {lineItems.length === 0 ? (
          <Text style={[styles.emptyItemsText, { color: theme.textFaint }]}>
            No inclusions or deductions added yet.
          </Text>
        ) : (
          lineItems.map((item, index) => (
            <LineItemRow
              key={item.id || index.toString()}
              item={item}
              showRemove={!isCommitted}
              onRemove={() => handleRemoveLineItem(index)}
            />
          ))
        )}

        {/* Add Line Item Section (draft only) */}
        {!isCommitted && (
          <View
            style={[
              styles.addItemCard,
              { backgroundColor: theme.surface, borderColor: theme.border },
            ]}
          >
            <Text style={[styles.addItemTitle, { color: theme.text }]}>Add Line Item</Text>

            {/* Inclusion / Deduction segment */}
            <View style={styles.segmentedRow}>
              <TouchableOpacity
                style={[
                  styles.segmentButton,
                  {
                    backgroundColor: itemType === 'inclusion' ? theme.inclusion : theme.surfaceAlt,
                    borderColor: theme.border,
                  },
                ]}
                onPress={() => setItemType('inclusion')}
              >
                <Text
                  style={[
                    styles.segmentButtonText,
                    { color: itemType === 'inclusion' ? '#ffffff' : theme.text },
                  ]}
                >
                  + Inclusion
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.segmentButton,
                  {
                    backgroundColor: itemType === 'deduction' ? theme.deduction : theme.surfaceAlt,
                    borderColor: theme.border,
                  },
                ]}
                onPress={() => setItemType('deduction')}
              >
                <Text
                  style={[
                    styles.segmentButtonText,
                    { color: itemType === 'deduction' ? '#ffffff' : theme.text },
                  ]}
                >
                  - Deduction
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.inputRow}>
              <TextInput
                style={[
                  styles.itemInput,
                  {
                    backgroundColor: theme.surfaceAlt,
                    borderColor: theme.border,
                    color: theme.text,
                    flex: 2,
                  },
                ]}
                placeholder="Label (e.g. Bonus, Tax)"
                placeholderTextColor={theme.textFaint}
                value={itemLabel}
                onChangeText={setItemLabel}
              />
              <TextInput
                style={[
                  styles.itemInput,
                  {
                    backgroundColor: theme.surfaceAlt,
                    borderColor: theme.border,
                    color: theme.text,
                    flex: 1,
                  },
                ]}
                placeholder="Amount"
                placeholderTextColor={theme.textFaint}
                value={itemAmount}
                onChangeText={setItemAmount}
                keyboardType="numeric"
              />
            </View>

            <TouchableOpacity
              style={[styles.addButton, { backgroundColor: theme.accent }]}
              onPress={handleAddLineItem}
            >
              <Text style={[styles.addButtonText, { color: theme.accentText }]}>Add Item</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Action Buttons (draft only) */}
        {!isCommitted && (
          <View style={styles.actionsContainer}>
            <TouchableOpacity
              style={[styles.commitButton, { backgroundColor: theme.inclusion }]}
              onPress={handleCommit}
              disabled={actionLoading}
              activeOpacity={0.8}
            >
              <Text style={[styles.commitButtonText, { color: '#ffffff' }]}>
                {actionLoading ? 'Processing...' : 'Commit Payroll Run'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.saveDraftButton,
                { backgroundColor: theme.surface, borderColor: theme.border },
              ]}
              onPress={handleSaveDraft}
              disabled={actionLoading}
              activeOpacity={0.7}
            >
              <Text style={[styles.saveDraftButtonText, { color: theme.text }]}>Save as Draft</Text>
            </TouchableOpacity>

            {currentRun && (
              <TouchableOpacity
                style={[styles.deleteDraftButton, { borderColor: theme.deduction }]}
                onPress={handleDeleteDraft}
                disabled={actionLoading}
                activeOpacity={0.7}
              >
                <Text style={[styles.deleteDraftButtonText, { color: theme.deduction }]}>
                  Delete Draft
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  customHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  customHeaderTitle: { fontSize: 17, fontWeight: '600' },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
    gap: 8,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: 14,
  },
  infoValue: {
    fontSize: 15,
    fontWeight: '600',
  },
  committedBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  committedBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  summaryCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 20,
    gap: 8,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  summaryLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 14,
  },
  summaryAmount: {
    fontSize: 15,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    marginVertical: 4,
  },
  netPayLabel: {
    fontSize: 16,
    fontWeight: '700',
  },
  netPayAmount: {
    fontSize: 20,
    fontWeight: '800',
  },
  sectionHeader: {
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  emptyItemsText: {
    fontSize: 14,
    marginBottom: 16,
    fontStyle: 'italic',
  },
  addItemCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 12,
    marginBottom: 20,
    gap: 12,
  },
  addItemTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  segmentedRow: {
    flexDirection: 'row',
    gap: 8,
  },
  segmentButton: {
    flex: 1,
    height: 40,
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  segmentButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  inputRow: {
    flexDirection: 'row',
    gap: 8,
  },
  itemInput: {
    height: 44,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 14,
  },
  addButton: {
    height: 42,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButtonText: {
    fontSize: 14,
    fontWeight: '700',
  },
  actionsContainer: {
    gap: 12,
    marginTop: 8,
  },
  commitButton: {
    height: 50,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  commitButtonText: {
    fontSize: 16,
    fontWeight: '700',
  },
  saveDraftButton: {
    height: 50,
    borderRadius: 10,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveDraftButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  deleteDraftButton: {
    height: 50,
    borderRadius: 10,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteDraftButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  periodPickerSection: {
    paddingTop: 4,
  },
  periodChipsRow: {
    flexDirection: 'row',
    gap: 8,
    paddingBottom: 4,
  },
  periodChip: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    alignItems: 'center',
    minWidth: 100,
  },
  periodChipDate: {
    fontSize: 12,
    fontWeight: '600',
  },
  periodChipSep: {
    fontSize: 11,
    marginTop: 1,
  },
  periodChipUsed: {
    fontSize: 10,
    marginTop: 2,
    fontStyle: 'italic',
  },
});
