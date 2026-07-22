import { useEffect, useRef } from 'react';
import CONFIG from '../config';

const GSI_SRC = 'https://accounts.google.com/gsi/client';

// Loads the Google Identity Services script once and caches the promise.
let gsiPromise = null;
function loadGsi() {
  if (gsiPromise) return gsiPromise;
  gsiPromise = new Promise((resolve, reject) => {
    if (window.google?.accounts?.id) return resolve(window.google);
    const script = document.createElement('script');
    script.src = GSI_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve(window.google);
    script.onerror = () => reject(new Error('Failed to load Google Sign-In'));
    document.head.appendChild(script);
  });
  return gsiPromise;
}

/**
 * Renders the official Google button. On success it calls
 * onCredential(idToken) — the caller sends that to the backend.
 */
export default function GoogleSignInButton({ onCredential, onError }) {
  const containerRef = useRef(null);

  useEffect(() => {
    if (!CONFIG.googleClientId) return; // not configured yet
    let cancelled = false;

    loadGsi()
      .then((google) => {
        if (cancelled || !containerRef.current) return;
        google.accounts.id.initialize({
          client_id: CONFIG.googleClientId,
          callback: (response) => {
            if (response?.credential) onCredential(response.credential);
          },
        });
        google.accounts.id.renderButton(containerRef.current, {
          theme: 'outline',
          size: 'large',
          width: 320,
          text: 'continue_with',
          shape: 'pill',
        });
      })
      .catch((err) => onError?.(err.message));

    return () => {
      cancelled = true;
    };
  }, [onCredential, onError]);

  if (!CONFIG.googleClientId) {
    return (
      <p className="text-center text-xs text-slate-400">
        ตั้งค่า VITE_GOOGLE_CLIENT_ID เพื่อเปิดใช้การเข้าสู่ระบบด้วย Google
      </p>
    );
  }

  return <div ref={containerRef} className="flex justify-center" />;
}
