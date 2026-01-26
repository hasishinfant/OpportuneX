import { z } from 'zod';
import { env } from '../env';
import type { EmailService } from './notification.service';

// Email configuration schema
const emailConfigSchema = z.object({
  apiKey: z.string().min(1),
  fromEmail: z.string().email(),
  fromName: z.string().min(1),
  replyToEmail: z.string().email().optional(),
  webhookSecret: z.string().optional(),
});

// SendGrid API interfaces
interface SendGridEmail {
  to: Array<{
    email: string;
    name?: string;
  }>;
  from: {
    email: string;
    name?: string;
  };
  reply_to?: {
    email: string;
    name?: string;
  };
  subject: string;
  content: Array<{
    type: 'text/plain' | 'text/html';
    value: string;
  }>;
  template_id?: string;
  dynamic_template_data?: Record<string, any>;
  custom_args?: Record<string, string>;
  categories?: string[];
  send_at?: number;
}

interface SendGridResponse {
  message_id: string;
  status: string;
}

interface SendGridBulkResponse {
  batch_id: string;
  status: string;
}

// Email template interface
export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  htmlContent: string;
  textContent: string;
  variables: string[];
  sendGridTemplateId?: string;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Email delivery status
export interface EmailDeliveryStatus {
  messageId: string;
  email: string;
  status: 'queued' | 'sent' | 'delivered' | 'bounced' | 'dropped' | 'deferred' | 'blocked';
  timestamp: Date;
  reason?: string;
  bounceType?: 'hard' | 'soft';
  clickCount?: number;
  openCount?: number;
}

// SendGrid email service implementation
export class SendGridEmailService implements EmailService {
  private config: z.infer<typeof emailConfigSchema>;
  private baseUrl = 'https://api.sendgrid.com/v3';
  private templates: Map<string, EmailTemplate> = new Map();

  constructor(config: {
    apiKey: string;
    fromEmail: string;
    fromName: string;
    replyToEmail?: string;
    webhookSecret?: string;
  }) {
    this.config = emailConfigSchema.parse(config);
    this.initializeDefaultTemplates();
  }

