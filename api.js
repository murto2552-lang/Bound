import CONFIG from './config.js';

// ========== MOCK DB LOGIC (IndexedDB) ==========
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

// ========== EXPORTED API METHODS ==========

export const api = {
  /**
   * Fetch all transactions
   * @returns {Promise<Array>} Array of transaction objects
   */
  async getTransactions() {
    if (CONFIG.isMockMode) {
      // Fetch from IndexedDB
      const db = await openDB();
      return new Promise((resolve, reject) => {
        const store = db.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME);
        const req = store.getAll();
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });
    } else {
      // Fetch from Real Backend API
      try {
        const response = await fetch(`${CONFIG.apiBaseUrl}/transactions`);
        if (!response.ok) throw new Error('Failed to fetch transactions');
        return await response.json();
      } catch (error) {
        console.error("API Error (getTransactions):", error);
        throw error;
      }
    }
  },

  /**
   * Create a new transaction
   * @param {Object|FormData} data - Transaction data (FormData if containing image, otherwise Object)
   * @returns {Promise<Object>} Created transaction
   */
  async createTransaction(data) {
    if (CONFIG.isMockMode) {
      // Save to IndexedDB
      let txObj = {};
      
      // Handle both FormData and plain Object for mock mode
      if (data instanceof FormData) {
        txObj = {
          date: data.get('date'),
          amount: parseFloat(data.get('amount')),
          type: data.get('type'),
          category: data.get('category') || '',
          notes: data.get('notes') || ''
        };
        const file = data.get('receipt');
        if (file && file.size > 0) {
          // Keep Blob logic for IndexedDB mock
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
      // Save to Real Backend API
      try {
        // If it's FormData (contains file), browser automatically sets boundary headers.
        // If it's plain JSON object, we need to set application/json header.
        
        let fetchOptions = {
          method: 'POST',
        };

        if (data instanceof FormData) {
          fetchOptions.body = data;
          // DO NOT set 'Content-Type': 'multipart/form-data'. 
          // Browser sets it automatically with the correct boundary when body is FormData.
        } else {
          fetchOptions.headers = { 'Content-Type': 'application/json' };
          fetchOptions.body = JSON.stringify(data);
        }

        const response = await fetch(`${CONFIG.apiBaseUrl}/transactions`, fetchOptions);
        if (!response.ok) throw new Error('Failed to create transaction');
        return await response.json();
      } catch (error) {
        console.error("API Error (createTransaction):", error);
        throw error;
      }
    }
  }
};
