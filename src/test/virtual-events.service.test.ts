// Virtual Events Service Tests

import { arBusinessCardService } from '@/lib/services/ar-business-card.service';
import { avatarService } from '@/lib/services/avatar.service';
import { deviceCapabilityService } from '@/lib/services/device-capability.service';
import { virtualEventsService } from '@/lib/services/virtual-events.service';

describe('VirtualEventsService', () => {
  describe('createEventSpace', () => {
    it('should create a new virtual event space', async () => {
      const spaceData = {
        name: 'Test Hackathon Space',
        description: 'A virtual space for hackathon participants',
        spaceType: 'conference' as const,
        maxParticipants: 50,
        sceneConfig: {
          environment: 'indoor' as const,
          lighting: {
            ambient: '#ffffff',
            directional: [
              {
                color: '#ffffff',
                intensity: 1,
                position: { x: 10, y: 20, z: 10 },
              },
            ],
          },
          floor: {
            color: '#cccccc',
            size: { width: 100, depth: 100 },
          },
          objects: [],
        },
      };

      const space = await virtualEventsService.createEventSpace(spaceData);

      expect(space).toBeDefined();
      expect(space.name).toBe(spaceData.name);
      expect(space.spaceType).toBe(spaceData.spaceType);
      expect(space.maxParticipants).toBe(spaceData.maxParticipants);
      expect(space.isActive).toBe(true);
    });

    it('should use default max participants if not provided', async () => {
      const spaceData = {
        name: 'Test Space',
        spaceType: 'networking' as const,
        sceneConfig: {
          environment: 'outdoor' as const,
          lighting: {
            ambient: '#ffffff',
            directional: [],
          },
          floor: {
            color: '#00ff00',
            size: { width: 50, depth: 50 },
          },
          objects: [],
        },
      };

      const space = await virtualEventsService.createEventSpace(spaceData);

      expect(space.maxParticipants).toBe(100);
    });
  });

  describe('joinEventSpace', () => {
    it('should allow user to join an event space', async () => {
      const space = await virtualEventsService.createEventSpace({
        name: 'Join Test Space',
        spaceType: 'workshop' as const,
        sceneConfig: {
          environment: 'indoor' as const,
          lighting: { ambient: '#ffffff', directional: [] },
          floor: { color: '#cccccc', size: { width: 50, depth: 50 } },
          objects: [],
        },
      });

      const userId = 'test-user-id';
      const session = await virtualEventsService.joinEventSpace(
        space.id,
        userId
      );

      expect(session).toBeDefined();
      expect(session.spaceId).toBe(space.id);
      expect(session.userId).toBe(userId);
      expect(session.isActive).toBe(true);
      expect(session.sessionToken).toBeDefined();
    });

    it('should return existing session if user already joined', async () => {
      const space = await virtualEventsService.createEventSpace({
        name: 'Rejoin Test Space',
        spaceType: 'conference' as const,
        sceneConfig: {
          environment: 'indoor' as const,
          lighting: { ambient: '#ffffff', directional: [] },
          floor: { color: '#cccccc', size: { width: 50, depth: 50 } },
          objects: [],
        },
      });

      const userId = 'test-user-id';
      const session1 = await virtualEventsService.joinEventSpace(
        space.id,
        userId
      );
      const session2 = await virtualEventsService.joinEventSpace(
        space.id,
        userId
      );

      expect(session1.id).toBe(session2.id);
    });

    it('should reject join if space is at capacity', async () => {
      const space = await virtualEventsService.createEventSpace({
        name: 'Full Space',
        spaceType: 'networking' as const,
        maxParticipants: 1,
        sceneConfig: {
          environment: 'indoor' as const,
          lighting: { ambient: '#ffffff', directional: [] },
          floor: { color: '#cccccc', size: { width: 50, depth: 50 } },
          objects: [],
        },
      });

      await virtualEventsService.joinEventSpace(space.id, 'user-1');

      await expect(
        virtualEventsService.joinEventSpace(space.id, 'user-2')
      ).rejects.toThrow('Event space is at maximum capacity');
    });
  });

  describe('createBooth', () => {
    it('should create a virtual booth in a space', async () => {
      const space = await virtualEventsService.createEventSpace({
        name: 'Exhibition Space',
        spaceType: 'exhibition' as const,
        sceneConfig: {
          environment: 'indoor' as const,
          lighting: { ambient: '#ffffff', directional: [] },
          floor: { color: '#cccccc', size: { width: 100, depth: 100 } },
          objects: [],
        },
      });

      const boothData = {
        spaceId: space.id,
        companyName: 'Tech Corp',
        boothConfig: {
          design: 'modern' as const,
          colors: {
            primary: '#0066cc',
            secondary: '#ffffff',
            accent: '#ff6600',
          },
          banners: ['banner1.jpg'],
          videos: [],
          documents: [],
          representatives: [],
        },
        position: { x: 10, y: 0, z: 10 },
      };

      const booth = await virtualEventsService.createBooth(boothData);

      expect(booth).toBeDefined();
      expect(booth.spaceId).toBe(space.id);
      expect(booth.companyName).toBe('Tech Corp');
      expect(booth.isActive).toBe(true);
    });
  });

  describe('getSpaceAnalytics', () => {
    it('should return analytics for a space', async () => {
      const space = await virtualEventsService.createEventSpace({
        name: 'Analytics Test Space',
        spaceType: 'conference' as const,
        sceneConfig: {
          environment: 'indoor' as const,
          lighting: { ambient: '#ffffff', directional: [] },
          floor: { color: '#cccccc', size: { width: 50, depth: 50 } },
          objects: [],
        },
      });

      const analytics = await virtualEventsService.getSpaceAnalytics(space.id);

      expect(analytics).toBeDefined();
      expect(analytics.totalVisitors).toBeGreaterThanOrEqual(0);
      expect(analytics.activeParticipants).toBeGreaterThanOrEqual(0);
      expect(analytics.boothVisits).toBeGreaterThanOrEqual(0);
      expect(analytics.presentationAttendance).toBeGreaterThanOrEqual(0);
      expect(analytics.averageSessionDuration).toBeGreaterThanOrEqual(0);
    });
  });
});

