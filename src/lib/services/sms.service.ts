import { z } from 'zod';
import { env } from '../env';
import type { SMSService } from './notification.service';

// SMS configuration schema
const smsConfigSchema = z.object({
  apiKey: z.string().min(1),
  apiSecret: z.string().min(1),
  fromNumber: z.string().min(1),
  webhookSecret: z.string().optional(),
});

// Twilio API interfaces
interface TwilioSMSRequest {
  To: string;
  From: string;
  Body: string;
  MessagingServiceSid?: string;
  StatusCallback?: string;
  ValidityPeriod?: number;
}

interface TwilioSMSResponse {
  sid: string;
  status: string;
  error_code?: string;
  error_message?: string;
}

// SMS template interface
export interface SMSTemplate {
  id: string;
  name: string;
  content: string;
  variables: string[];
  maxLength: number;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// SMS delivery status
export interface SMSDeliveryStatus {
  messageId: string;
  phoneNumber: string;
  status: 'queued' | 'sent' | 'delivered' | 'failed' | 'undelivered';
  timestamp: Date;
  errorCode?: string;
  errorMessage?: string;
  segments: number;
  cost?: number;
}

// Twilio SMS service implementation
export class TwilioSMSService implements SMSService {
  private config: z.infer<typeof smsConfigSchema>;
  private baseUrl = 'https://api.twilio.com/2010-04-01';
  private templates: Map<string, SMSTemplate> = new Map();

  constructor(config: {
    apiKey: string; // Account SID
    apiSecret: string; // Auth Token
    fromNumber: string;
    webhookSecret?: string;
  }) {
    this.config = smsConfigSchema.parse(config);
    this.initializeDefaultTemplates();
  }

