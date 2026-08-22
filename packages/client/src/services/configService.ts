import { FirebaseConfig, R2Config, APP_FIREBASE_CONFIG, APP_R2_CONFIG } from '@serverless-tour/common';

const CONFIG_STORAGE_KEY_FIREBASE = 'serverless_tour_firebase_config';
const CONFIG_STORAGE_KEY_R2 = 'serverless_tour_r2_config';

export function getFirebaseConfig(): FirebaseConfig {
  const stored = localStorage.getItem(CONFIG_STORAGE_KEY_FIREBASE);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      // Fallback to static config
    }
  }

  return {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY || APP_FIREBASE_CONFIG.apiKey,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || APP_FIREBASE_CONFIG.authDomain,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || APP_FIREBASE_CONFIG.projectId,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || APP_FIREBASE_CONFIG.storageBucket,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || APP_FIREBASE_CONFIG.messagingSenderId,
    appId: import.meta.env.VITE_FIREBASE_APP_ID || APP_FIREBASE_CONFIG.appId
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
      // Fallback to static config
    }
  }

  return {
    accountId: import.meta.env.VITE_R2_ACCOUNT_ID || '',
    accessKeyId: import.meta.env.VITE_R2_ACCESS_KEY_ID || '',
    secretAccessKey: import.meta.env.VITE_R2_SECRET_ACCESS_KEY || '',
    bucketName: import.meta.env.VITE_R2_BUCKET_NAME || APP_R2_CONFIG.bucketName,
    publicUrl: import.meta.env.VITE_R2_PUBLIC_URL || APP_R2_CONFIG.publicUrl
  };
}

export function saveR2Config(config: R2Config): void {
  localStorage.setItem(CONFIG_STORAGE_KEY_R2, JSON.stringify(config));
}

export function isFirebaseConfigured(): boolean {
  const cfg = getFirebaseConfig();
  return Boolean(cfg.apiKey && cfg.projectId && cfg.appId);
}

export function isR2Configured(): boolean {
  const cfg = getR2Config();
  return Boolean(cfg.publicUrl);
}

