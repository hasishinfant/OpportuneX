import { z } from 'zod';
import type {
  NotificationChannel,
  NotificationType,
} from './notification.service';

// Template interfaces
export interface NotificationTemplate {
  id: string;
  name: string;
  description?: string;
  type: NotificationType;
  channels: NotificationChannel[];
  subject?: string; // For email/SMS
  title: string; // For push/in-app
  content: {
    text: string;
    html?: string;
    markdown?: string;
  };
  variables: TemplateVariable[];
  metadata?: Record<string, any>;
  active: boolean;
  version: number;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface TemplateVariable {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'date' | 'array' | 'object';
  required: boolean;
  defaultValue?: any;
  description?: string;
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    enum?: any[];
  };
}

export interface TemplateCategory {
  id: string;
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  templates: string[]; // template IDs
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface TemplateRenderContext {
  variables: Record<string, any>;
  user?: {
    id: string;
    name: string;
    email: string;
    preferences?: Record<string, any>;
  };
  opportunity?: {
    id: string;
    title: string;
    type: string;
    organizer: string;
    deadline: Date;
    url: string;
  };
  system?: {
    appName: string;
    appUrl: string;
    supportEmail: string;
    unsubscribeUrl: string;
  };
}

export interface RenderedTemplate {
  subject?: string;
  title: string;
  content: {
    text: string;
    html?: string;
  };
  metadata?: Record<string, any>;
}

// Validation schemas
const templateVariableSchema = z.object({
  name: z.string().min(1).max(50),
  type: z.enum(['string', 'number', 'boolean', 'date', 'array', 'object']),
  required: z.boolean().default(false),
  defaultValue: z.any().optional(),
  description: z.string().max(200).optional(),
  validation: z
    .object({
      min: z.number().optional(),
      max: z.number().optional(),
      pattern: z.string().optional(),
      enum: z.array(z.any()).optional(),
    })
    .optional(),
});

const notificationTemplateSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  type: z.enum([
    'new_opportunity',
    'deadline_reminder',
    'recommendation',
    'system',
  ]),
  channels: z.array(z.enum(['email', 'sms', 'in_app', 'push'])).min(1),
  subject: z.string().max(200).optional(),
  title: z.string().min(1).max(200),
  content: z.object({
    text: z.string().min(1),
    html: z.string().optional(),
    markdown: z.string().optional(),
  }),
  variables: z.array(templateVariableSchema),
  metadata: z.record(z.any()).optional(),
  active: z.boolean().default(true),
  createdBy: z.string().min(1),
});

// Notification template service
export class NotificationTemplateService {
  private templates: Map<string, NotificationTemplate> = new Map();
  private categories: Map<string, TemplateCategory> = new Map();

  constructor() {
    this.initializeDefaultTemplates();
    this.initializeDefaultCategories();
  }

