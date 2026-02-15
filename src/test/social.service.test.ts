import { describe, expect, it, jest } from '@jest/globals';
import { socialService } from '../lib/services/social.service';

// Mock Prisma Client
jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({
    user: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    userFollow: {
      create: jest.fn(),
      deleteMany: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
    activityFeed: {
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
    discussion: {
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
    comment: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
    team: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
    teamMember: {
      create: jest.fn(),
      deleteMany: jest.fn(),
    },
    directMessage: {
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      updateMany: jest.fn(),
    },
    sharedContent: {
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
  })),
}));

describe('SocialService', () => {
  describe('followUser', () => {
    it('should successfully follow a user', async () => {
      const result = await socialService.followUser('user1', 'user2');
      expect(result.success).toBe(true);
    });

    it('should not allow following yourself', async () => {
      const result = await socialService.followUser('user1', 'user1');
      expect(result.success).toBe(false);
      expect(result.error).toBe('Cannot follow yourself');
    });
  });

  describe('createTeam', () => {
    it('should create a team with valid data', async () => {
      const result = await socialService.createTeam(
        'Test Team',
        'creator123',
        'Team description',
        undefined,
        5,
        true
      );
      expect(result.success).toBe(true);
    });
  });

  describe('shareContent', () => {
    it('should share content successfully', async () => {
      const result = await socialService.shareContent(
        'user123',
        'opportunity',
        'opp123',
        'user456',
        'Check this out!',
        false
      );
      expect(result.success).toBe(true);
    });
  });

  describe('sendDirectMessage', () => {
    it('should send a direct message', async () => {
      const result = await socialService.sendDirectMessage(
        'sender123',
        'receiver456',
        'Hello!'
      );
      expect(result.success).toBe(true);
    });
  });

  describe('createDiscussion', () => {
    it('should create a discussion thread', async () => {
      const result = await socialService.createDiscussion(
        'opp123',
        'user123',
        'Discussion Title',
        'Discussion content'
      );
      expect(result.success).toBe(true);
    });
  });
});
