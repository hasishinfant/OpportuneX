'use client';

import { cn } from '@/lib/utils';
import { ButtonHTMLAttributes, forwardRef } from 'react';
import { Button } from './Button';

interface AccessibleButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  loadingText?: string;
  ariaLabel?: string;
  ariaDescribedBy?: string;
  ariaExpanded?: boolean;
  ariaPressed?: boolean;
  hasPopup?: boolean | 'menu' | 'listbox' | 'tree' | 'grid' | 'dialog';
  controls?: string;
  describedBy?: string;
}

export const AccessibleButton = forwardRef<HTMLButtonElement, AccessibleButtonProps>(
  ({
    children,
    ariaLabel,
    ariaDescribedBy,
    ariaExpanded,
    ariaPressed,
    hasPopup,
    controls,
    describedBy,
    loading,
    loadingText,
    disabled,
    className,
    ...props
  }, ref) => {
    const isDisabled = disabled || loading;

    return (
      <Button
        ref={ref}
        disabled={isDisabled}
        aria-label={ariaLabel}
        aria-describedby={ariaDescribedBy || describedBy}
        aria-expanded={ariaExpanded}
        aria-pressed={ariaPressed}
        aria-haspopup={hasPopup}
        aria-controls={controls}
        aria-busy={loading}
        className={cn(
          // Focus styles for better accessibility
          'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2',
          // High contrast mode support
          'forced-colors:border-[ButtonBorder] forced-colors:text-[ButtonText]',
          className
        )}
        {...props}
      >
        {loading && loadingText ? loadingText : children}
      </Button>
    );
  }
);

AccessibleButton.displayName = 'AccessibleButton';