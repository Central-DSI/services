import { initializeApp, applicationDefault, cert, getApps } from "firebase-admin/app";
import { getMessaging } from "firebase-admin/messaging";

function parsePrivateKey(key) {
  if (!key) return undefined;
  // Support escaped newlines in env
  return key.replace(/\\n/g, "\n");
}

export function initFcm() {
  if (getApps().length) return;
  const saJson = process.env.FCM_SERVICE_ACCOUNT_JSON
    ? JSON.parse(process.env.FCM_SERVICE_ACCOUNT_JSON)
    : null;
  const projectId = process.env.FCM_PROJECT_ID;
  const clientEmail = process.env.FCM_CLIENT_EMAIL;
  const privateKey = parsePrivateKey(process.env.FCM_PRIVATE_KEY);

  if (saJson) {
    initializeApp({ credential: cert(saJson) });
  } else if (projectId && clientEmail && privateKey) {
    initializeApp({
      credential: cert({ projectId, clientEmail, privateKey }),
    });
  } else {
    // Try default credentials (GCE/Cloud Run) if available
    try {
      initializeApp({ credential: applicationDefault() });
    } catch (e) {
      console.warn("FCM not initialized: missing credentials");
    }
  }
}

export function getFcmMessaging() {
  initFcm();
  try {
    return getMessaging();
  } catch (e) {
    return null;
  }
}
