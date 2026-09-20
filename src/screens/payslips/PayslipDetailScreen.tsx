import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeContext';
import { getPayslipById } from '../../db/queries/payslips';
import { getPayrollRunById } from '../../db/queries/payrollRuns';
import { getEmployeeById } from '../../db/queries/employees';
import { getLineItemsByRun } from '../../db/queries/lineItems';
import { countWorkWeeksInMonth } from '../../domain/payPeriod';
import { PayslipView } from '../../domain/types';
import { usePayslipStore } from '../../store/payslipStore';

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

export function PayslipDetailScreen({ route, navigation }: any) {
  const { theme } = useTheme();
  const payslipId = route.params?.payslipId;

  const [payslip, setPayslip] = useState<PayslipView | null>(null);
  const [loading, setLoading] = useState(true);
  const { deletePayslipAndRevertRun } = usePayslipStore();

  const handleDelete = () => {
    Alert.alert(
      'Delete Payslip',
      'This will delete the payslip and revert the payroll run to draft so you can edit and regenerate it.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (!payslip) return;
            try {
              await deletePayslipAndRevertRun(payslip.id, payslip.payroll_run_id);
              const employeeId = route.params?.employeeId;
              const employeeName = route.params?.employeeName;
              navigation.reset({
                index: 1,
                routes: [
                  { name: 'PayrollEmployeeList' },
                  { name: 'PayrollRunList', params: { employeeId, employeeName } },
                ],
              });
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Failed to delete payslip');
            }
          },
        },
      ],
    );
  };

  const handleBack = () => {
    const employeeId = route.params?.employeeId;
    const employeeName = route.params?.employeeName;
    if (employeeId) {
      navigation.reset({
        index: 1,
        routes: [
          { name: 'PayrollEmployeeList' },
          { name: 'PayrollRunList', params: { employeeId, employeeName } },
        ],
      });
    } else {
      navigation.goBack();
    }
  };

  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      if (!payslipId) return;
      setLoading(true);
      try {
        const p = await getPayslipById(payslipId);
        if (!p) {
          Alert.alert('Error', 'Payslip not found');
          navigation.goBack();
          return;
        }

        const [run, employee, lineItems] = await Promise.all([
          getPayrollRunById(p.payroll_run_id),
          getEmployeeById(p.employee_id),
          getLineItemsByRun(p.payroll_run_id),
        ]);

        if (!run || !employee) {
          Alert.alert('Error', 'Incomplete payslip data');
          navigation.goBack();
          return;
        }

        if (isMounted) {
          setPayslip({
            ...p,
            run,
            employee,
            lineItems,
          });
        }
      } catch (err: any) {
        Alert.alert('Error', err.message || 'Failed to load payslip');
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadData();
    return () => {
      isMounted = false;
    };
  }, [payslipId, navigation]);

  if (loading || !payslip) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.bg }]}>
        <ActivityIndicator color={theme.accent} size="large" />
      </View>
    );
  }

  const { run, employee, lineItems } = payslip;
  const isCashAdvance = (i: typeof lineItems[0]) =>
    i.subtype === 'cash_advance' || i.label.toLowerCase().includes('cash advance');
  const inclusions = lineItems.filter((i) => i.type === 'inclusion');
  const deductions = lineItems.filter((i) => i.type === 'deduction' && !isCashAdvance(i));
  const cashAdvances = lineItems.filter((i) => i.type === 'deduction' && isCashAdvance(i));

  const totalInclusions = inclusions.reduce((acc, i) => acc + i.amount, 0);
  const totalDeductions = deductions.reduce((acc, i) => acc + i.amount, 0);
  const totalCashAdvances = cashAdvances.reduce((acc, i) => acc + i.amount, 0);

  // Format base pay label calculation description (e.g. "Base Pay (monthly $5,000 ÷ 2)" or "Base Pay")
  let basePaySubtext = '';
  if (employee.pay_schedule === 'biweekly') {
    basePaySubtext = ` (monthly ${formatCurrency(employee.monthly_rate)} ÷ 2)`;
  } else if (employee.pay_schedule === 'weekly') {
    const periodDate = new Date(run.period_start);
    const weeks = countWorkWeeksInMonth(periodDate.getMonth(), periodDate.getFullYear());
    basePaySubtext = ` (monthly ${formatCurrency(employee.monthly_rate)} ÷ ${weeks})`;
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <SafeAreaView style={{ backgroundColor: theme.bg }}>
        <View style={[styles.customHeader, { backgroundColor: theme.bg }]}>
          <TouchableOpacity
            onPress={handleBack}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            activeOpacity={0.6}
          >
            <Ionicons name="chevron-back" size={28} color={theme.text} />
          </TouchableOpacity>
          <Text style={[styles.customHeaderTitle, { color: theme.text }]}>Payslip</Text>
          <View style={{ width: 28 }} />
        </View>
      </SafeAreaView>
    <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.content}>
      {/* Header Card */}
      <View style={[styles.headerCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <Text style={[styles.employeeName, { color: theme.text }]}>{employee.name}</Text>
        <Text style={[styles.periodText, { color: theme.textMuted }]}>
          {formatPeriod(run.period_start, run.period_end)}
        </Text>

        <View style={styles.netPayBox}>
          <Text style={[styles.netPayLabel, { color: theme.textMuted }]}>Net Pay</Text>
          <Text style={[styles.netPayAmount, { color: theme.accent }]}>
            {formatCurrency(run.net_pay)}
          </Text>
        </View>
      </View>

      {/* Earnings Section */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Earnings</Text>

        {/* Base pay row */}
        <View style={[styles.itemRow, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={styles.itemInfo}>
            <Text style={[styles.itemLabel, { color: theme.text }]}>
              Base Pay{basePaySubtext}
            </Text>
            <Text style={[styles.itemSublabel, { color: theme.textMuted }]}>Regular salary</Text>
          </View>
          <Text style={[styles.itemAmount, { color: theme.text }]}>
            {formatCurrency(run.base_amount)}
          </Text>
        </View>

        {/* Inclusions */}
        {inclusions.map((item) => (
          <View
            key={item.id}
            style={[styles.itemRow, { backgroundColor: theme.surface, borderColor: theme.border }]}
          >
            <View style={styles.itemInfo}>
              <Text style={[styles.itemLabel, { color: theme.text }]}>{item.label}</Text>
              <Text style={[styles.itemSublabel, { color: theme.inclusion }]}>Inclusion</Text>
            </View>
            <Text style={[styles.itemAmount, { color: theme.inclusion }]}>
              +{formatCurrency(item.amount)}
            </Text>
          </View>
        ))}
      </View>

      {/* Deductions Section */}
      {deductions.length > 0 && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Deductions</Text>
          {deductions.map((item) => (
            <View
              key={item.id}
              style={[styles.itemRow, { backgroundColor: theme.surface, borderColor: theme.border }]}
            >
              <View style={styles.itemInfo}>
                <Text style={[styles.itemLabel, { color: theme.text }]}>{item.label}</Text>
                <Text style={[styles.itemSublabel, { color: theme.deduction }]}>Deduction</Text>
              </View>
              <Text style={[styles.itemAmount, { color: theme.deduction }]}>
                -{formatCurrency(item.amount)}
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* Cash Advance Recovery Section */}
      {cashAdvances.length > 0 && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Cash Advance Recovery</Text>
          {cashAdvances.map((item) => (
            <View
              key={item.id}
              style={[styles.itemRow, { backgroundColor: theme.surface, borderColor: theme.border }]}
            >
              <View style={styles.itemInfo}>
                <Text style={[styles.itemLabel, { color: theme.text }]}>{item.label}</Text>
                <Text style={[styles.itemSublabel, { color: theme.textMuted }]}>Already paid — recovered this period</Text>
              </View>
              <Text style={[styles.itemAmount, { color: theme.deduction }]}>
                -{formatCurrency(item.amount)}
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* Summary Box */}
      <View
        style={[
          styles.summaryCard,
          { backgroundColor: theme.surfaceAlt, borderColor: theme.border },
        ]}
      >
        <Text style={[styles.summaryTitle, { color: theme.text }]}>Summary</Text>

        <View style={styles.summaryRow}>
          <Text style={[styles.summaryLabel, { color: theme.textMuted }]}>Base Pay</Text>
          <Text style={[styles.summaryValue, { color: theme.text }]}>
            {formatCurrency(run.base_amount)}
          </Text>
        </View>

        <View style={styles.summaryRow}>
          <Text style={[styles.summaryLabel, { color: theme.textMuted }]}>Total Inclusions</Text>
          <Text style={[styles.summaryValue, { color: theme.inclusion }]}>
            +{formatCurrency(totalInclusions)}
          </Text>
        </View>

        <View style={styles.summaryRow}>
          <Text style={[styles.summaryLabel, { color: theme.textMuted }]}>Total Deductions</Text>
          <Text style={[styles.summaryValue, { color: theme.deduction }]}>
            -{formatCurrency(totalDeductions)}
          </Text>
        </View>

        {totalCashAdvances > 0 && (
          <>
            <View style={[styles.divider, { backgroundColor: theme.border }]} />
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: theme.textMuted }]}>Gross Pay</Text>
              <Text style={[styles.summaryValue, { color: theme.text }]}>
                {formatCurrency(run.gross_pay)}
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: theme.textMuted }]}>Cash Advance Recovery</Text>
              <Text style={[styles.summaryValue, { color: theme.deduction }]}>
                -{formatCurrency(totalCashAdvances)}
              </Text>
            </View>
          </>
        )}

        <View style={[styles.divider, { backgroundColor: theme.border }]} />

        <View style={styles.summaryRow}>
          <Text style={[styles.summaryTotalLabel, { color: theme.text }]}>Net Pay</Text>
          <Text style={[styles.summaryTotalValue, { color: theme.accent }]}>
            {formatCurrency(run.net_pay)}
          </Text>
        </View>
      </View>

      {/* Footer Metadata */}
      <View style={styles.footer}>
        <Text style={[styles.metaText, { color: theme.textMuted }]}>
          Generated: {new Date(payslip.generated_at).toLocaleString()}
        </Text>
        <View
          style={[
            styles.statusBadge,
            {
              backgroundColor: theme.badgeCommittedBg,
              borderColor: theme.badgeCommittedText,
            },
          ]}
        >
          <Text style={[styles.statusBadgeText, { color: theme.badgeCommittedText }]}>
            Official Payslip
          </Text>
        </View>
      </View>

      {/* Delete & Regenerate */}
      <TouchableOpacity
        style={[styles.deleteButton, { borderColor: theme.deduction }]}
        onPress={handleDelete}
        activeOpacity={0.7}
      >
        <Text style={[styles.deleteButtonText, { color: theme.deduction }]}>
          Delete &amp; Regenerate
        </Text>
      </TouchableOpacity>
    </ScrollView>
    </View>
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
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCard: {
    padding: 20,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    marginBottom: 20,
  },
  employeeName: {
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  periodText: {
    fontSize: 14,
    marginBottom: 16,
  },
  netPayBox: {
    alignItems: 'center',
  },
  netPayLabel: {
    fontSize: 13,
    marginBottom: 2,
  },
  netPayAmount: {
    fontSize: 32,
    fontWeight: '800',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 10,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 8,
  },
  itemInfo: {
    flex: 1,
  },
  itemLabel: {
    fontSize: 15,
    fontWeight: '500',
  },
  itemSublabel: {
    fontSize: 12,
    marginTop: 2,
  },
  itemAmount: {
    fontSize: 15,
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
    marginBottom: 6,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 14,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    marginVertical: 4,
  },
  summaryTotalLabel: {
    fontSize: 16,
    fontWeight: '700',
  },
  summaryTotalValue: {
    fontSize: 18,
    fontWeight: '800',
  },
  deleteButton: {
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 32,
    height: 48,
    borderRadius: 10,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
  },
  metaText: {
    fontSize: 12,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
});