  // Initialize default email templates
  private initializeDefaultTemplates(): void {
    const defaultTemplates: Omit<EmailTemplate, 'createdAt' | 'updatedAt'>[] = [
      {
        id: 'welcome',
        name: 'Welcome Email',
        subject: 'Welcome to OpportuneX!',
        htmlContent: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #007bff;">Welcome to OpportuneX!</h1>
            <p>Hi {{name}},</p>
            <p>Welcome to OpportuneX, your AI-powered opportunity discovery platform!</p>
            <p>We're excited to help you discover hackathons, internships, and workshops that match your interests and skills.</p>
            <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0;">
              <h3>Get Started:</h3>
              <ul>
                <li>Complete your profile to get personalized recommendations</li>
                <li>Use natural language or voice search to find opportunities</li>
                <li>Get AI-powered preparation roadmaps for your chosen opportunities</li>
              </ul>
            </div>
            <a href="{{dashboardUrl}}" style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">Go to Dashboard</a>
            <p style="margin-top: 30px; color: #666;">
              Best regards,<br>
              The OpportuneX Team
            </p>
          </div>
        `,
        textContent: `
          Welcome to OpportuneX!
          
          Hi {{name}},
          
          Welcome to OpportuneX, your AI-powered opportunity discovery platform!
          
          We're excited to help you discover hackathons, internships, and workshops that match your interests and skills.
          
          Get Started:
          - Complete your profile to get personalized recommendations
          - Use natural language or voice search to find opportunities
          - Get AI-powered preparation roadmaps for your chosen opportunities
          
          Go to Dashboard: {{dashboardUrl}}
          
          Best regards,
          The OpportuneX Team
        `,
        variables: ['name', 'dashboardUrl'],
        active: true,
      },
      {
        id: 'password-reset',
        name: 'Password Reset',
        subject: 'Reset Your OpportuneX Password',
        htmlContent: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #007bff;">Password Reset Request</h1>
            <p>Hi {{name}},</p>
            <p>We received a request to reset your password for your OpportuneX account.</p>
            <p>Click the button below to reset your password. This link will expire in 1 hour.</p>
            <a href="{{resetUrl}}" style="background-color: #dc3545; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">Reset Password</a>
            <p style="margin-top: 20px;">If you didn't request this password reset, please ignore this email.</p>
            <p style="color: #666;">
              Best regards,<br>
              The OpportuneX Team
            </p>
          </div>
        `,
        textContent: `
          Password Reset Request
          
          Hi {{name}},
          
          We received a request to reset your password for your OpportuneX account.
          
          Click the link below to reset your password. This link will expire in 1 hour.
          
          {{resetUrl}}
          
          If you didn't request this password reset, please ignore this email.
          
          Best regards,
          The OpportuneX Team
        `,
        variables: ['name', 'resetUrl'],
        active: true,
      },
      {
        id: 'opportunity-digest',
        name: 'Weekly Opportunity Digest',
        subject: 'Your Weekly Opportunity Digest - {{count}} New Opportunities',
        htmlContent: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #007bff;">Your Weekly Opportunity Digest</h1>
            <p>Hi {{name}},</p>
            <p>Here are {{count}} new opportunities that match your interests:</p>
            
            {{#opportunities}}
            <div style="border: 1px solid #ddd; padding: 20px; margin: 15px 0; border-radius: 8px;">
              <h3 style="margin-top: 0; color: #333;">{{title}}</h3>
              <p style="color: #666; margin: 5px 0;">
                <strong>Type:</strong> {{type}} | 
                <strong>Organizer:</strong> {{organizer}} | 
                <strong>Mode:</strong> {{mode}}
              </p>
              <p style="color: #dc3545; margin: 5px 0;">
                <strong>Deadline:</strong> {{deadline}}
              </p>
              <p style="margin: 10px 0;">{{description}}</p>
              <a href="{{url}}" style="background-color: #28a745; color: white; padding: 8px 16px; text-decoration: none; border-radius: 4px; font-size: 14px;">View Details</a>
            </div>
            {{/opportunities}}
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="{{moreOpportunitiesUrl}}" style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px;">View All Opportunities</a>
            </div>
            
            <p style="color: #666; font-size: 12px;">
              You're receiving this digest because you subscribed to weekly opportunity updates. 
              <a href="{{unsubscribeUrl}}">Unsubscribe</a> or <a href="{{preferencesUrl}}">manage your preferences</a>.
            </p>
          </div>
        `,
        textContent: `
          Your Weekly Opportunity Digest
          
          Hi {{name}},
          
          Here are {{count}} new opportunities that match your interests:
          
          {{#opportunities}}
          {{title}}
          Type: {{type}} | Organizer: {{organizer}} | Mode: {{mode}}
          Deadline: {{deadline}}
          {{description}}
          View: {{url}}
          
          {{/opportunities}}
          
          View all opportunities: {{moreOpportunitiesUrl}}
          
          You're receiving this digest because you subscribed to weekly opportunity updates.
          Unsubscribe: {{unsubscribeUrl}}
          Manage preferences: {{preferencesUrl}}
        `,
        variables: ['name', 'count', 'opportunities', 'moreOpportunitiesUrl', 'unsubscribeUrl', 'preferencesUrl'],
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

  // Send single email
  async sendEmail(params: {
    to: string;
    subject: string;
    html: string;
    text: string;
    templateId?: string;
    templateData?: Record<string, any>;
    customArgs?: Record<string, string>;
    categories?: string[];
    sendAt?: Date;
  }): Promise<{ messageId: string; status: string }> {
    try {
      const email: SendGridEmail = {
        to: [{ email: params.to }],
        from: {
          email: this.config.fromEmail,
          name: this.config.fromName,
        },
        subject: params.subject,
        content: [
          { type: 'text/plain', value: params.text },
          { type: 'text/html', value: params.html },
        ],
      };

      if (this.config.replyToEmail) {
        email.reply_to = {
          email: this.config.replyToEmail,
          name: this.config.fromName,
        };
      }

      if (params.templateId) {
        const template = this.templates.get(params.templateId);
        if (template?.sendGridTemplateId) {
          email.template_id = template.sendGridTemplateId;
          email.dynamic_template_data = params.templateData;
        }
      }

      if (params.customArgs) {
        email.custom_args = params.customArgs;
      }

      if (params.categories) {
        email.categories = params.categories;
      }

      if (params.sendAt) {
        email.send_at = Math.floor(params.sendAt.getTime() / 1000);
      }

      const response = await this.makeRequest('/mail/send', 'POST', email);
      
      return {
        messageId: response.headers?.['x-message-id'] || 'unknown',
        status: 'sent',
      };
    } catch (error) {
      console.error('SendGrid email send error:', error);
      throw new Error(`Failed to send email: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Send bulk emails
  async sendBulkEmail(params: {
    recipients: Array<{
      to: string;
      templateData?: Record<string, any>;
    }>;
    subject: string;
    html: string;
    text: string;
    templateId?: string;
    customArgs?: Record<string, string>;
    categories?: string[];
  }): Promise<Array<{ messageId: string; status: string; recipient: string }>> {
    try {
      const emails: SendGridEmail[] = params.recipients.map(recipient => {
        const email: SendGridEmail = {
          to: [{ email: recipient.to }],
          from: {
            email: this.config.fromEmail,
            name: this.config.fromName,
          },
          subject: params.subject,
          content: [
            { type: 'text/plain', value: params.text },
            { type: 'text/html', value: params.html },
          ],
        };

        if (this.config.replyToEmail) {
          email.reply_to = {
            email: this.config.replyToEmail,
            name: this.config.fromName,
          };
        }

        if (params.templateId) {
          const template = this.templates.get(params.templateId);
          if (template?.sendGridTemplateId) {
            email.template_id = template.sendGridTemplateId;
            email.dynamic_template_data = recipient.templateData;
          }
        }

        if (params.customArgs) {
          email.custom_args = params.customArgs;
        }

        if (params.categories) {
          email.categories = params.categories;
        }

        return email;
      });

      // Send emails in batches to avoid rate limits
      const batchSize = 100;
      const results: Array<{ messageId: string; status: string; recipient: string }> = [];

      for (let i = 0; i < emails.length; i += batchSize) {
        const batch = emails.slice(i, i + batchSize);
        const batchPromises = batch.map(async (email, index) => {
          try {
            const response = await this.makeRequest('/mail/send', 'POST', email);
            return {
              messageId: response.headers?.['x-message-id'] || 'unknown',
              status: 'sent',
              recipient: email.to[0].email,
            };
          } catch (error) {
            return {
              messageId: 'failed',
              status: 'failed',
              recipient: email.to[0].email,
            };
          }
        });

        const batchResults = await Promise.allSettled(batchPromises);
        batchResults.forEach((result, index) => {
          if (result.status === 'fulfilled') {
            results.push(result.value);
          } else {
            results.push({
              messageId: 'failed',
              status: 'failed',
              recipient: batch[index].to[0].email,
            });
          }
        });

        // Add delay between batches to respect rate limits
        if (i + batchSize < emails.length) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      return results;
    } catch (error) {
      console.error('SendGrid bulk email send error:', error);
      throw new Error(`Failed to send bulk emails: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Process webhook events from SendGrid
  async processWebhookEvent(event: any): Promise<EmailDeliveryStatus | null> {
    try {
      const eventType = event.event;
      const email = event.email;
      const messageId = event.sg_message_id;
      const timestamp = new Date(event.timestamp * 1000);

      let status: EmailDeliveryStatus['status'];
      let bounceType: 'hard' | 'soft' | undefined;

      switch (eventType) {
        case 'processed':
        case 'delivered':
          status = 'delivered';
          break;
        case 'bounce':
          status = 'bounced';
          bounceType = event.type === 'bounce' ? 'hard' : 'soft';
          break;
        case 'dropped':
          status = 'dropped';
          break;
        case 'deferred':
          status = 'deferred';
          break;
        case 'blocked':
          status = 'blocked';
          break;
        default:
          status = 'sent';
      }

      return {
        messageId,
        email,
        status,
        timestamp,
        reason: event.reason,
        bounceType,
        clickCount: event.click_count,
        openCount: event.open_count,
      };
    } catch (error) {
      console.error('Error processing SendGrid webhook event:', error);
      return null;
    }
  }

  // Get email template
  getTemplate(templateId: string): EmailTemplate | undefined {
    return this.templates.get(templateId);
  }

  // Add custom template
  addTemplate(template: Omit<EmailTemplate, 'createdAt' | 'updatedAt'>): EmailTemplate {
    const fullTemplate: EmailTemplate = {
      ...template,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.templates.set(template.id, fullTemplate);
    return fullTemplate;
  }

  // Process template with variables
  processTemplate(template: EmailTemplate, variables: Record<string, any>): {
    subject: string;
    html: string;
    text: string;
  } {
    const processString = (str: string) => {
      // Handle simple variable substitution
      let processed = str.replace(/\{\{(\w+)\}\}/g, (match, key) => {
        return variables[key] || match;
      });

      // Handle array iteration (basic Handlebars-like syntax)
      processed = processed.replace(/\{\{#(\w+)\}\}([\s\S]*?)\{\{\/\1\}\}/g, (match, arrayKey, template) => {
        const array = variables[arrayKey];
        if (!Array.isArray(array)) return '';
        
        return array.map(item => {
          return template.replace(/\{\{(\w+)\}\}/g, (itemMatch: string, itemKey: string) => {
            return item[itemKey] || itemMatch;
          });
        }).join('');
      });

      return processed;
    };

    return {
      subject: processString(template.subject),
      html: processString(template.htmlContent),
      text: processString(template.textContent),
    };
  }

  // Make HTTP request to SendGrid API
  private async makeRequest(endpoint: string, method: string, data?: any): Promise<any> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const response = await fetch(url, {
      method,
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: data ? JSON.stringify(data) : undefined,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`SendGrid API error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const responseData = response.status === 202 ? {} : await response.json();
    return {
      data: responseData,
      headers: Object.fromEntries(response.headers.entries()),
    };
  }

  // Validate email address
  static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  // Get delivery statistics
  async getDeliveryStats(startDate?: Date, endDate?: Date): Promise<{
    sent: number;
    delivered: number;
    bounced: number;
    dropped: number;
    deferred: number;
    blocked: number;
    deliveryRate: number;
  }> {
    // TODO: Implement actual stats retrieval from SendGrid API
    return {
      sent: 0,
      delivered: 0,
      bounced: 0,
      dropped: 0,
      deferred: 0,
      blocked: 0,
      deliveryRate: 0,
    };
  }
}

// Mock email service for development/testing
export class MockEmailService implements EmailService {
  private sentEmails: Array<{
    to: string;
    subject: string;
    html: string;
    text: string;
    sentAt: Date;
  }> = [];

  async sendEmail(params: {
    to: string;
    subject: string;
    html: string;
    text: string;
    templateId?: string;
    templateData?: Record<string, any>;
  }): Promise<{ messageId: string; status: string }> {
    console.log('📧 Mock Email Service - Sending email:', {
      to: params.to,
      subject: params.subject,
      templateId: params.templateId,
    });

    this.sentEmails.push({
      to: params.to,
      subject: params.subject,
      html: params.html,
      text: params.text,
      sentAt: new Date(),
    });

    return {
      messageId: `mock-${Date.now()}-${Math.random().toString(36).substring(2)}`,
      status: 'sent',
    };
  }

  async sendBulkEmail(params: {
    recipients: Array<{
      to: string;
      templateData?: Record<string, any>;
    }>;
    subject: string;
    html: string;
    text: string;
    templateId?: string;
  }): Promise<Array<{ messageId: string; status: string; recipient: string }>> {
    console.log('📧 Mock Email Service - Sending bulk emails:', {
      recipientCount: params.recipients.length,
      subject: params.subject,
      templateId: params.templateId,
    });

    return params.recipients.map(recipient => {
      this.sentEmails.push({
        to: recipient.to,
        subject: params.subject,
        html: params.html,
        text: params.text,
        sentAt: new Date(),
      });

      return {
        messageId: `mock-${Date.now()}-${Math.random().toString(36).substring(2)}`,
        status: 'sent',
        recipient: recipient.to,
      };
    });
  }

  getSentEmails() {
    return [...this.sentEmails];
  }

  clearSentEmails() {
    this.sentEmails = [];
  }
}

// Factory function to create email service
export function createEmailService(): EmailService {
  if (env.NODE_ENV === 'test' || !env.EMAIL_SERVICE_API_KEY) {
    return new MockEmailService();
  }

  return new SendGridEmailService({
    apiKey: env.EMAIL_SERVICE_API_KEY,
    fromEmail: 'noreply@opportunex.com',
    fromName: 'OpportuneX',
    replyToEmail: 'support@opportunex.com',
  });
}