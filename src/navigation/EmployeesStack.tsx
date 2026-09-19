import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTheme } from '../theme/ThemeContext';
import { EmployeeListScreen } from '../screens/employees/EmployeeListScreen';
import { EmployeeFormScreen } from '../screens/employees/EmployeeFormScreen';

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
        name="EmployeeList"
        component={EmployeeListScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="EmployeeForm"
        component={EmployeeFormScreen}
        options={{ title: 'Employee' }}
      />
    </Stack.Navigator>
  );
}
