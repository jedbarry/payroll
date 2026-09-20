import React from 'react';
import { TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../theme/ThemeContext';

export function BackButton({ onPress }: { onPress?: () => void }) {
  const navigation = useNavigation();
  const { theme } = useTheme();

  return (
    <TouchableOpacity
      onPress={onPress ?? (() => navigation.goBack())}
      activeOpacity={0.7}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      style={{ marginLeft: 4 }}
    >
      <Ionicons name="chevron-back" size={28} color={theme.text} />
    </TouchableOpacity>
  );
}
