import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { LineItem } from '../domain/types';

interface LineItemRowProps {
  item: LineItem | Omit<LineItem, 'id' | 'payroll_run_id'>;
  onRemove?: () => void;
  showRemove?: boolean;
}

export function LineItemRow({ item, onRemove, showRemove = false }: LineItemRowProps) {
  const { theme } = useTheme();
  const isInclusion = item.type === 'inclusion';
  const isCashAdvance = 'subtype' in item && item.subtype === 'cash_advance';
  const prefix = isInclusion ? '+ ' : '- ';
  const textColor = isInclusion ? theme.inclusion : theme.deduction;

  const typeLabel = isInclusion ? 'Inclusion' : isCashAdvance ? 'Cash Advance' : 'Deduction';

  return (
    <View
      style={[
        styles.row,
        {
          backgroundColor: theme.surface,
          borderColor: theme.border,
        },
      ]}
    >
      <View style={styles.info}>
        <Text style={[styles.label, { color: theme.text }]}>{item.label}</Text>
        <Text style={[styles.typeText, { color: theme.textMuted }]}>
          {typeLabel}
        </Text>
      </View>
      <View style={styles.amountContainer}>
        <Text style={[styles.amount, { color: textColor }]}>
          {prefix}PHP {item.amount.toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}
        </Text>
        {showRemove && onRemove && (
          <TouchableOpacity
            style={[styles.removeButton, { backgroundColor: theme.surfaceAlt }]}
            onPress={onRemove}
            accessibilityLabel={`Remove ${item.label}`}
          >
            <Text style={[styles.removeButtonText, { color: theme.deduction }]}>✕</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 8,
  },
  info: {
    flex: 1,
  },
  label: {
    fontSize: 15,
    fontWeight: '500',
  },
  typeText: {
    fontSize: 12,
    marginTop: 2,
  },
  amountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  amount: {
    fontSize: 15,
    fontWeight: '600',
  },
  removeButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeButtonText: {
    fontSize: 14,
    fontWeight: '700',
  },
});
