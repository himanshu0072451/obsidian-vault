// Persisted via expo-secure-store, same mechanism as useAuth.tsx's
// `vault_lock_on_bg` / `vault_camouflage_mode` flags.

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import * as SecureStore from "expo-secure-store";

const INTRO_KEY = "vault_onboarding_intro_seen";

interface OnboardingContextValue {
  loadingFlags: boolean;
  introSeen: boolean;
  markIntroSeen: () => Promise<void>;
}

const OnboardingContext = createContext<OnboardingContextValue | null>(null);

export function OnboardingProvider({ children }: { children: React.ReactNode }) {
  const [loadingFlags, setLoadingFlags] = useState(true);
  const [introSeen, setIntroSeen] = useState(false);

  useEffect(() => {
    SecureStore.getItemAsync(INTRO_KEY).then((value) => {
      setIntroSeen(value === "true");
      setLoadingFlags(false);
    });
  }, []);

  const markIntroSeen = useCallback(async () => {
    await SecureStore.setItemAsync(INTRO_KEY, "true");
    setIntroSeen(true);
  }, []);

  return (
    <OnboardingContext.Provider value={{ loadingFlags, introSeen, markIntroSeen }}>
      {children}
    </OnboardingContext.Provider>
  );
}

export function useOnboarding(): OnboardingContextValue {
  const ctx = useContext(OnboardingContext);
  if (!ctx) throw new Error("useOnboarding must be used within OnboardingProvider");
  return ctx;
}
