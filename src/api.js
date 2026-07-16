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

function getHeaders() {
  const token = localStorage.getItem('bound_token');
  return token ? { 'Authorization': `Bearer ${token}` } : {};
}

export const api = {
  async login(email, password) {
    const response = await fetch(`${CONFIG.apiBaseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Login failed');
    localStorage.setItem('bound_token', data.token);
    localStorage.setItem('bound_user', JSON.stringify(data.user));
    return data;
  },

  async register(userData) {
    const response = await fetch(`${CONFIG.apiBaseUrl}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData)
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Registration failed');
    localStorage.setItem('bound_token', data.token);
    localStorage.setItem('bound_user', JSON.stringify(data.user));
    return data;
  },

  logout() {
    localStorage.removeItem('bound_token');
    localStorage.removeItem('bound_user');
  },

  async getTransactions() {
    if (CONFIG.isMockMode) {
      const db = await openDB();
      return new Promise((resolve, reject) => {
        const store = db.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME);
        const req = store.getAll();
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });
    } else {
      const response = await fetch(`${CONFIG.apiBaseUrl}/transactions`, {
        headers: getHeaders()
      });
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
           this.logout();
           window.location.reload();
        }
        throw new Error('Failed to fetch transactions');
      }
      return await response.json();
    }
  },

  async createTransaction(data) {
    if (CONFIG.isMockMode) {
      // Mock code omitted for brevity but keeping basic structure
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
          seriesId: data.get('seriesId') || null
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
    } else {
      let fetchOptions = { 
        method: 'POST',
        headers: getHeaders()
      };
      if (data instanceof FormData) {
        fetchOptions.body = data;
      } else {
        fetchOptions.headers['Content-Type'] = 'application/json';
        fetchOptions.body = JSON.stringify(data);
      }
      const response = await fetch(`${CONFIG.apiBaseUrl}/transactions`, fetchOptions);
      if (!response.ok) throw new Error('Failed to create transaction');
      return await response.json();
    }
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
    } else {
      const response = await fetch(`${CONFIG.apiBaseUrl}/transactions/${id}`, {
        method: 'DELETE',
        headers: getHeaders()
      });
      if (!response.ok) throw new Error('Failed to delete transaction');
      return true;
    }
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
          items.forEach(item => {
            if (item.seriesId === seriesId) {
              store.delete(item.id);
            }
          });
          resolve(true);
        };
        req.onerror = () => reject(req.error);
      });
    } else {
      const response = await fetch(`${CONFIG.apiBaseUrl}/transactions/series/${seriesId}`, {
        method: 'DELETE',
        headers: getHeaders()
      });
      if (!response.ok) throw new Error('Failed to delete series');
      return true;
    }
  },

  async getAdminUsers() {
    const response = await fetch(`${CONFIG.apiBaseUrl}/admin/users`, { headers: getHeaders() });
    if (!response.ok) throw new Error('Failed to fetch admin users');
    return await response.json();
  },

  async getAdminStats() {
    const response = await fetch(`${CONFIG.apiBaseUrl}/admin/stats`, { headers: getHeaders() });
    if (!response.ok) throw new Error('Failed to fetch admin stats');
    return await response.json();
  }
};