describe('ArBusinessCardService', () => {
  describe('createOrUpdateCard', () => {
    it('should create a new AR business card', async () => {
      const userId = 'test-user-id';
      const cardData = {
        name: 'John Doe',
        title: 'Software Engineer',
        company: 'Tech Corp',
        email: 'john@example.com',
        phone: '+1234567890',
        skills: ['JavaScript', 'React', 'Node.js'],
      };

      const card = await arBusinessCardService.createOrUpdateCard(
        userId,
        cardData
      );

      expect(card).toBeDefined();
      expect(card.userId).toBe(userId);
      expect(card.cardData.name).toBe(cardData.name);
      expect(card.arMarkerId).toBeDefined();
      expect(card.shareCount).toBe(0);
    });

    it('should update existing card', async () => {
      const userId = 'test-user-id-2';
      const cardData1 = {
        name: 'Jane Doe',
        title: 'Designer',
        company: 'Design Co',
        email: 'jane@example.com',
      };

      const card1 = await arBusinessCardService.createOrUpdateCard(
        userId,
        cardData1
      );

      const cardData2 = {
        ...cardData1,
        title: 'Senior Designer',
      };

      const card2 = await arBusinessCardService.createOrUpdateCard(
        userId,
        cardData2
      );

      expect(card2.id).toBe(card1.id);
      expect(card2.cardData.title).toBe('Senior Designer');
    });
  });

  describe('exchangeCards', () => {
    it('should exchange business cards between users', async () => {
      const senderId = 'sender-id';
      const receiverId = 'receiver-id';

      const senderCard = await arBusinessCardService.createOrUpdateCard(
        senderId,
        {
          name: 'Sender',
          title: 'Developer',
          company: 'Tech',
          email: 'sender@example.com',
        }
      );

      await arBusinessCardService.exchangeCards(senderId, receiverId);

      const updatedCard = await arBusinessCardService.getUserCard(senderId);
      expect(updatedCard?.shareCount).toBe(1);
    });

    it('should throw error if sender has no card', async () => {
      await expect(
        arBusinessCardService.exchangeCards('no-card-user', 'receiver')
      ).rejects.toThrow('Sender does not have a business card');
    });
  });

  describe('getExchangeStats', () => {
    it('should return exchange statistics', async () => {
      const userId = 'stats-user-id';

      await arBusinessCardService.createOrUpdateCard(userId, {
        name: 'Stats User',
        title: 'Engineer',
        company: 'Tech',
        email: 'stats@example.com',
      });

      const stats = await arBusinessCardService.getExchangeStats(userId);

      expect(stats).toBeDefined();
      expect(stats.totalSent).toBeGreaterThanOrEqual(0);
      expect(stats.totalReceived).toBeGreaterThanOrEqual(0);
      expect(stats.uniqueConnections).toBeGreaterThanOrEqual(0);
      expect(stats.recentExchanges).toBeGreaterThanOrEqual(0);
    });
  });
});

