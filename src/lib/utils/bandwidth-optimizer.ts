// Bandwidth Optimization Utilities
import { VideoQuality } from '@/types/video-conferencing';

export interface NetworkConditions {
  downloadMbps: number;
  uploadMbps: number;
  latencyMs: number;
  packetLoss: number;
  jitter: number;
}

export interface VideoConstraints {
  width: number;
  height: number;
  frameRate: number;
  maxBitrate: number;
}

/**
 * Detect network conditions
 */
export async function detectNetworkConditions(): Promise<NetworkConditions> {
  try {
    // Use Network Information API if available
    const connection = (navigator as any).connection;

    if (connection) {
      const effectiveType = connection.effectiveType;
      const downlink = connection.downlink || 1;
      const rtt = connection.rtt || 100;

      return {
        downloadMbps: downlink,
        uploadMbps: downlink * 0.8, // Estimate upload as 80% of download
        latencyMs: rtt,
        packetLoss: 0,
        jitter: rtt * 0.1,
      };
    }

    // Fallback: estimate based on simple test
    return await performBandwidthTest();
  } catch (error) {
    console.error('Error detecting network conditions:', error);
    return {
      downloadMbps: 1,
      uploadMbps: 0.5,
      latencyMs: 100,
      packetLoss: 0,
      jitter: 10,
    };
  }
}

/**
 * Perform simple bandwidth test
 */
async function performBandwidthTest(): Promise<NetworkConditions> {
  const startTime = Date.now();
  const testSize = 100000; // 100KB

  try {
    // Download test
    const response = await fetch('/api/bandwidth-test', {
      method: 'POST',
      body: new ArrayBuffer(testSize),
    });

    const duration = (Date.now() - startTime) / 1000;
    const mbps = (testSize * 8) / (duration * 1000000);

    return {
      downloadMbps: mbps,
      uploadMbps: mbps * 0.8,
      latencyMs: duration * 1000,
      packetLoss: 0,
      jitter: 10,
    };
  } catch (error) {
    return {
      downloadMbps: 1,
      uploadMbps: 0.5,
      latencyMs: 100,
      packetLoss: 0,
      jitter: 10,
    };
  }
}

/**
 * Recommend video quality based on network conditions
 */
export function recommendVideoQuality(
  conditions: NetworkConditions
): VideoQuality {
  const { downloadMbps, uploadMbps, latencyMs, packetLoss } = conditions;

  // Poor conditions: high latency or packet loss
  if (latencyMs > 300 || packetLoss > 5) {
    return 'low';
  }

  // Check bandwidth
  const minBandwidth = Math.min(downloadMbps, uploadMbps);

  if (minBandwidth >= 5) {
    return 'hd';
  } else if (minBandwidth >= 2) {
    return 'high';
  } else if (minBandwidth >= 1) {
    return 'medium';
  } else {
    return 'low';
  }
}

/**
 * Get video constraints for quality level
 */
export function getVideoConstraintsForQuality(
  quality: VideoQuality
): VideoConstraints {
  const constraintsMap: Record<VideoQuality, VideoConstraints> = {
    low: {
      width: 320,
      height: 240,
      frameRate: 15,
      maxBitrate: 150000, // 150 kbps
    },
    medium: {
      width: 640,
      height: 480,
      frameRate: 24,
      maxBitrate: 500000, // 500 kbps
    },
    high: {
      width: 1280,
      height: 720,
      frameRate: 30,
      maxBitrate: 1200000, // 1.2 Mbps
    },
    hd: {
      width: 1920,
      height: 1080,
      frameRate: 30,
      maxBitrate: 2500000, // 2.5 Mbps
    },
  };

  return constraintsMap[quality];
}

/**
 * Adaptive bitrate controller
 */
export class AdaptiveBitrateController {
  private currentQuality: VideoQuality = 'high';
  private qualityHistory: VideoQuality[] = [];
  private readonly historySize = 10;

  constructor(initialQuality: VideoQuality = 'high') {
    this.currentQuality = initialQuality;
  }

