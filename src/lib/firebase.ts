import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getFirebaseClientConfig } from "@/lib/env";

const app = getApps().length === 0 ? initializeApp(getFirebaseClientConfig()) : getApp();

export const auth = getAuth(app);
export const db = getFirestore(app);

export default app;
