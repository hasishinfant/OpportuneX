/**
 * CDN Optimization Service for OpportuneX
 * Provides static asset optimization and CDN integration
 */

interface CDNConfig {
  enabled: boolean;
  baseUrl: string;
  regions: string[];
  cacheHeaders: Record<string, string>;
}

interface AssetOptimization {
  images: {
    formats: string[];
    qualities: number[];
    sizes: number[];
  };
  fonts: {
    preload: string[];
    display: string;
  };
  scripts: {
    minify: boolean;
    compress: boolean;
  };
  styles: {
    minify: boolean;
    critical: boolean;
  };
}

class CDNService {
  private config: CDNConfig;
  private optimization: AssetOptimization;

  constructor() {
    this.config = {
      enabled: process.env.CDN_ENABLED === 'true',
      baseUrl: process.env.CDN_BASE_URL || '',
      regions: (
        process.env.CDN_REGIONS || 'us-east-1,eu-west-1,ap-south-1'
      ).split(','),
      cacheHeaders: {
        'Cache-Control': 'public, max-age=31536000, immutable', // 1 year for static assets
        Vary: 'Accept-Encoding',
        'X-Content-Type-Options': 'nosniff',
      },
    };

    this.optimization = {
      images: {
        formats: ['webp', 'avif', 'jpeg', 'png'],
        qualities: [75, 85, 95],
        sizes: [320, 640, 768, 1024, 1280, 1920],
      },
      fonts: {
        preload: [
          'Inter-Regular.woff2',
          'Inter-Medium.woff2',
          'Inter-SemiBold.woff2',
        ],
        display: 'swap',
      },
      scripts: {
        minify: process.env.NODE_ENV === 'production',
        compress: true,
      },
      styles: {
        minify: process.env.NODE_ENV === 'production',
        critical: true,
      },
    };
  }

  /**
   * Get optimized asset URL
   */
  getAssetUrl(
    path: string,
    options: {
      width?: number;
      height?: number;
      quality?: number;
      format?: string;
      version?: string;
    } = {}
  ): string {
    if (!this.config.enabled || !this.config.baseUrl) {
      return path;
    }

    const url = new URL(path, this.config.baseUrl);

    // Add optimization parameters
    if (options.width) url.searchParams.set('w', options.width.toString());
    if (options.height) url.searchParams.set('h', options.height.toString());
    if (options.quality) url.searchParams.set('q', options.quality.toString());
    if (options.format) url.searchParams.set('f', options.format);
    if (options.version) url.searchParams.set('v', options.version);

    return url.toString();
  }

  /**
   * Generate responsive image srcset
   */
  generateSrcSet(
    imagePath: string,
    options: {
      format?: string;
      quality?: number;
      sizes?: number[];
    } = {}
  ): string {
    const {
      format = 'webp',
      quality = 75,
      sizes = this.optimization.images.sizes,
    } = options;

    return sizes
      .map(size => {
        const url = this.getAssetUrl(imagePath, {
          width: size,
          format,
          quality,
        });
        return `${url} ${size}w`;
      })
      .join(', ');
  }

  /**
   * Generate picture element with multiple formats
   */
  generatePictureElement(
    imagePath: string,
    alt: string,
    options: {
      sizes?: string;
      className?: string;
      loading?: 'lazy' | 'eager';
      priority?: boolean;
    } = {}
  ): string {
    const {
      sizes = '100vw',
      className = '',
      loading = 'lazy',
      priority = false,
    } = options;

    const webpSrcSet = this.generateSrcSet(imagePath, { format: 'webp' });
    const avifSrcSet = this.generateSrcSet(imagePath, { format: 'avif' });
    const fallbackSrc = this.getAssetUrl(imagePath, {
      format: 'jpeg',
      quality: 85,
    });

    return `
      <picture>
        <source srcset="${avifSrcSet}" type="image/avif" sizes="${sizes}">
        <source srcset="${webpSrcSet}" type="image/webp" sizes="${sizes}">
        <img 
          src="${fallbackSrc}" 
          alt="${alt}" 
          class="${className}"
          ${loading === 'lazy' ? 'loading="lazy"' : ''}
          ${priority ? 'fetchpriority="high"' : ''}
          sizes="${sizes}"
        >
      </picture>
    `.trim();
  }

  /**
   * Get cache headers for different asset types
   */
  getCacheHeaders(
    assetType: 'image' | 'font' | 'script' | 'style' | 'document'
  ): Record<string, string> {
    const baseHeaders = { ...this.config.cacheHeaders };

    switch (assetType) {
      case 'image':
        return {
          ...baseHeaders,
          'Cache-Control': 'public, max-age=31536000, immutable',
        };
      case 'font':
        return {
          ...baseHeaders,
          'Cache-Control': 'public, max-age=31536000, immutable',
          'Access-Control-Allow-Origin': '*',
        };
      case 'script':
      case 'style':
        return {
          ...baseHeaders,
          'Cache-Control': 'public, max-age=31536000, immutable',
        };
      case 'document':
        return {
          'Cache-Control': 'public, max-age=3600, must-revalidate',
          Vary: 'Accept-Encoding',
        };
      default:
        return baseHeaders;
    }
  }

