import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTheme } from '../theme/ThemeContext';
import { PayrollEmployeeListScreen } from '../screens/payroll/PayrollEmployeeListScreen';
import { PayrollRunListScreen } from '../screens/payroll/PayrollRunListScreen';
import { PayrollRunFormScreen } from '../screens/payroll/PayrollRunFormScreen';

export type PayrollStackParamList = {
  PayrollEmployeeList: undefined;
  PayrollRunList: { employeeId: string; employeeName: string };
  PayrollRunForm: { employeeId?: string; runId?: string; mode?: 'new' };
};

const Stack = createNativeStackNavigator<PayrollStackParamList>();

export function PayrollStack() {
  const { theme } = useTheme();

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: theme.navBar },
        headerTintColor: theme.accent,
        headerTitleStyle: { color: theme.text, fontWeight: '600' },
        contentStyle: { backgroundColor: theme.bg },
      }}
    >
      <Stack.Screen
        name="PayrollEmployeeList"
        component={PayrollEmployeeListScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="PayrollRunList"
        component={PayrollRunListScreen}
        options={({ route }) => ({
          title: route.params?.employeeName
            ? `${route.params.employeeName}'s Payroll`
            : 'Payroll',
        })}
      />
      <Stack.Screen
        name="PayrollRunForm"
        component={PayrollRunFormScreen}
        options={{ title: 'Payroll' }}
      />
    </Stack.Navigator>
  );
}
