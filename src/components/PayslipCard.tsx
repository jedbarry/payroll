import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { PayslipView } from '../domain/types';

interface PayslipCardProps {
  payslip: PayslipView;
  onPress: () => void;
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

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

function formatCurrency(amount: number): string {
  return `PHP ${amount.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function PayslipCard({ payslip, onPress }: PayslipCardProps) {
  const { theme } = useTheme();
  const initials = getInitials(payslip.employee?.name || 'EM');
  const scheduleLabel = formatSchedule(payslip.employee?.pay_schedule || 'monthly');

  return (
    <TouchableOpacity
      style={[
        styles.card,
        {
          backgroundColor: theme.surface,
          borderColor: theme.border,
        },
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.leftRow}>
        <View style={[styles.avatar, { backgroundColor: theme.surfaceAlt, borderColor: theme.border }]}>
          <Text style={[styles.avatarText, { color: theme.accent }]}>{initials}</Text>
        </View>
        <View style={styles.info}>
          <Text style={[styles.name, { color: theme.text }]}>{payslip.employee?.name}</Text>
          <Text style={[styles.period, { color: theme.textMuted }]}>
            {payslip.run?.period_start} – {payslip.run?.period_end}
          </Text>
        </View>
      </View>

      <View style={styles.rightRow}>
        <Text style={[styles.amount, { color: theme.text }]}>
          {formatCurrency(payslip.run?.gross_pay ?? 0)}
        </Text>
        <Text style={[styles.scheduleLabel, { color: theme.textMuted }]}>{scheduleLabel}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  leftRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 14,
    fontWeight: '700',
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: 15,
    fontWeight: '600',
  },
  period: {
    fontSize: 12,
    marginTop: 2,
  },
  rightRow: {
    alignItems: 'flex-end',
  },
  amount: {
    fontSize: 16,
    fontWeight: '700',
  },
  scheduleLabel: {
    fontSize: 12,
    marginTop: 2,
  },
});