  // Initialize default templates
  private initializeDefaultTemplates(): void {
    const defaultTemplates: Array<
      Omit<NotificationTemplate, 'id' | 'createdAt' | 'updatedAt'>
    > = [
      {
        name: 'New Opportunity Alert',
        description:
          'Notification sent when a new opportunity matches user criteria',
        type: 'new_opportunity',
        channels: ['email', 'in_app', 'push'],
        subject: 'New {{opportunityType}}: {{title}}',
        title: 'New {{opportunityType}} Available',
        content: {
          text: `Hi {{userName}},

A new {{opportunityType}} matching your interests has been posted:

{{title}}
Organizer: {{organizer}}
Deadline: {{deadline}}
Location: {{location}}
Mode: {{mode}}

{{description}}

View opportunity: {{url}}

Best regards,
The OpportuneX Team`,
          html: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <h2>New {{opportunityType}} Available!</h2>
  <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
    <h3 style="margin-top: 0; color: #007bff;">{{title}}</h3>
    <p><strong>Organizer:</strong> {{organizer}}</p>
    <p><strong>Deadline:</strong> {{deadline}}</p>
    <p><strong>Location:</strong> {{location}}</p>
    <p><strong>Mode:</strong> {{mode}}</p>
    <p style="margin: 15px 0;">{{description}}</p>
    <a href="{{url}}" style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">View Opportunity</a>
  </div>
  <p style="color: #666; font-size: 12px;">
    You're receiving this because you have alerts set up for {{opportunityType}} opportunities.
    <a href="{{unsubscribeUrl}}">Unsubscribe</a> or <a href="{{preferencesUrl}}">manage preferences</a>.
  </p>
</div>`,
        },
        variables: [
          {
            name: 'userName',
            type: 'string',
            required: true,
            description: "User's display name",
          },
          {
            name: 'opportunityType',
            type: 'string',
            required: true,
            description:
              'Type of opportunity (hackathon, internship, workshop)',
          },
          {
            name: 'title',
            type: 'string',
            required: true,
            description: 'Opportunity title',
          },
          {
            name: 'organizer',
            type: 'string',
            required: true,
            description: 'Organizer name',
          },
          {
            name: 'deadline',
            type: 'date',
            required: true,
            description: 'Application deadline',
          },
          {
            name: 'location',
            type: 'string',
            required: false,
            description: 'Opportunity location',
          },
          {
            name: 'mode',
            type: 'string',
            required: true,
            description: 'Online/offline/hybrid',
          },
          {
            name: 'description',
            type: 'string',
            required: true,
            description: 'Opportunity description',
          },
          {
            name: 'url',
            type: 'string',
            required: true,
            description: 'Link to opportunity',
          },
          {
            name: 'unsubscribeUrl',
            type: 'string',
            required: true,
            description: 'Unsubscribe link',
          },
          {
            name: 'preferencesUrl',
            type: 'string',
            required: true,
            description: 'Preferences management link',
          },
        ],
        active: true,
        version: 1,
        createdBy: 'system',
      },
      {
        name: 'Deadline Reminder',
        description: 'Reminder sent before opportunity deadlines',
        type: 'deadline_reminder',
        channels: ['email', 'sms', 'in_app', 'push'],
        subject: 'Reminder: {{title}} deadline {{timeLeft}}',
        title: 'Deadline Reminder',
        content: {
          text: `Hi {{userName}},

This is a reminder that the deadline for "{{title}}" is {{timeLeft}}.

Deadline: {{deadline}}
Organizer: {{organizer}}

Don't miss out on this opportunity! Make sure to submit your application before the deadline.

Apply now: {{url}}

Best regards,
The OpportuneX Team`,
          html: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <h2 style="color: #dc3545;">⏰ Deadline Reminder</h2>
  <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 20px; border-radius: 8px; margin: 20px 0;">
    <h3 style="margin-top: 0; color: #856404;">{{title}}</h3>
    <p><strong>Deadline:</strong> <span style="color: #dc3545;">{{deadline}}</span></p>
    <p><strong>Time Left:</strong> <span style="color: #dc3545;">{{timeLeft}}</span></p>
    <p><strong>Organizer:</strong> {{organizer}}</p>
    <p style="margin: 15px 0;">Don't miss out on this opportunity! Make sure to submit your application before the deadline.</p>
    <a href="{{url}}" style="background-color: #dc3545; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">Apply Now</a>
  </div>
</div>`,
        },
        variables: [
          {
            name: 'userName',
            type: 'string',
            required: true,
            description: "User's display name",
          },
          {
            name: 'title',
            type: 'string',
            required: true,
            description: 'Opportunity title',
          },
          {
            name: 'deadline',
            type: 'date',
            required: true,
            description: 'Application deadline',
          },
          {
            name: 'timeLeft',
            type: 'string',
            required: true,
            description: 'Time remaining until deadline',
          },
          {
            name: 'organizer',
            type: 'string',
            required: true,
            description: 'Organizer name',
          },
          {
            name: 'url',
            type: 'string',
            required: true,
            description: 'Link to opportunity',
          },
        ],
        active: true,
        version: 1,
        createdBy: 'system',
      },
      {
        name: 'Weekly Digest',
        description: 'Weekly summary of new opportunities',
        type: 'recommendation',
        channels: ['email'],
        subject: 'Your Weekly Opportunity Digest - {{count}} New Opportunities',
        title: 'Weekly Opportunity Digest',
        content: {
          text: `Hi {{userName}},

Here's your weekly digest of new opportunities:

{{#opportunities}}
{{title}}
Type: {{type}} | Organizer: {{organizer}}
Deadline: {{deadline}}
{{description}}
View: {{url}}

{{/opportunities}}

View all opportunities: {{allOpportunitiesUrl}}

Best regards,
The OpportuneX Team

Unsubscribe: {{unsubscribeUrl}}`,
          html: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <h1 style="color: #007bff;">Your Weekly Opportunity Digest</h1>
  <p>Hi {{userName}},</p>
  <p>Here are {{count}} new opportunities that match your interests:</p>
  
  {{#opportunities}}
  <div style="border: 1px solid #ddd; padding: 20px; margin: 15px 0; border-radius: 8px;">
    <h3 style="margin-top: 0; color: #333;">{{title}}</h3>
    <p style="color: #666; margin: 5px 0;">
      <strong>Type:</strong> {{type}} | 
      <strong>Organizer:</strong> {{organizer}}
    </p>
    <p style="color: #dc3545; margin: 5px 0;">
      <strong>Deadline:</strong> {{deadline}}
    </p>
    <p style="margin: 10px 0;">{{description}}</p>
    <a href="{{url}}" style="background-color: #28a745; color: white; padding: 8px 16px; text-decoration: none; border-radius: 4px; font-size: 14px;">View Details</a>
  </div>
  {{/opportunities}}
  
  <div style="text-align: center; margin: 30px 0;">
    <a href="{{allOpportunitiesUrl}}" style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px;">View All Opportunities</a>
  </div>
  
  <p style="color: #666; font-size: 12px;">
    You're receiving this digest because you subscribed to weekly opportunity updates. 
    <a href="{{unsubscribeUrl}}">Unsubscribe</a> or <a href="{{preferencesUrl}}">manage your preferences</a>.
  </p>
</div>`,
        },
        variables: [
          {
            name: 'userName',
            type: 'string',
            required: true,
            description: "User's display name",
          },
          {
            name: 'count',
            type: 'number',
            required: true,
            description: 'Number of opportunities',
          },
          {
            name: 'opportunities',
            type: 'array',
            required: true,
            description: 'Array of opportunity objects',
          },
          {
            name: 'allOpportunitiesUrl',
            type: 'string',
            required: true,
            description: 'Link to all opportunities',
          },
          {
            name: 'unsubscribeUrl',
            type: 'string',
            required: true,
            description: 'Unsubscribe link',
          },
          {
            name: 'preferencesUrl',
            type: 'string',
            required: true,
            description: 'Preferences management link',
          },
        ],
        active: true,
        version: 1,
        createdBy: 'system',
      },
      {
        name: 'Welcome Message',
        description: 'Welcome message for new users',
        type: 'system',
        channels: ['email', 'in_app'],
        subject: 'Welcome to OpportuneX!',
        title: 'Welcome to OpportuneX',
        content: {
          text: `Hi {{userName}},

Welcome to OpportuneX! We're excited to help you discover amazing opportunities.

Here's how to get started:
1. Complete your profile to get personalized recommendations
2. Set up opportunity alerts for your interests
3. Use our AI-powered search to find relevant opportunities
4. Get preparation roadmaps for opportunities you're interested in

Get started: {{dashboardUrl}}

If you have any questions, feel free to reach out to our support team at {{supportEmail}}.

Best regards,
The OpportuneX Team`,
          html: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <h1 style="color: #007bff;">Welcome to OpportuneX!</h1>
  <p>Hi {{userName}},</p>
  <p>Welcome to OpportuneX! We're excited to help you discover amazing opportunities.</p>
  
  <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
    <h3>Here's how to get started:</h3>
    <ol>
      <li>Complete your profile to get personalized recommendations</li>
      <li>Set up opportunity alerts for your interests</li>
      <li>Use our AI-powered search to find relevant opportunities</li>
      <li>Get preparation roadmaps for opportunities you're interested in</li>
    </ol>
  </div>
  
  <div style="text-align: center; margin: 30px 0;">
    <a href="{{dashboardUrl}}" style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px;">Get Started</a>
  </div>
  
  <p>If you have any questions, feel free to reach out to our support team at <a href="mailto:{{supportEmail}}">{{supportEmail}}</a>.</p>
  
  <p style="margin-top: 30px; color: #666;">
    Best regards,<br>
    The OpportuneX Team
  </p>
</div>`,
        },
        variables: [
          {
            name: 'userName',
            type: 'string',
            required: true,
            description: "User's display name",
          },
          {
            name: 'dashboardUrl',
            type: 'string',
            required: true,
            description: 'Link to user dashboard',
          },
          {
            name: 'supportEmail',
            type: 'string',
            required: true,
            description: 'Support email address',
          },
        ],
        active: true,
        version: 1,
        createdBy: 'system',
      },
    ];

    defaultTemplates.forEach(template => {
      const fullTemplate: NotificationTemplate = {
        ...template,
        id: this.generateId(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      this.templates.set(fullTemplate.id, fullTemplate);
    });
  }

  // Initialize default categories
  private initializeDefaultCategories(): void {
    const defaultCategories: Array<
      Omit<TemplateCategory, 'id' | 'createdAt' | 'updatedAt'>
    > = [
      {
        name: 'Opportunity Alerts',
        description: 'Templates for opportunity-related notifications',
        color: '#007bff',
        icon: '🎯',
        templates: [],
        active: true,
      },
      {
        name: 'Reminders',
        description: 'Templates for deadline and reminder notifications',
        color: '#dc3545',
        icon: '⏰',
        templates: [],
        active: true,
      },
      {
        name: 'Digests',
        description: 'Templates for periodic summary notifications',
        color: '#28a745',
        icon: '📊',
        templates: [],
        active: true,
      },
      {
        name: 'System',
        description: 'Templates for system and administrative notifications',
        color: '#6c757d',
        icon: '⚙️',
        templates: [],
        active: true,
      },
    ];

    defaultCategories.forEach(category => {
      const fullCategory: TemplateCategory = {
        ...category,
        id: this.generateId(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      this.categories.set(fullCategory.id, fullCategory);
    });

    // Assign templates to categories
    const templates = Array.from(this.templates.values());
    const categoryMap = Array.from(this.categories.values());

    templates.forEach(template => {
      let categoryId: string | undefined;

      switch (template.type) {
        case 'new_opportunity':
          categoryId = categoryMap.find(
            c => c.name === 'Opportunity Alerts'
          )?.id;
          break;
        case 'deadline_reminder':
          categoryId = categoryMap.find(c => c.name === 'Reminders')?.id;
          break;
        case 'recommendation':
          categoryId = categoryMap.find(c => c.name === 'Digests')?.id;
          break;
        case 'system':
          categoryId = categoryMap.find(c => c.name === 'System')?.id;
          break;
      }

      if (categoryId) {
        const category = this.categories.get(categoryId);
        if (category) {
          category.templates.push(template.id);
          this.categories.set(categoryId, category);
        }
      }
    });
  }

  // Create template
  async createTemplate(
    params: Omit<
      NotificationTemplate,
      'id' | 'version' | 'createdAt' | 'updatedAt'
    >
  ): Promise<NotificationTemplate> {
    // Validate input
    const validatedParams = notificationTemplateSchema.parse(params);

    const template: NotificationTemplate = {
      ...validatedParams,
      id: this.generateId(),
      version: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.templates.set(template.id, template);

    // TODO: Store in database
    console.log(
      `Created notification template ${template.id}: ${template.name}`
    );

    return template;
  }

  // Get template by ID
  async getTemplate(templateId: string): Promise<NotificationTemplate | null> {
    return this.templates.get(templateId) || null;
  }

  // Get templates by type
  async getTemplatesByType(
    type: NotificationType
  ): Promise<NotificationTemplate[]> {
    return Array.from(this.templates.values())
      .filter(template => template.type === type && template.active)
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  // Get templates by channel
  async getTemplatesByChannel(
    channel: NotificationChannel
  ): Promise<NotificationTemplate[]> {
    return Array.from(this.templates.values())
      .filter(
        template => template.channels.includes(channel) && template.active
      )
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  // Get all templates
  async getAllTemplates(
    options: {
      active?: boolean;
      createdBy?: string;
    } = {}
  ): Promise<NotificationTemplate[]> {
    let templates = Array.from(this.templates.values());

    if (options.active !== undefined) {
      templates = templates.filter(
        template => template.active === options.active
      );
    }

    if (options.createdBy) {
      templates = templates.filter(
        template => template.createdBy === options.createdBy
      );
    }

    return templates.sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
    );
  }

  // Update template
  async updateTemplate(
    templateId: string,
    updates: Partial<
      Omit<NotificationTemplate, 'id' | 'createdAt' | 'updatedAt'>
    >
  ): Promise<NotificationTemplate | null> {
    const template = this.templates.get(templateId);
    if (!template) return null;

    // Create new version if content changes
    const contentChanged = updates.content || updates.subject || updates.title;
    if (contentChanged) {
      template.version += 1;
    }

    // Apply updates
    Object.assign(template, updates, { updatedAt: new Date() });
    this.templates.set(templateId, template);

    // TODO: Update in database
    console.log(`Updated template ${templateId}`);

    return template;
  }

  // Delete template
  async deleteTemplate(templateId: string): Promise<boolean> {
    const template = this.templates.get(templateId);
    if (!template) return false;

    this.templates.delete(templateId);

    // Remove from categories
    for (const category of this.categories.values()) {
      const index = category.templates.indexOf(templateId);
      if (index > -1) {
        category.templates.splice(index, 1);
        this.categories.set(category.id, category);
      }
    }

    // TODO: Delete from database
    console.log(`Deleted template ${templateId}`);

    return true;
  }

  // Render template with context
  async renderTemplate(
    templateId: string,
    context: TemplateRenderContext
  ): Promise<RenderedTemplate | null> {
    const template = this.templates.get(templateId);
    if (!template) return null;

    // Validate required variables
    const missingVariables = template.variables
      .filter(
        variable => variable.required && !(variable.name in context.variables)
      )
      .map(variable => variable.name);

    if (missingVariables.length > 0) {
      throw new Error(
        `Missing required variables: ${missingVariables.join(', ')}`
      );
    }

    // Prepare render context with defaults
    const renderContext = {
      ...context.variables,
      ...context.user,
      ...context.opportunity,
      ...context.system,
    };

    // Add default values for missing optional variables
    template.variables.forEach(variable => {
      if (
        !variable.required &&
        !(variable.name in renderContext) &&
        variable.defaultValue !== undefined
      ) {
        renderContext[variable.name] = variable.defaultValue;
      }
    });

    // Render template
    const rendered: RenderedTemplate = {
      title: this.processTemplate(template.title, renderContext),
      content: {
        text: this.processTemplate(template.content.text, renderContext),
      },
    };

    if (template.subject) {
      rendered.subject = this.processTemplate(template.subject, renderContext);
    }

    if (template.content.html) {
      rendered.content.html = this.processTemplate(
        template.content.html,
        renderContext
      );
    }

    if (template.metadata) {
      rendered.metadata = template.metadata;
    }

    return rendered;
  }

  // Process template string with variables
  private processTemplate(
    template: string,
    context: Record<string, any>
  ): string {
    let processed = template;

    // Handle simple variable substitution {{variable}}
    processed = processed.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      const value = context[key];
      if (value === undefined || value === null) return match;

      // Format dates
      if (value instanceof Date) {
        return value.toLocaleDateString();
      }

      return String(value);
    });

    // Handle array iteration {{#array}}...{{/array}}
    processed = processed.replace(
      /\{\{#(\w+)\}\}([\s\S]*?)\{\{\/\1\}\}/g,
      (match, arrayKey, itemTemplate) => {
        const array = context[arrayKey];
        if (!Array.isArray(array)) return '';

        return array
          .map(item => {
            return itemTemplate.replace(
              /\{\{(\w+)\}\}/g,
              (itemMatch: string, itemKey: string) => {
                const value = item[itemKey];
                if (value === undefined || value === null) return itemMatch;

                if (value instanceof Date) {
                  return value.toLocaleDateString();
                }

                return String(value);
              }
            );
          })
          .join('');
      }
    );

    // Handle conditional blocks {{#if condition}}...{{/if}}
    processed = processed.replace(
      /\{\{#if (\w+)\}\}([\s\S]*?)\{\{\/if\}\}/g,
      (match, conditionKey, content) => {
        const condition = context[conditionKey];
        return condition ? content : '';
      }
    );

    // Handle negative conditional blocks {{#unless condition}}...{{/unless}}
    processed = processed.replace(
      /\{\{#unless (\w+)\}\}([\s\S]*?)\{\{\/unless\}\}/g,
      (match, conditionKey, content) => {
        const condition = context[conditionKey];
        return !condition ? content : '';
      }
    );

    return processed;
  }

  // Validate template variables
  async validateTemplate(
    templateId: string,
    variables: Record<string, any>
  ): Promise<{
    valid: boolean;
    errors: string[];
    warnings: string[];
  }> {
    const template = this.templates.get(templateId);
    if (!template) {
      return { valid: false, errors: ['Template not found'], warnings: [] };
    }

    const errors: string[] = [];
    const warnings: string[] = [];

    // Check required variables
    template.variables.forEach(variable => {
      if (variable.required && !(variable.name in variables)) {
        errors.push(`Missing required variable: ${variable.name}`);
      }

      const value = variables[variable.name];
      if (value !== undefined && variable.validation) {
        // Type validation
        const expectedType = variable.type;
        const actualType = Array.isArray(value) ? 'array' : typeof value;

        if (expectedType !== actualType) {
          errors.push(
            `Variable ${variable.name} should be ${expectedType}, got ${actualType}`
          );
        }

        // Range validation
        if (typeof value === 'number') {
          if (
            variable.validation.min !== undefined &&
            value < variable.validation.min
          ) {
            errors.push(
              `Variable ${variable.name} should be >= ${variable.validation.min}`
            );
          }
          if (
            variable.validation.max !== undefined &&
            value > variable.validation.max
          ) {
            errors.push(
              `Variable ${variable.name} should be <= ${variable.validation.max}`
            );
          }
        }

        // String length validation
        if (typeof value === 'string') {
          if (
            variable.validation.min !== undefined &&
            value.length < variable.validation.min
          ) {
            errors.push(
              `Variable ${variable.name} should have at least ${variable.validation.min} characters`
            );
          }
          if (
            variable.validation.max !== undefined &&
            value.length > variable.validation.max
          ) {
            errors.push(
              `Variable ${variable.name} should have at most ${variable.validation.max} characters`
            );
          }
        }

        // Pattern validation
        if (typeof value === 'string' && variable.validation.pattern) {
          const regex = new RegExp(variable.validation.pattern);
          if (!regex.test(value)) {
            errors.push(
              `Variable ${variable.name} does not match required pattern`
            );
          }
        }

        // Enum validation
        if (
          variable.validation.enum &&
          !variable.validation.enum.includes(value)
        ) {
          errors.push(
            `Variable ${variable.name} should be one of: ${variable.validation.enum.join(', ')}`
          );
        }
      }
    });

    // Check for unused variables
    Object.keys(variables).forEach(key => {
      const templateVariable = template.variables.find(v => v.name === key);
      if (!templateVariable) {
        warnings.push(`Unused variable: ${key}`);
      }
    });

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  // Get template categories
  async getCategories(): Promise<TemplateCategory[]> {
    return Array.from(this.categories.values())
      .filter(category => category.active)
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  // Create template category
  async createCategory(
    params: Omit<TemplateCategory, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<TemplateCategory> {
    const category: TemplateCategory = {
      ...params,
      id: this.generateId(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.categories.set(category.id, category);

    // TODO: Store in database
    console.log(`Created template category ${category.id}: ${category.name}`);

    return category;
  }

  // Get template statistics
  async getTemplateStats(): Promise<{
    totalTemplates: number;
    activeTemplates: number;
    byType: Record<NotificationType, number>;
    byChannel: Record<NotificationChannel, number>;
    byCategory: Record<string, number>;
    mostUsed: Array<{ templateId: string; name: string; usageCount: number }>;
  }> {
    const templates = Array.from(this.templates.values());
    const activeTemplates = templates.filter(t => t.active);

    const byType: Record<NotificationType, number> = {
      new_opportunity: 0,
      deadline_reminder: 0,
      recommendation: 0,
      system: 0,
    };

    const byChannel: Record<NotificationChannel, number> = {
      email: 0,
      sms: 0,
      in_app: 0,
      push: 0,
    };

    const byCategory: Record<string, number> = {};

    templates.forEach(template => {
      byType[template.type]++;

      template.channels.forEach(channel => {
        byChannel[channel]++;
      });
    });

    this.categories.forEach(category => {
      byCategory[category.name] = category.templates.length;
    });

    // TODO: Get actual usage statistics from database
    const mostUsed = templates
      .map(template => ({
        templateId: template.id,
        name: template.name,
        usageCount: Math.floor(Math.random() * 100), // Mock data
      }))
      .sort((a, b) => b.usageCount - a.usageCount)
      .slice(0, 10);

    return {
      totalTemplates: templates.length,
      activeTemplates: activeTemplates.length,
      byType,
      byChannel,
      byCategory,
      mostUsed,
    };
  }

  // Generate unique ID
  private generateId(): string {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
  }
}

// Export singleton instance
export const notificationTemplateService = new NotificationTemplateService();
