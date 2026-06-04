import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { hasPasscode, verifyPasscode, savePasscodeHash } from '../services/storage';

interface AuthState {
  isSetup: boolean;
  isUnlocked: boolean;
  isLoading: boolean;
  passcode: string;   // In-memory only; empty when locked
  unlock: (passcode: string) => Promise<boolean>;
  setup: (passcode: string) => Promise<void>;
  lock: () => void;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isSetup, setIsSetup] = useState(false);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [passcode, setPasscode] = useState('');

  useEffect(() => {
    hasPasscode().then((has) => {
      setIsSetup(has);
      setIsLoading(false);
    });
  }, []);

  const unlock = useCallback(async (code: string): Promise<boolean> => {
    const valid = await verifyPasscode(code);
    if (valid) {
      setPasscode(code);
      setIsUnlocked(true);
    }
    return valid;
  }, []);

  const setup = useCallback(async (code: string): Promise<void> => {
    await savePasscodeHash(code);
    setPasscode(code);
    setIsSetup(true);
    setIsUnlocked(true);
  }, []);

  const lock = useCallback(() => {
    setPasscode('');
    setIsUnlocked(false);
  }, []);

  return (
    <AuthContext.Provider value={{ isSetup, isUnlocked, isLoading, passcode, unlock, setup, lock }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
