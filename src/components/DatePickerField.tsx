import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Modal,
} from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useTheme } from '../theme/ThemeContext';

interface Props {
  label: string;
  hint?: string;
  value: string; // ISO date string YYYY-MM-DD, or empty
  onChange: (date: string | null) => void;
  placeholder?: string;
  clearable?: boolean;
}

function parseDate(value: string): Date {
  if (value) {
    const d = new Date(value + 'T00:00:00');
    if (!isNaN(d.getTime())) return d;
  }
  return new Date();
}

function formatDisplay(value: string): string {
  if (!value) return '';
  const d = new Date(value + 'T00:00:00');
  if (isNaN(d.getTime())) return value;
  return d.toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' });
}

function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function DatePickerField({ label, hint, value, onChange, placeholder = 'Not set', clearable = true }: Props) {
  const { theme } = useTheme();
  const [show, setShow] = useState(false);

  const [pendingDate, setPendingDate] = useState<Date | null>(null);

  const handleValueChange = (_event: DateTimePickerEvent, date?: Date) => {
    if (Platform.OS === 'android') {
      setShow(false);
      if (date) onChange(toISODate(date));
    } else {
      if (date) setPendingDate(date);
    }
  };

  const handleConfirmIOS = () => {
    if (pendingDate) onChange(toISODate(pendingDate));
    setPendingDate(null);
    setShow(false);
  };

  const handleDismiss = () => {
    setPendingDate(null);
    setShow(false);
  };

  return (
    <View style={styles.fieldGroup}>
      <View style={styles.labelRow}>
        <Text style={[styles.label, { color: theme.textMuted }]}>{label}</Text>
        {hint && <Text style={[styles.hint, { color: theme.textFaint }]}>{hint}</Text>}
      </View>

      <View style={styles.row}>
        <TouchableOpacity
          style={[
            styles.field,
            { backgroundColor: theme.surface, borderColor: theme.border },
          ]}
          onPress={() => setShow(true)}
          activeOpacity={0.7}
        >
          <Text style={[styles.fieldText, { color: value ? theme.text : theme.textFaint }]}>
            {value ? formatDisplay(value) : placeholder}
          </Text>
          <Text style={[styles.calIcon, { color: theme.accent }]}>📅</Text>
        </TouchableOpacity>

        {clearable && value ? (
          <TouchableOpacity
            style={[styles.clearBtn, { borderColor: theme.border }]}
            onPress={() => onChange(null)}
            activeOpacity={0.7}
          >
            <Text style={[styles.clearText, { color: theme.textMuted }]}>✕</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Android: inline picker, shown conditionally */}
      {show && Platform.OS === 'android' && (
        <DateTimePicker
          value={parseDate(value)}
          mode="date"
          display="default"
          onValueChange={handleValueChange}
          onDismiss={handleDismiss}
        />
      )}

      {/* iOS: modal with Done button */}
      {Platform.OS === 'ios' && (
        <Modal visible={show} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={[styles.modalSheet, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
                <Text style={[styles.modalTitle, { color: theme.text }]}>{label}</Text>
                <TouchableOpacity onPress={handleConfirmIOS}>
                  <Text style={[styles.doneText, { color: theme.accent }]}>Done</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={pendingDate ?? parseDate(value)}
                mode="date"
                display="spinner"
                onValueChange={handleValueChange}
                onDismiss={handleDismiss}
                style={styles.iosPicker}
                textColor={theme.text}
              />
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  fieldGroup: {
    marginBottom: 20,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
    marginBottom: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
  },
  hint: {
    fontSize: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  field: {
    flex: 1,
    height: 48,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  fieldText: {
    fontSize: 16,
    flex: 1,
  },
  calIcon: {
    fontSize: 16,
  },
  clearBtn: {
    width: 40,
    height: 48,
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  clearText: {
    fontSize: 14,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  modalSheet: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderWidth: 1,
    paddingBottom: 32,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  doneText: {
    fontSize: 16,
    fontWeight: '700',
  },
  iosPicker: {
    height: 220,
  },
});
