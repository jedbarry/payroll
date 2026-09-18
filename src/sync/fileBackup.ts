import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';

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
