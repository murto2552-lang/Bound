import CONFIG from './config.js';

const DB_NAME = 'financeDB';
const DB_VERSION = 1;
const STORE_NAME = 'transactions';

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
        store.createIndex('date', 'date', { unique: false });
        store.createIndex('type', 'type', { unique: false });
      }
    };
  });
}

// All authenticated requests rely on the httpOnly session cookie, so every
// call must send credentials. There is no token in JS anymore (XSS-safe).
function authFetch(url, options = {}) {
  return fetch(url, { credentials: 'include', ...options });
}

export const api = {
  // --- Auth ---
  async login(email, password) {
    const res = await authFetch(`${CONFIG.apiBaseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Login failed');
    return data.user;
  },

  async register(userData) {
    const res = await authFetch(`${CONFIG.apiBaseUrl}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Registration failed');
    return data.user;
  },

  async loginWithGoogle(credential) {
    const res = await authFetch(`${CONFIG.apiBaseUrl}/auth/google`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ credential }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Google sign-in failed');
    return data.user;
  },

  // Returns the current user, or null if the session is invalid/expired.
  async me() {
    const res = await authFetch(`${CONFIG.apiBaseUrl}/auth/me`);
    if (!res.ok) return null;
    const data = await res.json();
    return data.user;
  },

  async logout() {
    try {
      await authFetch(`${CONFIG.apiBaseUrl}/auth/logout`, { method: 'POST' });
    } catch {
      /* ignore network errors on logout */
    }
  },

  // --- Profile ---
  async getProfile() {
    const res = await authFetch(`${CONFIG.apiBaseUrl}/users/profile`);
    if (!res.ok) throw new Error('Failed to fetch profile');
    return await res.json();
  },

  async updateProfile(data) {
    const res = await authFetch(`${CONFIG.apiBaseUrl}/users/profile`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to update profile');
    return await res.json();
  },

  async uploadQrCode(file) {
    const formData = new FormData();
    formData.append('qrCode', file);
    const res = await authFetch(`${CONFIG.apiBaseUrl}/users/qrcode`, {
      method: 'POST',
      body: formData, // browser sets multipart boundary automatically
    });
    if (!res.ok) throw new Error('Failed to upload QR Code');
    return await res.json();
  },

  // --- Transactions ---
  async getTransactions() {
    if (CONFIG.isMockMode) {
      const db = await openDB();
      return new Promise((resolve, reject) => {
        const store = db.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME);
        const req = store.getAll();
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });
    }
    const res = await authFetch(`${CONFIG.apiBaseUrl}/transactions`);
    if (!res.ok) {
      if (res.status === 401 || res.status === 403) {
        window.dispatchEvent(new Event('bound:unauthorized'));
      }
      throw new Error('Failed to fetch transactions');
    }
    return await res.json();
  },

  async createTransaction(data) {
    if (CONFIG.isMockMode) {
      let txObj = {};
      if (data instanceof FormData) {
        txObj = {
          date: data.get('date'),
          amount: parseFloat(data.get('amount')),
          type: data.get('type'),
          subcategory: data.get('subcategory'),
          mainCategory: data.get('mainCategory'),
          notes: data.get('notes') || '',
          title: data.get('title') || '',
          seriesId: data.get('seriesId') || null,
        };
      } else {
        txObj = data;
      }
      const db = await openDB();
      return new Promise((resolve, reject) => {
        const store = db.transaction(STORE_NAME, 'readwrite').objectStore(STORE_NAME);
        const req = store.add(txObj);
        req.onsuccess = () => resolve({ id: req.result, ...txObj });
        req.onerror = () => reject(req.error);
      });
    }
    const fetchOptions = { method: 'POST' };
    if (data instanceof FormData) {
      fetchOptions.body = data;
    } else {
      fetchOptions.headers = { 'Content-Type': 'application/json' };
      fetchOptions.body = JSON.stringify(data);
    }
    const res = await authFetch(`${CONFIG.apiBaseUrl}/transactions`, fetchOptions);
    if (!res.ok) throw new Error('Failed to create transaction');
    return await res.json();
  },

  async deleteTransaction(id) {
    if (CONFIG.isMockMode) {
      const db = await openDB();
      return new Promise((resolve, reject) => {
        const store = db.transaction(STORE_NAME, 'readwrite').objectStore(STORE_NAME);
        const req = store.delete(Number(id));
        req.onsuccess = () => resolve(true);
        req.onerror = () => reject(req.error);
      });
    }
    const res = await authFetch(`${CONFIG.apiBaseUrl}/transactions/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete transaction');
    return true;
  },

  async deleteSeries(seriesId) {
    if (CONFIG.isMockMode) {
      const db = await openDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const req = store.getAll();
        req.onsuccess = () => {
          const items = req.result;
          items.forEach((item) => {
            if (item.seriesId === seriesId) store.delete(item.id);
          });
          resolve(true);
        };
        req.onerror = () => reject(req.error);
      });
    }
    const res = await authFetch(`${CONFIG.apiBaseUrl}/transactions/series/${seriesId}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete series');
    return true;
  },
};
