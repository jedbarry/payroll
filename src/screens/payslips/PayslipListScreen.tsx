import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../theme/ThemeContext';
import { usePayslipStore } from '../../store/payslipStore';
import { useEmployeeStore } from '../../store/employeeStore';
import { PayslipCard } from '../../components/PayslipCard';

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

function formatCurrency(amount: number): string {
  return `PHP ${amount.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function PayslipListScreen({ navigation }: any) {
  const { theme } = useTheme();
  const currentYear = new Date().getFullYear();
  const currentMonthIdx = new Date().getMonth();

  const {
    payslips,
    loading,
    availableYears,
    selectedYear,
    loadPayslipsForYear,
    loadAvailableYears,
    setSelectedYear,
  } = usePayslipStore();
  const { allEmployees, loadEmployees } = useEmployeeStore();

  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadAvailableYears();
      loadPayslipsForYear(selectedYear);
      loadEmployees();
    });
    loadAvailableYears();
    loadPayslipsForYear(selectedYear);
    loadEmployees();
    return unsubscribe;
  }, [navigation, selectedYear, loadPayslipsForYear, loadAvailableYears, loadEmployees]);

  // Filtered payslips
  const filteredPayslips = useMemo(() => {
    if (!selectedEmployeeId) return payslips;
    return payslips.filter((p) => p.employee_id === selectedEmployeeId);
  }, [payslips, selectedEmployeeId]);

  // Stats calculations
  const stats = useMemo(() => {
    let ytd = 0;
    let thisMonth = 0;
    const quarters = [0, 0, 0, 0];

    for (const p of filteredPayslips) {
      // Use gross_pay for reporting — it reflects earned pay before cash advance recovery
      const gross = p.run?.gross_pay ?? 0;
      ytd += gross;

      // Grouping by period_end or generated_at month
      const dateStr = p.run?.period_end || p.generated_at;
      const monthIdx = new Date(dateStr).getMonth();

      if (monthIdx === currentMonthIdx) {
        thisMonth += gross;
      }

      const qIdx = Math.floor(monthIdx / 3);
      if (qIdx >= 0 && qIdx <= 3) {
        quarters[qIdx] += gross;
      }
    }

    return { ytd, thisMonth, quarters };
  }, [filteredPayslips, currentMonthIdx]);

  // Group payslips by month (11 down to 0)
  const monthlyGroups = useMemo(() => {
    const groups: { [monthIdx: number]: typeof filteredPayslips } = {};
    for (let m = 0; m < 12; m++) {
      groups[m] = [];
    }

    for (const p of filteredPayslips) {
      const dateStr = p.run?.period_end || p.generated_at;
      const monthIdx = new Date(dateStr).getMonth();
      if (groups[monthIdx]) {
        groups[monthIdx].push(p);
      }
    }

    return groups;
  }, [filteredPayslips]);

  // For current year: only show months up to today. For past years: show all 12.
  const maxMonthIdx = selectedYear === currentYear ? currentMonthIdx : 11;

  const selectedEmployeeName = allEmployees.find((e) => e.id === selectedEmployeeId)?.name;
  const headerLabel = selectedEmployeeName
    ? `${selectedEmployeeName} · ${selectedYear}`
    : `${selectedYear} Pay Records`;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Title */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.text }]}>Pay Records</Text>
        </View>

        {/* Year selector */}
        {availableYears.length > 1 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.yearTabsRow}
          >
            {availableYears.map((yr) => {
              const isSelected = yr === selectedYear;
              return (
                <TouchableOpacity
                  key={yr}
                  style={[
                    styles.yearTab,
                    {
                      borderBottomColor: isSelected ? theme.accent : 'transparent',
                      borderBottomWidth: 2,
                    },
                  ]}
                  onPress={() => {
                    setSelectedEmployeeId(null);
                    setSelectedYear(yr);
                  }}
                >
                  <Text
                    style={[
                      styles.yearTabText,
                      { color: isSelected ? theme.accent : theme.textMuted },
                    ]}
                  >
                    {yr}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}

        {/* Header Stats Panel */}
        <View
          style={[
            styles.statsPanel,
            { backgroundColor: theme.surface, borderColor: theme.border },
          ]}
        >
          <Text style={[styles.statsHeaderLabel, { color: theme.textMuted }]}>
            {headerLabel}
          </Text>

          {/* YTD & Current Month */}
          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={[styles.statLabel, { color: theme.textMuted }]}>YTD Total</Text>
              <Text style={[styles.statValueLarge, { color: theme.accent }]}>
                {formatCurrency(stats.ytd)}
              </Text>
            </View>
            <View style={styles.statBox}>
              <Text style={[styles.statLabel, { color: theme.textMuted }]}>
                {MONTH_NAMES[currentMonthIdx]}
              </Text>
              <Text style={[styles.statValueLarge, { color: theme.text }]}>
                {formatCurrency(stats.thisMonth)}
              </Text>
            </View>
          </View>

          {/* Divider */}
          <View style={[styles.divider, { backgroundColor: theme.border }]} />

          {/* Q1-Q4 Row */}
          <View style={styles.quarterRow}>
            {['Q1', 'Q2', 'Q3', 'Q4'].map((q, idx) => (
              <View key={q} style={styles.quarterBox}>
                <Text style={[styles.quarterLabel, { color: theme.textMuted }]}>{q}</Text>
                <Text style={[styles.quarterValue, { color: theme.text }]}>
                  {formatCurrency(stats.quarters[idx])}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Employee Filter Pills */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterContainer}
        >
          <TouchableOpacity
            style={[
              styles.filterPill,
              {
                backgroundColor: selectedEmployeeId === null ? theme.accent : theme.surface,
                borderColor: theme.border,
              },
            ]}
            onPress={() => setSelectedEmployeeId(null)}
          >
            <Text
              style={[
                styles.filterPillText,
                { color: selectedEmployeeId === null ? theme.accentText : theme.text },
              ]}
            >
              All
            </Text>
          </TouchableOpacity>

          {allEmployees.map((emp) => {
            const isSelected = selectedEmployeeId === emp.id;
            return (
              <TouchableOpacity
                key={emp.id}
                style={[
                  styles.filterPill,
                  {
                    backgroundColor: isSelected ? theme.accent : theme.surface,
                    borderColor: theme.border,
                  },
                ]}
                onPress={() => setSelectedEmployeeId(emp.id)}
              >
                <Text
                  style={[
                    styles.filterPillText,
                    { color: isSelected ? theme.accentText : theme.text },
                  ]}
                >
                  {emp.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Monthly Sections (11 down to 0) */}
        {loading && payslips.length === 0 ? (
          <View style={styles.centered}>
            <ActivityIndicator color={theme.accent} size="large" />
          </View>
        ) : (
          <View style={styles.monthsContainer}>
            {Array.from({ length: maxMonthIdx + 1 }, (_, i) => maxMonthIdx - i).map((monthIdx) => {
              const monthPayslips = monthlyGroups[monthIdx] || [];
              return (
                <View key={monthIdx} style={styles.monthSection}>
                  <View style={styles.monthHeader}>
                    <Text style={[styles.monthTitle, { color: theme.text }]}>
                      {MONTH_NAMES[monthIdx]}
                    </Text>
                    {monthPayslips.length > 0 && (
                      <Text style={[styles.monthCount, { color: theme.textMuted }]}>
                        {monthPayslips.length}{' '}
                        {monthPayslips.length === 1 ? 'record' : 'records'}
                      </Text>
                    )}
                  </View>

                  {monthPayslips.length === 0 ? (
                    <View
                      style={[
                        styles.emptyMonthBox,
                        { backgroundColor: theme.surfaceAlt, borderColor: theme.border },
                      ]}
                    >
                      <Text style={[styles.emptyMonthText, { color: theme.textFaint }]}>
                        No payslips
                      </Text>
                    </View>
                  ) : (
                    monthPayslips.map((p) => (
                      <PayslipCard
                        key={p.id}
                        payslip={p}
                        onPress={() =>
                          navigation.navigate('PayslipDetail', {
                            payslipId: p.id,
                          })
                        }
                      />
                    ))
                  )}
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  yearTabsRow: {
    paddingHorizontal: 16,
    gap: 4,
    marginBottom: 4,
  },
  yearTab: {
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  yearTabText: {
    fontSize: 15,
    fontWeight: '700',
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
  },
  statsPanel: {
    marginHorizontal: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  statsHeaderLabel: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  statBox: {
    flex: 1,
  },
  statLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  statValueLarge: {
    fontSize: 22,
    fontWeight: '700',
  },
  divider: {
    height: 1,
    marginBottom: 12,
  },
  quarterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  quarterBox: {
    flex: 1,
  },
  quarterLabel: {
    fontSize: 11,
    marginBottom: 2,
  },
  quarterValue: {
    fontSize: 13,
    fontWeight: '600',
  },
  filterContainer: {
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 20,
  },
  filterPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterPillText: {
    fontSize: 14,
    fontWeight: '600',
  },
  monthsContainer: {
    paddingHorizontal: 16,
  },
  monthSection: {
    marginBottom: 20,
  },
  monthHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  monthTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  monthCount: {
    fontSize: 12,
  },
  emptyMonthBox: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  emptyMonthText: {
    fontSize: 13,
    fontStyle: 'italic',
  },
  centered: {
    paddingVertical: 40,
    alignItems: 'center',
  },
});
