import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTheme } from '../theme/ThemeContext';
import { EmployeeListScreen } from '../screens/employees/EmployeeListScreen';
import { EmployeeFormScreen } from '../screens/employees/EmployeeFormScreen';
import { BackButton } from './BackButton';

export type EmployeesStackParamList = {
  EmployeeList: undefined;
  EmployeeForm: { mode: 'add' | 'edit'; employeeId?: string };
};

const Stack = createNativeStackNavigator<EmployeesStackParamList>();

export function EmployeesStack() {
  const { theme } = useTheme();

  return (
    <Stack.Navigator
      screenOptions={{
        contentStyle: { backgroundColor: theme.bg },
        headerShown: false,
      }}
    >
      <Stack.Screen name="EmployeeList" component={EmployeeListScreen} />
      <Stack.Screen name="EmployeeForm" component={EmployeeFormScreen} />
    </Stack.Navigator>
  );
}
