import { useCallback, useEffect, useState } from 'react';

interface OnboardingState {
  isCompleted: boolean;
  currentStep: number;
  skippedSteps: string[];
  completedAt?: Date;
}

interface UseOnboardingReturn {
  isOnboardingCompleted: boolean;
  shouldShowOnboarding: boolean;
  completeOnboarding: (data?: any) => void;
  skipOnboarding: () => void;
  resetOnboarding: () => void;
  onboardingData: any;
}

const STORAGE_KEY = 'opportunex-onboarding';

export function useOnboarding(): UseOnboardingReturn {
  const [onboardingState, setOnboardingState] = useState<OnboardingState>({
    isCompleted: false,
    currentStep: 0,
    skippedSteps: [],
  });
  const [onboardingData, setOnboardingData] = useState<any>(null);

  // Load onboarding state from localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setOnboardingState(parsed.state || onboardingState);
        setOnboardingData(parsed.data || null);
      }
    } catch (error) {
      console.error('Failed to load onboarding state:', error);
    }
  }, []);

  // Save onboarding state to localStorage
  const saveOnboardingState = useCallback(
    (state: OnboardingState, data?: any) => {
      if (typeof window === 'undefined') return;

      try {
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({
            state,
            data: data || onboardingData,
          })
        );
      } catch (error) {
        console.error('Failed to save onboarding state:', error);
      }
    },
    [onboardingData]
  );

  const completeOnboarding = useCallback(
    (data?: any) => {
      const newState: OnboardingState = {
        ...onboardingState,
        isCompleted: true,
        completedAt: new Date(),
      };

      setOnboardingState(newState);
      if (data) {
        setOnboardingData(data);
      }
      saveOnboardingState(newState, data);

      // Track completion event
      if (typeof window !== 'undefined' && (window as any).gtag) {
        (window as any).gtag('event', 'onboarding_completed', {
          event_category: 'engagement',
          event_label: 'user_onboarding',
        });
      }
    },
    [onboardingState, saveOnboardingState]
  );

  const skipOnboarding = useCallback(() => {
    const newState: OnboardingState = {
      ...onboardingState,
      isCompleted: true,
      completedAt: new Date(),
    };

    setOnboardingState(newState);
    saveOnboardingState(newState);

    // Track skip event
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', 'onboarding_skipped', {
        event_category: 'engagement',
        event_label: 'user_onboarding',
      });
    }
  }, [onboardingState, saveOnboardingState]);

  const resetOnboarding = useCallback(() => {
    const newState: OnboardingState = {
      isCompleted: false,
      currentStep: 0,
      skippedSteps: [],
    };

    setOnboardingState(newState);
    setOnboardingData(null);
    saveOnboardingState(newState, null);

    // Clear from localStorage
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [saveOnboardingState]);

  // Determine if onboarding should be shown
  const shouldShowOnboarding = !onboardingState.isCompleted;

  return {
    isOnboardingCompleted: onboardingState.isCompleted,
    shouldShowOnboarding,
    completeOnboarding,
    skipOnboarding,
    resetOnboarding,
    onboardingData,
  };
}
