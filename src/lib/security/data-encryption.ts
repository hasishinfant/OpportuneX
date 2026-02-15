import bcrypt from 'bcrypt';
import crypto from 'crypto';

/**
 * Data encryption utilities for sensitive information
 */
export class DataEncryption {
  private static readonly ALGORITHM = 'aes-256-gcm';
  private static readonly KEY_LENGTH = 32;
  private static readonly IV_LENGTH = 16;
  private static readonly TAG_LENGTH = 16;
  private static readonly SALT_ROUNDS = 12;

  /**
   * Get encryption key from environment or generate one
   */
  private static getEncryptionKey(): Buffer {
    const key = process.env.ENCRYPTION_KEY;
    if (!key) {
      throw new Error('ENCRYPTION_KEY environment variable is required');
    }

    // Derive key from the provided key using PBKDF2
    const salt = process.env.ENCRYPTION_SALT || 'opportunex-default-salt';
    return crypto.pbkdf2Sync(key, salt, 100000, this.KEY_LENGTH, 'sha256');
  }

  /**
   * Encrypt sensitive data
   */
  static encrypt(plaintext: string): string {
    try {
      const key = this.getEncryptionKey();
      const iv = crypto.randomBytes(this.IV_LENGTH);
      const cipher = crypto.createCipher(this.ALGORITHM, key);
      cipher.setAAD(Buffer.from('OpportuneX-AAD'));

      let encrypted = cipher.update(plaintext, 'utf8', 'hex');
      encrypted += cipher.final('hex');

      const tag = cipher.getAuthTag();

      // Combine IV, tag, and encrypted data
      const result = `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted}`;
      return result;
    } catch (error) {
      console.error('Encryption error:', error);
      throw new Error('Failed to encrypt data');
    }
  }

