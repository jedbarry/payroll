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
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeContext';
import { useEmployeeStore } from '../../store/employeeStore';
import { useDepartmentStore } from '../../store/departmentStore';
import { getEmployeeById } from '../../db/queries/employees';
import {
  getPayHistoryByEmployee,
  insertPayHistory,
  updatePayHistory,
  deletePayHistory,
  makePayHistoryCurrent,
} from '../../db/queries/payHistory';
import { updateEmployee as updateEmployeeQuery } from '../../db/queries/employees';
import { PaySchedule, PayDayConfig, PayHistory } from '../../domain/types';
import { DatePickerField } from '../../components/DatePickerField';
import { getBaseAmount } from '../../domain/payPeriod';

export function EmployeeFormScreen({ route, navigation }: any) {
  const { theme } = useTheme();
  const { addEmployee, updateEmployee, loadEmployees } = useEmployeeStore();
  const { departments, loadDepartments, ensureDepartment } = useDepartmentStore();

  const mode: 'add' | 'edit' = route.params?.mode || 'add';
  const employeeId: string | undefined = route.params?.employeeId;

  const [name, setName] = useState('');
  const [monthlyRate, setMonthlyRate] = useState('');
  const [schedule, setSchedule] = useState<PaySchedule>('monthly');
  const [payDayConfig, setPayDayConfig] = useState<PayDayConfig | null>('last');
  const [departmentText, setDepartmentText] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [archiveDate, setArchiveDate] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const [payHistory, setPayHistory] = useState<PayHistory[]>([]);
  const [currentSchedule, setCurrentSchedule] = useState<PaySchedule>('monthly');

  // Pay history editing state
  type HistoryFormMode = { type: 'add' } | { type: 'edit'; id: string };
  const [historyFormMode, setHistoryFormMode] = useState<HistoryFormMode | null>(null);
  const [historyRate, setHistoryRate] = useState('');
  const [historyFrom, setHistoryFrom] = useState('');
  const [historyTo, setHistoryTo] = useState('');

  useEffect(() => {
    loadDepartments();
  }, [loadDepartments]);

  useEffect(() => {
    if (mode === 'edit' && employeeId) {
      getEmployeeById(employeeId).then((emp) => {
        if (emp) {
            setName(emp.name);
            setMonthlyRate(emp.monthly_rate.toString());
            setSchedule(emp.pay_schedule);
            setCurrentSchedule(emp.pay_schedule);
            setPayDayConfig(emp.pay_day_config);
            setStartDate(emp.start_date ?? '');
            setArchiveDate(emp.archive_date ?? '');
            setIsActive(emp.is_active);
          }
      });
      getPayHistoryByEmployee(employeeId).then(setPayHistory).catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, employeeId]);

  // Fill department text once departments are loaded (edit mode)
  useEffect(() => {
    if (mode === 'edit' && employeeId && departmentText === '') {
      getEmployeeById(employeeId).then((emp) => {
        if (emp?.department_id) {
          const dept = departments.find((d) => d.id === emp.department_id);
          if (dept) setDepartmentText(dept.name);
        }
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [departments]);

  const filteredSuggestions = departmentText.trim()
    ? departments.filter((d) =>
        d.name.toLowerCase().includes(departmentText.trim().toLowerCase()),
      )
    : departments;

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
    const trimmedDept = departmentText.trim();

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
      let department_id: string | null = null;
      if (trimmedDept) {
        const dept = await ensureDepartment(trimmedDept);
        department_id = dept.id;
      }

      const trimmedStart = startDate.trim() || null;
      const trimmedArchive = archiveDate.trim() || null;

      if (mode === 'add') {
        await addEmployee({
          name: trimmedName,
          monthly_rate: rateNum,
          pay_schedule: schedule,
          pay_day_config: schedule === 'weekly' ? null : payDayConfig,
          department_id,
          start_date: trimmedStart,
          archive_date: trimmedArchive,
        });
      } else if (mode === 'edit' && employeeId) {
        await updateEmployee(employeeId, {
          name: trimmedName,
          monthly_rate: rateNum,
          pay_schedule: schedule,
          pay_day_config: schedule === 'weekly' ? null : payDayConfig,
          department_id,
          is_active: isActive,
          start_date: trimmedStart,
          archive_date: trimmedArchive,
        });
      }
      navigation.goBack();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to save employee.');
    } finally {
      setSaving(false);
    }
  };

  // When archive date is set manually, also mark inactive
  const handleArchiveDateChange = (date: string | null) => {
    setArchiveDate(date ?? '');
    if (date) {
      setIsActive(false);
    }
  };

  const reloadHistory = () => {
    if (employeeId) getPayHistoryByEmployee(employeeId).then(setPayHistory).catch(() => {});
  };

  const openAddHistory = () => {
    setHistoryRate('');
    setHistoryFrom('');
    setHistoryTo('');
    setHistoryFormMode({ type: 'add' });
  };

  const openEditHistory = (entry: PayHistory) => {
    setHistoryRate(entry.monthly_rate.toString());
    setHistoryFrom(entry.effective_from);
    setHistoryTo(entry.effective_to ?? '');
    setHistoryFormMode({ type: 'edit', id: entry.id });
  };

  const cancelHistoryForm = () => setHistoryFormMode(null);

  const saveHistoryForm = async () => {
    if (!employeeId) return;
    const rate = parseFloat(historyRate);
    if (isNaN(rate) || rate <= 0) { Alert.alert('Validation Error', 'Rate must be greater than 0.'); return; }
    if (!historyFrom) { Alert.alert('Validation Error', 'Effective From date is required.'); return; }
    const effectiveTo = historyTo.trim() || null;
    try {
      if (historyFormMode?.type === 'add') {
        await insertPayHistory({
          employee_id: employeeId,
          monthly_rate: rate,
          effective_from: historyFrom,
          effective_to: effectiveTo,
        });
      } else if (historyFormMode?.type === 'edit') {
        await updatePayHistory(historyFormMode.id, {
          monthly_rate: rate,
          effective_from: historyFrom,
          effective_to: effectiveTo,
        });
      }
      // If this entry is current (no end date), sync employee.monthly_rate
      if (effectiveTo === null) {
        await updateEmployeeQuery(employeeId, { monthly_rate: rate });
        setMonthlyRate(rate.toString());
        await loadEmployees(true);
      }
      setHistoryFormMode(null);
      reloadHistory();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to save.');
    }
  };

  const handleDeleteHistory = (entry: PayHistory) => {
    Alert.alert('Delete Entry', 'Delete this pay history entry?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          try {
            await deletePayHistory(entry.id);
            reloadHistory();
          } catch (err: any) {
            Alert.alert('Error', err.message || 'Failed to delete.');
          }
        },
      },
    ]);
  };

  const handleMakeCurrent = async (entry: PayHistory) => {
    if (!employeeId) return;
    try {
      await makePayHistoryCurrent(entry.id, employeeId);
      // Sync employee.monthly_rate to the new current rate
      await updateEmployeeQuery(employeeId, { monthly_rate: entry.monthly_rate });
      setMonthlyRate(entry.monthly_rate.toString());
      // Refresh store so Resources list and any other screen shows updated rate
      await loadEmployees(true);
      reloadHistory();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to update.');
    }
  };

  const handleArchive = () => {
    if (!employeeId) return;
    Alert.alert(
      'Archive Resource',
      `Are you sure you want to archive ${name}? They will no longer appear as active.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Archive',
          style: 'destructive',
          onPress: async () => {
            try {
              // Auto-fill archive date with today if not already set
              const today = new Date();
              const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
              const finalArchiveDate = archiveDate || todayStr;
              await updateEmployee(employeeId, {
                is_active: false,
                archive_date: finalArchiveDate,
              });
              navigation.goBack();
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Failed to archive employee.');
            }
          },
        },
      ],
    );
  };

  const screenTitle = mode === 'edit' && name ? `Edit ${name}` : 'New Resource';

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
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Full Name */}
        <View style={styles.fieldGroup}>
          <Text style={[styles.label, { color: theme.textMuted }]}>Full Name</Text>
          <TextInput
            style={[styles.input, { backgroundColor: theme.surface, borderColor: theme.border, color: theme.text }]}
            placeholder="e.g. Jane Doe"
            placeholderTextColor={theme.textFaint}
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
          />
        </View>

        {/* Monthly Rate */}
        <View style={styles.fieldGroup}>
          <Text style={[styles.label, { color: theme.textMuted }]}>Monthly Rate (PHP)</Text>
          <TextInput
            style={[styles.input, { backgroundColor: theme.surface, borderColor: theme.border, color: theme.text }]}
            placeholder="e.g. 5000"
            placeholderTextColor={theme.textFaint}
            value={monthlyRate}
            onChangeText={setMonthlyRate}
            keyboardType="numeric"
          />
        </View>

        {/* Department */}
        <View style={styles.fieldGroup}>
          <Text style={[styles.label, { color: theme.textMuted }]}>Department</Text>
          <TextInput
            style={[styles.input, { backgroundColor: theme.surface, borderColor: theme.border, color: theme.text }]}
            placeholder="e.g. Engineering"
            placeholderTextColor={theme.textFaint}
            value={departmentText}
            onChangeText={(t) => { setDepartmentText(t); setShowSuggestions(true); }}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
            autoCapitalize="words"
          />
          {showSuggestions && filteredSuggestions.length > 0 && (
            <View style={[styles.suggestionsBox, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <FlatList
                data={filteredSuggestions}
                keyExtractor={(item) => item.id}
                scrollEnabled={false}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[styles.suggestionRow, { borderBottomColor: theme.border }]}
                    onPress={() => { setDepartmentText(item.name); setShowSuggestions(false); }}
                  >
                    <Text style={[styles.suggestionText, { color: theme.text }]}>{item.name}</Text>
                  </TouchableOpacity>
                )}
              />
            </View>
          )}
        </View>

        {/* Pay Schedule */}
        <View style={styles.fieldGroup}>
          <Text style={[styles.label, { color: theme.textMuted }]}>Pay Schedule</Text>
          <View style={styles.segmentedRow}>
            {(['monthly', 'biweekly', 'weekly'] as PaySchedule[]).map((sched) => {
              const isSelected = schedule === sched;
              const title = sched === 'monthly' ? 'Monthly' : sched === 'biweekly' ? 'Bi-weekly' : 'Weekly';
              return (
                <TouchableOpacity
                  key={sched}
                  style={[styles.segmentButton, { backgroundColor: isSelected ? theme.accent : theme.surface, borderColor: theme.border }]}
                  onPress={() => handleScheduleChange(sched)}
                >
                  <Text style={[styles.segmentText, { color: isSelected ? theme.accentText : theme.text }]}>{title}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Pay Day Config */}
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
                    style={[styles.segmentButton, { backgroundColor: isSelected ? theme.accent : theme.surface, borderColor: theme.border }]}
                    onPress={() => setPayDayConfig(cfg)}
                  >
                    <Text style={[styles.segmentText, { color: isSelected ? theme.accentText : theme.text }]}>{title}</Text>
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
                    style={[styles.segmentButton, { backgroundColor: isSelected ? theme.accent : theme.surface, borderColor: theme.border }]}
                    onPress={() => setPayDayConfig(cfg)}
                  >
                    <Text style={[styles.segmentText, { color: isSelected ? theme.accentText : theme.text }]}>{title}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        <DatePickerField
          label="Start Date"
          value={startDate}
          onChange={(d) => setStartDate(d ?? '')}
          placeholder="Not set"
          clearable
        />

        <DatePickerField
          label="Archive Date"
          hint="optional — auto-set on archive"
          value={archiveDate}
          onChange={handleArchiveDateChange}
          placeholder="Not set"
          clearable
        />

        {/* Pay History (edit mode only) */}
        {mode === 'edit' && (
          <View style={styles.fieldGroup}>
            <View style={styles.historyHeader}>
              <Text style={[styles.label, { color: theme.textMuted, marginBottom: 0 }]}>Pay History</Text>
              {historyFormMode === null && (
                <TouchableOpacity onPress={openAddHistory} activeOpacity={0.7}>
                  <Text style={[styles.historyAddBtn, { color: theme.accent }]}>+ Add Entry</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Inline add/edit form */}
            {historyFormMode !== null && (
              <View style={[styles.historyFormCard, { backgroundColor: theme.surfaceAlt, borderColor: theme.border }]}>
                <Text style={[styles.historyFormTitle, { color: theme.text }]}>
                  {historyFormMode.type === 'add' ? 'New Entry' : 'Edit Entry'}
                </Text>
                <Text style={[styles.historyFormLabel, { color: theme.textMuted }]}>Monthly Rate (PHP)</Text>
                <TextInput
                  style={[styles.historyFormInput, { backgroundColor: theme.surface, borderColor: theme.border, color: theme.text }]}
                  value={historyRate}
                  onChangeText={setHistoryRate}
                  keyboardType="numeric"
                  placeholder="e.g. 5000"
                  placeholderTextColor={theme.textFaint}
                />
                <Text style={[styles.historyFormLabel, { color: theme.textMuted }]}>Effective From (YYYY-MM-DD)</Text>
                <TextInput
                  style={[styles.historyFormInput, { backgroundColor: theme.surface, borderColor: theme.border, color: theme.text }]}
                  value={historyFrom}
                  onChangeText={setHistoryFrom}
                  placeholder="e.g. 2024-01-01"
                  placeholderTextColor={theme.textFaint}
                />
                <Text style={[styles.historyFormLabel, { color: theme.textMuted }]}>Effective To (YYYY-MM-DD, blank = current)</Text>
                <TextInput
                  style={[styles.historyFormInput, { backgroundColor: theme.surface, borderColor: theme.border, color: theme.text }]}
                  value={historyTo}
                  onChangeText={setHistoryTo}
                  placeholder="Leave blank if current"
                  placeholderTextColor={theme.textFaint}
                />
                <View style={styles.historyFormActions}>
                  <TouchableOpacity
                    style={[styles.historyFormCancel, { borderColor: theme.border }]}
                    onPress={cancelHistoryForm}
                  >
                    <Text style={[styles.historyFormCancelText, { color: theme.textMuted }]}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.historyFormSave, { backgroundColor: theme.accent }]}
                    onPress={saveHistoryForm}
                  >
                    <Text style={[styles.historyFormSaveText, { color: theme.accentText }]}>Save</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Entry list */}
            {payHistory.length > 0 && (
              <View style={[styles.historyCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                {[...payHistory].reverse().map((entry, idx) => {
                  const isCurrent = entry.effective_to === null;
                  const isEditing = historyFormMode?.type === 'edit' && historyFormMode.id === entry.id;
                  const now = new Date();
                  const perPeriod = getBaseAmount(entry.monthly_rate, currentSchedule, now.getMonth(), now.getFullYear());
                  const perPeriodLabel =
                    currentSchedule === 'weekly'
                      ? `PHP ${perPeriod.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} / wk`
                      : currentSchedule === 'biweekly'
                      ? `PHP ${perPeriod.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} / bi-wk`
                      : null;
                  const fmtDate = (iso: string) => {
                    const d = new Date(iso + 'T00:00:00');
                    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                  };
                  return (
                    <View
                      key={entry.id}
                      style={[
                        styles.historyRow,
                        idx < payHistory.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.border },
                        isEditing && { opacity: 0.4 },
                      ]}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.historyRate, { color: theme.text }]}>
                          PHP {entry.monthly_rate.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          <Text style={[styles.historyRateSuffix, { color: theme.textMuted }]}> / mo</Text>
                        </Text>
                        {perPeriodLabel && (
                          <Text style={[styles.historyPerPeriod, { color: theme.textMuted }]}>{perPeriodLabel}</Text>
                        )}
                        <Text style={[styles.historyDates, { color: theme.textMuted }]}>
                          {fmtDate(entry.effective_from)} – {isCurrent ? 'Present' : fmtDate(entry.effective_to!)}
                        </Text>
                      </View>
                      <View style={styles.historyActions}>
                        {isCurrent ? (
                          <View style={[styles.currentBadge, { backgroundColor: theme.surfaceAlt, borderColor: theme.border }]}>
                            <Text style={[styles.currentBadgeText, { color: theme.accent }]}>Current</Text>
                          </View>
                        ) : (
                          <TouchableOpacity
                            style={[styles.historyActionBtn, { borderColor: theme.accent }]}
                            onPress={() => handleMakeCurrent(entry)}
                            activeOpacity={0.7}
                          >
                            <Text style={[styles.historyActionBtnText, { color: theme.accent }]}>Make Current</Text>
                          </TouchableOpacity>
                        )}
                        <TouchableOpacity
                          style={[styles.historyActionBtn, { borderColor: theme.border }]}
                          onPress={() => openEditHistory(entry)}
                          activeOpacity={0.7}
                        >
                          <Text style={[styles.historyActionBtnText, { color: theme.text }]}>Edit</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.historyActionBtn, { borderColor: theme.deduction }]}
                          onPress={() => handleDeleteHistory(entry)}
                          activeOpacity={0.7}
                        >
                          <Text style={[styles.historyActionBtnText, { color: theme.deduction }]}>Delete</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        )}

        {/* Save */}
        <TouchableOpacity
          style={[styles.primaryButton, { backgroundColor: theme.accent }]}
          onPress={handleSave}
          disabled={saving}
          activeOpacity={0.8}
        >
          <Text style={[styles.primaryButtonText, { color: theme.accentText }]}>
            {saving ? 'Saving...' : mode === 'add' ? 'Create Resource' : 'Save Changes'}
          </Text>
        </TouchableOpacity>

        {/* Edit-mode actions */}
        {mode === 'edit' && employeeId && isActive && (
          <View style={styles.editActions}>
            <TouchableOpacity
              style={[styles.archiveButton, { borderColor: theme.deduction }]}
              onPress={handleArchive}
              activeOpacity={0.7}
            >
              <Text style={[styles.archiveButtonText, { color: theme.deduction }]}>Archive Resource</Text>
            </TouchableOpacity>
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
  scrollContent: { padding: 20, paddingBottom: 40 },
  fieldGroup: { marginBottom: 20 },
  label: { fontSize: 14, fontWeight: '500', marginBottom: 8 },
  input: { height: 48, borderRadius: 8, borderWidth: 1, paddingHorizontal: 14, fontSize: 16 },
  suggestionsBox: {
    borderWidth: 1, borderTopWidth: 0,
    borderBottomLeftRadius: 8, borderBottomRightRadius: 8,
    overflow: 'hidden', marginTop: -1,
  },
  suggestionRow: { paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  suggestionText: { fontSize: 15 },
  segmentedRow: { flexDirection: 'row', gap: 8 },
  segmentButton: { flex: 1, height: 44, borderRadius: 8, borderWidth: 1, justifyContent: 'center', alignItems: 'center' },
  segmentText: { fontSize: 14, fontWeight: '600' },
  primaryButton: { height: 50, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginTop: 10 },
  primaryButtonText: { fontSize: 16, fontWeight: '700' },
  editActions: { marginTop: 24, gap: 12 },
  archiveButton: { height: 50, borderRadius: 10, borderWidth: 1, justifyContent: 'center', alignItems: 'center' },
  archiveButtonText: { fontSize: 15, fontWeight: '600' },
  historyCard: {
    borderRadius: 10,
    borderWidth: 1,
    overflow: 'hidden',
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  historyAddBtn: {
    fontSize: 14,
    fontWeight: '600',
  },
  historyFormCard: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 14,
    marginBottom: 10,
    gap: 6,
  },
  historyFormTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },
  historyFormLabel: {
    fontSize: 12,
    marginTop: 4,
  },
  historyFormInput: {
    height: 44,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 15,
  },
  historyFormActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  historyFormCancel: {
    flex: 1,
    height: 40,
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  historyFormCancelText: {
    fontSize: 14,
    fontWeight: '600',
  },
  historyFormSave: {
    flex: 1,
    height: 40,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  historyFormSaveText: {
    fontSize: 14,
    fontWeight: '700',
  },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  historyActions: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
    flexShrink: 0,
  },
  historyActionBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  historyActionBtnText: {
    fontSize: 11,
    fontWeight: '600',
  },
  historyRate: {
    fontSize: 15,
    fontWeight: '600',
  },
  historyRateSuffix: {
    fontSize: 13,
    fontWeight: '400',
  },
  historyPerPeriod: {
    fontSize: 12,
    marginTop: 1,
  },
  historyDates: {
    fontSize: 12,
    marginTop: 2,
  },
  currentBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  currentBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
});
