import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTheme } from '../theme/ThemeContext';
import { PayrollEmployeeListScreen } from '../screens/payroll/PayrollEmployeeListScreen';
import { PayrollRunListScreen } from '../screens/payroll/PayrollRunListScreen';
import { PayrollRunFormScreen } from '../screens/payroll/PayrollRunFormScreen';
import { PayslipDetailScreen } from '../screens/payslips/PayslipDetailScreen';
export type PayrollStackParamList = {
  PayrollEmployeeList: undefined;
  PayrollRunList: { employeeId: string; employeeName: string };
  PayrollRunForm: { employeeId?: string; runId?: string; mode?: 'new' };
  PayslipDetail: { payslipId: string; employeeId?: string; employeeName?: string };
};

const Stack = createNativeStackNavigator<PayrollStackParamList>();

export function PayrollStack() {
  const { theme } = useTheme();

  return (
    <Stack.Navigator
      screenOptions={{
        contentStyle: { backgroundColor: theme.bg },
        headerShown: false,
      }}
    >
      <Stack.Screen name="PayrollEmployeeList" component={PayrollEmployeeListScreen} />
      <Stack.Screen name="PayrollRunList" component={PayrollRunListScreen} />
      <Stack.Screen name="PayrollRunForm" component={PayrollRunFormScreen} />
      <Stack.Screen name="PayslipDetail" component={PayslipDetailScreen} />
    </Stack.Navigator>
  );
}
