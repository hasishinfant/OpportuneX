'use client';

import { cn } from '@/lib/utils';

interface SkipLinkProps {
  href: string;
  children: React.ReactNode;
  className?: string;
}

export function SkipLink({ href, children, className }: SkipLinkProps) {
  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    const target = document.querySelector(href);
    if (target) {
      // Make the target focusable if it isn't already
      if (!target.hasAttribute('tabindex')) {
        target.setAttribute('tabindex', '-1');
      }
      (target as HTMLElement).focus();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <a
      href={href}
      onClick={handleClick}
      className={cn(
        // Hidden by default, visible on focus
        'sr-only focus:not-sr-only',
        // Positioning and styling when focused
        'focus:absolute focus:top-4 focus:left-4 focus:z-50',
        'focus:px-4 focus:py-2 focus:bg-primary-600 focus:text-white',
        'focus:rounded-md focus:shadow-lg focus:outline-none',
        'focus:ring-2 focus:ring-primary-500 focus:ring-offset-2',
        // Smooth transitions
        'transition-all duration-200',
        className
      )}
    >
      {children}
    </a>
  );
}

// Multiple skip links component
interface SkipLinksProps {
  links: Array<{
    href: string;
    label: string;
  }>;
  className?: string;
}

export function SkipLinks({ links, className }: SkipLinksProps) {
  return (
    <div className={cn('fixed top-0 left-0 z-50', className)}>
      {links.map((link, index) => (
        <SkipLink key={index} href={link.href}>
          {link.label}
        </SkipLink>
      ))}
    </div>
  );
}