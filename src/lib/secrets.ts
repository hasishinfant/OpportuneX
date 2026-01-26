import {
  createHash,
  createCipheriv,
  createDecipheriv,
  randomBytes,
} from 'crypto';
import { z } from 'zod';

/**
 * Secrets Management System for OpportuneX
 * Provides secure handling of sensitive configuration data
 */

// Secret classification levels
export enum SecretLevel {
  PUBLIC = 'public',
  INTERNAL = 'internal',
  CONFIDENTIAL = 'confidential',
  RESTRICTED = 'restricted',
}

// Secret metadata interface
interface SecretMetadata {
  level: SecretLevel;
  description: string;
  required: boolean;
  environments: Array<'development' | 'production' | 'test'>;
  lastRotated?: Date;
  expiresAt?: Date;
}

// Secret registry with metadata
export const SECRET_REGISTRY: Record<string, SecretMetadata> = {
  // Database secrets
  DATABASE_URL: {
    level: SecretLevel.RESTRICTED,
    description: 'PostgreSQL database connection string',
    required: true,
    environments: ['development', 'production', 'test'],
  },
  REDIS_URL: {
    level: SecretLevel.RESTRICTED,
    description: 'Redis cache connection string',
    required: true,
    environments: ['development', 'production', 'test'],
  },

  // Authentication secrets
  JWT_SECRET: {
    level: SecretLevel.RESTRICTED,
    description: 'JWT signing secret key',
    required: true,
    environments: ['development', 'production', 'test'],
  },
  REFRESH_TOKEN_SECRET: {
    level: SecretLevel.RESTRICTED,
    description: 'Refresh token signing secret key',
    required: true,
    environments: ['development', 'production', 'test'],
  },

  // External API keys
  OPENAI_API_KEY: {
    level: SecretLevel.CONFIDENTIAL,
    description: 'OpenAI API key for AI instructor functionality',
    required: false,
    environments: ['production'],
  },
  GOOGLE_SPEECH_TO_TEXT_API_KEY: {
    level: SecretLevel.CONFIDENTIAL,
    description: 'Google Speech-to-Text API key',
    required: false,
    environments: ['production'],
  },
  AZURE_SPEECH_KEY: {
    level: SecretLevel.CONFIDENTIAL,
    description: 'Azure Speech Services API key',
    required: false,
    environments: ['production'],
  },

  // Communication service keys
  SENDGRID_API_KEY: {
    level: SecretLevel.CONFIDENTIAL,
    description: 'SendGrid email service API key',
    required: false,
    environments: ['production'],
  },
  TWILIO_ACCOUNT_SID: {
    level: SecretLevel.CONFIDENTIAL,
    description: 'Twilio SMS service account SID',
    required: false,
    environments: ['production'],
  },
  TWILIO_AUTH_TOKEN: {
    level: SecretLevel.RESTRICTED,
    description: 'Twilio SMS service auth token',
    required: false,
    environments: ['production'],
  },

  // Monitoring and analytics
  SENTRY_DSN: {
    level: SecretLevel.INTERNAL,
    description: 'Sentry error monitoring DSN',
    required: false,
    environments: ['production'],
  },
  GOOGLE_ANALYTICS_ID: {
    level: SecretLevel.INTERNAL,
    description: 'Google Analytics tracking ID',
    required: false,
    environments: ['production'],
  },

  // Elasticsearch credentials
  ELASTICSEARCH_USERNAME: {
    level: SecretLevel.CONFIDENTIAL,
    description: 'Elasticsearch username',
    required: false,
    environments: ['production'],
  },
  ELASTICSEARCH_PASSWORD: {
    level: SecretLevel.RESTRICTED,
    description: 'Elasticsearch password',
    required: false,
    environments: ['production'],
  },
};

/**
 * Secret validation schema
 */
const secretValidationSchema = z.object({
  value: z.string().min(1, 'Secret value cannot be empty'),
  level: z.nativeEnum(SecretLevel),
  environment: z.enum(['development', 'production', 'test']),
});

/**
 * Secrets Manager Class
 */
