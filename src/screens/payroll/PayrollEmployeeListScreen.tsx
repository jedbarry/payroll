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
import { Employee } from '../../domain/types';

export function PayrollEmployeeListScreen({ navigation }: any) {
  const { theme } = useTheme();
  const { allEmployees, loading, loadEmployees } = useEmployeeStore();

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadEmployees();
    });
    loadEmployees();
    return unsubscribe;
  }, [navigation, loadEmployees]);

  const active = allEmployees.filter((e) => e.is_active);
  const archived = allEmployees.filter((e) => !e.is_active);
  const sections: Array<{ title: string; data: Employee[] }> = [];
  if (active.length > 0) sections.push({ title: 'Active Payroll', data: active });
  if (archived.length > 0) sections.push({ title: 'Inactive Payroll', data: archived });

  const flatData: Array<Employee | { sectionTitle: string }> = [];
  for (const s of sections) {
    flatData.push({ sectionTitle: s.title });
    flatData.push(...s.data);
  }

  const renderItem = ({ item }: { item: Employee | { sectionTitle: string } }) => {
    if ('sectionTitle' in item) {
      return (
        <Text style={[styles.sectionLabel, { color: theme.textMuted }]}>
          {item.sectionTitle}
        </Text>
      );
    }

    const isArchived = !item.is_active;
    return (
      <TouchableOpacity
        style={[
          styles.card,
          {
            backgroundColor: theme.surface,
            borderColor: theme.border,
            opacity: isArchived ? 0.5 : 1,
          },
        ]}
        onPress={() =>
          navigation.navigate('PayrollRunList', {
            employeeId: item.id,
            employeeName: item.name,
          })
        }
        activeOpacity={0.7}
      >
        <View style={styles.cardRow}>
          <View style={styles.cardLeft}>
            <Text style={[styles.name, { color: theme.text }]}>{item.name} Payroll</Text>
            <Text style={[styles.sub, { color: theme.textMuted }]}>
              {scheduleLabel(item.pay_schedule)}
              {item.start_date ? ` · from ${item.start_date}` : ''}
            </Text>
          </View>
          <View style={styles.cardRight}>
            {isArchived && (
              <View style={[styles.badge, { backgroundColor: theme.surfaceAlt, borderColor: theme.border }]}>
                <Text style={[styles.badgeText, { color: theme.textMuted }]}>Archived</Text>
              </View>
            )}
            <Text style={[styles.chev, { color: theme.textMuted }]}>›</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]} edges={['top']}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.text }]}>Payroll</Text>
      </View>

      {loading && allEmployees.length === 0 ? (
        <View style={styles.centered}>
          <ActivityIndicator color={theme.accent} size="large" />
        </View>
      ) : allEmployees.length === 0 ? (
        <View style={styles.centered}>
          <Text style={[styles.emptyText, { color: theme.textFaint }]}>
            No resources yet. Add one in the Resources tab.
          </Text>
        </View>
      ) : (
        <FlatList
          data={flatData}
          keyExtractor={(item, index) =>
            'sectionTitle' in item ? `section-${index}` : item.id
          }
          contentContainerStyle={styles.listContent}
          renderItem={renderItem}
        />
      )}
    </SafeAreaView>
  );
}

function scheduleLabel(schedule: string): string {
  switch (schedule) {
    case 'monthly': return 'Monthly';
    case 'biweekly': return 'Bi-weekly';
    case 'weekly': return 'Weekly';
    default: return schedule;
  }
}

const styles = StyleSheet.create({
  container: { flex: 1 },
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
    paddingBottom: 40,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 12,
    marginBottom: 6,
  },
  card: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 10,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardLeft: { flex: 1 },
  cardRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  sub: {
    fontSize: 13,
  },
  badge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 5,
    borderWidth: 1,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '500',
  },
  chev: {
    fontSize: 20,
    fontWeight: '300',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyText: {
    fontSize: 15,
    textAlign: 'center',
  },
});
