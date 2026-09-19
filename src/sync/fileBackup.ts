import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { dumpToSnapshot, restoreFromSnapshot, Snapshot } from './serialise';

const BACKUP_FILENAME = 'payroll-backup-latest.json';
const BACKUP_FOLDER = 'payroll-files';
const MAX_BACKUPS = 5;

// ─── folder path helper ────────────────────────────────────────────────────

function backupFolderUri(): string {
  return `${FileSystem.documentDirectory}${BACKUP_FOLDER}/`;
}

async function ensureBackupFolder(): Promise<void> {
  const info = await FileSystem.getInfoAsync(backupFolderUri());
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(backupFolderUri(), { intermediates: true });
  }
}

// ─── device backup (new API) ───────────────────────────────────────────────

export interface DeviceBackupEntry {
  filename: string;
  uri: string;
  createdAt: string; // ISO string parsed from filename
}

/**
 * Lists all backups in the payroll-files folder, newest first.
 */
export async function listDeviceBackups(): Promise<DeviceBackupEntry[]> {
  if (Platform.OS === 'web') return [];

  await ensureBackupFolder();
  const files = await FileSystem.readDirectoryAsync(backupFolderUri());

  const entries: DeviceBackupEntry[] = files
    .filter((f) => f.startsWith('payroll-backup-') && f.endsWith('.json'))
    .map((filename) => {
      // filename format: payroll-backup-2026-09-19T16-29-24.json
      // Strip prefix/suffix, then restore colons in the time portion (HH-MM-SS → HH:MM:SS)
      const datePart = filename.replace('payroll-backup-', '').replace('.json', '');
      // datePart: 2026-09-19T16-29-24  — replace only the time dashes (after T)
      const iso = datePart.replace(/T(\d{2})-(\d{2})-(\d{2})/, 'T$1:$2:$3');
      const d = new Date(iso);
      const createdAt = isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
      return { filename, uri: `${backupFolderUri()}${filename}`, createdAt };
    });

  // Sort newest first
  entries.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return entries;
}

/**
 * Creates a timestamped backup in payroll-files/, opens the share sheet,
 * and prunes old backups beyond MAX_BACKUPS.
 */
export async function saveDeviceBackup(): Promise<void> {
  if (Platform.OS === 'web') throw new Error('Not supported on web.');

  await ensureBackupFolder();

  const snapshot = await dumpToSnapshot();
  const body = JSON.stringify(snapshot, null, 2);

  const now = new Date();
  const ts = now.toISOString().replace(/:/g, '-').replace(/\..+/, '');
  const filename = `payroll-backup-${ts}.json`;
  const uri = `${backupFolderUri()}${filename}`;

  await FileSystem.writeAsStringAsync(uri, body, {
    encoding: FileSystem.EncodingType.UTF8,
  });

  // Prune to MAX_BACKUPS
  const all = await listDeviceBackups();
  const toDelete = all.slice(MAX_BACKUPS);
  for (const entry of toDelete) {
    await FileSystem.deleteAsync(entry.uri, { idempotent: true });
  }

}

/**
 * Restores the database from a specific backup file URI.
 */
export async function restoreDeviceBackup(uri: string): Promise<void> {
  const text = await FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.UTF8,
  });

  // Parse and validate before touching the DB
  let snapshot: Snapshot;
  try {
    snapshot = JSON.parse(text);
  } catch {
    throw new Error('Backup file is not valid JSON. Restore aborted — your data is unchanged.');
  }
  if (!snapshot?.tables) {
    throw new Error('Backup file has no tables. Restore aborted — your data is unchanged.');
  }

  await restoreFromSnapshot(snapshot);
}

/**
 * Opens a document picker so the user can select a previously saved backup
 * from Files/iCloud/anywhere, then restores it into SQLite.
 */
export async function restoreFromPicker(): Promise<boolean> {
  const result = await DocumentPicker.getDocumentAsync({
    type: 'application/json',
    copyToCacheDirectory: true,
  });

  if (result.canceled) return false;

  const asset = result.assets[0];
  if (!asset?.uri) throw new Error('No file selected.');

  const text = await FileSystem.readAsStringAsync(asset.uri, {
    encoding: FileSystem.EncodingType.UTF8,
  });

  let snapshot: Snapshot;
  try {
    snapshot = JSON.parse(text);
  } catch {
    throw new Error('Selected file is not valid JSON. Restore aborted.');
  }
  if (!snapshot?.tables) {
    throw new Error('Selected file is not a valid backup. Restore aborted.');
  }

  await restoreFromSnapshot(snapshot);
  return true;
}

// ─── legacy helpers (used by S3 sync) ─────────────────────────────────────

export async function saveLocalBackupFile(jsonString: string, filename = BACKUP_FILENAME): Promise<string | null> {
  if (Platform.OS === 'web') {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(`local_file_${filename}`, jsonString);
    }
    return `localStorage://local_file_${filename}`;
  }

  const docDir = FileSystem.documentDirectory;
  if (!docDir) return null;

  const fileUri = `${docDir}${filename}`;
  await FileSystem.writeAsStringAsync(fileUri, jsonString, {
    encoding: FileSystem.EncodingType.UTF8,
  });
  return fileUri;
}

export async function readLocalBackupFile(filename = BACKUP_FILENAME): Promise<string | null> {
  if (Platform.OS === 'web') {
    if (typeof localStorage !== 'undefined') {
      return localStorage.getItem(`local_file_${filename}`);
    }
    return null;
  }

  const docDir = FileSystem.documentDirectory;
  if (!docDir) return null;

  const fileUri = `${docDir}${filename}`;
  const info = await FileSystem.getInfoAsync(fileUri);
  if (!info.exists) return null;

  return await FileSystem.readAsStringAsync(fileUri, {
    encoding: FileSystem.EncodingType.UTF8,
  });
}

export async function exportToFiles(): Promise<void> {
  const snapshot = await dumpToSnapshot();
  const body = JSON.stringify(snapshot, null, 2);
  const filename = `payroll-backup-${Date.now()}.json`;

  const fileUri = await saveLocalBackupFile(body, filename);
  await saveLocalBackupFile(body, BACKUP_FILENAME);

  if (!fileUri) throw new Error('Could not write backup file.');

  const canShare = await Sharing.isAvailableAsync();
  if (!canShare) throw new Error('Sharing is not available on this device.');

  await Sharing.shareAsync(fileUri, {
    mimeType: 'application/json',
    dialogTitle: 'Save payroll backup',
    UTI: 'public.json',
  });
}

export async function importFromFiles(): Promise<boolean> {
  const result = await DocumentPicker.getDocumentAsync({
    type: 'application/json',
    copyToCacheDirectory: true,
  });

  if (result.canceled) return false;

  const asset = result.assets[0];
  if (!asset?.uri) throw new Error('No file selected.');

  const text = await FileSystem.readAsStringAsync(asset.uri, {
    encoding: FileSystem.EncodingType.UTF8,
  });

  await saveLocalBackupFile(text, `payroll-import-${Date.now()}.json`);
  await saveLocalBackupFile(text, BACKUP_FILENAME);

  const snapshot: Snapshot = JSON.parse(text);
  await restoreFromSnapshot(snapshot);
  return true;
}
