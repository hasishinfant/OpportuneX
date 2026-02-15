// Virtual Events Service
// Manages virtual event spaces, sessions, and interactions

import {
  BoothConfig,
  SceneConfig,
  Vector3,
  VirtualBooth,
  VirtualEventSession,
  VirtualEventSpace,
  VirtualInteraction,
  VirtualPresentation,
} from '@/types/virtual-events';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class VirtualEventsService {
  // Create a new virtual event space
  async createEventSpace(data: {
    opportunityId?: string;
    name: string;
    description?: string;
    spaceType: 'conference' | 'exhibition' | 'networking' | 'workshop';
    maxParticipants?: number;
    sceneConfig: SceneConfig;
  }): Promise<VirtualEventSpace> {
    const space = await prisma.virtualEventSpace.create({
      data: {
        opportunityId: data.opportunityId,
        name: data.name,
        description: data.description,
        spaceType: data.spaceType,
        maxParticipants: data.maxParticipants || 100,
        sceneConfig: data.sceneConfig as any,
        isActive: true,
      },
    });

    return space as VirtualEventSpace;
  }

  // Get event space by ID
  async getEventSpace(spaceId: string): Promise<VirtualEventSpace | null> {
    const space = await prisma.virtualEventSpace.findUnique({
      where: { id: spaceId },
      include: {
        booths: true,
        presentations: true,
        sessions: {
          where: { isActive: true },
        },
      },
    });

    return space as VirtualEventSpace | null;
  }

  // List all active event spaces
  async listEventSpaces(filters?: {
    opportunityId?: string;
    spaceType?: string;
  }): Promise<VirtualEventSpace[]> {
    const spaces = await prisma.virtualEventSpace.findMany({
      where: {
        isActive: true,
        ...(filters?.opportunityId && { opportunityId: filters.opportunityId }),
        ...(filters?.spaceType && { spaceType: filters.spaceType }),
      },
      include: {
        sessions: {
          where: { isActive: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return spaces as VirtualEventSpace[];
  }

  // Join a virtual event space
  async joinEventSpace(
    spaceId: string,
    userId: string,
    initialPosition?: Vector3
  ): Promise<VirtualEventSession> {
    // Check if space exists and has capacity
    const space = await prisma.virtualEventSpace.findUnique({
      where: { id: spaceId },
      include: {
        sessions: {
          where: { isActive: true },
        },
      },
    });

    if (!space) {
      throw new Error('Event space not found');
    }

    if (space.sessions.length >= space.maxParticipants) {
      throw new Error('Event space is at maximum capacity');
    }

    // Check if user already has an active session
    const existingSession = await prisma.virtualEventSession.findFirst({
      where: {
        spaceId,
        userId,
        isActive: true,
      },
    });

    if (existingSession) {
      return existingSession as VirtualEventSession;
    }

    // Create new session
    const sessionToken = this.generateSessionToken();
    const session = await prisma.virtualEventSession.create({
      data: {
        spaceId,
        userId,
        sessionToken,
        position: initialPosition || { x: 0, y: 0, z: 0 },
        rotation: { x: 0, y: 0, z: 0 },
        isActive: true,
      },
    });

    return session as VirtualEventSession;
  }

  // Leave a virtual event space
  async leaveEventSpace(sessionId: string): Promise<void> {
    await prisma.virtualEventSession.update({
      where: { id: sessionId },
      data: {
        isActive: false,
        leftAt: new Date(),
      },
    });
  }

  // Update user position in virtual space
  async updateUserPosition(
    sessionId: string,
    position: Vector3,
    rotation: Vector3
  ): Promise<void> {
    await prisma.virtualEventSession.update({
      where: { id: sessionId },
      data: {
        position: position as any,
        rotation: rotation as any,
      },
    });
  }

  // Get active participants in a space
  async getActiveParticipants(spaceId: string): Promise<VirtualEventSession[]> {
    const sessions = await prisma.virtualEventSession.findMany({
      where: {
        spaceId,
        isActive: true,
      },
      orderBy: { joinedAt: 'asc' },
    });

    return sessions as VirtualEventSession[];
  }

  // Create a virtual booth
  async createBooth(data: {
    spaceId: string;
    companyName: string;
    boothConfig: BoothConfig;
    position: Vector3;
  }): Promise<VirtualBooth> {
    const booth = await prisma.virtualBooth.create({
      data: {
        spaceId: data.spaceId,
        companyName: data.companyName,
        boothConfig: data.boothConfig as any,
        position: data.position as any,
        isActive: true,
      },
    });

    return booth as VirtualBooth;
  }

  // Get booths in a space
  async getBooths(spaceId: string): Promise<VirtualBooth[]> {
    const booths = await prisma.virtualBooth.findMany({
      where: {
        spaceId,
        isActive: true,
      },
    });

    return booths as VirtualBooth[];
  }

  // Create a virtual presentation
  async createPresentation(data: {
    spaceId: string;
    presenterId: string;
    title: string;
    description?: string;
    contentUrl?: string;
    contentType?: 'slides' | 'video' | '3d_model' | 'screen_share';
    scheduledAt?: Date;
  }): Promise<VirtualPresentation> {
    const presentation = await prisma.virtualPresentation.create({
      data: {
        spaceId: data.spaceId,
        presenterId: data.presenterId,
        title: data.title,
        description: data.description,
        contentUrl: data.contentUrl,
        contentType: data.contentType,
        scheduledAt: data.scheduledAt,
        isActive: true,
      },
    });

    return presentation as VirtualPresentation;
  }

  // Start a presentation
  async startPresentation(presentationId: string): Promise<void> {
    await prisma.virtualPresentation.update({
      where: { id: presentationId },
      data: {
        startedAt: new Date(),
      },
    });
  }

  // End a presentation
  async endPresentation(presentationId: string): Promise<void> {
    await prisma.virtualPresentation.update({
      where: { id: presentationId },
      data: {
        endedAt: new Date(),
        isActive: false,
      },
    });
  }

  // Log a virtual interaction
  async logInteraction(data: {
    spaceId: string;
    userId: string;
    interactionType: 'booth_visit' | 'presentation_attend' | 'chat' | 'gesture';
    targetId?: string;
    metadata?: Record<string, any>;
  }): Promise<VirtualInteraction> {
    const interaction = await prisma.virtualInteraction.create({
      data: {
        spaceId: data.spaceId,
        userId: data.userId,
        interactionType: data.interactionType,
        targetId: data.targetId,
        metadata: data.metadata as any,
      },
    });

    return interaction as VirtualInteraction;
  }

  // Get interaction analytics for a space
  async getSpaceAnalytics(spaceId: string): Promise<{
    totalVisitors: number;
    activeParticipants: number;
    boothVisits: number;
    presentationAttendance: number;
    averageSessionDuration: number;
  }> {
    const [totalSessions, activeSessions, boothVisits, presentationAttendance] =
      await Promise.all([
        prisma.virtualEventSession.count({
          where: { spaceId },
        }),
        prisma.virtualEventSession.count({
          where: { spaceId, isActive: true },
        }),
        prisma.virtualInteraction.count({
          where: { spaceId, interactionType: 'booth_visit' },
        }),
        prisma.virtualInteraction.count({
          where: { spaceId, interactionType: 'presentation_attend' },
        }),
      ]);

    // Calculate average session duration
    const completedSessions = await prisma.virtualEventSession.findMany({
      where: {
        spaceId,
        isActive: false,
        leftAt: { not: null },
      },
      select: {
        joinedAt: true,
        leftAt: true,
      },
    });

    const totalDuration = completedSessions.reduce((sum, session) => {
      if (session.leftAt) {
        return sum + (session.leftAt.getTime() - session.joinedAt.getTime());
      }
      return sum;
    }, 0);

    const averageSessionDuration =
      completedSessions.length > 0
        ? totalDuration / completedSessions.length / 1000 / 60 // Convert to minutes
        : 0;

    return {
      totalVisitors: totalSessions,
      activeParticipants: activeSessions,
      boothVisits,
      presentationAttendance,
      averageSessionDuration: Math.round(averageSessionDuration),
    };
  }

  // Generate a unique session token
  private generateSessionToken(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  }

  // Update event space configuration
  async updateEventSpace(
    spaceId: string,
    updates: {
      name?: string;
      description?: string;
      maxParticipants?: number;
      sceneConfig?: SceneConfig;
      isActive?: boolean;
    }
  ): Promise<VirtualEventSpace> {
    const space = await prisma.virtualEventSpace.update({
      where: { id: spaceId },
      data: {
        ...(updates.name && { name: updates.name }),
        ...(updates.description !== undefined && {
          description: updates.description,
        }),
        ...(updates.maxParticipants && {
          maxParticipants: updates.maxParticipants,
        }),
        ...(updates.sceneConfig && { sceneConfig: updates.sceneConfig as any }),
        ...(updates.isActive !== undefined && { isActive: updates.isActive }),
      },
    });

    return space as VirtualEventSpace;
  }

  // Delete event space
  async deleteEventSpace(spaceId: string): Promise<void> {
    await prisma.virtualEventSpace.delete({
      where: { id: spaceId },
    });
  }
}

export const virtualEventsService = new VirtualEventsService();
