'use client';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { cn } from '@/lib/utils';
import { useCallback, useEffect, useState } from 'react';

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  component: React.ComponentType<OnboardingStepProps>;
  optional?: boolean;
}

interface OnboardingStepProps {
  onNext: (data?: any) => void;
  onSkip?: () => void;
  onPrevious?: () => void;
  data?: any;
}

interface OnboardingFlowProps {
  steps: OnboardingStep[];
  onComplete: (data: Record<string, any>) => void;
  onSkip?: () => void;
  className?: string;
  showProgress?: boolean;
}

export function OnboardingFlow({
  steps,
  onComplete,
  onSkip,
  className,
  showProgress = true,
}: OnboardingFlowProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [stepData, setStepData] = useState<Record<string, any>>({});
  const [isCompleting, setIsCompleting] = useState(false);

  const currentStep = steps[currentStepIndex];
  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === steps.length - 1;

  const handleNext = useCallback((data?: any) => {
    const newStepData = {
      ...stepData,
      [currentStep.id]: data,
    };
    setStepData(newStepData);

    if (isLastStep) {
      setIsCompleting(true);
      onComplete(newStepData);
    } else {
      setCurrentStepIndex(prev => prev + 1);
    }
  }, [currentStep, stepData, isLastStep, onComplete]);

  const handlePrevious = useCallback(() => {
    if (!isFirstStep) {
      setCurrentStepIndex(prev => prev - 1);
    }
  }, [isFirstStep]);

  const handleSkipStep = useCallback(() => {
    if (currentStep.optional) {
      handleNext(null);
    }
  }, [currentStep, handleNext]);

  const handleSkipAll = useCallback(() => {
    if (onSkip) {
      onSkip();
    }
  }, [onSkip]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && onSkip) {
        onSkip();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onSkip]);

  const StepComponent = currentStep.component;

  return (
    <div className={cn('max-w-2xl mx-auto', className)}>
      {/* Progress indicator */}
      {showProgress && (
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-secondary-600">
              Step {currentStepIndex + 1} of {steps.length}
            </span>
            {onSkip && (
              <button
                onClick={handleSkipAll}
                className="text-sm text-secondary-500 hover:text-secondary-700 transition-colors"
              >
                Skip onboarding
              </button>
            )}
          </div>
          <div className="w-full bg-secondary-200 rounded-full h-2">
            <div
              className="bg-primary-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${((currentStepIndex + 1) / steps.length) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Step content */}
      <div className="bg-white dark:bg-secondary-800 rounded-lg shadow-lg p-8">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-secondary-900 dark:text-white mb-2">
            {currentStep.title}
          </h2>
          <p className="text-secondary-600 dark:text-secondary-300">
            {currentStep.description}
          </p>
        </div>

        <StepComponent
          onNext={handleNext}
          onSkip={currentStep.optional ? handleSkipStep : undefined}
          onPrevious={!isFirstStep ? handlePrevious : undefined}
          data={stepData[currentStep.id]}
        />
      </div>

      {/* Step indicators */}
      <div className="flex justify-center mt-6 space-x-2">
        {steps.map((step, index) => (
          <div
            key={step.id}
            className={cn(
              'w-3 h-3 rounded-full transition-colors',
              index === currentStepIndex
                ? 'bg-primary-600'
                : index < currentStepIndex
                ? 'bg-primary-300'
                : 'bg-secondary-300'
            )}
            aria-label={`Step ${index + 1}: ${step.title}`}
          />
        ))}
      </div>

      {isCompleting && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-secondary-800 rounded-lg p-6 max-w-sm mx-4">
            <div className="text-center">
              <div className="w-12 h-12 bg-primary-100 dark:bg-primary-900 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-secondary-900 dark:text-white mb-2">
                Setting up your profile...
              </h3>
              <p className="text-secondary-600 dark:text-secondary-300">
                Please wait while we personalize your experience.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Predefined onboarding steps
export function WelcomeStep({ onNext }: OnboardingStepProps) {
  return (
    <div className="text-center space-y-6">
      <div className="w-20 h-20 bg-primary-100 dark:bg-primary-900 rounded-full flex items-center justify-center mx-auto">
        <svg className="w-10 h-10 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      </div>
      <div>
        <h3 className="text-xl font-semibold text-secondary-900 dark:text-white mb-2">
          Welcome to OpportuneX!
        </h3>
        <p className="text-secondary-600 dark:text-secondary-300 mb-6">
          We'll help you discover amazing hackathons, internships, and workshops tailored to your interests and skills.
        </p>
      </div>
      <Button onClick={() => onNext()} size="lg" className="w-full sm:w-auto">
        Get Started
      </Button>
    </div>
  );
}

export function ProfileStep({ onNext, onSkip }: OnboardingStepProps) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    location: '',
    institution: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onNext(formData);
  };

  const isValid = formData.name.trim() && formData.email.trim();

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input
          label="Full Name *"
          value={formData.name}
          onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
          placeholder="Enter your full name"
          required
        />
        <Input
          label="Email Address *"
          type="email"
          value={formData.email}
          onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
          placeholder="Enter your email"
          required
        />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input
          label="Location"
          value={formData.location}
          onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
          placeholder="City, State"
        />
        <Input
          label="Institution"
          value={formData.institution}
          onChange={(e) => setFormData(prev => ({ ...prev, institution: e.target.value }))}
          placeholder="University/College"
        />
      </div>
      <div className="flex flex-col sm:flex-row gap-3 pt-4">
        <Button type="submit" disabled={!isValid} className="flex-1">
          Continue
        </Button>
        {onSkip && (
          <Button type="button" variant="outline" onClick={onSkip} className="flex-1">
            Skip for now
          </Button>
        )}
      </div>
    </form>
  );
}

export function InterestsStep({ onNext, onSkip }: OnboardingStepProps) {
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);

  const interests = [
    'Web Development',
    'Mobile Development',
    'Data Science',
    'Machine Learning',
    'Artificial Intelligence',
    'Cybersecurity',
    'Cloud Computing',
    'DevOps',
    'UI/UX Design',
    'Blockchain',
    'IoT',
    'Game Development',
  ];

  const toggleInterest = (interest: string) => {
    setSelectedInterests(prev =>
      prev.includes(interest)
        ? prev.filter(i => i !== interest)
        : [...prev, interest]
    );
  };

  const handleContinue = () => {
    onNext({ interests: selectedInterests });
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-secondary-900 dark:text-white mb-2">
          What are you interested in?
        </h3>
        <p className="text-secondary-600 dark:text-secondary-300">
          Select topics that interest you to get personalized recommendations.
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {interests.map((interest) => (
          <button
            key={interest}
            type="button"
            onClick={() => toggleInterest(interest)}
            className={cn(
              'p-3 rounded-lg border-2 text-sm font-medium transition-all',
              selectedInterests.includes(interest)
                ? 'border-primary-500 bg-primary-50 dark:bg-primary-900 text-primary-700 dark:text-primary-300'
                : 'border-secondary-200 dark:border-secondary-600 hover:border-secondary-300 dark:hover:border-secondary-500 text-secondary-700 dark:text-secondary-300'
            )}
          >
            {interest}
          </button>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row gap-3 pt-4">
        <Button
          onClick={handleContinue}
          disabled={selectedInterests.length === 0}
          className="flex-1"
        >
          Continue ({selectedInterests.length} selected)
        </Button>
        {onSkip && (
          <Button variant="outline" onClick={onSkip} className="flex-1">
            Skip for now
          </Button>
        )}
      </div>
    </div>
  );
}

export function NotificationsStep({ onNext, onSkip }: OnboardingStepProps) {
  const [preferences, setPreferences] = useState({
    email: true,
    push: false,
    sms: false,
  });

  const handleSubmit = () => {
    onNext({ notifications: preferences });
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-secondary-900 dark:text-white mb-2">
          Stay updated with notifications
        </h3>
        <p className="text-secondary-600 dark:text-secondary-300">
          Choose how you'd like to receive updates about new opportunities.
        </p>
      </div>

      <div className="space-y-4">
        {[
          { key: 'email', label: 'Email notifications', description: 'Get updates via email' },
          { key: 'push', label: 'Push notifications', description: 'Browser notifications for urgent updates' },
          { key: 'sms', label: 'SMS notifications', description: 'Text messages for deadline reminders' },
        ].map(({ key, label, description }) => (
          <label key={key} className="flex items-start space-x-3 cursor-pointer">
            <input
              type="checkbox"
              checked={preferences[key as keyof typeof preferences]}
              onChange={(e) => setPreferences(prev => ({ ...prev, [key]: e.target.checked }))}
              className="mt-1 w-4 h-4 text-primary-600 border-secondary-300 rounded focus:ring-primary-500"
            />
            <div>
              <div className="font-medium text-secondary-900 dark:text-white">{label}</div>
              <div className="text-sm text-secondary-600 dark:text-secondary-300">{description}</div>
            </div>
          </label>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row gap-3 pt-4">
        <Button onClick={handleSubmit} className="flex-1">
          Complete Setup
        </Button>
        {onSkip && (
          <Button variant="outline" onClick={onSkip} className="flex-1">
            Skip for now
          </Button>
        )}
      </div>
    </div>
  );
}