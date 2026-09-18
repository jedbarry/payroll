import React, { useState, useEffect } from 'react';
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
} from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { useEmployeeStore } from '../../store/employeeStore';
import { getEmployeeById } from '../../db/queries/employees';
import { PaySchedule, PayDayConfig } from '../../domain/types';

export function EmployeeFormScreen({ route, navigation }: any) {
  const { theme } = useTheme();
  const { addEmployee, updateEmployee, archiveEmployee } = useEmployeeStore();

  const mode: 'add' | 'edit' = route.params?.mode || 'add';
  const employeeId: string | undefined = route.params?.employeeId;

  const [name, setName] = useState('');
  const [monthlyRate, setMonthlyRate] = useState('');
  const [schedule, setSchedule] = useState<PaySchedule>('monthly');
  const [payDayConfig, setPayDayConfig] = useState<PayDayConfig | null>('last');
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (mode === 'edit' && employeeId) {
      getEmployeeById(employeeId).then((emp) => {
        if (emp) {
          setName(emp.name);
          setMonthlyRate(emp.monthly_rate.toString());
          setSchedule(emp.pay_schedule);
          setPayDayConfig(emp.pay_day_config);
          setIsActive(emp.is_active);
          navigation.setOptions({ title: `Edit ${emp.name}` });
        }
      });
    } else {
      navigation.setOptions({ title: 'New Employee' });
    }
  }, [mode, employeeId, navigation]);

  const handleScheduleChange = (newSchedule: PaySchedule) => {
    setSchedule(newSchedule);
    if (newSchedule === 'weekly') {
      setPayDayConfig(null);
    } else if (newSchedule === 'biweekly') {
      if (payDayConfig !== '1st_and_15th' && payDayConfig !== '15th_and_last') {
        setPayDayConfig('1st_and_15th');
      }
    } else if (newSchedule === 'monthly') {
      if (payDayConfig !== '1st' && payDayConfig !== '15th' && payDayConfig !== 'last') {
        setPayDayConfig('last');
      }
    }
  };

  const handleSave = async () => {
    const trimmedName = name.trim();
    const rateNum = parseFloat(monthlyRate);

    if (!trimmedName) {
      Alert.alert('Validation Error', 'Full Name is required.');
      return;
    }

    if (isNaN(rateNum) || rateNum <= 0) {
      Alert.alert('Validation Error', 'Monthly Rate must be greater than 0.');
      return;
    }

    if (schedule !== 'weekly' && !payDayConfig) {
      Alert.alert('Validation Error', 'Payment Day configuration is required.');
      return;
    }

    setSaving(true);
    try {
      if (mode === 'add') {
        await addEmployee({
          name: trimmedName,
          monthly_rate: rateNum,
          pay_schedule: schedule,
          pay_day_config: schedule === 'weekly' ? null : payDayConfig,
        });
      } else if (mode === 'edit' && employeeId) {
        await updateEmployee(employeeId, {
          name: trimmedName,
          monthly_rate: rateNum,
          pay_schedule: schedule,
          pay_day_config: schedule === 'weekly' ? null : payDayConfig,
          is_active: isActive,
        });
      }
      navigation.goBack();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to save employee.');
    } finally {
      setSaving(false);
    }
  };

  const handleArchive = () => {
    if (!employeeId) return;
    Alert.alert(
      'Archive Employee',
      `Are you sure you want to archive ${name}? They will no longer appear as active.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Archive',
          style: 'destructive',
          onPress: async () => {
            try {
              await archiveEmployee(employeeId);
              navigation.goBack();
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Failed to archive employee.');
            }
          },
        },
      ],
    );
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={[styles.container, { backgroundColor: theme.bg }]}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Full Name */}
        <View style={styles.fieldGroup}>
          <Text style={[styles.label, { color: theme.textMuted }]}>Full Name</Text>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: theme.surface,
                borderColor: theme.border,
                color: theme.text,
              },
            ]}
            placeholder="e.g. Jane Doe"
            placeholderTextColor={theme.textFaint}
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
          />
        </View>

        {/* Monthly Rate */}
        <View style={styles.fieldGroup}>
          <Text style={[styles.label, { color: theme.textMuted }]}>Monthly Rate ($)</Text>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: theme.surface,
                borderColor: theme.border,
                color: theme.text,
              },
            ]}
            placeholder="e.g. 5000"
            placeholderTextColor={theme.textFaint}
            value={monthlyRate}
            onChangeText={setMonthlyRate}
            keyboardType="numeric"
          />
        </View>

        {/* Pay Schedule */}
        <View style={styles.fieldGroup}>
          <Text style={[styles.label, { color: theme.textMuted }]}>Pay Schedule</Text>
          <View style={styles.segmentedRow}>
            {(['monthly', 'biweekly', 'weekly'] as PaySchedule[]).map((sched) => {
              const isSelected = schedule === sched;
              const title =
                sched === 'monthly' ? 'Monthly' : sched === 'biweekly' ? 'Bi-weekly' : 'Weekly';
              return (
                <TouchableOpacity
                  key={sched}
                  style={[
                    styles.segmentButton,
                    {
                      backgroundColor: isSelected ? theme.accent : theme.surface,
                      borderColor: theme.border,
                    },
                  ]}
                  onPress={() => handleScheduleChange(sched)}
                >
                  <Text
                    style={[
                      styles.segmentText,
                      { color: isSelected ? theme.accentText : theme.text },
                    ]}
                  >
                    {title}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Pay Day Config (context-sensitive) */}
        {schedule === 'monthly' && (
          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: theme.textMuted }]}>Payment Day</Text>
            <View style={styles.segmentedRow}>
              {(['1st', '15th', 'last'] as PayDayConfig[]).map((cfg) => {
                const isSelected = payDayConfig === cfg;
                const title = cfg === '1st' ? '1st' : cfg === '15th' ? '15th' : 'Last Day';
                return (
                  <TouchableOpacity
                    key={cfg}
                    style={[
                      styles.segmentButton,
                      {
                        backgroundColor: isSelected ? theme.accent : theme.surface,
                        borderColor: theme.border,
                      },
                    ]}
                    onPress={() => setPayDayConfig(cfg)}
                  >
                    <Text
                      style={[
                        styles.segmentText,
                        { color: isSelected ? theme.accentText : theme.text },
                      ]}
                    >
                      {title}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {schedule === 'biweekly' && (
          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: theme.textMuted }]}>Payment Days</Text>
            <View style={styles.segmentedRow}>
              {(['1st_and_15th', '15th_and_last'] as PayDayConfig[]).map((cfg) => {
                const isSelected = payDayConfig === cfg;
                const title = cfg === '1st_and_15th' ? '1st & 15th' : '15th & Last';
                return (
                  <TouchableOpacity
                    key={cfg}
                    style={[
                      styles.segmentButton,
                      {
                        backgroundColor: isSelected ? theme.accent : theme.surface,
                        borderColor: theme.border,
                      },
                    ]}
                    onPress={() => setPayDayConfig(cfg)}
                  >
                    <Text
                      style={[
                        styles.segmentText,
                        { color: isSelected ? theme.accentText : theme.text },
                      ]}
                    >
                      {title}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {/* Save button */}
        <TouchableOpacity
          style={[styles.primaryButton, { backgroundColor: theme.accent }]}
          onPress={handleSave}
          disabled={saving}
          activeOpacity={0.8}
        >
          <Text style={[styles.primaryButtonText, { color: theme.accentText }]}>
            {saving ? 'Saving...' : mode === 'add' ? 'Create Employee' : 'Save Changes'}
          </Text>
        </TouchableOpacity>

        {/* Edit mode extra actions */}
        {mode === 'edit' && employeeId && (
          <View style={styles.editActions}>
            <TouchableOpacity
              style={[
                styles.secondaryButton,
                { backgroundColor: theme.surfaceAlt, borderColor: theme.border },
              ]}
              onPress={() =>
                navigation.navigate('PayrollRunList', {
                  employeeId,
                  employeeName: name,
                })
              }
              activeOpacity={0.7}
            >
              <Text style={[styles.secondaryButtonText, { color: theme.accent }]}>
                Run History & New Run
              </Text>
            </TouchableOpacity>

            {isActive && (
              <TouchableOpacity
                style={[styles.archiveButton, { borderColor: theme.deduction }]}
                onPress={handleArchive}
                activeOpacity={0.7}
              >
                <Text style={[styles.archiveButtonText, { color: theme.deduction }]}>
                  Archive Employee
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
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  fieldGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  input: {
    height: 48,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontSize: 16,
  },
  segmentedRow: {
    flexDirection: 'row',
    gap: 8,
  },
  segmentButton: {
    flex: 1,
    height: 44,
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  segmentText: {
    fontSize: 14,
    fontWeight: '600',
  },
  primaryButton: {
    height: 50,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '700',
  },
  editActions: {
    marginTop: 24,
    gap: 12,
  },
  secondaryButton: {
    height: 50,
    borderRadius: 10,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  secondaryButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  archiveButton: {
    height: 50,
    borderRadius: 10,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  archiveButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
});
