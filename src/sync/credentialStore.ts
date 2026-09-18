import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

export interface S3Config {
  region: string;
  bucket: string;
  key: string;
  accessKeyId: string;
  secretAccessKey: string;
}

const CREDENTIALS_KEY = 's3_credentials';

// Tiny platform-aware storage helper — used for both credentials and timestamps
export const secureStorage = {
  async getItem(key: string): Promise<string | null> {
    if (Platform.OS === 'web') {
      return localStorage.getItem(key);
    }
    return SecureStore.getItemAsync(key);
  },

  async setItem(key: string, value: string): Promise<void> {
    if (Platform.OS === 'web') {
      localStorage.setItem(key, value);
      return;
    }
    await SecureStore.setItemAsync(key, value);
  },
};

export async function saveCredentials(config: S3Config): Promise<void> {
  await secureStorage.setItem(CREDENTIALS_KEY, JSON.stringify(config));
}

export async function loadCredentials(): Promise<S3Config | null> {
  const raw = await secureStorage.getItem(CREDENTIALS_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as S3Config;
  } catch {
    return null;
  }
}
