// src/config.js - Application Configuration
const CONFIG = {
  isMockMode: false,
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/v1',
  // OAuth 2.0 Web client ID from Google Cloud Console (Vite exposes VITE_* vars)
  googleClientId: import.meta.env.VITE_GOOGLE_CLIENT_ID || '',
};
export default CONFIG;
