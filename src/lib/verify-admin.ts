import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { getFirebaseAdminApp } from "@/lib/firebase-admin";

export interface VerifiedAdmin {
  uid: string;
  email?: string;
}

async function isAdminUser(uid: string): Promise<boolean> {
  getFirebaseAdminApp();
  const db = getFirestore();
  const adminDoc = await db.collection("admins").doc(uid).get();

  if (!adminDoc.exists) {
    return false;
  }

  const data = adminDoc.data();
  return data?.isAdmin === true || data?.role === "admin";
}

export async function verifyAdminRequest(
  request: Request
): Promise<VerifiedAdmin | null> {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return null;
  }

  const idToken = authHeader.slice("Bearer ".length).trim();
  if (!idToken) {
    return null;
  }

  try {
    getFirebaseAdminApp();
    const decoded = await getAuth().verifyIdToken(idToken);
    const authorized = await isAdminUser(decoded.uid);

    if (!authorized) {
      return null;
    }

    return { uid: decoded.uid, email: decoded.email };
  } catch {
    return null;
  }
}
