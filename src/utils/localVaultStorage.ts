import { VaultAccount, VaultPreferences } from '../types/vault';
import { sanitizeAccountPayload } from './vaultHelpers';

export interface LocalUserSession {
  uid: string;
  username: string;
  displayName: string;
  birthdate: string;
}

interface StoredUserRecord {
  uid: string;
  username: string;
  normalizedUsername: string;
  displayName: string;
  birthdate: string;
  salt: string;
  authHash: string;
  createdAt: string;
}

interface StoredVaultData {
  accounts: VaultAccount[];
  preferences: VaultPreferences;
}

const USERS_KEY = 'khaznati_standalone_users_v1';
const SESSION_KEY = 'khaznati_standalone_session_v1';
const VAULT_PREFIX = 'khaznati_standalone_vault_v1_';
const IDB_NAME = 'khaznati_standalone_idb';
const IDB_STORE = 'vaults';

function normalizeUsername(username: string): string {
  return username.trim().toLowerCase();
}

function generateSalt(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

async function computeAuthHash(
  normalizedUsername: string,
  password: string,
  birthdate: string,
  salt: string
): Promise<string> {
  const material = `${salt}::${normalizedUsername}::${password}::${birthdate}`;
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const encoder = new TextEncoder();
    const digest = await crypto.subtle.digest('SHA-256', encoder.encode(material));
    return Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }
  // Fallback deterministic hash for non-secure contexts
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < material.length; i++) {
    const ch = material.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16);
}

function readUsersMap(): Record<string, StoredUserRecord> {
  try {
    const raw = localStorage.getItem(USERS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, StoredUserRecord>) : {};
  } catch {
    return {};
  }
}

function writeUsersMap(map: Record<string, StoredUserRecord>): void {
  localStorage.setItem(USERS_KEY, JSON.stringify(map));
}

