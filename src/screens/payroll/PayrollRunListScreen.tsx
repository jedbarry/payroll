import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeContext';
import { usePayrollStore } from '../../store/payrollStore';
import { PayrollRun } from '../../domain/types';
import { getDb } from '../../db/index';
import { getEmployeeById } from '../../db/queries/employees';
import { getPayrollRunsByEmployee } from '../../db/queries/payrollRuns';
import { getPayPeriods, getBaseAmount } from '../../domain/payPeriod';

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

export function PayrollRunListScreen({ route, navigation }: any) {
  const { theme } = useTheme();
  const { employeeId, employeeName } = route.params || {};
  const { runs, loading, loadRunsForEmployee, saveDraft } = usePayrollStore();

  // Reload on focus (returning from form etc.)
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      if (employeeId) loadRunsForEmployee(employeeId);
    });
    if (employeeId) loadRunsForEmployee(employeeId);
    return unsubscribe;
  }, [navigation, employeeId, loadRunsForEmployee]);

  // Auto-generate a draft once on mount — only if the period has already started
  useEffect(() => {
    let cancelled = false;

    async function initRuns() {
      if (!employeeId) return;

      const existing = await getPayrollRunsByEmployee(employeeId);
      if (existing.some((r) => r.status === 'draft')) return;

      const emp = await getEmployeeById(employeeId);
      if (!emp || !emp.is_active) return;

      const existingPeriodKeys = new Set(existing.map((r) => `${r.period_start}_${r.period_end}`));

      const now = new Date();
      const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      const currentYear = now.getFullYear();
      const startYear = emp.start_date ? parseInt(emp.start_date.substring(0, 4), 10) : currentYear;

      // Find the most recent period that has started (start <= today) and has no run yet
      let period: { start: string; end: string; month: number; year: number } | null = null;
      outer: for (let yr = currentYear; yr >= startYear; yr--) {
        for (let m = 11; m >= 0; m--) {
          const periods = getPayPeriods(emp.pay_schedule, emp.pay_day_config, m, yr);
          for (const p of [...periods].reverse()) {
            if (emp.start_date && p.end < emp.start_date) continue;
            if (emp.archive_date && p.start > emp.archive_date) continue;
            if (existingPeriodKeys.has(`${p.start}_${p.end}`)) continue;
            if (p.start <= todayStr) {
              period = { ...p, month: m, year: yr };
              break outer;
            }
          }
        }
      }

      if (!period || cancelled) return;

      const base = getBaseAmount(emp.monthly_rate, emp.pay_schedule, period.month, period.year);
      await saveDraft(
        {
          employee_id: employeeId,
          period_start: period.start,
          period_end: period.end,
          base_amount: base,
          gross_pay: base,
          net_pay: base,
          status: 'draft',
        },
        [],
      );
    }

    initRuns();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employeeId]);

  const draftRuns = runs.filter((r) => r.status === 'draft');
  const committedRuns = runs.filter((r) => r.status === 'committed');

  const handleCommittedRunPress = async (run: PayrollRun) => {
    try {
      const db = getDb();
      const payslipRow = await db.getFirstAsync<{ id: string }>(
        'SELECT id FROM payslips WHERE payroll_run_id = ?;',
        [run.id],
      );
      if (payslipRow) {
        navigation.navigate('PayslipDetail', {
          payslipId: payslipRow.id,
          employeeId,
          employeeName,
        });
      } else {
        navigation.navigate('PayrollRunForm', { runId: run.id });
      }
    } catch {
      navigation.navigate('PayrollRunForm', { runId: run.id });
    }
  };

  const screenTitle = employeeName ? `${employeeName}'s Payroll` : 'Payroll';

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
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
      {loading && runs.length === 0 ? (
        <View style={styles.centered}>
          <ActivityIndicator color={theme.accent} size="large" />
        </View>
      ) : (
        <FlatList
          data={committedRuns}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={
            <View>
              {/* Always-visible + New Payroll button */}
              <TouchableOpacity
                style={[styles.addRunButton, { backgroundColor: theme.accent }]}
                onPress={() =>
                  navigation.navigate('PayrollRunForm', {
                    employeeId,
                    mode: 'new',
                  })
                }
                activeOpacity={0.8}
              >
                <Text style={[styles.addRunButtonText, { color: theme.accentText }]}>
                  + New Payroll
                </Text>
              </TouchableOpacity>

              {/* All draft runs */}
              {draftRuns.length > 0 && (
                <View style={styles.draftSection}>
                  <Text style={[styles.sectionTitle, { color: theme.badgeDraftText }]}>
                    Active Drafts
                  </Text>
                  {draftRuns.map((draft) => (
                    <TouchableOpacity
                      key={draft.id}
                      style={[
                        styles.draftCard,
                        {
                          backgroundColor: theme.badgeDraftBg,
                          borderColor: theme.badgeDraftText,
                          marginBottom: 10,
                        },
                      ]}
                      onPress={() =>
                        navigation.navigate('PayrollRunForm', {
                          runId: draft.id,
                          employeeId,
                        })
                      }
                      activeOpacity={0.7}
                    >
                      <View style={styles.runCardHeader}>
                        <Text style={[styles.periodText, { color: theme.text }]}>
                          {formatPeriod(draft.period_start, draft.period_end)}
                        </Text>
                        <View
                          style={[
                            styles.badge,
                            { backgroundColor: theme.surfaceAlt, borderColor: theme.badgeDraftText },
                          ]}
                        >
                          <Text style={[styles.badgeText, { color: theme.badgeDraftText }]}>
                            Draft
                          </Text>
                        </View>
                      </View>
                      <View style={styles.runCardFooter}>
                        <Text style={[styles.amountLabel, { color: theme.textMuted }]}>Net Pay</Text>
                        <Text style={[styles.netAmount, { color: theme.accent }]}>
                          {formatCurrency(draft.net_pay)}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {committedRuns.length > 0 && (
                <Text style={[styles.sectionTitle, { color: theme.textMuted, marginTop: 8 }]}>
                  Committed Runs
                </Text>
              )}
            </View>
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.card,
                {
                  backgroundColor: theme.surface,
                  borderColor: theme.border,
                },
              ]}
              onPress={() => handleCommittedRunPress(item)}
              activeOpacity={0.7}
            >
              <View style={styles.runCardHeader}>
                <Text style={[styles.periodText, { color: theme.text }]}>
                  {formatPeriod(item.period_start, item.period_end)}
                </Text>
                <View
                  style={[
                    styles.badge,
                    {
                      backgroundColor: theme.badgeCommittedBg,
                      borderColor: theme.badgeCommittedText,
                    },
                  ]}
                >
                  <Text style={[styles.badgeText, { color: theme.badgeCommittedText }]}>
                    Committed
                  </Text>
                </View>
              </View>
              <View style={styles.runCardFooter}>
                <Text style={[styles.amountLabel, { color: theme.textMuted }]}>Net Pay</Text>
                <Text style={[styles.netAmount, { color: theme.text }]}>
                  {formatCurrency(item.net_pay)}
                </Text>
              </View>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            draftRuns.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={[styles.emptyText, { color: theme.textFaint }]}>
                  No committed runs yet.
                </Text>
              </View>
            ) : null
          }
        />
      )}
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
  listContent: {
    padding: 16,
    paddingBottom: 40,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  draftSection: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  draftCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1.5,
    borderStyle: 'dashed',
  },
  card: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  runCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  periodText: {
    fontSize: 15,
    fontWeight: '600',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  runCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  amountLabel: {
    fontSize: 13,
  },
  netAmount: {
    fontSize: 18,
    fontWeight: '700',
  },
  addRunButton: {
    height: 48,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  addRunButtonText: {
    fontSize: 15,
    fontWeight: '700',
  },
  emptyContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 15,
  },
});
