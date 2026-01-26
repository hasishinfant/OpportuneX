#!/usr/bin/env tsx

/**
 * Secrets Generation Script for OpportuneX
 * Generates secure secrets for different environments
 */

import { randomBytes, createHash } from 'crypto';
import { writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { secretsManager, SecretLevel, SECRET_REGISTRY } from '../lib/secrets';

interface SecretTemplate {
  key: string;
  description: string;
  length?: number;
  type: 'random' | 'uuid' | 'jwt' | 'hash' | 'custom';
  customGenerator?: () => string;
  required: boolean;
  environments: Array<'development' | 'production' | 'test'>;
}

class SecretsGenerator {
  private secrets: Map<string, string> = new Map();

  /**
   * Generate a random hex string
   */
  private generateRandomHex(length = 32): string {
    return randomBytes(length).toString('hex');
  }

  /**
   * Generate a UUID v4
   */
  private generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(
      /[xy]/g,
      function (c) {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      }
    );
  }

  /**
   * Generate a JWT secret (64 characters)
   */
  private generateJWTSecret(): string {
    return this.generateRandomHex(32); // 64 hex characters
  }

  /**
   * Generate a hash from input
   */
  private generateHash(input: string): string {
    return createHash('sha256').update(input).digest('hex');
  }

  /**
   * Generate secret based on type
   */
  private generateSecret(template: SecretTemplate): string {
    switch (template.type) {
      case 'random':
        return this.generateRandomHex(template.length || 32);
      case 'uuid':
        return this.generateUUID();
      case 'jwt':
        return this.generateJWTSecret();
      case 'hash':
        return this.generateHash(`${template.key}-${Date.now()}`);
      case 'custom':
        return template.customGenerator
          ? template.customGenerator()
          : this.generateRandomHex();
      default:
        return this.generateRandomHex(template.length || 32);
    }
  }

  /**
   * Secret templates for different types
   */
  private getSecretTemplates(): SecretTemplate[] {
    return [
      {
        key: 'JWT_SECRET',
        description: 'JWT signing secret key',
        type: 'jwt',
        required: true,
        environments: ['development', 'production', 'test'],
      },
      {
        key: 'REFRESH_TOKEN_SECRET',
        description: 'Refresh token signing secret key',
        type: 'jwt',
        required: true,
        environments: ['development', 'production', 'test'],
      },
      {
        key: 'SECRETS_ENCRYPTION_KEY',
        description: 'Key for encrypting secrets at rest',
        type: 'jwt',
        required: false,
        environments: ['production'],
      },
      {
        key: 'SESSION_SECRET',
        description: 'Session encryption secret',
        type: 'random',
        length: 32,
        required: false,
        environments: ['development', 'production'],
      },
      {
        key: 'WEBHOOK_SECRET',
        description: 'Webhook signature verification secret',
        type: 'random',
        length: 24,
        required: false,
        environments: ['production'],
      },
      {
        key: 'API_KEY_SALT',
        description: 'Salt for API key generation',
        type: 'random',
        length: 16,
        required: false,
        environments: ['production'],
      },
    ];
  }

  /**
   * Generate secrets for specific environment
   */
  generateSecretsForEnvironment(
    environment: 'development' | 'production' | 'test'
  ): Map<string, string> {
    console.log(`🔐 Generating secrets for ${environment} environment...`);

    const templates = this.getSecretTemplates();
    const environmentSecrets = new Map<string, string>();

    templates.forEach(template => {
      if (template.environments.includes(environment)) {
        const secret = this.generateSecret(template);
        environmentSecrets.set(template.key, secret);
        console.log(`  ✅ Generated ${template.key} (${template.description})`);
      }
    });

    return environmentSecrets;
  }

  /**
   * Generate environment file with secrets
   */
  generateEnvironmentFile(
    environment: 'development' | 'production' | 'test',
    overwrite = false
  ): void {
    const filename = `.env.${environment}.secrets`;
    const filepath = join(process.cwd(), filename);

    if (existsSync(filepath) && !overwrite) {
      console.log(
        `⚠️  ${filename} already exists. Use --overwrite to replace it.`
      );
      return;
    }

    const secrets = this.generateSecretsForEnvironment(environment);

    let content = `# Generated secrets for ${environment} environment\n`;
    content += `# Generated on: ${new Date().toISOString()}\n`;
    content += `# WARNING: Keep this file secure and never commit to version control\n\n`;

    secrets.forEach((value, key) => {
      const template = this.getSecretTemplates().find(t => t.key === key);
      if (template) {
        content += `# ${template.description}\n`;
        content += `${key}="${value}"\n\n`;
      }
    });

    writeFileSync(filepath, content);
    console.log(`✅ Generated ${filename}`);
    console.log(`⚠️  Remember to add ${filename} to your .gitignore file!`);
  }

  /**
   * Validate existing secrets
   */
  validateExistingSecrets(environment: 'development' | 'production' | 'test'): {
    valid: boolean;
    issues: string[];
    recommendations: string[];
  } {
    console.log(`🔍 Validating existing secrets for ${environment}...`);

    const issues: string[] = [];
    const recommendations: string[] = [];
    const templates = this.getSecretTemplates();

    templates.forEach(template => {
      if (template.environments.includes(environment)) {
        const value = process.env[template.key];

        if (!value && template.required) {
          issues.push(`Missing required secret: ${template.key}`);
        } else if (value) {
          // Check for common issues
          if (
            value.includes('REPLACE_WITH') ||
            value.includes('your-') ||
            value.includes('example')
          ) {
            issues.push(`${template.key} contains placeholder values`);
          }

          if (template.type === 'jwt' && value.length < 64) {
            if (environment === 'production') {
              issues.push(
                `${template.key} should be at least 64 characters in production`
              );
            } else {
              recommendations.push(
                `${template.key} should be at least 64 characters for better security`
              );
            }
          }

          if (
            environment === 'production' &&
            (value.includes('dev-') || value.includes('test-'))
          ) {
            issues.push(
              `${template.key} appears to contain development/test values in production`
            );
          }
        }
      }
    });

    return {
      valid: issues.length === 0,
      issues,
      recommendations,
    };
  }

  /**
   * Rotate secrets (generate new ones)
   */
  rotateSecrets(
    environment: 'development' | 'production' | 'test',
    secretKeys?: string[]
  ): void {
    console.log(`🔄 Rotating secrets for ${environment} environment...`);

    const templates = this.getSecretTemplates();
    const toRotate = secretKeys || templates.map(t => t.key);

    toRotate.forEach(key => {
      const template = templates.find(t => t.key === key);
      if (template && template.environments.includes(environment)) {
        const newSecret = this.generateSecret(template);
        console.log(`  🔄 Rotated ${key}`);
        console.log(
          `     New value: ${secretsManager.maskSecret(newSecret, 8)}`
        );
      }
    });
  }

  /**
   * Generate secrets audit report
   */
  generateAuditReport(): void {
    console.log('📊 Secrets Audit Report');
    console.log('='.repeat(50));

    const audit = secretsManager.getSecretsAudit();
    const validation = secretsManager.validateSecrets();

    console.log(`Environment: ${process.env.NODE_ENV}`);
    console.log(`Total secrets: ${audit.total}`);
    console.log(`Configured: ${audit.configured}`);
    console.log(`Missing: ${audit.missing}`);
    console.log('');

    console.log('By Security Level:');
    Object.entries(audit.byLevel).forEach(([level, count]) => {
      console.log(`  ${level}: ${count}`);
    });

    if (validation.missing.length > 0) {
      console.log('\n❌ Missing Required Secrets:');
      validation.missing.forEach(secret => console.log(`  - ${secret}`));
    }

    if (validation.warnings.length > 0) {
      console.log('\n⚠️  Warnings:');
      validation.warnings.forEach(warning => console.log(`  - ${warning}`));
    }

    console.log('\n📋 Secret Registry:');
    Object.entries(SECRET_REGISTRY).forEach(([key, metadata]) => {
      const configured = secretsManager.getSecret(key) ? '✅' : '❌';
      console.log(
        `  ${configured} ${key} (${metadata.level}) - ${metadata.description}`
      );
    });
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  const environment =
    (args[1] as 'development' | 'production' | 'test') || 'development';
  const overwrite = args.includes('--overwrite');

  const generator = new SecretsGenerator();

  switch (command) {
    case 'generate':
      generator.generateEnvironmentFile(environment, overwrite);
      break;

    case 'validate':
      const validation = generator.validateExistingSecrets(environment);
      console.log(
        `\nValidation Result: ${validation.valid ? '✅ PASSED' : '❌ FAILED'}`
      );

      if (validation.issues.length > 0) {
        console.log('\n❌ Issues:');
        validation.issues.forEach(issue => console.log(`  - ${issue}`));
      }

      if (validation.recommendations.length > 0) {
        console.log('\n💡 Recommendations:');
        validation.recommendations.forEach(rec => console.log(`  - ${rec}`));
      }

      process.exit(validation.valid ? 0 : 1);
      break;

    case 'rotate':
      const secretKeys = args.slice(2).filter(arg => !arg.startsWith('--'));
      generator.rotateSecrets(
        environment,
        secretKeys.length > 0 ? secretKeys : undefined
      );
      break;

    case 'audit':
      generator.generateAuditReport();
      break;

    default:
      console.log('OpportuneX Secrets Generator');
      console.log('');
      console.log('Usage:');
      console.log(
        '  tsx src/scripts/generate-secrets.ts generate [environment] [--overwrite]'
      );
      console.log(
        '  tsx src/scripts/generate-secrets.ts validate [environment]'
      );
      console.log(
        '  tsx src/scripts/generate-secrets.ts rotate [environment] [secret1] [secret2]...'
      );
      console.log('  tsx src/scripts/generate-secrets.ts audit');
      console.log('');
      console.log('Environments: development, production, test');
      console.log('');
      console.log('Examples:');
      console.log('  tsx src/scripts/generate-secrets.ts generate production');
      console.log('  tsx src/scripts/generate-secrets.ts validate development');
      console.log(
        '  tsx src/scripts/generate-secrets.ts rotate production JWT_SECRET'
      );
      console.log('  tsx src/scripts/generate-secrets.ts audit');
      break;
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

export { SecretsGenerator };
