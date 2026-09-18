import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Switch,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../theme/ThemeContext';
import {
  loadCredentials,
  saveCredentials,
  secureStorage,
  type S3Config,
} from '../../sync/credentialStore';
import { exportToS3, importFromS3 } from '../../sync/s3Sync';

const LAST_EXPORT_KEY = 'last_export_at';

export function SyncScreen() {
  const { theme, isDark, toggleTheme } = useTheme();

  const [region, setRegion] = useState('');
  const [bucket, setBucket] = useState('');
  const [s3Key, setS3Key] = useState('');
  const [accessKeyId, setAccessKeyId] = useState('');
  const [secretAccessKey, setSecretAccessKey] = useState('');

  const [lastExportAt, setLastExportAt] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);

  // Load saved credentials + last export timestamp on mount
  useEffect(() => {
    loadCredentials().then((config) => {
      if (config) {
        setRegion(config.region);
        setBucket(config.bucket);
        setS3Key(config.key);
        setAccessKeyId(config.accessKeyId);
        setSecretAccessKey(config.secretAccessKey);
      }
    });
    secureStorage.getItem(LAST_EXPORT_KEY).then(setLastExportAt);
  }, []);

  const currentConfig = useCallback(
    (): S3Config => ({
      region,
      bucket,
      key: s3Key,
      accessKeyId,
      secretAccessKey,
    }),
    [region, bucket, s3Key, accessKeyId, secretAccessKey],
  );

  const handleBlurSave = useCallback(() => {
    saveCredentials(currentConfig());
  }, [currentConfig]);

  const handleExport = useCallback(async () => {
    setExporting(true);
    try {
      await exportToS3(currentConfig());
      const ts = new Date().toISOString();
      await secureStorage.setItem(LAST_EXPORT_KEY, ts);
      setLastExportAt(ts);
      Alert.alert('Export complete', 'Your data has been uploaded to S3.');
    } catch (err: any) {
      Alert.alert('Export failed', err?.message ?? String(err));
    } finally {
      setExporting(false);
    }
  }, [currentConfig]);

  const handleImport = useCallback(() => {
    Alert.alert(
      'Restore from S3',
      'This will overwrite ALL local data. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Import',
          style: 'destructive',
          onPress: async () => {
            setImporting(true);
            try {
              await importFromS3(currentConfig());
              Alert.alert(
                'Import complete',
                'Your data has been restored.',
              );
            } catch (err: any) {
              Alert.alert('Import failed', err?.message ?? String(err));
            } finally {
              setImporting(false);
            }
          },
        },
      ],
    );
  }, [currentConfig]);

  const formattedLastExport = lastExportAt
    ? new Date(lastExportAt).toLocaleString()
    : 'Never';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.text }]}>S3 Sync</Text>
        </View>

        {/* Appearance / Theme Toggle Section */}
        <View
          style={[
            styles.sectionCard,
            { backgroundColor: theme.surface, borderColor: theme.border },
          ]}
        >
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

        {/* S3 Configuration Section */}
        <View
          style={[
            styles.sectionCard,
            { backgroundColor: theme.surface, borderColor: theme.border },
          ]}
        >
          <Text style={[styles.sectionTitle, { color: theme.textMuted }]}>S3 Configuration</Text>

          <Text style={[styles.fieldLabel, { color: theme.textMuted }]}>AWS Region</Text>
          <TextInput
            style={[
              styles.input,
              { backgroundColor: theme.bg, borderColor: theme.border, color: theme.text },
            ]}
            value={region}
            onChangeText={setRegion}
            onBlur={handleBlurSave}
            placeholder="us-east-1"
            placeholderTextColor={theme.textFaint}
            autoCapitalize="none"
            autoCorrect={false}
          />

          <Text style={[styles.fieldLabel, { color: theme.textMuted }]}>S3 Bucket</Text>
          <TextInput
            style={[
              styles.input,
              { backgroundColor: theme.bg, borderColor: theme.border, color: theme.text },
            ]}
            value={bucket}
            onChangeText={setBucket}
            onBlur={handleBlurSave}
            placeholder="my-payroll-backups"
            placeholderTextColor={theme.textFaint}
            autoCapitalize="none"
            autoCorrect={false}
          />

          <Text style={[styles.fieldLabel, { color: theme.textMuted }]}>S3 Key (object key)</Text>
          <TextInput
            style={[
              styles.input,
              { backgroundColor: theme.bg, borderColor: theme.border, color: theme.text },
            ]}
            value={s3Key}
            onChangeText={setS3Key}
            onBlur={handleBlurSave}
            placeholder="payroll-backup.json"
            placeholderTextColor={theme.textFaint}
            autoCapitalize="none"
            autoCorrect={false}
          />

          <Text style={[styles.fieldLabel, { color: theme.textMuted }]}>Access Key ID</Text>
          <TextInput
            style={[
              styles.input,
              { backgroundColor: theme.bg, borderColor: theme.border, color: theme.text },
            ]}
            value={accessKeyId}
            onChangeText={setAccessKeyId}
            onBlur={handleBlurSave}
            placeholder="AKIAIOSFODNN7EXAMPLE"
            placeholderTextColor={theme.textFaint}
            autoCapitalize="none"
            autoCorrect={false}
          />

          <Text style={[styles.fieldLabel, { color: theme.textMuted }]}>Secret Access Key</Text>
          <TextInput
            style={[
              styles.input,
              { backgroundColor: theme.bg, borderColor: theme.border, color: theme.text },
            ]}
            value={secretAccessKey}
            onChangeText={setSecretAccessKey}
            onBlur={handleBlurSave}
            placeholder="••••••••••••••••••••••••••••••••••••••••"
            placeholderTextColor={theme.textFaint}
            secureTextEntry={true}
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        {/* Backup & Restore Section */}
        <View
          style={[
            styles.sectionCard,
            { backgroundColor: theme.surface, borderColor: theme.border },
          ]}
        >
          <Text style={[styles.sectionTitle, { color: theme.textMuted }]}>Backup & Restore</Text>

          <Text style={[styles.lastExportLabel, { color: theme.textMuted }]}>
            Last export:{' '}
            <Text style={{ color: theme.text }}>{formattedLastExport}</Text>
          </Text>

          {/* Export button */}
          <TouchableOpacity
            style={[styles.button, styles.primaryButton, { backgroundColor: theme.accent }]}
            onPress={handleExport}
            disabled={exporting || importing}
            activeOpacity={0.8}
          >
            {exporting ? (
              <ActivityIndicator color={theme.accentText} />
            ) : (
              <Text style={[styles.buttonText, { color: theme.accentText }]}>↑ Export to S3</Text>
            )}
          </TouchableOpacity>

          {/* Import button */}
          <TouchableOpacity
            style={[
              styles.button,
              styles.dangerButton,
              { borderColor: theme.deduction },
            ]}
            onPress={handleImport}
            disabled={exporting || importing}
            activeOpacity={0.8}
          >
            {importing ? (
              <ActivityIndicator color={theme.deduction} />
            ) : (
              <Text style={[styles.buttonText, { color: theme.deduction }]}>↓ Import from S3</Text>
            )}
          </TouchableOpacity>

          <Text style={[styles.warningText, { color: theme.textMuted }]}>
            Import overwrites all local data — use only to restore on a new device.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  header: {
    paddingHorizontal: 4,
    paddingTop: 12,
    paddingBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
  },
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
    marginBottom: 12,
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  toggleLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  toggleSublabel: {
    fontSize: 13,
    marginTop: 2,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 4,
    marginTop: 12,
  },
  input: {
    height: 44,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 15,
  },
  lastExportLabel: {
    fontSize: 14,
    marginBottom: 16,
  },
  button: {
    height: 48,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  primaryButton: {
    // background set inline
  },
  dangerButton: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  warningText: {
    fontSize: 13,
    marginTop: 4,
    textAlign: 'center',
  },
});