export class SecretsManager {
  private static instance: SecretsManager;
  private encryptionKey: string;
  private secrets: Map<string, string> = new Map();

  private constructor() {
    // Generate or retrieve encryption key
    this.encryptionKey = this.getOrCreateEncryptionKey();
    this.loadSecrets();
  }

  public static getInstance(): SecretsManager {
    if (!SecretsManager.instance) {
      SecretsManager.instance = new SecretsManager();
    }
    return SecretsManager.instance;
  }

  /**
   * Get or create encryption key for secret encryption
   */
  private getOrCreateEncryptionKey(): string {
    const envKey = process.env.SECRETS_ENCRYPTION_KEY;
    if (envKey) {
      return envKey;
    }

    // In development or test, use a deterministic key
    if (
      process.env.NODE_ENV === 'development' ||
      process.env.NODE_ENV === 'test'
    ) {
      return createHash('sha256').update('dev-encryption-key').digest('hex');
    }

    // In production, this should be provided via environment variable
    // For now, generate a warning but don't fail
    console.warn(
      '⚠️  SECRETS_ENCRYPTION_KEY not provided in production. Using generated key.'
    );
    return createHash('sha256').update(`prod-key-${Date.now()}`).digest('hex');
  }

  /**
   * Load secrets from environment variables
   */
  private loadSecrets(): void {
    const currentEnv =
      (process.env.NODE_ENV as 'development' | 'production' | 'test') ||
      'development';

    Object.entries(SECRET_REGISTRY).forEach(([key, metadata]) => {
      if (metadata.environments.includes(currentEnv)) {
        const value = process.env[key];
        if (value) {
          this.secrets.set(key, value);
        } else if (metadata.required) {
          console.warn(
            `⚠️  Required secret ${key} is missing for ${currentEnv} environment`
          );
        }
      }
    });
  }

  /**
   * Get a secret value
   */
  public getSecret(key: string): string | undefined {
    return this.secrets.get(key);
  }

  /**
   * Get a secret value with validation
   */
  public getSecretRequired(key: string): string {
    const value = this.secrets.get(key);
    if (!value) {
      throw new Error(`Required secret ${key} is not available`);
    }
    return value;
  }

  /**
   * Set a secret value (for runtime configuration)
   */
  public setSecret(
    key: string,
    value: string,
    level: SecretLevel = SecretLevel.INTERNAL
  ): void {
    const currentEnv =
      (process.env.NODE_ENV as 'development' | 'production' | 'test') ||
      'development';

    // Validate the secret
    const validation = secretValidationSchema.safeParse({
      value,
      level,
      environment: currentEnv,
    });

    if (!validation.success) {
      throw new Error(`Invalid secret: ${validation.error.message}`);
    }

    this.secrets.set(key, value);
  }

  /**
   * Encrypt a secret value using AES-256-GCM
   */
  public encryptSecret(value: string): string {
    try {
      const iv = randomBytes(16);
      const cipher = createCipheriv(
        'aes-256-gcm',
        Buffer.from(this.encryptionKey, 'hex').subarray(0, 32),
        iv
      );

      let encrypted = cipher.update(value, 'utf8', 'hex');
      encrypted += cipher.final('hex');

      const authTag = cipher.getAuthTag();

      // Combine IV, authTag, and encrypted data
      return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
    } catch (error) {
      throw new Error(`Failed to encrypt secret: ${error}`);
    }
  }

