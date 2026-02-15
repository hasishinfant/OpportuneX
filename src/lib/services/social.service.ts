import { PrismaClient } from '@prisma/client';
import type { ApiResponse, PaginatedResponse } from '../../types';

const prisma = new PrismaClient();

export interface PublicUserProfile {
  id: string;
  name: string;
  institution?: string;
  degree?: string;
  technicalSkills: string[];
  domains: string[];
  followerCount: number;
  followingCount: number;
  isFollowing?: boolean;
}

export interface ActivityFeedItem {
  id: string;
  user: {
    id: string;
    name: string;
  };
  activityType: string;
  entityId: string;
  entityType: string;
  metadata?: any;
  createdAt: Date;
}

export interface DiscussionThread {
  id: string;
  opportunityId: string;
  user: {
    id: string;
    name: string;
  };
  title: string;
  content: string;
  commentCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CommentData {
  id: string;
  user: {
    id: string;
    name: string;
  };
  content: string;
  parentId?: string;
  replies?: CommentData[];
  createdAt: Date;
  updatedAt: Date;
}

export interface TeamData {
  id: string;
  name: string;
  description?: string;
  opportunityId?: string;
  creator: {
    id: string;
    name: string;
  };
  memberCount: number;
  maxMembers: number;
  isPublic: boolean;
  createdAt: Date;
}

export interface DirectMessageData {
  id: string;
  sender: {
    id: string;
    name: string;
  };
  receiver: {
    id: string;
    name: string;
  };
  content: string;
  isRead: boolean;
  createdAt: Date;
}

export class SocialService {
  /**
   * Get public user profile
   */
  async getPublicProfile(
    userId: string,
    viewerId?: string
  ): Promise<ApiResponse<PublicUserProfile>> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          name: true,
          institution: true,
          degree: true,
          technicalSkills: true,
          domains: true,
          followers: true,
          following: true,
        },
      });

      if (!user) {
        return {
          success: false,
          error: 'User not found',
        };
      }

      let isFollowing = false;
      if (viewerId) {
        const follow = await prisma.userFollow.findUnique({
          where: {
            followerId_followingId: {
              followerId: viewerId,
              followingId: userId,
            },
          },
        });
        isFollowing = !!follow;
      }

      const profile: PublicUserProfile = {
        id: user.id,
        name: user.name,
        institution: user.institution || undefined,
        degree: user.degree || undefined,
        technicalSkills: user.technicalSkills || [],
        domains: user.domains || [],
        followerCount: user.followers.length,
        followingCount: user.following.length,
        isFollowing,
      };

      return {
        success: true,
        data: profile,
      };
    } catch (error) {
      console.error('Get public profile error:', error);
      return {
        success: false,
        error: 'Failed to retrieve public profile',
      };
    }
  }

  /**
   * Follow a user
   */
  async followUser(
    followerId: string,
    followingId: string
  ): Promise<ApiResponse<null>> {
    try {
      if (followerId === followingId) {
        return {
          success: false,
          error: 'Cannot follow yourself',
        };
      }

      await prisma.userFollow.create({
        data: {
          followerId,
          followingId,
        },
      });

      // Create activity
      await this.createActivity(
        followerId,
        'joined_team',
        followingId,
        'user',
        { action: 'followed' }
      );

      return {
        success: true,
        message: 'User followed successfully',
      };
    } catch (error) {
      console.error('Follow user error:', error);
      return {
        success: false,
        error: 'Failed to follow user',
      };
    }
  }

  /**
   * Unfollow a user
   */
  async unfollowUser(
    followerId: string,
    followingId: string
  ): Promise<ApiResponse<null>> {
    try {
      await prisma.userFollow.deleteMany({
        where: {
          followerId,
          followingId,
        },
      });

      return {
        success: true,
        message: 'User unfollowed successfully',
      };
    } catch (error) {
      console.error('Unfollow user error:', error);
      return {
        success: false,
        error: 'Failed to unfollow user',
      };
    }
  }

  /**
   * Get user's followers
   */
  async getFollowers(
    userId: string,
    page = 1,
    limit = 20
  ): Promise<ApiResponse<PaginatedResponse<PublicUserProfile>>> {
    try {
      const skip = (page - 1) * limit;

      const [followers, total] = await Promise.all([
        prisma.userFollow.findMany({
          where: { followingId: userId },
          skip,
          take: limit,
          include: {
            follower: {
              select: {
                id: true,
                name: true,
                institution: true,
                degree: true,
                technicalSkills: true,
                domains: true,
                followers: true,
                following: true,
              },
            },
          },
        }),
        prisma.userFollow.count({
          where: { followingId: userId },
        }),
      ]);

      const profiles: PublicUserProfile[] = followers.map(f => ({
        id: f.follower.id,
        name: f.follower.name,
        institution: f.follower.institution || undefined,
        degree: f.follower.degree || undefined,
        technicalSkills: f.follower.technicalSkills || [],
        domains: f.follower.domains || [],
        followerCount: f.follower.followers.length,
        followingCount: f.follower.following.length,
      }));

      return {
        success: true,
        data: {
          data: profiles,
          pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
            hasNext: page * limit < total,
            hasPrev: page > 1,
          },
        },
      };
    } catch (error) {
      console.error('Get followers error:', error);
      return {
        success: false,
        error: 'Failed to retrieve followers',
      };
    }
  }

  /**
   * Get users that a user is following
   */
  async getFollowing(
    userId: string,
    page = 1,
    limit = 20
  ): Promise<ApiResponse<PaginatedResponse<PublicUserProfile>>> {
    try {
      const skip = (page - 1) * limit;

      const [following, total] = await Promise.all([
        prisma.userFollow.findMany({
          where: { followerId: userId },
          skip,
          take: limit,
          include: {
            following: {
              select: {
                id: true,
                name: true,
                institution: true,
                degree: true,
                technicalSkills: true,
                domains: true,
                followers: true,
                following: true,
              },
            },
          },
        }),
        prisma.userFollow.count({
          where: { followerId: userId },
        }),
      ]);

      const profiles: PublicUserProfile[] = following.map(f => ({
        id: f.following.id,
        name: f.following.name,
        institution: f.following.institution || undefined,
        degree: f.following.degree || undefined,
        technicalSkills: f.following.technicalSkills || [],
        domains: f.following.domains || [],
        followerCount: f.following.followers.length,
        followingCount: f.following.following.length,
      }));

      return {
        success: true,
        data: {
          data: profiles,
          pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
            hasNext: page * limit < total,
            hasPrev: page > 1,
          },
        },
      };
    } catch (error) {
      console.error('Get following error:', error);
      return {
        success: false,
        error: 'Failed to retrieve following list',
      };
    }
  }

  /**
   * Get activity feed for a user (from people they follow)
   */
  async getActivityFeed(
    userId: string,
    page = 1,
    limit = 20
  ): Promise<ApiResponse<PaginatedResponse<ActivityFeedItem>>> {
    try {
      const skip = (page - 1) * limit;

      // Get list of users that the current user follows
      const following = await prisma.userFollow.findMany({
        where: { followerId: userId },
        select: { followingId: true },
      });

      const followingIds = following.map(f => f.followingId);

      const [activities, total] = await Promise.all([
        prisma.activityFeed.findMany({
          where: {
            userId: { in: followingIds },
          },
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
          include: {
            user: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        }),
        prisma.activityFeed.count({
          where: {
            userId: { in: followingIds },
          },
        }),
      ]);

      const feedItems: ActivityFeedItem[] = activities.map(a => ({
        id: a.id,
        user: a.user,
        activityType: a.activityType,
        entityId: a.entityId,
        entityType: a.entityType,
        metadata: a.metadata,
        createdAt: a.createdAt,
      }));

      return {
        success: true,
        data: {
          data: feedItems,
          pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
            hasNext: page * limit < total,
            hasPrev: page > 1,
          },
        },
      };
    } catch (error) {
      console.error('Get activity feed error:', error);
      return {
        success: false,
        error: 'Failed to retrieve activity feed',
      };
    }
  }

  /**
   * Create an activity
   */
  async createActivity(
    userId: string,
    activityType: string,
    entityId: string,
    entityType: string,
    metadata?: any
  ): Promise<ApiResponse<null>> {
    try {
      await prisma.activityFeed.create({
        data: {
          userId,
          activityType: activityType as any,
          entityId,
          entityType,
          metadata,
        },
      });

      return {
        success: true,
        message: 'Activity created successfully',
      };
    } catch (error) {
      console.error('Create activity error:', error);
      return {
        success: false,
        error: 'Failed to create activity',
      };
    }
  }

  /**
   * Get discussions for an opportunity
   */
  async getDiscussions(
    opportunityId: string,
    page = 1,
    limit = 20
  ): Promise<ApiResponse<PaginatedResponse<DiscussionThread>>> {
    try {
      const skip = (page - 1) * limit;

      const [discussions, total] = await Promise.all([
        prisma.discussion.findMany({
          where: {
            opportunityId,
            isActive: true,
          },
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
          include: {
            user: {
              select: {
                id: true,
                name: true,
              },
            },
            comments: {
              where: { isActive: true },
            },
          },
        }),
        prisma.discussion.count({
          where: {
            opportunityId,
            isActive: true,
          },
        }),
      ]);

      const threads: DiscussionThread[] = discussions.map(d => ({
        id: d.id,
        opportunityId: d.opportunityId,
        user: d.user,
        title: d.title,
        content: d.content,
        commentCount: d.comments.length,
        createdAt: d.createdAt,
        updatedAt: d.updatedAt,
      }));

      return {
        success: true,
        data: {
          data: threads,
          pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
            hasNext: page * limit < total,
            hasPrev: page > 1,
          },
        },
      };
    } catch (error) {
      console.error('Get discussions error:', error);
      return {
        success: false,
        error: 'Failed to retrieve discussions',
      };
    }
  }

  /**
   * Create a discussion
   */
  async createDiscussion(
    opportunityId: string,
    userId: string,
    title: string,
    content: string
  ): Promise<ApiResponse<DiscussionThread>> {
    try {
      const discussion = await prisma.discussion.create({
        data: {
          opportunityId,
          userId,
          title,
          content,
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      return {
        success: true,
        data: {
          id: discussion.id,
          opportunityId: discussion.opportunityId,
          user: discussion.user,
          title: discussion.title,
          content: discussion.content,
          commentCount: 0,
          createdAt: discussion.createdAt,
          updatedAt: discussion.updatedAt,
        },
      };
    } catch (error) {
      console.error('Create discussion error:', error);
      return {
        success: false,
        error: 'Failed to create discussion',
      };
    }
  }

  /**
   * Get comments for a discussion
   */
  async getComments(discussionId: string): Promise<ApiResponse<CommentData[]>> {
    try {
      const comments = await prisma.comment.findMany({
        where: {
          discussionId,
          isActive: true,
          parentId: null, // Get only top-level comments
        },
        orderBy: { createdAt: 'asc' },
        include: {
          user: {
            select: {
              id: true,
              name: true,
            },
          },
          replies: {
            where: { isActive: true },
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
            orderBy: { createdAt: 'asc' },
          },
        },
      });

      const commentData: CommentData[] = comments.map(c => ({
        id: c.id,
        user: c.user,
        content: c.content,
        parentId: c.parentId || undefined,
        replies: c.replies.map(r => ({
          id: r.id,
          user: r.user,
          content: r.content,
          parentId: r.parentId || undefined,
          createdAt: r.createdAt,
          updatedAt: r.updatedAt,
        })),
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
      }));

      return {
        success: true,
        data: commentData,
      };
    } catch (error) {
      console.error('Get comments error:', error);
      return {
        success: false,
        error: 'Failed to retrieve comments',
      };
    }
  }

  /**
   * Add a comment to a discussion
   */
  async addComment(
    discussionId: string,
    userId: string,
    content: string,
    parentId?: string
  ): Promise<ApiResponse<CommentData>> {
    try {
      const comment = await prisma.comment.create({
        data: {
          discussionId,
          userId,
          content,
          parentId,
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      return {
        success: true,
        data: {
          id: comment.id,
          user: comment.user,
          content: comment.content,
          parentId: comment.parentId || undefined,
          createdAt: comment.createdAt,
          updatedAt: comment.updatedAt,
        },
      };
    } catch (error) {
      console.error('Add comment error:', error);
      return {
        success: false,
        error: 'Failed to add comment',
      };
    }
  }

  /**
   * Create a team
   */
  async createTeam(
    name: string,
    creatorId: string,
    description?: string,
    opportunityId?: string,
    maxMembers = 5,
    isPublic = true
  ): Promise<ApiResponse<TeamData>> {
    try {
      const team = await prisma.team.create({
        data: {
          name,
          description,
          opportunityId,
          creatorId,
          maxMembers,
          isPublic,
        },
        include: {
          creator: {
            select: {
              id: true,
              name: true,
            },
          },
          members: true,
        },
      });

      // Add creator as admin member
      await prisma.teamMember.create({
        data: {
          teamId: team.id,
          userId: creatorId,
          role: 'admin',
        },
      });

      // Create activity
      await this.createActivity(creatorId, 'joined_team', team.id, 'team', {
        action: 'created',
      });

      return {
        success: true,
        data: {
          id: team.id,
          name: team.name,
          description: team.description || undefined,
          opportunityId: team.opportunityId || undefined,
          creator: team.creator,
          memberCount: 1,
          maxMembers: team.maxMembers,
          isPublic: team.isPublic,
          createdAt: team.createdAt,
        },
      };
    } catch (error) {
      console.error('Create team error:', error);
      return {
        success: false,
        error: 'Failed to create team',
      };
    }
  }

  /**
   * Get teams
   */
  async getTeams(
    opportunityId?: string,
    page = 1,
    limit = 20
  ): Promise<ApiResponse<PaginatedResponse<TeamData>>> {
    try {
      const skip = (page - 1) * limit;

      const where: any = {
        isActive: true,
        isPublic: true,
      };

      if (opportunityId) {
        where.opportunityId = opportunityId;
      }

      const [teams, total] = await Promise.all([
        prisma.team.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
          include: {
            creator: {
              select: {
                id: true,
                name: true,
              },
            },
            members: true,
          },
        }),
        prisma.team.count({ where }),
      ]);

      const teamData: TeamData[] = teams.map(t => ({
        id: t.id,
        name: t.name,
        description: t.description || undefined,
        opportunityId: t.opportunityId || undefined,
        creator: t.creator,
        memberCount: t.members.length,
        maxMembers: t.maxMembers,
        isPublic: t.isPublic,
        createdAt: t.createdAt,
      }));

      return {
        success: true,
        data: {
          data: teamData,
          pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
            hasNext: page * limit < total,
            hasPrev: page > 1,
          },
        },
      };
    } catch (error) {
      console.error('Get teams error:', error);
      return {
        success: false,
        error: 'Failed to retrieve teams',
      };
    }
  }

  /**
   * Join a team
   */
  async joinTeam(teamId: string, userId: string): Promise<ApiResponse<null>> {
    try {
      const team = await prisma.team.findUnique({
        where: { id: teamId },
        include: { members: true },
      });

      if (!team) {
        return {
          success: false,
          error: 'Team not found',
        };
      }

      if (team.members.length >= team.maxMembers) {
        return {
          success: false,
          error: 'Team is full',
        };
      }

      await prisma.teamMember.create({
        data: {
          teamId,
          userId,
          role: 'member',
        },
      });

      // Create activity
      await this.createActivity(userId, 'joined_team', teamId, 'team', {
        action: 'joined',
      });

      return {
        success: true,
        message: 'Joined team successfully',
      };
    } catch (error) {
      console.error('Join team error:', error);
      return {
        success: false,
        error: 'Failed to join team',
      };
    }
  }

  /**
   * Leave a team
   */
  async leaveTeam(teamId: string, userId: string): Promise<ApiResponse<null>> {
    try {
      await prisma.teamMember.deleteMany({
        where: {
          teamId,
          userId,
        },
      });

      return {
        success: true,
        message: 'Left team successfully',
      };
    } catch (error) {
      console.error('Leave team error:', error);
      return {
        success: false,
        error: 'Failed to leave team',
      };
    }
  }

  /**
   * Send a direct message
   */
  async sendDirectMessage(
    senderId: string,
    receiverId: string,
    content: string
  ): Promise<ApiResponse<DirectMessageData>> {
    try {
      const message = await prisma.directMessage.create({
        data: {
          senderId,
          receiverId,
          content,
        },
        include: {
          sender: {
            select: {
              id: true,
              name: true,
            },
          },
          receiver: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      return {
        success: true,
        data: {
          id: message.id,
          sender: message.sender,
          receiver: message.receiver,
          content: message.content,
          isRead: message.isRead,
          createdAt: message.createdAt,
        },
      };
    } catch (error) {
      console.error('Send direct message error:', error);
      return {
        success: false,
        error: 'Failed to send message',
      };
    }
  }

  /**
   * Get direct messages between two users
   */
  async getDirectMessages(
    userId: string,
    otherUserId: string,
    page = 1,
    limit = 50
  ): Promise<ApiResponse<PaginatedResponse<DirectMessageData>>> {
    try {
      const skip = (page - 1) * limit;

      const [messages, total] = await Promise.all([
        prisma.directMessage.findMany({
          where: {
            OR: [
              { senderId: userId, receiverId: otherUserId },
              { senderId: otherUserId, receiverId: userId },
            ],
          },
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
          include: {
            sender: {
              select: {
                id: true,
                name: true,
              },
            },
            receiver: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        }),
        prisma.directMessage.count({
          where: {
            OR: [
              { senderId: userId, receiverId: otherUserId },
              { senderId: otherUserId, receiverId: userId },
            ],
          },
        }),
      ]);

      // Mark messages as read
      await prisma.directMessage.updateMany({
        where: {
          senderId: otherUserId,
          receiverId: userId,
          isRead: false,
        },
        data: {
          isRead: true,
        },
      });

      const messageData: DirectMessageData[] = messages.map(m => ({
        id: m.id,
        sender: m.sender,
        receiver: m.receiver,
        content: m.content,
        isRead: m.isRead,
        createdAt: m.createdAt,
      }));

      return {
        success: true,
        data: {
          data: messageData,
          pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
            hasNext: page * limit < total,
            hasPrev: page > 1,
          },
        },
      };
    } catch (error) {
      console.error('Get direct messages error:', error);
      return {
        success: false,
        error: 'Failed to retrieve messages',
      };
    }
  }

  /**
   * Share content with another user
   */
  async shareContent(
    userId: string,
    contentType: 'opportunity' | 'roadmap',
    contentId: string,
    sharedWithId?: string,
    message?: string,
    isPublic = false
  ): Promise<ApiResponse<null>> {
    try {
      await prisma.sharedContent.create({
        data: {
          userId,
          contentType: contentType as any,
          contentId,
          sharedWithId,
          message,
          isPublic,
        },
      });

      // Create activity
      await this.createActivity(
        userId,
        'shared_opportunity',
        contentId,
        contentType,
        { sharedWith: sharedWithId, message }
      );

      return {
        success: true,
        message: 'Content shared successfully',
      };
    } catch (error) {
      console.error('Share content error:', error);
      return {
        success: false,
        error: 'Failed to share content',
      };
    }
  }

  /**
   * Get shared content for a user
   */
  async getSharedContent(
    userId: string,
    page = 1,
    limit = 20
  ): Promise<ApiResponse<PaginatedResponse<any>>> {
    try {
      const skip = (page - 1) * limit;

      const [shares, total] = await Promise.all([
        prisma.sharedContent.findMany({
          where: {
            OR: [{ sharedWithId: userId }, { userId, isPublic: true }],
          },
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
          include: {
            user: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        }),
        prisma.sharedContent.count({
          where: {
            OR: [{ sharedWithId: userId }, { userId, isPublic: true }],
          },
        }),
      ]);

      return {
        success: true,
        data: {
          data: shares,
          pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
            hasNext: page * limit < total,
            hasPrev: page > 1,
          },
        },
      };
    } catch (error) {
      console.error('Get shared content error:', error);
      return {
        success: false,
        error: 'Failed to retrieve shared content',
      };
    }
  }
}

export const socialService = new SocialService();