  // Initialize default SMS templates
  private initializeDefaultTemplates(): void {
    const defaultTemplates: Omit<SMSTemplate, 'createdAt' | 'updatedAt'>[] = [
      {
        id: 'welcome',
        name: 'Welcome SMS',
        content: 'Welcome to OpportuneX! 🎉 Start discovering opportunities that match your skills. Reply STOP to opt out.',
        variables: [],
        maxLength: 160,
        active: true,
      },
      {
        id: 'otp-verification',
        name: 'OTP Verification',
        content: 'Your OpportuneX verification code is: {{otp}}. Valid for 10 minutes. Do not share this code.',
        variables: ['otp'],
        maxLength: 160,
        active: true,
      },
      {
        id: 'deadline-reminder',
        name: 'Deadline Reminder',
        content: '⏰ Reminder: {{title}} deadline is {{timeLeft}}. Don\'t miss out! Apply now: {{shortUrl}}',
        variables: ['title', 'timeLeft', 'shortUrl'],
        maxLength: 160,
        active: true,
      },
      {
        id: 'new-opportunity',
        name: 'New Opportunity Alert',
        content: '🚀 New {{type}}: {{title}} by {{organizer}}. Deadline: {{deadline}}. View: {{shortUrl}}',
        variables: ['type', 'title', 'organizer', 'deadline', 'shortUrl'],
        maxLength: 160,
        active: true,
      },
      {
        id: 'password-reset',
        name: 'Password Reset',
        content: 'Reset your OpportuneX password: {{resetUrl}} This link expires in 1 hour. Reply STOP to opt out.',
        variables: ['resetUrl'],
        maxLength: 160,
        active: true,
      },
    ];

    defaultTemplates.forEach(template => {
      this.templates.set(template.id, {
        ...template,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    });
  }

  // Send single SMS
  async sendSMS(params: {
    to: string;
    message: string;
    templateId?: string;
    templateData?: Record<string, any>;
    validityPeriod?: number; // in seconds
  }): Promise<{ messageId: string; status: string }> {
    try {
      // Validate phone number format
      const phoneNumber = this.formatPhoneNumber(params.to);
      
      // Process template if provided
      let message = params.message;
      if (params.templateId && params.templateData) {
        const template = this.templates.get(params.templateId);
        if (template) {
          message = this.processTemplate(template, params.templateData).content;
        }
      }

      // Validate message length
      if (message.length > 1600) { // Twilio's max length
        throw new Error('SMS message too long. Maximum 1600 characters allowed.');
      }

      const smsData: TwilioSMSRequest = {
        To: phoneNumber,
        From: this.config.fromNumber,
        Body: message,
      };

      if (params.validityPeriod) {
        smsData.ValidityPeriod = params.validityPeriod;
      }

      const response = await this.makeRequest('/Accounts/{AccountSid}/Messages.json', 'POST', smsData);
      
      return {
        messageId: response.sid,
        status: response.status,
      };
    } catch (error) {
      console.error('Twilio SMS send error:', error);
      throw new Error(`Failed to send SMS: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Send bulk SMS
  async sendBulkSMS(params: {
    recipients: Array<{
      to: string;
      templateData?: Record<string, any>;
    }>;
    message: string;
    templateId?: string;
    validityPeriod?: number;
  }): Promise<Array<{ messageId: string; status: string; recipient: string }>> {
    try {
      const results: Array<{ messageId: string; status: string; recipient: string }> = [];
      
      // Send SMS messages with rate limiting
      const batchSize = 10; // Twilio rate limit consideration
      
      for (let i = 0; i < params.recipients.length; i += batchSize) {
        const batch = params.recipients.slice(i, i + batchSize);
        
        const batchPromises = batch.map(async (recipient) => {
          try {
            let message = params.message;
            
            // Process template if provided
            if (params.templateId && recipient.templateData) {
              const template = this.templates.get(params.templateId);
              if (template) {
                message = this.processTemplate(template, recipient.templateData).content;
              }
            }

            const result = await this.sendSMS({
              to: recipient.to,
              message,
              validityPeriod: params.validityPeriod,
            });

            return {
              messageId: result.messageId,
              status: result.status,
              recipient: recipient.to,
            };
          } catch (error) {
            console.error(`Failed to send SMS to ${recipient.to}:`, error);
            return {
              messageId: 'failed',
              status: 'failed',
              recipient: recipient.to,
            };
          }
        });

        const batchResults = await Promise.allSettled(batchPromises);
        batchResults.forEach((result) => {
          if (result.status === 'fulfilled') {
            results.push(result.value);
          }
        });

        // Add delay between batches to respect rate limits
        if (i + batchSize < params.recipients.length) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      return results;
    } catch (error) {
      console.error('Twilio bulk SMS send error:', error);
      throw new Error(`Failed to send bulk SMS: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Process webhook events from Twilio
  async processWebhookEvent(event: any): Promise<SMSDeliveryStatus | null> {
    try {
      const messageId = event.MessageSid;
      const phoneNumber = event.To;
      const status = this.mapTwilioStatus(event.MessageStatus);
      const timestamp = new Date();

      return {
        messageId,
        phoneNumber,
        status,
        timestamp,
        errorCode: event.ErrorCode,
        errorMessage: event.ErrorMessage,
        segments: parseInt(event.NumSegments) || 1,
      };
    } catch (error) {
      console.error('Error processing Twilio webhook event:', error);
      return null;
    }
  }

  // Map Twilio status to our status enum
  private mapTwilioStatus(twilioStatus: string): SMSDeliveryStatus['status'] {
    switch (twilioStatus) {
      case 'queued':
      case 'accepted':
        return 'queued';
      case 'sending':
      case 'sent':
        return 'sent';
      case 'delivered':
        return 'delivered';
      case 'failed':
        return 'failed';
      case 'undelivered':
        return 'undelivered';
      default:
        return 'sent';
    }
  }

  // Format phone number to E.164 format
  private formatPhoneNumber(phoneNumber: string): string {
    // Remove all non-digit characters
    const digits = phoneNumber.replace(/\D/g, '');
    
    // Handle Indian phone numbers
    if (digits.length === 10 && !digits.startsWith('91')) {
      return `+91${digits}`;
    }
    
    // Handle numbers with country code
    if (digits.length === 12 && digits.startsWith('91')) {
      return `+${digits}`;
    }
    
    // Handle international format
    if (digits.length > 10 && !phoneNumber.startsWith('+')) {
      return `+${digits}`;
    }
    
    // Return as-is if already in correct format
    if (phoneNumber.startsWith('+')) {
      return phoneNumber;
    }
    
    throw new Error(`Invalid phone number format: ${phoneNumber}`);
  }

  // Get SMS template
  getTemplate(templateId: string): SMSTemplate | undefined {
    return this.templates.get(templateId);
  }

  // Add custom template
  addTemplate(template: Omit<SMSTemplate, 'createdAt' | 'updatedAt'>): SMSTemplate {
    const fullTemplate: SMSTemplate = {
      ...template,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.templates.set(template.id, fullTemplate);
    return fullTemplate;
  }

  // Process template with variables
  processTemplate(template: SMSTemplate, variables: Record<string, any>): {
    content: string;
    length: number;
    segments: number;
  } {
    const processString = (str: string) => {
      return str.replace(/\{\{(\w+)\}\}/g, (match, key) => {
        return variables[key] || match;
      });
    };

    const content = processString(template.content);
    const length = content.length;
    const segments = Math.ceil(length / 160); // SMS segment calculation

    return {
      content,
      length,
      segments,
    };
  }

  // Make HTTP request to Twilio API
  private async makeRequest(endpoint: string, method: string, data?: any): Promise<any> {
    const url = `${this.baseUrl}${endpoint.replace('{AccountSid}', this.config.apiKey)}`;
    
    // Create basic auth header
    const auth = Buffer.from(`${this.config.apiKey}:${this.config.apiSecret}`).toString('base64');
    
    const headers: Record<string, string> = {
      'Authorization': `Basic ${auth}`,
    };

    let body: string | undefined;
    if (data) {
      if (method === 'POST') {
        headers['Content-Type'] = 'application/x-www-form-urlencoded';
        body = new URLSearchParams(data).toString();
      } else {
        headers['Content-Type'] = 'application/json';
        body = JSON.stringify(data);
      }
    }

    const response = await fetch(url, {
      method,
      headers,
      body,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Twilio API error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    return await response.json();
  }

  // Validate phone number
  static isValidPhoneNumber(phoneNumber: string): boolean {
    const phoneRegex = /^\+?[1-9]\d{1,14}$/;
    const digits = phoneNumber.replace(/\D/g, '');
    return phoneRegex.test(phoneNumber) && digits.length >= 10 && digits.length <= 15;
  }

  // Get delivery statistics
  async getDeliveryStats(startDate?: Date, endDate?: Date): Promise<{
    sent: number;
    delivered: number;
    failed: number;
    undelivered: number;
    deliveryRate: number;
    totalCost: number;
  }> {
    // TODO: Implement actual stats retrieval from Twilio API
    return {
      sent: 0,
      delivered: 0,
      failed: 0,
      undelivered: 0,
      deliveryRate: 0,
      totalCost: 0,
    };
  }

  // Check opt-out status
  async checkOptOutStatus(phoneNumber: string): Promise<boolean> {
    // TODO: Implement opt-out status check
    return false;
  }

  // Handle opt-out request
  async handleOptOut(phoneNumber: string): Promise<void> {
    // TODO: Implement opt-out handling
    console.log(`Handling opt-out for ${phoneNumber}`);
  }
}

// Mock SMS service for development/testing
export class MockSMSService implements SMSService {
  private sentSMS: Array<{
    to: string;
    message: string;
    sentAt: Date;
  }> = [];

  async sendSMS(params: {
    to: string;
    message: string;
    templateId?: string;
    templateData?: Record<string, any>;
  }): Promise<{ messageId: string; status: string }> {
    console.log('📱 Mock SMS Service - Sending SMS:', {
      to: params.to,
      message: params.message.substring(0, 50) + (params.message.length > 50 ? '...' : ''),
      templateId: params.templateId,
    });

    this.sentSMS.push({
      to: params.to,
      message: params.message,
      sentAt: new Date(),
    });

    return {
      messageId: `mock-sms-${Date.now()}-${Math.random().toString(36).substring(2)}`,
      status: 'sent',
    };
  }

  async sendBulkSMS(params: {
    recipients: Array<{
      to: string;
      templateData?: Record<string, any>;
    }>;
    message: string;
    templateId?: string;
  }): Promise<Array<{ messageId: string; status: string; recipient: string }>> {
    console.log('📱 Mock SMS Service - Sending bulk SMS:', {
      recipientCount: params.recipients.length,
      message: params.message.substring(0, 50) + (params.message.length > 50 ? '...' : ''),
      templateId: params.templateId,
    });

    return params.recipients.map(recipient => {
      this.sentSMS.push({
        to: recipient.to,
        message: params.message,
        sentAt: new Date(),
      });

      return {
        messageId: `mock-sms-${Date.now()}-${Math.random().toString(36).substring(2)}`,
        status: 'sent',
        recipient: recipient.to,
      };
    });
  }

  getSentSMS() {
    return [...this.sentSMS];
  }

  clearSentSMS() {
    this.sentSMS = [];
  }
}

// Factory function to create SMS service
export function createSMSService(): SMSService {
  if (env.NODE_ENV === 'test' || !env.SMS_SERVICE_API_KEY) {
    return new MockSMSService();
  }

  // Parse SMS service configuration from environment
  const smsConfig = env.SMS_SERVICE_API_KEY.split(':');
  if (smsConfig.length !== 2) {
    console.warn('Invalid SMS service configuration, using mock service');
    return new MockSMSService();
  }

  return new TwilioSMSService({
    apiKey: smsConfig[0], // Account SID
    apiSecret: smsConfig[1], // Auth Token
    fromNumber: '+1234567890', // TODO: Configure from environment
  });
}