  /**
   * Decrypt sensitive data
   */
  static decrypt(encryptedData: string): string {
    try {
      const key = this.getEncryptionKey();
      const parts = encryptedData.split(':');

      if (parts.length !== 3) {
        throw new Error('Invalid encrypted data format');
      }

      const iv = Buffer.from(parts[0], 'hex');
      const tag = Buffer.from(parts[1], 'hex');
      const encrypted = parts[2];

      const decipher = crypto.createDecipher(this.ALGORITHM, key);
      decipher.setAAD(Buffer.from('OpportuneX-AAD'));
      decipher.setAuthTag(tag);

      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (error) {
      console.error('Decryption error:', error);
      throw new Error('Failed to decrypt data');
    }
  }

  /**
   * Hash passwords securely
   */
  static async hashPassword(password: string): Promise<string> {
    try {
      return await bcrypt.hash(password, this.SALT_ROUNDS);
    } catch (error) {
      console.error('Password hashing error:', error);
      throw new Error('Failed to hash password');
    }
  }

  /**
   * Verify password against hash
   */
  static async verifyPassword(
    password: string,
    hash: string
  ): Promise<boolean> {
    try {
      return await bcrypt.compare(password, hash);
    } catch (error) {
      console.error('Password verification error:', error);
      return false;
    }
  }

  /**
   * Generate secure random token
   */
  static generateSecureToken(length = 32): string {
    return crypto.randomBytes(length).toString('hex');
  }

  /**
   * Hash sensitive data for indexing (one-way)
   */
  static hashForIndex(data: string, salt?: string): string {
    const actualSalt = salt || process.env.INDEX_SALT || 'default-index-salt';
    return crypto
      .createHash('sha256')
      .update(data + actualSalt)
      .digest('hex');
  }

  /**
   * Encrypt user PII (Personally Identifiable Information)
   */
  static encryptPII(data: {
    email?: string;
    phone?: string;
    name?: string;
    address?: string;
  }): any {
    const encrypted: any = {};

    for (const [key, value] of Object.entries(data)) {
      if (value && typeof value === 'string') {
        encrypted[key] = this.encrypt(value);
      } else {
        encrypted[key] = value;
      }
    }

    return encrypted;
  }

  /**
   * Decrypt user PII
   */
  static decryptPII(encryptedData: any): any {
    const decrypted: any = {};

    for (const [key, value] of Object.entries(encryptedData)) {
      if (value && typeof value === 'string' && value.includes(':')) {
        try {
          decrypted[key] = this.decrypt(value);
        } catch (error) {
          console.error(`Failed to decrypt ${key}:`, error);
          decrypted[key] = '[DECRYPTION_FAILED]';
        }
      } else {
        decrypted[key] = value;
      }
    }

    return decrypted;
  }

  /**
   * Encrypt database field
   */
  static encryptField(value: any): any {
    if (value === null || value === undefined) {
      return value;
    }

    if (typeof value === 'string') {
      return this.encrypt(value);
    }

    if (typeof value === 'object') {
      return this.encrypt(JSON.stringify(value));
    }

    return this.encrypt(String(value));
  }

  /**
   * Decrypt database field
   */
  static decryptField(encryptedValue: any): any {
    if (!encryptedValue || typeof encryptedValue !== 'string') {
      return encryptedValue;
    }

    try {
      const decrypted = this.decrypt(encryptedValue);

      // Try to parse as JSON if it looks like JSON
      if (decrypted.startsWith('{') || decrypted.startsWith('[')) {
        try {
          return JSON.parse(decrypted);
        } catch {
          return decrypted;
        }
      }

      return decrypted;
    } catch (error) {
      console.error('Field decryption error:', error);
      return '[DECRYPTION_FAILED]';
    }
  }

  /**
   * Encrypt sensitive search queries
   */
  static encryptSearchQuery(query: string, userId: string): string {
    const data = JSON.stringify({
      query,
      userId,
      timestamp: Date.now(),
    });
    return this.encrypt(data);
  }

  /**
   * Decrypt search query
   */
  static decryptSearchQuery(encryptedQuery: string): {
    query: string;
    userId: string;
    timestamp: number;
  } | null {
    try {
      const decrypted = this.decrypt(encryptedQuery);
      return JSON.parse(decrypted);
    } catch (error) {
      console.error('Search query decryption error:', error);
      return null;
    }
  }

  /**
   * Key rotation utilities
   */
  static async rotateEncryptionKey(
    oldKey: string,
    newKey: string
  ): Promise<void> {
    // This would be used in a migration script to re-encrypt data with new key
    console.warn('Key rotation should be performed during maintenance window');

    // Implementation would:
    // 1. Decrypt all encrypted fields with old key
    // 2. Re-encrypt with new key
    // 3. Update environment variable
    // 4. Verify all data can be decrypted with new key

    throw new Error(
      'Key rotation must be implemented as a separate migration process'
    );
  }

  /**
   * Secure data comparison without decryption
   */
  static secureCompare(encryptedValue: string, plainValue: string): boolean {
    try {
      const decrypted = this.decrypt(encryptedValue);
      return crypto.timingSafeEqual(
        Buffer.from(decrypted, 'utf8'),
        Buffer.from(plainValue, 'utf8')
      );
    } catch (error) {
      return false;
    }
  }

  /**
   * Generate encryption key for new deployment
   */
  static generateEncryptionKey(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Validate encryption key strength
   */
  static validateEncryptionKey(key: string): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (!key) {
      errors.push('Encryption key is required');
    } else {
      if (key.length < 32) {
        errors.push('Encryption key must be at least 32 characters');
      }

      if (!/^[a-fA-F0-9]+$/.test(key)) {
        errors.push('Encryption key must be hexadecimal');
      }

      if (key === 'default-key' || key === '00000000000000000000000000000000') {
        errors.push('Encryption key must not be a default or weak key');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Encrypt file contents
   */
  static encryptFile(fileBuffer: Buffer): {
    encryptedData: Buffer;
    metadata: {
      algorithm: string;
      iv: string;
      tag: string;
    };
  } {
    const key = this.getEncryptionKey();
    const iv = crypto.randomBytes(this.IV_LENGTH);
    const cipher = crypto.createCipher(this.ALGORITHM, key);

    const encrypted = Buffer.concat([
      cipher.update(fileBuffer),
      cipher.final(),
    ]);

    const tag = cipher.getAuthTag();

    return {
      encryptedData: encrypted,
      metadata: {
        algorithm: this.ALGORITHM,
        iv: iv.toString('hex'),
        tag: tag.toString('hex'),
      },
    };
  }

  /**
   * Decrypt file contents
   */
  static decryptFile(
    encryptedData: Buffer,
    metadata: {
      algorithm: string;
      iv: string;
      tag: string;
    }
  ): Buffer {
    const key = this.getEncryptionKey();
    const iv = Buffer.from(metadata.iv, 'hex');
    const tag = Buffer.from(metadata.tag, 'hex');

    const decipher = crypto.createDecipher(metadata.algorithm, key);
    decipher.setAuthTag(tag);

    return Buffer.concat([decipher.update(encryptedData), decipher.final()]);
  }
}

/**
 * Middleware to encrypt sensitive request/response data
 */
export const encryptionMiddleware = {
  /**
   * Encrypt sensitive fields in request body
   */
  encryptRequest: (sensitiveFields: string[]) => {
    return (req: any, res: any, next: any) => {
      if (req.body) {
        for (const field of sensitiveFields) {
          if (req.body[field]) {
            req.body[field] = DataEncryption.encryptField(req.body[field]);
          }
        }
      }
      next();
    };
  },

  /**
   * Decrypt sensitive fields in response data
   */
  decryptResponse: (sensitiveFields: string[]) => {
    return (req: any, res: any, next: any) => {
      const originalJson = res.json;

      res.json = function (data: any) {
        if (data && typeof data === 'object') {
          for (const field of sensitiveFields) {
            if (data[field]) {
              data[field] = DataEncryption.decryptField(data[field]);
            }
          }
        }

        return originalJson.call(this, data);
      };

      next();
    };
  },
};
