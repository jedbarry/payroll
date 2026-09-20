import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTheme } from '../theme/ThemeContext';
import { SyncScreen } from '../screens/sync/SyncScreen';
import { BackupDetailScreen } from '../screens/sync/BackupDetailScreen';
import { DeviceBackupEntry } from '../sync/fileBackup';

export type SettingsStackParamList = {
  SettingsList: undefined;
  BackupDetail: { entry: DeviceBackupEntry };
};

const Stack = createNativeStackNavigator<SettingsStackParamList>();

export function SettingsStack() {
  const { theme } = useTheme();

  return (
    <Stack.Navigator
      screenOptions={{
        contentStyle: { backgroundColor: theme.bg },
        headerShown: false,
      }}
    >
      <Stack.Screen name="SettingsList" component={SyncScreen} />
      <Stack.Screen name="BackupDetail" component={BackupDetailScreen} />
    </Stack.Navigator>
  );
}
