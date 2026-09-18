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
        headerStyle: {
          backgroundColor: theme.navBar,
        },
        headerTintColor: theme.accent,
        headerTitleStyle: {
          color: theme.text,
          fontWeight: '600',
        },
        contentStyle: {
          backgroundColor: theme.bg,
        },
      }}
    >
      <Stack.Screen
        name="PayslipList"
        component={PayslipListScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="PayslipDetail"
        component={PayslipDetailScreen}
        options={{ title: 'Payslip' }}
      />
    </Stack.Navigator>
  );
}
