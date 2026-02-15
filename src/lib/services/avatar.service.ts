// Avatar Service
// Manages user avatars for virtual events

import { AvatarConfig, UserAvatar } from '@/types/virtual-events';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class AvatarService {
  // Default avatar configurations
  private defaultAvatarConfigs: Record<string, AvatarConfig> = {
    default_male: {
      model: 'default',
      appearance: {
        skinTone: '#f5d5b8',
        hairStyle: 'short',
        hairColor: '#2c1810',
        outfit: 'casual',
        accessories: [],
      },
      animations: {
        idle: 'idle_standing',
        walk: 'walk_forward',
        talk: 'talk_gesture',
        wave: 'wave_hand',
      },
    },
    default_female: {
      model: 'default',
      appearance: {
        skinTone: '#f5d5b8',
        hairStyle: 'long',
        hairColor: '#2c1810',
        outfit: 'casual',
        accessories: [],
      },
      animations: {
        idle: 'idle_standing',
        walk: 'walk_forward',
        talk: 'talk_gesture',
        wave: 'wave_hand',
      },
    },
    professional: {
      model: 'default',
      appearance: {
        skinTone: '#f5d5b8',
        hairStyle: 'professional',
        hairColor: '#2c1810',
        outfit: 'business',
        accessories: ['glasses'],
      },
      animations: {
        idle: 'idle_standing',
        walk: 'walk_confident',
        talk: 'talk_professional',
        wave: 'wave_hand',
      },
    },
  };

  // Create or update user avatar
  async createOrUpdateAvatar(
    userId: string,
    avatarConfig: AvatarConfig
  ): Promise<UserAvatar> {
    // Validate avatar configuration
    this.validateAvatarConfig(avatarConfig);

    // Check if user already has an avatar
    const existingAvatar = await prisma.userAvatar.findUnique({
      where: { userId },
    });

    if (existingAvatar) {
      const updated = await prisma.userAvatar.update({
        where: { userId },
        data: {
          avatarConfig: avatarConfig as any,
        },
      });
      return updated as UserAvatar;
    }

    const avatar = await prisma.userAvatar.create({
      data: {
        userId,
        avatarConfig: avatarConfig as any,
      },
    });

    return avatar as UserAvatar;
  }

  // Get user avatar
  async getUserAvatar(userId: string): Promise<UserAvatar | null> {
    const avatar = await prisma.userAvatar.findUnique({
      where: { userId },
    });

    return avatar as UserAvatar | null;
  }

  // Get or create default avatar for user
  async getOrCreateDefaultAvatar(
    userId: string,
    preset: 'default_male' | 'default_female' | 'professional' = 'default_male'
  ): Promise<UserAvatar> {
    const existingAvatar = await this.getUserAvatar(userId);
    if (existingAvatar) {
      return existingAvatar;
    }

    const defaultConfig = this.defaultAvatarConfigs[preset];
    return this.createOrUpdateAvatar(userId, defaultConfig);
  }

  // Update avatar appearance
  async updateAppearance(
    userId: string,
    appearance: Partial<AvatarConfig['appearance']>
  ): Promise<UserAvatar> {
    const avatar = await this.getUserAvatar(userId);
    if (!avatar) {
      throw new Error('Avatar not found');
    }

    const updatedConfig: AvatarConfig = {
      ...avatar.avatarConfig,
      appearance: {
        ...avatar.avatarConfig.appearance,
        ...appearance,
      },
    };

    return this.createOrUpdateAvatar(userId, updatedConfig);
  }

  // Update avatar animations
  async updateAnimations(
    userId: string,
    animations: Partial<AvatarConfig['animations']>
  ): Promise<UserAvatar> {
    const avatar = await this.getUserAvatar(userId);
    if (!avatar) {
      throw new Error('Avatar not found');
    }

    const updatedConfig: AvatarConfig = {
      ...avatar.avatarConfig,
      animations: {
        ...avatar.avatarConfig.animations,
        ...animations,
      },
    };

    return this.createOrUpdateAvatar(userId, updatedConfig);
  }

  // Set custom avatar model
  async setCustomModel(userId: string, modelUrl: string): Promise<UserAvatar> {
    const avatar = await this.getUserAvatar(userId);
    if (!avatar) {
      throw new Error('Avatar not found');
    }

    const updatedConfig: AvatarConfig = {
      ...avatar.avatarConfig,
      model: 'custom',
      modelUrl,
    };

    return this.createOrUpdateAvatar(userId, updatedConfig);
  }

  // Get available avatar presets
  getAvailablePresets(): Array<{
    id: string;
    name: string;
    config: AvatarConfig;
  }> {
    return [
      {
        id: 'default_male',
        name: 'Default Male',
        config: this.defaultAvatarConfigs.default_male,
      },
      {
        id: 'default_female',
        name: 'Default Female',
        config: this.defaultAvatarConfigs.default_female,
      },
      {
        id: 'professional',
        name: 'Professional',
        config: this.defaultAvatarConfigs.professional,
      },
    ];
  }

  // Validate avatar configuration
  private validateAvatarConfig(config: AvatarConfig): void {
    if (!config.model) {
      throw new Error('Avatar model is required');
    }

    if (config.model === 'custom' && !config.modelUrl) {
      throw new Error('Model URL is required for custom avatars');
    }

    if (!config.appearance) {
      throw new Error('Avatar appearance is required');
    }

    if (!config.animations) {
      throw new Error('Avatar animations are required');
    }

    // Validate required animations
    const requiredAnimations = ['idle', 'walk', 'talk', 'wave'];
    for (const anim of requiredAnimations) {
      if (!config.animations[anim]) {
        throw new Error(`Required animation '${anim}' is missing`);
      }
    }
  }

  // Delete user avatar
  async deleteAvatar(userId: string): Promise<void> {
    await prisma.userAvatar.delete({
      where: { userId },
    });
  }

  // Get avatar customization options
  getCustomizationOptions(): {
    skinTones: string[];
    hairStyles: string[];
    hairColors: string[];
    outfits: string[];
    accessories: string[];
  } {
    return {
      skinTones: [
        '#f5d5b8',
        '#e8b896',
        '#d4a574',
        '#c68642',
        '#8d5524',
        '#5c3317',
      ],
      hairStyles: [
        'short',
        'medium',
        'long',
        'curly',
        'straight',
        'professional',
        'casual',
      ],
      hairColors: [
        '#000000',
        '#2c1810',
        '#4a2511',
        '#6a3410',
        '#8b4513',
        '#d2691e',
        '#daa520',
        '#ffd700',
      ],
      outfits: ['casual', 'business', 'formal', 'sporty', 'creative'],
      accessories: [
        'glasses',
        'sunglasses',
        'hat',
        'cap',
        'headphones',
        'watch',
        'backpack',
      ],
    };
  }
}

export const avatarService = new AvatarService();
