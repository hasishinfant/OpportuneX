import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();

export interface CreateWebhookInput {
  userId: string;
  apiKeyId: string;
  url: string;
  events: string[];
  retryCount?: number;
  timeoutMs?: number;
}

export interface WebhookResponse {
  id: string;
  url: string;
  events: string[];
  secret: string; // Only returned on creation
  isActive: boolean;
  retryCount: number;
  timeoutMs: number;
  lastTriggeredAt: Date | null;
  createdAt: Date;
}

export interface WebhookListItem {
  id: string;
  url: string;
  events: string[];
  isActive: boolean;
  retryCount: number;
  lastTriggeredAt: Date | null;
  createdAt: Date;
}

export interface WebhookEvent {
  event: string;
  timestamp: string;
  data: any;
}

export class WebhookService {
  /**
   * Generate a webhook secret
   */
  private generateSecret(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Create HMAC signature for webhook payload
   */
  private createSignature(payload: string, secret: string): string {
    return crypto.createHmac('sha256', secret).update(payload).digest('hex');
  }

  /**
   * Create a new webhook
   */
  async createWebhook(input: CreateWebhookInput): Promise<WebhookResponse> {
    const secret = this.generateSecret();

    const webhook = await prisma.webhook.create({
      data: {
        userId: input.userId,
        apiKeyId: input.apiKeyId,
        url: input.url,
        events: input.events,
        secret,
        retryCount: input.retryCount || 3,
        timeoutMs: input.timeoutMs || 5000,
      },
    });

    return {
      id: webhook.id,
      url: webhook.url,
      events: webhook.events,
      secret, // Only returned on creation
      isActive: webhook.isActive,
      retryCount: webhook.retryCount,
      timeoutMs: webhook.timeoutMs,
      lastTriggeredAt: webhook.lastTriggeredAt,
      createdAt: webhook.createdAt,
    };
  }

  /**
   * List webhooks for a user
   */
  async listWebhooks(userId: string): Promise<WebhookListItem[]> {
    const webhooks = await prisma.webhook.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    return webhooks.map(webhook => ({
      id: webhook.id,
      url: webhook.url,
      events: webhook.events,
      isActive: webhook.isActive,
      retryCount: webhook.retryCount,
      lastTriggeredAt: webhook.lastTriggeredAt,
      createdAt: webhook.createdAt,
    }));
  }

  /**
   * Update webhook
   */
  async updateWebhook(
    userId: string,
    webhookId: string,
    updates: {
      url?: string;
      events?: string[];
      isActive?: boolean;
      retryCount?: number;
      timeoutMs?: number;
    }
  ): Promise<WebhookListItem> {
    await prisma.webhook.updateMany({
      where: {
        id: webhookId,
        userId,
      },
      data: updates,
    });

    const webhook = await prisma.webhook.findUnique({
      where: { id: webhookId },
    });

    if (!webhook) {
      throw new Error('Webhook not found');
    }

    return {
      id: webhook.id,
      url: webhook.url,
      events: webhook.events,
      isActive: webhook.isActive,
      retryCount: webhook.retryCount,
      lastTriggeredAt: webhook.lastTriggeredAt,
      createdAt: webhook.createdAt,
    };
  }

  /**
   * Delete webhook
   */
  async deleteWebhook(userId: string, webhookId: string): Promise<void> {
    await prisma.webhook.deleteMany({
      where: {
        id: webhookId,
        userId,
      },
    });
  }

  /**
   * Trigger webhook for an event
   */
  async triggerWebhook(
    eventType: string,
    data: any,
    userId?: string
  ): Promise<void> {
    const where: any = {
      isActive: true,
      events: {
        has: eventType,
      },
    };

    if (userId) {
      where.userId = userId;
    }

    const webhooks = await prisma.webhook.findMany({ where });

    // Trigger all matching webhooks in parallel
    await Promise.all(
      webhooks.map(webhook => this.deliverWebhook(webhook.id, eventType, data))
    );
  }

  /**
   * Deliver webhook with retries
   */
  private async deliverWebhook(
    webhookId: string,
    eventType: string,
    data: any
  ): Promise<void> {
    const webhook = await prisma.webhook.findUnique({
      where: { id: webhookId },
    });

    if (!webhook || !webhook.isActive) {
      return;
    }

    const payload: WebhookEvent = {
      event: eventType,
      timestamp: new Date().toISOString(),
      data,
    };

    const payloadString = JSON.stringify(payload);
    const signature = this.createSignature(payloadString, webhook.secret);

    let attemptCount = 0;
    let success = false;
    let responseStatus: number | null = null;
    let responseBody: string | null = null;
    let errorMessage: string | null = null;

    while (attemptCount < webhook.retryCount && !success) {
      attemptCount++;

      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), webhook.timeoutMs);

        const response = await fetch(webhook.url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Webhook-Signature': signature,
            'X-Webhook-Event': eventType,
            'X-Webhook-Delivery-ID': crypto.randomUUID(),
          },
          body: payloadString,
          signal: controller.signal,
        });

        clearTimeout(timeout);

        responseStatus = response.status;
        responseBody = await response.text();

        if (response.ok) {
          success = true;
        } else {
          errorMessage = `HTTP ${response.status}: ${responseBody}`;
        }
      } catch (error: any) {
        errorMessage = error.message;
      }

      // Exponential backoff between retries
      if (!success && attemptCount < webhook.retryCount) {
        await new Promise(resolve =>
          setTimeout(resolve, Math.pow(2, attemptCount) * 1000)
        );
      }
    }

    // Log delivery attempt
    await prisma.webhookDelivery.create({
      data: {
        webhookId,
        eventType,
        payload,
        responseStatus,
        responseBody,
        errorMessage,
        attemptCount,
        deliveredAt: success ? new Date() : null,
      },
    });

    // Update last triggered timestamp
    if (success) {
      await prisma.webhook.update({
        where: { id: webhookId },
        data: { lastTriggeredAt: new Date() },
      });
    }
  }

  /**
   * Get webhook delivery logs
   */
  async getDeliveryLogs(
    userId: string,
    webhookId: string,
    limit: number = 50
  ): Promise<any[]> {
    const webhook = await prisma.webhook.findFirst({
      where: {
        id: webhookId,
        userId,
      },
    });

    if (!webhook) {
      throw new Error('Webhook not found');
    }

    const deliveries = await prisma.webhookDelivery.findMany({
      where: { webhookId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return deliveries.map(delivery => ({
      id: delivery.id,
      eventType: delivery.eventType,
      payload: delivery.payload,
      responseStatus: delivery.responseStatus,
      errorMessage: delivery.errorMessage,
      attemptCount: delivery.attemptCount,
      deliveredAt: delivery.deliveredAt,
      createdAt: delivery.createdAt,
    }));
  }

  /**
   * Test webhook delivery
   */
  async testWebhook(
    userId: string,
    webhookId: string
  ): Promise<{
    success: boolean;
    responseStatus?: number;
    responseBody?: string;
    errorMessage?: string;
  }> {
    const webhook = await prisma.webhook.findFirst({
      where: {
        id: webhookId,
        userId,
      },
    });

    if (!webhook) {
      throw new Error('Webhook not found');
    }

    const testPayload: WebhookEvent = {
      event: 'webhook.test',
      timestamp: new Date().toISOString(),
      data: {
        message: 'This is a test webhook delivery',
      },
    };

    const payloadString = JSON.stringify(testPayload);
    const signature = this.createSignature(payloadString, webhook.secret);

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), webhook.timeoutMs);

      const response = await fetch(webhook.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Signature': signature,
          'X-Webhook-Event': 'webhook.test',
          'X-Webhook-Delivery-ID': crypto.randomUUID(),
        },
        body: payloadString,
        signal: controller.signal,
      });

      clearTimeout(timeout);

      const responseBody = await response.text();

      return {
        success: response.ok,
        responseStatus: response.status,
        responseBody,
      };
    } catch (error: any) {
      return {
        success: false,
        errorMessage: error.message,
      };
    }
  }

  /**
   * Verify webhook signature
   */
  verifySignature(payload: string, signature: string, secret: string): boolean {
    const expectedSignature = this.createSignature(payload, secret);
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  }
}

export const webhookService = new WebhookService();
