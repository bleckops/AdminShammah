function requiredServer(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

const firebaseClientEnv = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
} as const;

const firebaseClientEnvKeys = {
  apiKey: "NEXT_PUBLIC_FIREBASE_API_KEY",
  authDomain: "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN",
  projectId: "NEXT_PUBLIC_FIREBASE_PROJECT_ID",
  storageBucket: "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET",
  messagingSenderId: "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID",
  appId: "NEXT_PUBLIC_FIREBASE_APP_ID",
} as const;

export function getFirebaseClientConfig() {
  for (const key of Object.keys(firebaseClientEnv) as Array<
    keyof typeof firebaseClientEnv
  >) {
    if (!firebaseClientEnv[key]?.trim()) {
      throw new Error(
        `Missing required environment variable: ${firebaseClientEnvKeys[key]}`
      );
    }
  }

  return {
    apiKey: firebaseClientEnv.apiKey!.trim(),
    authDomain: firebaseClientEnv.authDomain!.trim(),
    projectId: firebaseClientEnv.projectId!.trim(),
    storageBucket: firebaseClientEnv.storageBucket!.trim(),
    messagingSenderId: firebaseClientEnv.messagingSenderId!.trim(),
    appId: firebaseClientEnv.appId!.trim(),
  };
}

export function getFirebaseProjectId(): string {
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID?.trim();
  if (!projectId) {
    throw new Error(
      "Missing required environment variable: NEXT_PUBLIC_FIREBASE_PROJECT_ID"
    );
  }
  return projectId;
}

export function getFirebaseAdminCredentials() {
  return {
    projectId: getFirebaseProjectId(),
    clientEmail: requiredServer("FIREBASE_CLIENT_EMAIL"),
    privateKey: requiredServer("FIREBASE_PRIVATE_KEY").replace(/\\n/g, "\n"),
  };
}

export function isFirebaseAdminConfigured(): boolean {
  return !!(
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID?.trim() &&
    process.env.FIREBASE_CLIENT_EMAIL?.trim() &&
    process.env.FIREBASE_PRIVATE_KEY?.trim()
  );
}

export function getCloudinaryConfig() {
  return {
    cloudName: requiredServer("CLOUDINARY_CLOUD_NAME"),
    apiKey: requiredServer("CLOUDINARY_API_KEY"),
    apiSecret: requiredServer("CLOUDINARY_API_SECRET"),
  };
}

export function isCloudinaryConfigured(): boolean {
  return !!(
    process.env.CLOUDINARY_CLOUD_NAME?.trim() &&
    process.env.CLOUDINARY_API_KEY?.trim() &&
    process.env.CLOUDINARY_API_SECRET?.trim()
  );
}

export function getCloudinaryCloudName(): string | undefined {
  return process.env.CLOUDINARY_CLOUD_NAME?.trim() || undefined;
}
