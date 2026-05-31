/**
 * Holds the plaintext passcode in memory for the current unlocked session.
 * Cleared when the app locks.
 */

import React, { createContext, useContext, useRef, useCallback } from 'react';

interface SessionContextValue {
  setPasscode: (p: string) => void;
  getPasscode: () => string;
  clearPasscode: () => void;
}

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const passcodeRef = useRef<string>('');

  const setPasscode = useCallback((p: string) => {
    passcodeRef.current = p;
  }, []);

  const getPasscode = useCallback(() => passcodeRef.current, []);

  const clearPasscode = useCallback(() => {
    passcodeRef.current = '';
  }, []);

  return (
    <SessionContext.Provider value={{ setPasscode, getPasscode, clearPasscode }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession(): SessionContextValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession must be used within SessionProvider');
  return ctx;
}