  /**
   * Generate preload links for critical resources
   */
  generatePreloadLinks(): string[] {
    const preloadLinks: string[] = [];

    // Preload critical fonts
    this.optimization.fonts.preload.forEach(font => {
      const fontUrl = this.getAssetUrl(`/fonts/${font}`);
      preloadLinks.push(
        `<link rel="preload" href="${fontUrl}" as="font" type="font/woff2" crossorigin>`
      );
    });

    // Preload critical CSS
    const criticalCssUrl = this.getAssetUrl('/css/critical.css');
    preloadLinks.push(
      `<link rel="preload" href="${criticalCssUrl}" as="style">`
    );

    return preloadLinks;
  }

  /**
   * Generate resource hints for performance
   */
  generateResourceHints(): string[] {
    const hints: string[] = [];

    if (this.config.enabled && this.config.baseUrl) {
      // DNS prefetch for CDN domain
      const cdnDomain = new URL(this.config.baseUrl).hostname;
      hints.push(`<link rel="dns-prefetch" href="//${cdnDomain}">`);
      hints.push(
        `<link rel="preconnect" href="${this.config.baseUrl}" crossorigin>`
      );
    }

    // Prefetch for external services
    hints.push('<link rel="dns-prefetch" href="//fonts.googleapis.com">');
    hints.push('<link rel="dns-prefetch" href="//api.openai.com">');

    return hints;
  }

  /**
   * Optimize image for different devices and formats
   */
  async optimizeImage(
    imagePath: string,
    options: {
      targetSizes?: number[];
      formats?: string[];
      quality?: number;
    } = {}
  ): Promise<{
    optimized: Array<{
      url: string;
      width: number;
      format: string;
      size: number;
    }>;
    original: string;
  }> {
    const {
      targetSizes = this.optimization.images.sizes,
      formats = this.optimization.images.formats,
      quality = 75,
    } = options;

    const optimized = [];

    for (const format of formats) {
      for (const size of targetSizes) {
        const url = this.getAssetUrl(imagePath, {
          width: size,
          format,
          quality,
        });

        optimized.push({
          url,
          width: size,
          format,
          size: 0, // Would be calculated by actual CDN service
        });
      }
    }

    return {
      optimized,
      original: this.getAssetUrl(imagePath),
    };
  }

  /**
   * Generate service worker cache strategies
   */
  generateCacheStrategies(): {
    strategies: Array<{
      pattern: string;
      strategy: string;
      options: any;
    }>;
  } {
    return {
      strategies: [
        {
          pattern: '/api/',
          strategy: 'NetworkFirst',
          options: {
            cacheName: 'api-cache',
            networkTimeoutSeconds: 3,
            cacheableResponse: {
              statuses: [0, 200],
            },
          },
        },
        {
          pattern: '/images/',
          strategy: 'CacheFirst',
          options: {
            cacheName: 'images-cache',
            expiration: {
              maxEntries: 100,
              maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
            },
          },
        },
        {
          pattern: '/fonts/',
          strategy: 'CacheFirst',
          options: {
            cacheName: 'fonts-cache',
            expiration: {
              maxEntries: 10,
              maxAgeSeconds: 365 * 24 * 60 * 60, // 1 year
            },
          },
        },
        {
          pattern: '/static/',
          strategy: 'StaleWhileRevalidate',
          options: {
            cacheName: 'static-resources',
            expiration: {
              maxEntries: 50,
              maxAgeSeconds: 7 * 24 * 60 * 60, // 7 days
            },
          },
        },
      ],
    };
  }

