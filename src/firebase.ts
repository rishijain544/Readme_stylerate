import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

// ── BEFORE DEPLOYING ──────────────────────────────────────
// Add your production domain or Vercel domain to Firebase authorized domains:
// Firebase Console → Authentication → Settings
// → Authorized domains → Add domain → e.g. yourapp.vercel.app
//
// Also restrict Gemini API key to your domain in GCP:
// console.cloud.google.com → APIs & Services → Credentials
// → Edit your key → Set API restriction if needed / HTTP referrers
// ──────────────────────────────────────────────────────────

/*
  PASTE THESE SECURE SCHEMAS IN FIREBASE CONSOLE → FIRESTORE → RULES:

  rules_version = '2';
  service cloud.firestore {
    match /databases/{database}/documents {

      // Global safety net
      match /{document=**} {
        allow read, write: if false;
      }

      // Connection check
      match /test/connection {
        allow read: if true;
      }

      match /users/{userId} {
        allow read, write: if request.auth != null
                           && request.auth.uid == userId;
      }

      match /users/{userId}/readmes/{readmeId} {
        allow list, get, delete: if request.auth != null
                                 && request.auth.uid == userId;
        allow create: if request.auth != null
                      && request.auth.uid == userId;
      }

      match /errors/{docId} {
        // Anyone can write error alerts
        allow create: if true;
        // Only owner or specified administrator can read
        allow read: if request.auth != null && (
          request.auth.uid == resource.data.userId ||
          request.auth.token.email == 'rishijain30a@gmail.com'
        );
        allow update: if request.auth != null
          && request.auth.token.email == 'rishijain30a@gmail.com';
        allow delete: if false;
      }

      match /payments/{docId} {
        allow read: if request.auth != null
                    && request.auth.uid == resource.data.userId;
        allow create: if request.auth != null
                      && request.auth.uid == request.resource.data.userId;
        allow update, delete: if false;
      }
    }
  }
*/

// FIREBASE_CONFIG is public-facing and safe to expose in web apps.
// All writes are securely protected by Firestore database security rules defined above.
// The configuration includes: apiKey, authDomain, projectId, storageBucket, messagingSenderId, appId
const app = initializeApp(firebaseConfig);
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
}, firebaseConfig.firestoreDatabaseId); /* CRITICAL: The app will break without this line */
export const auth = getAuth();

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: any, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}
