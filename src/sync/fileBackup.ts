import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { dumpToSnapshot, restoreFromSnapshot, Snapshot } from './serialise';

const BACKUP_FILENAME = 'payroll-backup-latest.json';

/**
 * Saves JSON snapshot string to a local file in the app's document directory.
 * On native (iOS/Android), uses expo-file-system documentDirectory.
 * On Web, fallback to localStorage.
 */
export async function saveLocalBackupFile(jsonString: string, filename = BACKUP_FILENAME): Promise<string | null> {
  if (Platform.OS === 'web') {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(`local_file_${filename}`, jsonString);
    }
    return `localStorage://local_file_${filename}`;
  }

  const docDir = FileSystem.documentDirectory;
  if (!docDir) {
    return null;
  }

  const fileUri = `${docDir}${filename}`;
  await FileSystem.writeAsStringAsync(fileUri, jsonString, {
    encoding: FileSystem.EncodingType.UTF8,
  });

  return fileUri;
}

/**
 * Reads local backup file contents if available.
 */
export async function readLocalBackupFile(filename = BACKUP_FILENAME): Promise<string | null> {
  if (Platform.OS === 'web') {
    if (typeof localStorage !== 'undefined') {
      return localStorage.getItem(`local_file_${filename}`);
    }
    return null;
  }

  const docDir = FileSystem.documentDirectory;
  if (!docDir) {
    return null;
  }

  const fileUri = `${docDir}${filename}`;
  const info = await FileSystem.getInfoAsync(fileUri);
  if (!info.exists) {
    return null;
  }

  return await FileSystem.readAsStringAsync(fileUri, {
    encoding: FileSystem.EncodingType.UTF8,
  });
}

/**
 * Exports the full DB snapshot to a timestamped JSON file in the document
 * directory, then opens the iOS/Android share sheet so the user can save it
 * to the Files app, AirDrop it, etc.
 */
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

/**
 * Opens a document picker so the user can select a previously exported
 * snapshot JSON from the Files app, saves it locally, then restores into SQLite.
 */
/** Returns true if a file was picked and restored, false if the user cancelled. */
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

  // Save a local copy before restoring
  await saveLocalBackupFile(text, `payroll-import-${Date.now()}.json`);
  await saveLocalBackupFile(text, BACKUP_FILENAME);

  const snapshot: Snapshot = JSON.parse(text);
  await restoreFromSnapshot(snapshot);
  return true;
}
