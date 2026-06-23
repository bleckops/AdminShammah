import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import {
  getFirebaseAdminCredentials,
  isFirebaseAdminConfigured,
} from "@/lib/env";

let adminApp: App | null = null;

export function getFirebaseAdminApp(): App {
  if (adminApp) {
    return adminApp;
  }

  const existing = getApps()[0];
  if (existing) {
    adminApp = existing;
    return adminApp;
  }

  const { projectId, clientEmail, privateKey } = getFirebaseAdminCredentials();

  adminApp = initializeApp({
    credential: cert({ projectId, clientEmail, privateKey }),
  });

  return adminApp;
}

export { isFirebaseAdminConfigured };
