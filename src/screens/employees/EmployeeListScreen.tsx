import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../theme/ThemeContext';
import { useEmployeeStore } from '../../store/employeeStore';
import { useDepartmentStore } from '../../store/departmentStore';
import { Employee } from '../../domain/types';

function formatSchedule(schedule: string): string {
  switch (schedule) {
    case 'monthly':
      return 'Monthly';
    case 'biweekly':
      return 'Bi-weekly';
    case 'weekly':
      return 'Weekly';
    default:
      return schedule;
  }
}

function formatPayDay(payDayConfig: string | null): string {
  if (!payDayConfig) return '';
  switch (payDayConfig) {
    case '1st':
      return '1st of month';
    case '15th':
      return '15th of month';
    case 'last':
      return 'Last day';
    case '1st_and_15th':
      return '1st & 15th';
    case '15th_and_last':
      return '15th & last';
    default:
      return payDayConfig;
  }
}

function formatCurrency(amount: number): string {
  return `$${amount.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}

export function EmployeeListScreen({ navigation }: any) {
  const { theme } = useTheme();
  const { allEmployees, loading, loadEmployees } = useEmployeeStore();
  const { departments, loadDepartments } = useDepartmentStore();

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadEmployees(true);
      loadDepartments();
    });
    loadEmployees(true);
    loadDepartments();
    return unsubscribe;
  }, [navigation, loadEmployees, loadDepartments]);

  const activeEmployees = allEmployees.filter((e) => e.is_active);
  const archivedEmployees = allEmployees.filter((e) => !e.is_active);

  const renderEmployeeCard = (employee: Employee, isArchived = false) => {
    const scheduleLabel = formatSchedule(employee.pay_schedule);
    const payDayLabel = formatPayDay(employee.pay_day_config);
    const timingDetail = payDayLabel ? ` · ${payDayLabel}` : '';
    const departmentName = employee.department_id
      ? (departments.find((d) => d.id === employee.department_id)?.name ?? null)
      : null;

    return (
      <TouchableOpacity
        key={employee.id}
        style={[
          styles.card,
          {
            backgroundColor: theme.surface,
            borderColor: theme.border,
            opacity: isArchived ? 0.5 : 1,
          },
        ]}
        onPress={() =>
          navigation.navigate('EmployeeForm', {
            mode: 'edit',
            employeeId: employee.id,
          })
        }
        activeOpacity={0.7}
      >
        <View style={styles.cardHeader}>
          <Text style={[styles.employeeName, { color: theme.text }]}>{employee.name}</Text>
          <Text style={[styles.monthlyRate, { color: theme.accent }]}>
            {formatCurrency(employee.monthly_rate)}
            <Text style={[styles.perMonth, { color: theme.textMuted }]}> / mo</Text>
          </Text>
        </View>
        <View style={styles.cardFooter}>
          <Text style={[styles.scheduleText, { color: theme.textMuted }]}>
            {scheduleLabel}
            {timingDetail}
          </Text>
          <View style={styles.badgeRow}>
            {departmentName && (
              <View style={[styles.deptBadge, { backgroundColor: theme.surfaceAlt, borderColor: theme.border }]}>
                <Text style={[styles.deptBadgeText, { color: theme.accent }]}>{departmentName}</Text>
              </View>
            )}
            {isArchived && (
              <View style={[styles.archivedBadge, { backgroundColor: theme.surfaceAlt, borderColor: theme.border }]}>
                <Text style={[styles.archivedText, { color: theme.textMuted }]}>Archived</Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]} edges={['top']}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.text }]}>Employees</Text>
      </View>

      {loading && allEmployees.length === 0 ? (
        <View style={styles.centered}>
          <ActivityIndicator color={theme.accent} size="large" />
        </View>
      ) : (
        <FlatList
          data={[...activeEmployees, ...archivedEmployees]}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => renderEmployeeCard(item, !item.is_active)}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={[styles.emptyText, { color: theme.textFaint }]}>
                No employees yet. Tap + to add one.
              </Text>
            </View>
          }
        />
      )}

      <TouchableOpacity
        style={[styles.fab, { backgroundColor: theme.accent }]}
        onPress={() => navigation.navigate('EmployeeForm', { mode: 'add' })}
        activeOpacity={0.8}
        accessibilityLabel="Add Employee"
      >
        <Text style={[styles.fabText, { color: theme.accentText }]}>+</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 90,
  },
  card: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  employeeName: {
    fontSize: 17,
    fontWeight: '600',
    flex: 1,
  },
  monthlyRate: {
    fontSize: 16,
    fontWeight: '700',
  },
  perMonth: {
    fontSize: 13,
    fontWeight: '400',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  scheduleText: {
    fontSize: 14,
    flex: 1,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
  },
  deptBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  deptBadgeText: {
    fontSize: 12,
    fontWeight: '500',
  },
  archivedBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  archivedText: {
    fontSize: 12,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  fabText: {
    fontSize: 32,
    fontWeight: '400',
    marginTop: -2,
  },
});