describe('AvatarService', () => {
  describe('createOrUpdateAvatar', () => {
    it('should create a new avatar', async () => {
      const userId = 'avatar-user-id';
      const config = {
        model: 'default' as const,
        appearance: {
          skinTone: '#f5d5b8',
          hairStyle: 'short',
          hairColor: '#2c1810',
          outfit: 'casual',
          accessories: ['glasses'],
        },
        animations: {
          idle: 'idle_standing',
          walk: 'walk_forward',
          talk: 'talk_gesture',
          wave: 'wave_hand',
        },
      };

      const avatar = await avatarService.createOrUpdateAvatar(userId, config);

      expect(avatar).toBeDefined();
      expect(avatar.userId).toBe(userId);
      expect(avatar.avatarConfig.appearance.skinTone).toBe(
        config.appearance.skinTone
      );
    });

    it('should validate avatar configuration', async () => {
      const userId = 'invalid-avatar-user';
      const invalidConfig = {
        model: 'default' as const,
        appearance: {},
        animations: {},
      } as any;

      await expect(
        avatarService.createOrUpdateAvatar(userId, invalidConfig)
      ).rejects.toThrow();
    });
  });

  describe('getAvailablePresets', () => {
    it('should return available avatar presets', () => {
      const presets = avatarService.getAvailablePresets();

      expect(presets).toBeDefined();
      expect(presets.length).toBeGreaterThan(0);
      expect(presets[0]).toHaveProperty('id');
      expect(presets[0]).toHaveProperty('name');
      expect(presets[0]).toHaveProperty('config');
    });
  });

  describe('getCustomizationOptions', () => {
    it('should return customization options', () => {
      const options = avatarService.getCustomizationOptions();

      expect(options).toBeDefined();
      expect(options.skinTones).toBeDefined();
      expect(options.hairStyles).toBeDefined();
      expect(options.hairColors).toBeDefined();
      expect(options.outfits).toBeDefined();
      expect(options.accessories).toBeDefined();
    });
  });
});

describe('DeviceCapabilityService', () => {
  describe('detectAndSaveCapabilities', () => {
    it('should save device capabilities', async () => {
      const userId = 'device-user-id';
      const capabilities = {
        supportsWebxr: true,
        supportsAr: true,
        supportsVr: false,
        deviceType: 'mobile' as const,
        performanceTier: 'medium' as const,
      };

      const saved = await deviceCapabilityService.detectAndSaveCapabilities(
        userId,
        capabilities
      );

      expect(saved).toBeDefined();
      expect(saved.userId).toBe(userId);
      expect(saved.supportsWebxr).toBe(true);
      expect(saved.deviceType).toBe('mobile');
    });
  });

  describe('getRecommendedSettings', () => {
    it('should return low settings for low tier', () => {
      const settings = deviceCapabilityService.getRecommendedSettings('low');

      expect(settings.renderDistance).toBe(20);
      expect(settings.shadowQuality).toBe('off');
      expect(settings.maxAvatars).toBe(10);
    });

    it('should return high settings for high tier', () => {
      const settings = deviceCapabilityService.getRecommendedSettings('high');

      expect(settings.renderDistance).toBe(100);
      expect(settings.shadowQuality).toBe('high');
      expect(settings.maxAvatars).toBe(50);
    });
  });

  describe('estimatePerformanceTier', () => {
    it('should estimate high tier for VR headsets', () => {
      const tier = deviceCapabilityService.estimatePerformanceTier({
        userAgent:
          'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 OculusQuest',
        hardwareConcurrency: 4,
      });

      expect(tier).toBe('high');
    });

    it('should estimate low tier for low-end mobile', () => {
      const tier = deviceCapabilityService.estimatePerformanceTier({
        userAgent:
          'Mozilla/5.0 (Linux; Android 8.0; Mobile) AppleWebKit/537.36',
        hardwareConcurrency: 2,
      });

      expect(tier).toBe('low');
    });

    it('should estimate medium tier for desktop', () => {
      const tier = deviceCapabilityService.estimatePerformanceTier({
        userAgent:
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        hardwareConcurrency: 4,
      });

      expect(tier).toBe('medium');
    });
  });

  describe('getFallbackMode', () => {
    it('should return webxr for supported devices', () => {
      const capability = {
        supportsWebxr: true,
        supportsAr: true,
        supportsVr: true,
        deviceType: 'vr_headset' as const,
        performanceTier: 'high' as const,
      } as any;

      const mode = deviceCapabilityService.getFallbackMode(capability);
      expect(mode).toBe('webxr');
    });

    it('should return 2d for null capability', () => {
      const mode = deviceCapabilityService.getFallbackMode(null);
      expect(mode).toBe('2d');
    });

    it('should return webgl for desktop without webxr', () => {
      const capability = {
        supportsWebxr: false,
        deviceType: 'desktop' as const,
        performanceTier: 'medium' as const,
      } as any;

      const mode = deviceCapabilityService.getFallbackMode(capability);
      expect(mode).toBe('webgl');
    });
  });
});