  /**
   * Update quality based on network conditions
   */
  updateQuality(conditions: NetworkConditions): VideoQuality {
    const recommendedQuality = recommendVideoQuality(conditions);

    // Add to history
    this.qualityHistory.push(recommendedQuality);
    if (this.qualityHistory.length > this.historySize) {
      this.qualityHistory.shift();
    }

    // Use moving average to avoid frequent changes
    const avgQuality = this.getAverageQuality();

    // Only change if significantly different
    if (this.shouldChangeQuality(avgQuality)) {
      this.currentQuality = avgQuality;
    }

    return this.currentQuality;
  }

  /**
   * Get current quality
   */
  getCurrentQuality(): VideoQuality {
    return this.currentQuality;
  }

  /**
   * Calculate average quality from history
   */
  private getAverageQuality(): VideoQuality {
    if (this.qualityHistory.length === 0) {
      return this.currentQuality;
    }

    const qualityScores: Record<VideoQuality, number> = {
      low: 1,
      medium: 2,
      high: 3,
      hd: 4,
    };

    const reverseMap: Record<number, VideoQuality> = {
      1: 'low',
      2: 'medium',
      3: 'high',
      4: 'hd',
    };

    const avgScore =
      this.qualityHistory.reduce((sum, q) => sum + qualityScores[q], 0) /
      this.qualityHistory.length;

    const roundedScore = Math.round(avgScore);
    return reverseMap[roundedScore] || 'medium';
  }

  /**
   * Determine if quality should change
   */
  private shouldChangeQuality(newQuality: VideoQuality): boolean {
    const qualityLevels: VideoQuality[] = ['low', 'medium', 'high', 'hd'];
    const currentIndex = qualityLevels.indexOf(this.currentQuality);
    const newIndex = qualityLevels.indexOf(newQuality);

    // Change if difference is more than 1 level
    return Math.abs(currentIndex - newIndex) > 1;
  }

  /**
   * Force quality change
   */
  setQuality(quality: VideoQuality): void {
    this.currentQuality = quality;
    this.qualityHistory = [quality];
  }
}

/**
 * Monitor connection quality
 */
export class ConnectionQualityMonitor {
  private checkInterval: NodeJS.Timeout | null = null;
  private onQualityChange?: (quality: VideoQuality) => void;
  private bitrateController: AdaptiveBitrateController;

  constructor(onQualityChange?: (quality: VideoQuality) => void) {
    this.onQualityChange = onQualityChange;
    this.bitrateController = new AdaptiveBitrateController();
  }

  /**
   * Start monitoring
   */
  start(intervalMs: number = 5000): void {
    this.stop(); // Clear any existing interval

    this.checkInterval = setInterval(async () => {
      const conditions = await detectNetworkConditions();
      const quality = this.bitrateController.updateQuality(conditions);

      if (this.onQualityChange) {
        this.onQualityChange(quality);
      }
    }, intervalMs);
  }

  /**
   * Stop monitoring
   */
  stop(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }

  /**
   * Get current quality
   */
  getCurrentQuality(): VideoQuality {
    return this.bitrateController.getCurrentQuality();
  }
}

/**
 * Calculate estimated bandwidth usage
 */
export function calculateBandwidthUsage(
  quality: VideoQuality,
  participantCount: number
): {
  uploadMbps: number;
  downloadMbps: number;
  total: number;
} {
  const constraints = getVideoConstraintsForQuality(quality);
  const videoBitrate = constraints.maxBitrate / 1000000; // Convert to Mbps
  const audioBitrate = 0.064; // 64 kbps for audio

  const uploadMbps = videoBitrate + audioBitrate;
  const downloadMbps = (videoBitrate + audioBitrate) * participantCount;

  return {
    uploadMbps,
    downloadMbps,
    total: uploadMbps + downloadMbps,
  };
}

/**
 * Check if device can handle quality
 */
export function canDeviceHandleQuality(
  quality: VideoQuality,
  participantCount: number
): boolean {
  const usage = calculateBandwidthUsage(quality, participantCount);

  // Rough estimate: assume device can handle up to 10 Mbps total
  return usage.total <= 10;
}

/**
 * Get audio-only mode recommendation
 */
export function shouldUseAudioOnly(conditions: NetworkConditions): boolean {
  return (
    conditions.downloadMbps < 0.5 ||
    conditions.uploadMbps < 0.3 ||
    conditions.latencyMs > 500 ||
    conditions.packetLoss > 10
  );
}
