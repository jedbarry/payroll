import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { useTheme } from '../../theme/ThemeContext';
import { restoreDeviceBackup } from '../../sync/fileBackup';

export function BackupDetailScreen({ route, navigation }: any) {
  const { theme } = useTheme();
  const { entry } = route.params;

  const [restoring, setRestoring] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [sharing, setSharing] = useState(false);

  const busy = restoring || deleting || sharing;

  const formattedDate = formatBackupDate(entry.createdAt);
  const fileSize = useFileSize(entry.uri);

  const handleRestore = () => {
    Alert.alert(
      'Restore Backup',
      `Restore from ${formattedDate}? This will overwrite ALL current data.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Restore',
          style: 'destructive',
          onPress: async () => {
            setRestoring(true);
            try {
              await restoreDeviceBackup(entry.uri);
              Alert.alert('Restored', 'Your data has been restored successfully.', [
                { text: 'OK', onPress: () => navigation.goBack() },
              ]);
            } catch (err: any) {
              Alert.alert('Restore failed', err?.message ?? String(err));
            } finally {
              setRestoring(false);
            }
          },
        },
      ],
    );
  };

  const handleSaveToFiles = async () => {
    setSharing(true);
    try {
      const canShare = await Sharing.isAvailableAsync();
      if (!canShare) throw new Error('Sharing is not available on this device.');
      await Sharing.shareAsync(entry.uri, {
        mimeType: 'application/json',
        dialogTitle: 'Save backup to Files',
        UTI: 'public.json',
      });
    } catch (err: any) {
      Alert.alert('Save failed', err?.message ?? String(err));
    } finally {
      setSharing(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Backup',
      `Delete the backup from ${formattedDate}? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setDeleting(true);
            try {
              await FileSystem.deleteAsync(entry.uri, { idempotent: true });
              navigation.goBack();
            } catch (err: any) {
              Alert.alert('Delete failed', err?.message ?? String(err));
              setDeleting(false);
            }
          },
        },
      ],
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <SafeAreaView style={{ backgroundColor: theme.bg }}>
        <View style={[styles.customHeader, { backgroundColor: theme.bg }]}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            activeOpacity={0.6}
          >
            <Ionicons name="chevron-back" size={28} color={theme.text} />
          </TouchableOpacity>
          <Text style={[styles.customHeaderTitle, { color: theme.text }]}>Backup Details</Text>
          <View style={{ width: 28 }} />
        </View>
      </SafeAreaView>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.content}>
      {/* Info card */}
      <View style={[styles.infoCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <Row label="Created" value={formattedDate} theme={theme} />
        <Row label="File" value={entry.filename} theme={theme} />
        {fileSize !== null && (
          <Row label="Size" value={fileSize} theme={theme} />
        )}
      </View>

      {/* Actions */}
      <TouchableOpacity
        style={[styles.primaryButton, { backgroundColor: theme.inclusion }]}
        onPress={handleRestore}
        disabled={busy}
        activeOpacity={0.8}
      >
        {restoring ? (
          <ActivityIndicator color="#ffffff" />
        ) : (
          <Text style={styles.primaryButtonText}>Restore This Backup</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.outlineButton, { borderColor: theme.accent }]}
        onPress={handleSaveToFiles}
        disabled={busy}
        activeOpacity={0.8}
      >
        {sharing ? (
          <ActivityIndicator color={theme.accent} />
        ) : (
          <Text style={[styles.outlineButtonText, { color: theme.accent }]}>Save to Files / iCloud…</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.dangerButton, { borderColor: theme.deduction }]}
        onPress={handleDelete}
        disabled={busy}
        activeOpacity={0.8}
      >
        {deleting ? (
          <ActivityIndicator color={theme.deduction} />
        ) : (
          <Text style={[styles.dangerButtonText, { color: theme.deduction }]}>Delete Backup</Text>
        )}
      </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

function Row({ label, value, theme }: { label: string; value: string; theme: any }) {
  return (
    <View style={styles.row}>
      <Text style={[styles.rowLabel, { color: theme.textMuted }]}>{label}</Text>
      <Text style={[styles.rowValue, { color: theme.text }]}>{value}</Text>
    </View>
  );
}

function useFileSize(uri: string): string | null {
  const [size, setSize] = React.useState<string | null>(null);
  React.useEffect(() => {
    FileSystem.getInfoAsync(uri, { size: true }).then((info) => {
      if (info.exists && 'size' in info && info.size) {
        const kb = info.size / 1024;
        setSize(kb < 1024 ? `${kb.toFixed(1)} KB` : `${(kb / 1024).toFixed(2)} MB`);
      }
    }).catch(() => {});
  }, [uri]);
  return size;
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
  customHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  customHeaderTitle: { fontSize: 17, fontWeight: '600' },
  content: { padding: 16, paddingBottom: 40 },
  infoCard: {
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 24,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: 'transparent',
    gap: 12,
  },
  rowLabel: { fontSize: 14, fontWeight: '500', flexShrink: 0 },
  rowValue: { fontSize: 14, flex: 1, textAlign: 'right' },
  primaryButton: {
    height: 50,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  primaryButtonText: { fontSize: 16, fontWeight: '700', color: '#ffffff' },
  outlineButton: {
    height: 50,
    borderRadius: 10,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  outlineButtonText: { fontSize: 15, fontWeight: '600' },
  dangerButton: {
    height: 50,
    borderRadius: 10,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  dangerButtonText: { fontSize: 15, fontWeight: '600' },
});
