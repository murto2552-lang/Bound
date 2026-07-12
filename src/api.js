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

export const api = {
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
      const response = await fetch(`${CONFIG.apiBaseUrl}/transactions`);
      if (!response.ok) throw new Error('Failed to fetch transactions');
      return await response.json();
    }
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
          seriesId: data.get('seriesId') || null
        };
        const file = data.get('receipt');
        if (file && file.size > 0) {
          txObj.receiptBlob = file; 
        }
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
      let fetchOptions = { method: 'POST' };
      if (data instanceof FormData) {
        fetchOptions.body = data;
      } else {
        fetchOptions.headers = { 'Content-Type': 'application/json' };
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
        method: 'DELETE'
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
        method: 'DELETE'
      });
      if (!response.ok) throw new Error('Failed to delete series');
      return true;
    }
  },

  async resetDatabase() {
    if (CONFIG.isMockMode) {
      const db = await openDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const req = store.clear();
        req.onsuccess = () => {
          localStorage.removeItem('financeCategories');
          resolve(true);
        };
        req.onerror = () => reject(req.error);
      });
    } else {
      // For real backend
      return true;
    }
  }
};