  /**
   * Decrypt a secret value using AES-256-GCM
   */
  public decryptSecret(encryptedValue: string): string {
    try {
      const parts = encryptedValue.split(':');
      if (parts.length !== 3) {
        throw new Error('Invalid encrypted value format');
      }

      const iv = Buffer.from(parts[0], 'hex');
      const authTag = Buffer.from(parts[1], 'hex');
      const encrypted = parts[2];

      const decipher = createDecipheriv(
        'aes-256-gcm',
        Buffer.from(this.encryptionKey, 'hex').subarray(0, 32),
        iv
      );
      decipher.setAuthTag(authTag);

      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (error) {
      throw new Error(`Failed to decrypt secret: ${error}`);
    }
  }

  /**
   * Generate a secure random secret
   */
  public generateSecret(length = 32): string {
    return randomBytes(length).toString('hex');
  }

  /**
   * Validate all secrets for current environment
   */
  public validateSecrets(): {
    valid: boolean;
    missing: string[];
    warnings: string[];
  } {
    const currentEnv =
      (process.env.NODE_ENV as 'development' | 'production' | 'test') ||
      'development';
    const missing: string[] = [];
    const warnings: string[] = [];

    Object.entries(SECRET_REGISTRY).forEach(([key, metadata]) => {
      if (metadata.environments.includes(currentEnv)) {
        const value = this.secrets.get(key);

        if (!value && metadata.required) {
          missing.push(key);
        }

        // Check secret strength for production
        if (value && currentEnv === 'production') {
          if (metadata.level === SecretLevel.RESTRICTED && value.length < 32) {
            warnings.push(
              `${key} should be at least 32 characters long in production`
            );
          }

          if (
            value.includes('REPLACE_WITH') ||
            value.includes('test-') ||
            value.includes('dev-')
          ) {
            warnings.push(
              `${key} appears to contain placeholder or test values`
            );
          }
        }

        // Check for expired secrets
        if (metadata.expiresAt && metadata.expiresAt < new Date()) {
          warnings.push(`${key} has expired and should be rotated`);
        }
      }
    });

    return {
      valid: missing.length === 0,
      missing,
      warnings,
    };
  }

  /**
   * Get secrets audit information
   */
  public getSecretsAudit(): {
    total: number;
    byLevel: Record<SecretLevel, number>;
    configured: number;
    missing: number;
  } {
    const currentEnv =
      (process.env.NODE_ENV as 'development' | 'production' | 'test') ||
      'development';
    const byLevel: Record<SecretLevel, number> = {
      [SecretLevel.PUBLIC]: 0,
      [SecretLevel.INTERNAL]: 0,
      [SecretLevel.CONFIDENTIAL]: 0,
      [SecretLevel.RESTRICTED]: 0,
    };

    let configured = 0;
    let total = 0;

    Object.entries(SECRET_REGISTRY).forEach(([key, metadata]) => {
      if (metadata.environments.includes(currentEnv)) {
        total++;
        byLevel[metadata.level]++;

        if (this.secrets.has(key)) {
          configured++;
        }
      }
    });

    return {
      total,
      byLevel,
      configured,
      missing: total - configured,
    };
  }

  /**
   * Mask sensitive values for logging
   */
  public maskSecret(value: string, visibleChars = 4): string {
    if (value.length <= visibleChars * 2) {
      return '*'.repeat(value.length);
    }

    const start = value.substring(0, visibleChars);
    const end = value.substring(value.length - visibleChars);
    const middle = '*'.repeat(value.length - visibleChars * 2);

    return `${start}${middle}${end}`;
  }

  /**
   * Clear all secrets from memory (for security)
   */
  public clearSecrets(): void {
    this.secrets.clear();
  }
}

// Export singleton instance
export const secretsManager = SecretsManager.getInstance();

// Helper functions for common secret operations
export const getSecret = (key: string): string | undefined =>
  secretsManager.getSecret(key);
export const getSecretRequired = (key: string): string =>
  secretsManager.getSecretRequired(key);
export const validateAllSecrets = () => secretsManager.validateSecrets();
export const getSecretsAudit = () => secretsManager.getSecretsAudit();
export const maskSecret = (value: string, visibleChars?: number) =>
  secretsManager.maskSecret(value, visibleChars);

// Environment-specific secret validation
export const validateEnvironmentSecrets = (
  environment: 'development' | 'production' | 'test'
) => {
  const requiredSecrets = Object.entries(SECRET_REGISTRY)
    .filter(
      ([_, metadata]) =>
        metadata.required && metadata.environments.includes(environment)
    )
    .map(([key]) => key);

  const missingSecrets = requiredSecrets.filter(key => !process.env[key]);

  if (missingSecrets.length > 0) {
    throw new Error(
      `Missing required secrets for ${environment}: ${missingSecrets.join(', ')}`
    );
  }

  return true;
};
