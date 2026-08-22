import { FirebaseConfig, R2Config } from '@serverless-tour/common';

const CONFIG_STORAGE_KEY_FIREBASE = 'serverless_tour_firebase_config';
const CONFIG_STORAGE_KEY_R2 = 'serverless_tour_r2_config';

export function getFirebaseConfig(): FirebaseConfig {
  const stored = localStorage.getItem(CONFIG_STORAGE_KEY_FIREBASE);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      // Fallback to env
    }
  }

  return {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
    appId: import.meta.env.VITE_FIREBASE_APP_ID || ''
  };
}

export function saveFirebaseConfig(config: FirebaseConfig): void {
  localStorage.setItem(CONFIG_STORAGE_KEY_FIREBASE, JSON.stringify(config));
}

export function getR2Config(): R2Config {
  const stored = localStorage.getItem(CONFIG_STORAGE_KEY_R2);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      // Fallback to env
    }
  }

  return {
    accountId: import.meta.env.VITE_R2_ACCOUNT_ID || '',
    accessKeyId: import.meta.env.VITE_R2_ACCESS_KEY_ID || '',
    secretAccessKey: import.meta.env.VITE_R2_SECRET_ACCESS_KEY || '',
    bucketName: import.meta.env.VITE_R2_BUCKET_NAME || 'interactive-demos',
    publicUrl: import.meta.env.VITE_R2_PUBLIC_URL || 'https://pub-tour.r2.dev'
  };
}

export function saveR2Config(config: R2Config): void {
  localStorage.setItem(CONFIG_STORAGE_KEY_R2, JSON.stringify(config));
}

export function isFirebaseConfigured(): boolean {
  if (import.meta.env.VITE_ENABLE_OFFLINE_MOCK === 'true') {
    return false;
  }
  const cfg = getFirebaseConfig();
  return Boolean(cfg.apiKey && cfg.projectId && cfg.appId);
}

export function isR2Configured(): boolean {
  if (import.meta.env.VITE_ENABLE_OFFLINE_MOCK === 'true') {
    return false;
  }
  const cfg = getR2Config();
  return Boolean(cfg.accountId && cfg.accessKeyId && cfg.secretAccessKey);
}
