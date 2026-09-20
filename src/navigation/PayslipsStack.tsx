import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTheme } from '../theme/ThemeContext';
import { PayslipListScreen } from '../screens/payslips/PayslipListScreen';
import { PayslipDetailScreen } from '../screens/payslips/PayslipDetailScreen';

export type PayslipsStackParamList = {
  PayslipList: undefined;
  PayslipDetail: { payslipId: string };
};

const Stack = createNativeStackNavigator<PayslipsStackParamList>();

export function PayslipsStack() {
  const { theme } = useTheme();

  return (
    <Stack.Navigator
      screenOptions={{
        contentStyle: { backgroundColor: theme.bg },
        headerShown: false,
      }}
    >
      <Stack.Screen name="PayslipList" component={PayslipListScreen} />
      <Stack.Screen name="PayslipDetail" component={PayslipDetailScreen} />
    </Stack.Navigator>
  );
}
