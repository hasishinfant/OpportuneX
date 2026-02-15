// useVirtualEvents Hook
// Custom React hook for managing virtual event interactions

import {
  ArBusinessCard,
  AvatarConfig,
  UserAvatar,
  UserDeviceCapability,
  Vector3,
  VirtualEventSession,
  VirtualEventSpace,
} from '@/types/virtual-events';
import { useCallback, useState } from 'react';

export function useVirtualEvents() {
  const [spaces, setSpaces] = useState<VirtualEventSpace[]>([]);
  const [currentSpace, setCurrentSpace] = useState<VirtualEventSpace | null>(
    null
  );
  const [currentSession, setCurrentSession] =
    useState<VirtualEventSession | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch all event spaces
  const fetchSpaces = useCallback(
    async (filters?: { opportunityId?: string; spaceType?: string }) => {
      setLoading(true);
      setError(null);
      try {
        const query = new URLSearchParams(filters as any).toString();
        const response = await fetch(`/api/virtual-events/spaces?${query}`);
        if (!response.ok) throw new Error('Failed to fetch spaces');
        const data = await response.json();
        setSpaces(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  // Fetch a specific space
  const fetchSpace = useCallback(async (spaceId: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/virtual-events/spaces/${spaceId}`);
      if (!response.ok) throw new Error('Failed to fetch space');
      const data = await response.json();
      setCurrentSpace(data);
      return data;
    } catch (err: any) {
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // Join an event space
  const joinSpace = useCallback(
    async (spaceId: string, initialPosition?: Vector3) => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(
          `/api/virtual-events/spaces/${spaceId}/join`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ initialPosition }),
          }
        );
        if (!response.ok) throw new Error('Failed to join space');
        const session = await response.json();
        setCurrentSession(session);
        return session;
      } catch (err: any) {
        setError(err.message);
        return null;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  // Leave current space
  const leaveSpace = useCallback(async () => {
    if (!currentSession) return;

    setLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/virtual-events/sessions/${currentSession.id}/leave`,
        { method: 'POST' }
      );
      if (!response.ok) throw new Error('Failed to leave space');
      setCurrentSession(null);
      setCurrentSpace(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [currentSession]);

  // Update user position
  const updatePosition = useCallback(
    async (position: Vector3, rotation: Vector3) => {
      if (!currentSession) return;

      try {
        await fetch(
          `/api/virtual-events/sessions/${currentSession.id}/position`,
          {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ position, rotation }),
          }
        );
      } catch (err: any) {
        console.error('Failed to update position:', err);
      }
    },
    [currentSession]
  );

  // Log an interaction
  const logInteraction = useCallback(
    async (
      interactionType: string,
      targetId?: string,
      metadata?: Record<string, any>
    ) => {
      if (!currentSpace) return;

      try {
        await fetch(
          `/api/virtual-events/spaces/${currentSpace.id}/interactions`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ interactionType, targetId, metadata }),
          }
        );
      } catch (err: any) {
        console.error('Failed to log interaction:', err);
      }
    },
    [currentSpace]
  );

  return {
    spaces,
    currentSpace,
    currentSession,
    loading,
    error,
    fetchSpaces,
    fetchSpace,
    joinSpace,
    leaveSpace,
    updatePosition,
    logInteraction,
  };
}

export function useArBusinessCard() {
  const [card, setCard] = useState<ArBusinessCard | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch user's business card
  const fetchCard = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/virtual-events/ar/business-card');
      if (response.status === 404) {
        setCard(null);
        return null;
      }
      if (!response.ok) throw new Error('Failed to fetch card');
      const data = await response.json();
      setCard(data);
      return data;
    } catch (err: any) {
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // Create or update card
  const saveCard = useCallback(async (cardData: any) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/virtual-events/ar/business-card', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cardData),
      });
      if (!response.ok) throw new Error('Failed to save card');
      const data = await response.json();
      setCard(data);
      return data;
    } catch (err: any) {
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // Exchange cards
  const exchangeCard = useCallback(
    async (receiverId: string, spaceId?: string) => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(
          '/api/virtual-events/ar/business-card/exchange',
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ receiverId, spaceId }),
          }
        );
        if (!response.ok) throw new Error('Failed to exchange card');
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  // Generate QR code
  const generateQrCode = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(
        '/api/virtual-events/ar/business-card/qr-code',
        {
          method: 'POST',
        }
      );
      if (!response.ok) throw new Error('Failed to generate QR code');
      const data = await response.json();
      return data.qrCodeUrl;
    } catch (err: any) {
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    card,
    loading,
    error,
    fetchCard,
    saveCard,
    exchangeCard,
    generateQrCode,
  };
}

