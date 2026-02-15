// AR Business Card Service
// Manages AR-enabled digital business cards and exchanges

import { ArBusinessCard, ArBusinessCardData } from '@/types/virtual-events';
import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();

export class ArBusinessCardService {
  // Create or update AR business card
  async createOrUpdateCard(
    userId: string,
    cardData: ArBusinessCardData
  ): Promise<ArBusinessCard> {
    // Check if user already has a card
    const existingCard = await prisma.arBusinessCard.findFirst({
      where: { userId },
    });

    const arMarkerId = this.generateArMarkerId(userId);

    if (existingCard) {
      const updated = await prisma.arBusinessCard.update({
        where: { id: existingCard.id },
        data: {
          cardData: cardData as any,
          arMarkerId,
        },
      });
      return updated as ArBusinessCard;
    }

    const card = await prisma.arBusinessCard.create({
      data: {
        userId,
        cardData: cardData as any,
        arMarkerId,
        shareCount: 0,
      },
    });

    return card as ArBusinessCard;
  }

  // Get user's business card
  async getUserCard(userId: string): Promise<ArBusinessCard | null> {
    const card = await prisma.arBusinessCard.findFirst({
      where: { userId },
    });

    return card as ArBusinessCard | null;
  }

  // Get card by AR marker ID
  async getCardByMarkerId(markerId: string): Promise<ArBusinessCard | null> {
    const card = await prisma.arBusinessCard.findUnique({
      where: { arMarkerId: markerId },
    });

    return card as ArBusinessCard | null;
  }

  // Exchange business cards
  async exchangeCards(
    senderId: string,
    receiverId: string,
    spaceId?: string
  ): Promise<void> {
    // Get sender's card
    const senderCard = await this.getUserCard(senderId);
    if (!senderCard) {
      throw new Error('Sender does not have a business card');
    }

    // Log the exchange
    await prisma.arCardExchange.create({
      data: {
        senderId,
        receiverId,
        cardId: senderCard.id,
        spaceId,
      },
    });

    // Increment share count
    await prisma.arBusinessCard.update({
      where: { id: senderCard.id },
      data: {
        shareCount: { increment: 1 },
      },
    });
  }

  // Get cards received by a user
  async getReceivedCards(userId: string): Promise<
    Array<{
      card: ArBusinessCard;
      exchangedAt: Date;
      senderId: string;
    }>
  > {
    const exchanges = await prisma.arCardExchange.findMany({
      where: { receiverId: userId },
      include: {
        card: true,
      },
      orderBy: { exchangedAt: 'desc' },
    });

    return exchanges.map(exchange => ({
      card: exchange.card as ArBusinessCard,
      exchangedAt: exchange.exchangedAt,
      senderId: exchange.senderId,
    }));
  }

  // Get cards sent by a user
  async getSentCards(userId: string): Promise<
    Array<{
      receiverId: string;
      exchangedAt: Date;
    }>
  > {
    const exchanges = await prisma.arCardExchange.findMany({
      where: { senderId: userId },
      orderBy: { exchangedAt: 'desc' },
    });

    return exchanges.map(exchange => ({
      receiverId: exchange.receiverId,
      exchangedAt: exchange.exchangedAt,
    }));
  }

  // Generate QR code URL for business card
  async generateQrCode(userId: string): Promise<string> {
    const card = await this.getUserCard(userId);
    if (!card) {
      throw new Error('User does not have a business card');
    }

    // In production, use a QR code generation service
    // For now, return a placeholder URL
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(
      JSON.stringify({
        type: 'ar_business_card',
        markerId: card.arMarkerId,
        userId,
      })
    )}`;

    // Update card with QR code URL
    await prisma.arBusinessCard.update({
      where: { id: card.id },
      data: { qrCodeUrl },
    });

    return qrCodeUrl;
  }

  // Get exchange statistics
  async getExchangeStats(userId: string): Promise<{
    totalSent: number;
    totalReceived: number;
    uniqueConnections: number;
    recentExchanges: number;
  }> {
    const [sent, received] = await Promise.all([
      prisma.arCardExchange.count({
        where: { senderId: userId },
      }),
      prisma.arCardExchange.count({
        where: { receiverId: userId },
      }),
    ]);

    // Get unique connections (people who exchanged cards with user)
    const sentTo = await prisma.arCardExchange.findMany({
      where: { senderId: userId },
      select: { receiverId: true },
      distinct: ['receiverId'],
    });

    const receivedFrom = await prisma.arCardExchange.findMany({
      where: { receiverId: userId },
      select: { senderId: true },
      distinct: ['senderId'],
    });

    const uniqueConnections = new Set([
      ...sentTo.map(e => e.receiverId),
      ...receivedFrom.map(e => e.senderId),
    ]).size;

    // Recent exchanges (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recentExchanges = await prisma.arCardExchange.count({
      where: {
        OR: [{ senderId: userId }, { receiverId: userId }],
        exchangedAt: { gte: sevenDaysAgo },
      },
    });

    return {
      totalSent: sent,
      totalReceived: received,
      uniqueConnections,
      recentExchanges,
    };
  }

  // Generate unique AR marker ID
  private generateArMarkerId(userId: string): string {
    const hash = crypto
      .createHash('sha256')
      .update(`${userId}_${Date.now()}`)
      .digest('hex');
    return `ar_marker_${hash.substring(0, 16)}`;
  }

  // Delete business card
  async deleteCard(userId: string): Promise<void> {
    const card = await this.getUserCard(userId);
    if (card) {
      await prisma.arBusinessCard.delete({
        where: { id: card.id },
      });
    }
  }
}

export const arBusinessCardService = new ArBusinessCardService();
