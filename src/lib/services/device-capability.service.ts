// Device Capability Service
// Detects and manages user device AR/VR capabilities

import {
  PerformanceSettings,
  UserDeviceCapability,
} from '@/types/virtual-events';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class DeviceCapabilityService {
  // Detect and save device capabilities
  async detectAndSaveCapabilities(
    userId: string,
    capabilities: {
      supportsWebxr: boolean;
      supportsAr: boolean;
      supportsVr: boolean;
      deviceType: 'mobile' | 'desktop' | 'vr_headset';
      performanceTier: 'low' | 'medium' | 'high';
    }
  ): Promise<UserDeviceCapability> {
    // Check if user already has capability record
    const existing = await prisma.userDeviceCapability.findFirst({
      where: { userId },
    });

    if (existing) {
      const updated = await prisma.userDeviceCapability.update({
        where: { id: existing.id },
        data: {
          supportsWebxr: capabilities.supportsWebxr,
          supportsAr: capabilities.supportsAr,
          supportsVr: capabilities.supportsVr,
          deviceType: capabilities.deviceType,
          performanceTier: capabilities.performanceTier,
          lastDetectedAt: new Date(),
        },
      });
      return updated as UserDeviceCapability;
    }

    const capability = await prisma.userDeviceCapability.create({
      data: {
        userId,
        supportsWebxr: capabilities.supportsWebxr,
        supportsAr: capabilities.supportsAr,
        supportsVr: capabilities.supportsVr,
        deviceType: capabilities.deviceType,
        performanceTier: capabilities.performanceTier,
      },
    });

    return capability as UserDeviceCapability;
  }

  // Get user device capabilities
  async getUserCapabilities(
    userId: string
  ): Promise<UserDeviceCapability | null> {
    const capability = await prisma.userDeviceCapability.findFirst({
      where: { userId },
    });

    return capability as UserDeviceCapability | null;
  }

  // Get recommended performance settings based on device
  getRecommendedSettings(
    performanceTier: 'low' | 'medium' | 'high'
  ): PerformanceSettings {
    const settingsMap: Record<string, PerformanceSettings> = {
      low: {
        renderDistance: 20,
        shadowQuality: 'off',
        textureQuality: 'low',
        antialiasing: false,
        particleEffects: false,
        maxAvatars: 10,
      },
      medium: {
        renderDistance: 50,
        shadowQuality: 'low',
        textureQuality: 'medium',
        antialiasing: true,
        particleEffects: true,
        maxAvatars: 25,
      },
      high: {
        renderDistance: 100,
        shadowQuality: 'high',
        textureQuality: 'high',
        antialiasing: true,
        particleEffects: true,
        maxAvatars: 50,
      },
    };

    return settingsMap[performanceTier];
  }

  // Check if device supports specific feature
  async supportsFeature(
    userId: string,
    feature: 'webxr' | 'ar' | 'vr'
  ): Promise<boolean> {
    const capability = await this.getUserCapabilities(userId);
    if (!capability) {
      return false;
    }

    switch (feature) {
      case 'webxr':
        return capability.supportsWebxr;
      case 'ar':
        return capability.supportsAr;
      case 'vr':
        return capability.supportsVr;
      default:
        return false;
    }
  }

  // Get fallback mode for unsupported devices
  getFallbackMode(
    capability: UserDeviceCapability | null
  ): '2d' | 'webgl' | 'webxr' {
    if (!capability) {
      return '2d';
    }

    if (capability.supportsWebxr) {
      return 'webxr';
    }

    if (
      capability.deviceType === 'desktop' ||
      capability.performanceTier !== 'low'
    ) {
      return 'webgl';
    }

    return '2d';
  }

  // Get device statistics
  async getDeviceStatistics(): Promise<{
    totalDevices: number;
    webxrSupport: number;
    arSupport: number;
    vrSupport: number;
    deviceTypes: Record<string, number>;
    performanceTiers: Record<string, number>;
  }> {
    const [total, webxr, ar, vr, devices, tiers] = await Promise.all([
      prisma.userDeviceCapability.count(),
      prisma.userDeviceCapability.count({
        where: { supportsWebxr: true },
      }),
      prisma.userDeviceCapability.count({
        where: { supportsAr: true },
      }),
      prisma.userDeviceCapability.count({
        where: { supportsVr: true },
      }),
      prisma.userDeviceCapability.groupBy({
        by: ['deviceType'],
        _count: true,
      }),
      prisma.userDeviceCapability.groupBy({
        by: ['performanceTier'],
        _count: true,
      }),
    ]);

    const deviceTypes: Record<string, number> = {};
    devices.forEach(d => {
      if (d.deviceType) {
        deviceTypes[d.deviceType] = d._count;
      }
    });

    const performanceTiers: Record<string, number> = {};
    tiers.forEach(t => {
      if (t.performanceTier) {
        performanceTiers[t.performanceTier] = t._count;
      }
    });

    return {
      totalDevices: total,
      webxrSupport: webxr,
      arSupport: ar,
      vrSupport: vr,
      deviceTypes,
      performanceTiers,
    };
  }

  // Estimate performance tier based on device info
  estimatePerformanceTier(deviceInfo: {
    userAgent: string;
    hardwareConcurrency?: number;
    deviceMemory?: number;
    maxTouchPoints?: number;
  }): 'low' | 'medium' | 'high' {
    const ua = deviceInfo.userAgent.toLowerCase();

    // Check for VR headsets (high performance)
    if (ua.includes('oculus') || ua.includes('quest') || ua.includes('vive')) {
      return 'high';
    }

    // Check for mobile devices
    const isMobile = /mobile|android|iphone|ipad|ipod/.test(ua);

    if (isMobile) {
      // High-end mobile devices
      if (
        ua.includes('iphone 1') || // iPhone 10+
        ua.includes('ipad pro') ||
        (deviceInfo.hardwareConcurrency && deviceInfo.hardwareConcurrency >= 6)
      ) {
        return 'medium';
      }
      return 'low';
    }

    // Desktop devices
    if (deviceInfo.hardwareConcurrency && deviceInfo.hardwareConcurrency >= 8) {
      return 'high';
    }

    if (deviceInfo.hardwareConcurrency && deviceInfo.hardwareConcurrency >= 4) {
      return 'medium';
    }

    return 'medium'; // Default for desktop
  }

  // Check WebXR support (client-side detection helper)
  getWebXRDetectionScript(): string {
    return `
      async function detectWebXRCapabilities() {
        const capabilities = {
          supportsWebxr: false,
          supportsAr: false,
          supportsVr: false,
          deviceType: 'desktop',
          performanceTier: 'medium'
        };

        // Check WebXR support
        if ('xr' in navigator) {
          capabilities.supportsWebxr = true;
          
          try {
            capabilities.supportsVr = await navigator.xr.isSessionSupported('immersive-vr');
            capabilities.supportsAr = await navigator.xr.isSessionSupported('immersive-ar');
          } catch (e) {
            console.warn('WebXR session check failed:', e);
          }
        }

        // Detect device type
        const isMobile = /mobile|android|iphone|ipad|ipod/i.test(navigator.userAgent);
        const isVRHeadset = /oculus|quest|vive/i.test(navigator.userAgent);
        
        if (isVRHeadset) {
          capabilities.deviceType = 'vr_headset';
        } else if (isMobile) {
          capabilities.deviceType = 'mobile';
        } else {
          capabilities.deviceType = 'desktop';
        }

        // Estimate performance tier
        const cores = navigator.hardwareConcurrency || 2;
        const memory = navigator.deviceMemory || 4;
        
        if (isVRHeadset || (cores >= 8 && memory >= 8)) {
          capabilities.performanceTier = 'high';
        } else if (cores >= 4 && memory >= 4) {
          capabilities.performanceTier = 'medium';
        } else {
          capabilities.performanceTier = 'low';
        }

        return capabilities;
      }
    `;
  }
}

export const deviceCapabilityService = new DeviceCapabilityService();