function openVaultDb(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === 'undefined') return Promise.resolve(null);
  return new Promise((resolve) => {
    try {
      const request = indexedDB.open(IDB_NAME, 1);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(IDB_STORE)) {
          db.createObjectStore(IDB_STORE);
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

async function idbGetVault(uid: string): Promise<StoredVaultData | null> {
  const db = await openVaultDb();
  if (!db) return null;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(IDB_STORE, 'readonly');
      const store = tx.objectStore(IDB_STORE);
      const req = store.get(uid);
      req.onsuccess = () => resolve((req.result as StoredVaultData) || null);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

async function idbSetVault(uid: string, data: StoredVaultData): Promise<void> {
  const db = await openVaultDb();
  if (!db) return;
  await new Promise<void>((resolve) => {
    try {
      const tx = db.transaction(IDB_STORE, 'readwrite');
      const store = tx.objectStore(IDB_STORE);
      store.put(data, uid);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
}

export function getRegisteredUsersCount(): number {
  return Object.keys(readUsersMap()).length;
}

export function getSavedSession(): LocalUserSession | null {
  try {
    const raw =
      localStorage.getItem(SESSION_KEY) || sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as LocalUserSession;
    if (parsed && parsed.uid && parsed.username) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

export function clearSavedSession(): void {
  localStorage.removeItem(SESSION_KEY);
  sessionStorage.removeItem(SESSION_KEY);
}

function saveSession(session: LocalUserSession, rememberDevice: boolean): void {
  clearSavedSession();
  const serialized = JSON.stringify(session);
  if (rememberDevice) {
    localStorage.setItem(SESSION_KEY, serialized);
  } else {
    sessionStorage.setItem(SESSION_KEY, serialized);
  }
}

export async function registerLocalUser(params: {
  username: string;
  password: string;
  birthdate: string;
  rememberDevice?: boolean;
}): Promise<LocalUserSession> {
  const rawUsername = params.username.trim();
  const normalized = normalizeUsername(rawUsername);
  if (normalized.length < 2) {
    throw new Error('اسم المستخدم يجب أن يكون حرفين على الأقل.');
  }
  if (params.password.length < 4) {
    throw new Error('كلمة المرور يجب أن تكون 4 أحرف أو أرقام على الأقل.');
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(params.birthdate)) {
    throw new Error('يرجى تحديد تاريخ الميلاد بشكل صحيح.');
  }

  const users = readUsersMap();
  if (users[normalized]) {
    throw new Error('اسم المستخدم مسجل مسبقاً على هذا الجهاز. انتقل لتبويب تسجيل الدخول.');
  }

  const uid = `u_${normalized.replace(/[^a-z0-9_-]/g, '_')}_${Date.now().toString(36)}`;
  const salt = generateSalt();
  const authHash = await computeAuthHash(normalized, params.password, params.birthdate, salt);

  const newUser: StoredUserRecord = {
    uid,
    username: rawUsername,
    normalizedUsername: normalized,
    displayName: rawUsername,
    birthdate: params.birthdate,
    salt,
    authHash,
    createdAt: new Date().toISOString(),
  };

  users[normalized] = newUser;
  writeUsersMap(users);

  const initialVault: StoredVaultData = {
    accounts: [],
    preferences: {
      ownerId: uid,
      realBirthdate: params.birthdate,
      vaultPinHash: '',
      autoLockMinutes: 15,
      theme: localStorage.getItem('khaznati_theme') === 'dark' ? 'dark' : 'light',
    },
  };

  await saveLocalVaultData(uid, initialVault);

  const session: LocalUserSession = {
    uid,
    username: rawUsername,
    displayName: rawUsername,
    birthdate: params.birthdate,
  };
  saveSession(session, params.rememberDevice !== false);
  return session;
}

export async function loginLocalUser(params: {
  username: string;
  password: string;
  birthdate: string;
  rememberDevice?: boolean;
}): Promise<LocalUserSession> {
  const normalized = normalizeUsername(params.username);
  if (!normalized || !params.password || !params.birthdate) {
    throw new Error('يرجى إدخال اسم المستخدم وكلمة المرور وتاريخ الميلاد.');
  }

  const users = readUsersMap();
  const record = users[normalized];
  if (!record) {
    throw new Error('اسم المستخدم غير موجود على هذا الجهاز.');
  }

  const candidateHash = await computeAuthHash(
    normalized,
    params.password,
    params.birthdate,
    record.salt
  );

  if (candidateHash !== record.authHash) {
    throw new Error('بيانات الدخول غير صحيحة. تأكد من اسم المستخدم وكلمة المرور وتاريخ الميلاد.');
  }

  const session: LocalUserSession = {
    uid: record.uid,
    username: record.username,
    displayName: record.displayName,
    birthdate: record.birthdate,
  };
  saveSession(session, params.rememberDevice !== false);
  return session;
}

function normalizeLoadedAccounts(accounts: VaultAccount[], uid: string): VaultAccount[] {
  return accounts.map((acc) => ({
    ...sanitizeAccountPayload(acc, uid, acc.id),
    createdAt: acc.createdAt,
    updatedAt: acc.updatedAt,
  }));
}

export async function loadLocalVaultData(
  uid: string,
  fallbackBirthdate: string
): Promise<StoredVaultData> {
  const idbData = await idbGetVault(uid);
  if (idbData && Array.isArray(idbData.accounts)) {
    return {
      accounts: normalizeLoadedAccounts(idbData.accounts, uid),
      preferences: {
        ownerId: uid,
        realBirthdate: idbData.preferences?.realBirthdate || fallbackBirthdate,
        vaultPinHash: idbData.preferences?.vaultPinHash || '',
        autoLockMinutes: idbData.preferences?.autoLockMinutes ?? 15,
        clipboardClearSeconds: idbData.preferences?.clipboardClearSeconds ?? 30,
        theme: idbData.preferences?.theme === 'dark' ? 'dark' : 'light',
      },
    };
  }

  try {
    const raw = localStorage.getItem(`${VAULT_PREFIX}${uid}`);
    if (raw) {
      const parsed = JSON.parse(raw) as StoredVaultData;
      if (parsed && Array.isArray(parsed.accounts)) {
        return {
          accounts: normalizeLoadedAccounts(parsed.accounts, uid),
          preferences: {
            ownerId: uid,
            realBirthdate: parsed.preferences?.realBirthdate || fallbackBirthdate,
            vaultPinHash: parsed.preferences?.vaultPinHash || '',
            autoLockMinutes: parsed.preferences?.autoLockMinutes ?? 15,
            clipboardClearSeconds: parsed.preferences?.clipboardClearSeconds ?? 30,
            theme: parsed.preferences?.theme === 'dark' ? 'dark' : 'light',
          },
        };
      }
    }
  } catch {
    // ignore corrupted localStorage fallback
  }

  return {
    accounts: [],
    preferences: {
      ownerId: uid,
      realBirthdate: fallbackBirthdate,
      vaultPinHash: '',
      autoLockMinutes: 15,
      clipboardClearSeconds: 30,
      theme: localStorage.getItem('khaznati_theme') === 'dark' ? 'dark' : 'light',
    },
  };
}

export async function saveLocalVaultData(
  uid: string,
  data: StoredVaultData
): Promise<void> {
  try {
    localStorage.setItem(`${VAULT_PREFIX}${uid}`, JSON.stringify(data));
  } catch {
    // Ignore storage quota warnings on localStorage if IndexedDB handles it
  }
  await idbSetVault(uid, data);
}
