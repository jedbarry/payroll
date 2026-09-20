import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Switch,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../theme/ThemeContext';
import {
  listDeviceBackups,
  saveDeviceBackup,
  restoreFromPicker,
  type DeviceBackupEntry,
} from '../../sync/fileBackup';

export function SyncScreen({ navigation }: any) {
  const { theme, isDark, toggleTheme } = useTheme();

  const [backups, setBackups] = useState<DeviceBackupEntry[]>([]);
  const [backingUp, setBackingUp] = useState(false);
  const [restoringFromFile, setRestoringFromFile] = useState(false);

  const loadBackups = useCallback(async () => {
    try {
      const list = await listDeviceBackups();
      setBackups(list);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    loadBackups();
  }, [loadBackups]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', loadBackups);
    return unsubscribe;
  }, [navigation, loadBackups]);

  const handleBackupNow = useCallback(async () => {
    setBackingUp(true);
    try {
      await saveDeviceBackup();
      await loadBackups();
    } catch (err: any) {
      const msg: string = err?.message ?? String(err);
      // Permission denied or user cancelled the Files access dialog
      if (msg.includes('permission') || msg.includes('denied') || msg.includes('cancelled') || msg.includes('canceled')) {
        Alert.alert(
          'Permission Required',
          'Payroll needs access to Files to save backups. You can grant access in Settings → Payroll → Files.',
        );
      } else {
        Alert.alert('Backup failed', msg);
      }
    } finally {
      setBackingUp(false);
    }
  }, [loadBackups]);

  const handleRestoreFromFile = useCallback(() => {
    Alert.alert(
      'Restore from File',
      'Pick a backup file. This will overwrite ALL current data.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Pick File',
          onPress: async () => {
            setRestoringFromFile(true);
            try {
              const restored = await restoreFromPicker();
              if (restored) Alert.alert('Restored', 'Your data has been restored successfully.');
            } catch (err: any) {
              Alert.alert('Restore failed', err?.message ?? String(err));
            } finally {
              setRestoringFromFile(false);
            }
          },
        },
      ],
    );
  }, []);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.text }]}>Settings</Text>
        </View>

        {/* Appearance */}
        <View style={[styles.sectionCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.sectionTitle, { color: theme.textMuted }]}>Appearance</Text>
          <View style={styles.toggleRow}>
            <View>
              <Text style={[styles.toggleLabel, { color: theme.text }]}>
                {isDark ? 'Dark Mode' : 'Light Mode'}
              </Text>
              <Text style={[styles.toggleSublabel, { color: theme.textMuted }]}>
                {isDark ? 'Switch to light theme' : 'Switch to dark theme'}
              </Text>
            </View>
            <Switch
              value={isDark}
              onValueChange={toggleTheme}
              trackColor={{ true: theme.accent, false: theme.border }}
              thumbColor={theme.accentText}
            />
          </View>
        </View>

        {/* Device Backup */}
        <View style={[styles.sectionCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.sectionTitle, { color: theme.textMuted }]}>Device Backup</Text>
          <Text style={[styles.sectionNote, { color: theme.textMuted }]}>
            Saves a backup to this device and opens the share sheet so you can also save it to Files or iCloud. Last 5 backups are kept.
          </Text>

          <TouchableOpacity
            style={[styles.button, { backgroundColor: theme.accent }]}
            onPress={handleBackupNow}
            disabled={backingUp}
            activeOpacity={0.8}
          >
            {backingUp ? (
              <ActivityIndicator color={theme.accentText} />
            ) : (
              <Text style={[styles.buttonText, { color: theme.accentText }]}>Backup Now</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.outlineButton, { borderColor: theme.border }]}
            onPress={handleRestoreFromFile}
            disabled={backingUp || restoringFromFile}
            activeOpacity={0.8}
          >
            {restoringFromFile ? (
              <ActivityIndicator color={theme.text} />
            ) : (
              <Text style={[styles.outlineButtonText, { color: theme.text }]}>Restore from File…</Text>
            )}
          </TouchableOpacity>

          {/* Backup list */}
          {backups.length === 0 ? (
            <Text style={[styles.emptyText, { color: theme.textFaint }]}>No backups yet.</Text>
          ) : (
            backups.map((entry) => (
              <TouchableOpacity
                key={entry.uri}
                style={[styles.backupRow, { borderTopColor: theme.border }]}
                onPress={() => navigation.navigate('BackupDetail', { entry })}
                activeOpacity={0.7}
              >
                <View style={styles.backupInfo}>
                  <Text style={[styles.backupDate, { color: theme.text }]}>
                    {formatBackupDate(entry.createdAt)}
                  </Text>
                  <Text style={[styles.backupFilename, { color: theme.textMuted }]}>
                    {entry.filename}
                  </Text>
                </View>
                <Text style={[styles.chevron, { color: theme.textMuted }]}>›</Text>
              </TouchableOpacity>
            ))
          )}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

function formatBackupDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 40 },
  header: { paddingHorizontal: 4, paddingTop: 12, paddingBottom: 16 },
  title: { fontSize: 28, fontWeight: '700' },
  sectionCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  sectionNote: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 16,
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  toggleLabel: { fontSize: 16, fontWeight: '600' },
  toggleSublabel: { fontSize: 13, marginTop: 2 },
  button: {
    height: 48,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  buttonText: { fontSize: 16, fontWeight: '600' },
  outlineButton: {
    height: 48,
    borderRadius: 10,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  outlineButtonText: { fontSize: 15, fontWeight: '600' },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: 12,
    fontStyle: 'italic',
  },
  backupRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderTopWidth: 1,
  },
  backupInfo: { flex: 1, marginRight: 12 },
  backupDate: { fontSize: 14, fontWeight: '600' },
  backupFilename: { fontSize: 11, marginTop: 2 },
  chevron: { fontSize: 22, fontWeight: '300' },
});