  /**
   * Get CDN health status
   */
  async getHealthStatus(): Promise<{
    healthy: boolean;
    regions: Array<{
      region: string;
      status: 'healthy' | 'degraded' | 'down';
      latency?: number;
    }>;
    error?: string;
  }> {
    if (!this.config.enabled) {
      return { healthy: true, regions: [] };
    }

    try {
      const regionChecks = await Promise.allSettled(
        this.config.regions.map(async region => {
          const start = Date.now();
          const testUrl = `${this.config.baseUrl}/health?region=${region}`;

          try {
            const response = await fetch(testUrl, {
              method: 'HEAD',
              signal: AbortSignal.timeout(5000),
            });
            const latency = Date.now() - start;

            return {
              region,
              status: response.ok
                ? ('healthy' as const)
                : ('degraded' as const),
              latency,
            };
          } catch {
            return {
              region,
              status: 'down' as const,
            };
          }
        })
      );

      const regions = regionChecks.map(result =>
        result.status === 'fulfilled'
          ? result.value
          : {
              region: 'unknown',
              status: 'down' as const,
            }
      );

      const healthy = regions.some(r => r.status === 'healthy');

      return { healthy, regions };
    } catch (error) {
      return {
        healthy: false,
        regions: [],
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Purge CDN cache for specific paths
   */
  async purgeCache(paths: string[]): Promise<{
    success: boolean;
    purged: string[];
    errors: string[];
  }> {
    if (!this.config.enabled) {
      return { success: true, purged: [], errors: [] };
    }

    const purged: string[] = [];
    const errors: string[] = [];

    for (const path of paths) {
      try {
        // This would integrate with your CDN provider's purge API
        // Example for CloudFlare, AWS CloudFront, etc.
        console.log(`Purging CDN cache for: ${path}`);
        purged.push(path);
      } catch (error) {
        errors.push(
          `Failed to purge ${path}: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    }

    return {
      success: errors.length === 0,
      purged,
      errors,
    };
  }
}

/**
 * Image optimization utilities
 */
export class ImageOptimizer {
  private cdnService: CDNService;

  constructor() {
    this.cdnService = new CDNService();
  }

  /**
   * Generate Next.js Image component props
   */
  generateImageProps(
    src: string,
    alt: string,
    options: {
      width?: number;
      height?: number;
      priority?: boolean;
      quality?: number;
      sizes?: string;
      placeholder?: 'blur' | 'empty';
      blurDataURL?: string;
    } = {}
  ) {
    const {
      width = 800,
      height = 600,
      priority = false,
      quality = 75,
      sizes = '100vw',
      placeholder = 'empty',
      blurDataURL,
    } = options;

    return {
      src: this.cdnService.getAssetUrl(src, { quality }),
      alt,
      width,
      height,
      priority,
      quality,
      sizes,
      placeholder,
      blurDataURL,
      // Enable optimization
      unoptimized: false,
    };
  }

  /**
   * Generate low-quality image placeholder (LQIP)
   */
  generateLQIP(imagePath: string): string {
    return this.cdnService.getAssetUrl(imagePath, {
      width: 20,
      quality: 20,
      format: 'jpeg',
    });
  }

  /**
   * Generate image metadata for SEO
   */
  generateImageMetadata(
    imagePath: string,
    options: {
      title?: string;
      description?: string;
      width?: number;
      height?: number;
    } = {}
  ) {
    const { title, description, width = 1200, height = 630 } = options;
    const imageUrl = this.cdnService.getAssetUrl(imagePath, {
      width,
      height,
      quality: 85,
    });

    return {
      openGraph: {
        images: [
          {
            url: imageUrl,
            width,
            height,
            alt: title || description || 'OpportuneX',
          },
        ],
      },
      twitter: {
        card: 'summary_large_image',
        images: [imageUrl],
      },
    };
  }
}

/**
 * Performance monitoring for CDN
 */
export class CDNPerformanceMonitor {
  private metrics: Array<{
    url: string;
    loadTime: number;
    size: number;
    timestamp: Date;
    cacheHit: boolean;
  }> = [];

  /**
   * Record asset load metrics
   */
  recordAssetLoad(
    url: string,
    loadTime: number,
    size: number,
    cacheHit: boolean
  ) {
    this.metrics.push({
      url,
      loadTime,
      size,
      timestamp: new Date(),
      cacheHit,
    });

    // Keep only recent metrics
    if (this.metrics.length > 1000) {
      this.metrics = this.metrics.slice(-1000);
    }
  }

  /**
   * Get performance statistics
   */
  getStats() {
    if (this.metrics.length === 0) {
      return {
        averageLoadTime: 0,
        cacheHitRate: 0,
        totalAssets: 0,
        totalSize: 0,
      };
    }

    const totalLoadTime = this.metrics.reduce((sum, m) => sum + m.loadTime, 0);
    const cacheHits = this.metrics.filter(m => m.cacheHit).length;
    const totalSize = this.metrics.reduce((sum, m) => sum + m.size, 0);

    return {
      averageLoadTime: Math.round(totalLoadTime / this.metrics.length),
      cacheHitRate: Math.round((cacheHits / this.metrics.length) * 100),
      totalAssets: this.metrics.length,
      totalSize: Math.round(totalSize / 1024), // KB
    };
  }

  /**
   * Get slow loading assets
   */
  getSlowAssets(thresholdMs = 1000) {
    return this.metrics
      .filter(m => m.loadTime > thresholdMs)
      .sort((a, b) => b.loadTime - a.loadTime)
      .slice(0, 10);
  }
}

// Export singleton instances
export const cdnService = new CDNService();
export const imageOptimizer = new ImageOptimizer();
export const cdnPerformanceMonitor = new CDNPerformanceMonitor();

// Export types
export type { AssetOptimization, CDNConfig };
