'use client';

import { cdnPerformanceMonitor, imageOptimizer } from '@/lib/cdn-optimization';
import Image from 'next/image';
import React, { useEffect, useRef, useState } from 'react';

interface OptimizedImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  priority?: boolean;
  quality?: number;
  sizes?: string;
  placeholder?: 'blur' | 'empty';
  blurDataURL?: string;
  lazy?: boolean;
  onLoad?: () => void;
  onError?: () => void;
  fallbackSrc?: string;
  aspectRatio?: string;
  objectFit?: 'contain' | 'cover' | 'fill' | 'none' | 'scale-down';
  rounded?: boolean;
  shadow?: boolean;
  loading?: 'lazy' | 'eager';
}

/**
 * Optimized Image Component with lazy loading, CDN integration, and performance monitoring
 */
export const OptimizedImage: React.FC<OptimizedImageProps> = ({
  src,
  alt,
  width = 800,
  height = 600,
  className = '',
  priority = false,
  quality = 75,
  sizes = '100vw',
  placeholder = 'empty',
  blurDataURL,
  lazy = true,
  onLoad,
  onError,
  fallbackSrc,
  aspectRatio,
  objectFit = 'cover',
  rounded = false,
  shadow = false,
  loading = 'lazy',
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isInView, setIsInView] = useState(!lazy || priority);
  const imgRef = useRef<HTMLDivElement>(null);
  const loadStartTime = useRef<number>(0);

  // Intersection Observer for lazy loading
  useEffect(() => {
    if (!lazy || priority || isInView) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsInView(true);
            observer.disconnect();
          }
        });
      },
      {
        rootMargin: '50px', // Start loading 50px before the image comes into view
        threshold: 0.1,
      }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => observer.disconnect();
  }, [lazy, priority, isInView]);

  // Generate optimized image props
  const imageProps = imageOptimizer.generateImageProps(src, alt, {
    width,
    height,
    priority,
    quality,
    sizes,
    placeholder,
    blurDataURL: blurDataURL || imageOptimizer.generateLQIP(src),
  });

  // Handle image load
  const handleLoad = () => {
    const loadTime = Date.now() - loadStartTime.current;
    setIsLoaded(true);
    
    // Record performance metrics
    cdnPerformanceMonitor.recordAssetLoad(
      imageProps.src,
      loadTime,
      0, // Size would be available in a real implementation
      false // Cache hit detection would be implemented
    );
    
    onLoad?.();
  };

  // Handle image error
  const handleError = () => {
    setHasError(true);
    onError?.();
  };

  // Start load timing when image starts loading
  useEffect(() => {
    if (isInView && !isLoaded && !hasError) {
      loadStartTime.current = Date.now();
    }
  }, [isInView, isLoaded, hasError]);

  // Generate CSS classes
  const containerClasses = [
    'relative overflow-hidden',
    aspectRatio && `aspect-[${aspectRatio}]`,
    rounded && 'rounded-lg',
    shadow && 'shadow-md',
    className,
  ].filter(Boolean).join(' ');

  const imageClasses = [
    'transition-opacity duration-300',
    isLoaded ? 'opacity-100' : 'opacity-0',
    objectFit === 'contain' && 'object-contain',
    objectFit === 'cover' && 'object-cover',
    objectFit === 'fill' && 'object-fill',
    objectFit === 'none' && 'object-none',
    objectFit === 'scale-down' && 'object-scale-down',
  ].filter(Boolean).join(' ');

  return (
    <div ref={imgRef} className={containerClasses}>
      {/* Loading placeholder */}
      {!isLoaded && !hasError && (
        <div className="absolute inset-0 bg-gray-200 animate-pulse flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
        </div>
      )}

      {/* Error fallback */}
      {hasError && (
        <div className="absolute inset-0 bg-gray-100 flex items-center justify-center">
          {fallbackSrc ? (
            <img
              src={fallbackSrc}
              alt={alt}
              className="w-full h-full object-cover"
              onError={() => setHasError(true)}
            />
          ) : (
            <div className="text-gray-400 text-center p-4">
              <svg
                className="w-12 h-12 mx-auto mb-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
              <p className="text-sm">Image not available</p>
            </div>
          )}
        </div>
      )}

      {/* Optimized image */}
      {isInView && !hasError && (
        <Image
          {...imageProps}
          className={imageClasses}
          onLoad={handleLoad}
          onError={handleError}
          loading={loading}
          style={{
            width: '100%',
            height: '100%',
          }}
        />
      )}
    </div>
  );
};

/**
 * Responsive Image Component with multiple breakpoints
 */
interface ResponsiveImageProps extends Omit<OptimizedImageProps, 'sizes'> {
  breakpoints?: {
    mobile?: number;
    tablet?: number;
    desktop?: number;
  };
}

export const ResponsiveImage: React.FC<ResponsiveImageProps> = ({
  breakpoints = { mobile: 320, tablet: 768, desktop: 1200 },
  ...props
}) => {
  const sizes = `
    (max-width: 768px) ${breakpoints.mobile}px,
    (max-width: 1200px) ${breakpoints.tablet}px,
    ${breakpoints.desktop}px
  `;

  return <OptimizedImage {...props} sizes={sizes} />;
};

/**
 * Avatar Image Component with optimized loading
 */
interface AvatarImageProps {
  src?: string;
  alt: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  fallbackInitials?: string;
  className?: string;
}

export const AvatarImage: React.FC<AvatarImageProps> = ({
  src,
  alt,
  size = 'md',
  fallbackInitials,
  className = '',
}) => {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
    xl: 'w-24 h-24',
  };

  const sizePx = {
    sm: 32,
    md: 48,
    lg: 64,
    xl: 96,
  };

  if (!src) {
    return (
      <div
        className={`
          ${sizeClasses[size]} 
          rounded-full 
          bg-gradient-to-br from-blue-500 to-purple-600 
          flex items-center justify-center 
          text-white font-medium
          ${className}
        `}
      >
        {fallbackInitials || alt.charAt(0).toUpperCase()}
      </div>
    );
  }

  return (
    <OptimizedImage
      src={src}
      alt={alt}
      width={sizePx[size]}
      height={sizePx[size]}
      className={`${sizeClasses[size]} rounded-full ${className}`}
      quality={90}
      priority={size === 'xl'} // Prioritize large avatars
      objectFit="cover"
      fallbackSrc="/images/default-avatar.png"
    />
  );
};

/**
 * Gallery Image Component with lightbox support
 */
interface GalleryImageProps extends OptimizedImageProps {
  thumbnailSrc?: string;
  onClick?: () => void;
  index?: number;
}

export const GalleryImage: React.FC<GalleryImageProps> = ({
  src,
  thumbnailSrc,
  onClick,
  index,
  ...props
}) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      className="relative cursor-pointer group"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onClick}
    >
      <OptimizedImage
        src={thumbnailSrc || src}
        {...props}
        className={`
          transition-transform duration-300 
          ${isHovered ? 'scale-105' : 'scale-100'}
          ${props.className || ''}
        `}
        rounded
        shadow
      />
      
      {/* Overlay */}
      <div
        className={`
          absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 
          transition-all duration-300 rounded-lg
          flex items-center justify-center
        `}
      >
        <div
          className={`
            w-12 h-12 bg-white bg-opacity-90 rounded-full 
            flex items-center justify-center
            transform scale-0 group-hover:scale-100
            transition-transform duration-300
          `}
        >
          <svg
            className="w-6 h-6 text-gray-800"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7"
            />
          </svg>
        </div>
      </div>
    </div>
  );
};

export default OptimizedImage;