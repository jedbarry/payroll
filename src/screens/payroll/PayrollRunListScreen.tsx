import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { usePayrollStore } from '../../store/payrollStore';
import { PayrollRun } from '../../domain/types';
import { getDb } from '../../db/index';

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
  const { runs, loading, loadRunsForEmployee } = usePayrollStore();

  useEffect(() => {
    navigation.setOptions({
      title: employeeName ? `${employeeName}'s Payroll` : 'Payroll',
    });
  }, [navigation, employeeName]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      if (employeeId) {
        loadRunsForEmployee(employeeId);
      }
    });
    if (employeeId) {
      loadRunsForEmployee(employeeId);
    }
    return unsubscribe;
  }, [navigation, employeeId, loadRunsForEmployee]);

  const draftRun = runs.find((r) => r.status === 'draft');
  const committedRuns = runs.filter((r) => r.status === 'committed');

  const handleCommittedRunPress = async (run: PayrollRun) => {
    try {
      const db = getDb();
      const payslipRow = await db.getFirstAsync<{ id: string }>(
        'SELECT id FROM payslips WHERE payroll_run_id = ?;',
        [run.id],
      );
      if (payslipRow) {
        navigation.navigate('PayslipsTab', {
          screen: 'PayslipDetail',
          params: { payslipId: payslipRow.id },
        });
      } else {
        navigation.navigate('PayrollRunForm', { runId: run.id });
      }
    } catch {
      navigation.navigate('PayrollRunForm', { runId: run.id });
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
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
              {/* Draft run card */}
              {draftRun && (
                <View style={styles.draftSection}>
                  <Text style={[styles.sectionTitle, { color: theme.badgeDraftText }]}>
                    Active Draft
                  </Text>
                  <TouchableOpacity
                    style={[
                      styles.draftCard,
                      {
                        backgroundColor: theme.badgeDraftBg,
                        borderColor: theme.badgeDraftText,
                      },
                    ]}
                    onPress={() =>
                      navigation.navigate('PayrollRunForm', {
                        runId: draftRun.id,
                        employeeId,
                      })
                    }
                    activeOpacity={0.7}
                  >
                    <View style={styles.runCardHeader}>
                      <Text style={[styles.periodText, { color: theme.text }]}>
                        {formatPeriod(draftRun.period_start, draftRun.period_end)}
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
                        {formatCurrency(draftRun.net_pay)}
                      </Text>
                    </View>
                  </TouchableOpacity>
                </View>
              )}

              {/* Action: + Run button if no draft exists */}
              {!draftRun && (
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
              )}

              {committedRuns.length > 0 && (
                <Text style={[styles.sectionTitle, { color: theme.textMuted, marginTop: 16 }]}>
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
            !draftRun ? (
              <View style={styles.emptyContainer}>
                <Text style={[styles.emptyText, { color: theme.textFaint }]}>
                  No payroll runs yet.
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
  container: {
    flex: 1,
  },
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