export function useAvatar() {
  const [avatar, setAvatar] = useState<UserAvatar | null>(null);
  const [presets, setPresets] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch user's avatar
  const fetchAvatar = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/virtual-events/avatar');
      if (!response.ok) throw new Error('Failed to fetch avatar');
      const data = await response.json();
      setAvatar(data);
      return data;
    } catch (err: any) {
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // Save avatar configuration
  const saveAvatar = useCallback(async (config: AvatarConfig) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/virtual-events/avatar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      if (!response.ok) throw new Error('Failed to save avatar');
      const data = await response.json();
      setAvatar(data);
      return data;
    } catch (err: any) {
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch avatar presets
  const fetchPresets = useCallback(async () => {
    try {
      const response = await fetch('/api/virtual-events/avatar/presets');
      if (!response.ok) throw new Error('Failed to fetch presets');
      const data = await response.json();
      setPresets(data);
      return data;
    } catch (err: any) {
      console.error('Failed to fetch presets:', err);
      return [];
    }
  }, []);

  return {
    avatar,
    presets,
    loading,
    error,
    fetchAvatar,
    saveAvatar,
    fetchPresets,
  };
}

export function useDeviceCapabilities() {
  const [capabilities, setCapabilities] = useState<UserDeviceCapability | null>(
    null
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Detect and save capabilities
  const detectCapabilities = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Detect WebXR support
      const supportsWebxr = 'xr' in navigator;
      let supportsVr = false;
      let supportsAr = false;

      if (supportsWebxr) {
        try {
          supportsVr = await (navigator as any).xr.isSessionSupported(
            'immersive-vr'
          );
          supportsAr = await (navigator as any).xr.isSessionSupported(
            'immersive-ar'
          );
        } catch (e) {
          console.warn('WebXR session check failed:', e);
        }
      }

      // Detect device type
      const isMobile = /mobile|android|iphone|ipad|ipod/i.test(
        navigator.userAgent
      );
      const isVRHeadset = /oculus|quest|vive/i.test(navigator.userAgent);

      let deviceType: 'mobile' | 'desktop' | 'vr_headset' = 'desktop';
      if (isVRHeadset) deviceType = 'vr_headset';
      else if (isMobile) deviceType = 'mobile';

      // Estimate performance tier
      const cores = (navigator as any).hardwareConcurrency || 2;
      const memory = (navigator as any).deviceMemory || 4;

      let performanceTier: 'low' | 'medium' | 'high' = 'medium';
      if (isVRHeadset || (cores >= 8 && memory >= 8)) {
        performanceTier = 'high';
      } else if (cores >= 4 && memory >= 4) {
        performanceTier = 'medium';
      } else {
        performanceTier = 'low';
      }

      // Save to server
      const response = await fetch('/api/virtual-events/device/capabilities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          supportsWebxr,
          supportsAr,
          supportsVr,
          deviceType,
          performanceTier,
        }),
      });

      if (!response.ok) throw new Error('Failed to save capabilities');
      const data = await response.json();
      setCapabilities(data);
      return data;
    } catch (err: any) {
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch saved capabilities
  const fetchCapabilities = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/virtual-events/device/capabilities');
      if (!response.ok) throw new Error('Failed to fetch capabilities');
      const data = await response.json();
      setCapabilities(data);
      return data;
    } catch (err: any) {
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    capabilities,
    loading,
    error,
    detectCapabilities,
    fetchCapabilities,
  };
}
