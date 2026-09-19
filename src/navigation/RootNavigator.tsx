import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { EmployeesStack } from './EmployeesStack';
import { PayrollStack } from './PayrollStack';
import { PayslipsStack } from './PayslipsStack';
import { SyncScreen } from '../screens/sync/SyncScreen';

export type RootTabParamList = {
  EmployeesTab: undefined;
  PayrollTab: undefined;
  PayslipsTab: undefined;
  SyncTab: undefined;
};

const Tab = createBottomTabNavigator<RootTabParamList>();

export function RootNavigator() {
  const { theme } = useTheme();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: theme.tabBar,
          borderTopColor: theme.border,
        },
        tabBarActiveTintColor: theme.accent,
        tabBarInactiveTintColor: theme.textMuted,
      }}
    >
      <Tab.Screen
        name="EmployeesTab"
        component={EmployeesStack}
        options={{
          tabBarLabel: 'Employees',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="people" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="PayrollTab"
        component={PayrollStack}
        options={{
          tabBarLabel: 'Payroll',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="card" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="PayslipsTab"
        component={PayslipsStack}
        options={{
          tabBarLabel: 'Pay Records',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="document-text" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="SyncTab"
        component={SyncScreen}
        options={{
          tabBarLabel: 'Sync',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="sync" size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}
