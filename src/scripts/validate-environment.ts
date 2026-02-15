#!/usr/bin/env tsx

/**
 * Environment Validation Script for OpportuneX
 * Validates environment configuration and secrets management
 */

import { Client } from '@elastic/elasticsearch';
import { createClient } from 'redis';
import { env, validateEnv } from '../lib/env';
import {
  getSecretsAudit,
  secretsManager,
  validateAllSecrets,
} from '../lib/secrets';

interface ValidationResult {
  category: string;
  status: 'pass' | 'warn' | 'fail';
  message: string;
  details?: any;
}

class EnvironmentValidator {
  private results: ValidationResult[] = [];

  /**
   * Add validation result
   */
  private addResult(
    category: string,
    status: 'pass' | 'warn' | 'fail',
    message: string,
    details?: any
  ) {
    this.results.push({ category, status, message, details });
  }

  /**
   * Validate basic environment setup
   */
  async validateBasicEnvironment(): Promise<void> {
    console.log('🔍 Validating basic environment setup...');

    try {
      const healthCheck = validateEnv.getHealthCheck();

      if (healthCheck.status === 'healthy') {
        this.addResult(
          'Environment',
          'pass',
          `Environment is healthy (${env.NODE_ENV})`
        );
      } else if (healthCheck.status === 'warning') {
        this.addResult(
          'Environment',
          'warn',
          `Environment has warnings (${env.NODE_ENV})`,
          healthCheck
        );
      } else {
        this.addResult(
          'Environment',
          'fail',
          `Environment validation failed (${env.NODE_ENV})`,
          healthCheck
        );
      }
    } catch (error) {
      this.addResult(
        'Environment',
        'fail',
        `Environment validation error: ${error}`
      );
    }
  }

  /**
   * Validate secrets management
   */
  async validateSecrets(): Promise<void> {
    console.log('🔐 Validating secrets management...');

    try {
      const secretsValidation = validateAllSecrets();
      const audit = getSecretsAudit();

      if (secretsValidation.valid) {
        this.addResult(
          'Secrets',
          'pass',
          `All required secrets are configured (${audit.configured}/${audit.total})`
        );
      } else {
        this.addResult(
          'Secrets',
          'fail',
          `Missing required secrets: ${secretsValidation.missing.join(', ')}`,
          audit
        );
      }

      if (secretsValidation.warnings.length > 0) {
        this.addResult(
          'Secrets',
          'warn',
          `Secret warnings: ${secretsValidation.warnings.length}`,
          secretsValidation.warnings
        );
      }

      // Test secret encryption/decryption
      try {
        const testSecret = 'test-secret-value';
        const encrypted = secretsManager.encryptSecret(testSecret);
        const decrypted = secretsManager.decryptSecret(encrypted);

        if (decrypted === testSecret) {
          this.addResult(
            'Secrets',
            'pass',
            'Secret encryption/decryption working correctly'
          );
        } else {
          this.addResult(
            'Secrets',
            'fail',
            'Secret encryption/decryption failed'
          );
        }
      } catch (error) {
        this.addResult(
          'Secrets',
          'fail',
          `Secret encryption test failed: ${error}`
        );
      }
    } catch (error) {
      this.addResult('Secrets', 'fail', `Secrets validation error: ${error}`);
    }
  }

  /**
   * Validate database connection
   */
  async validateDatabase(): Promise<void> {
    console.log('🗄️  Validating database connection...');

    try {
      // Check if DATABASE_URL is properly formatted
      const dbUrl = process.env.DATABASE_URL;
      if (!dbUrl) {
        this.addResult('Database', 'fail', 'DATABASE_URL is not set');
        return;
      }

      // Validate URL format
      try {
        const url = new URL(dbUrl);
        const validProtocols = ['postgresql:', 'postgres:', 'prisma+postgres:'];
        if (!validProtocols.includes(url.protocol)) {
          this.addResult(
            'Database',
            'fail',
            `Invalid DATABASE_URL protocol: ${url.protocol}`
          );
          return;
        }
      } catch (urlError) {
        this.addResult('Database', 'fail', 'Invalid DATABASE_URL format');
        return;
      }

      // Try to connect to database
      const { PrismaClient } = await import('@prisma/client');
      const prisma = new PrismaClient({
        log: ['error'],
      });

      await prisma.$connect();
      await prisma.$queryRaw`SELECT 1`;
      await prisma.$disconnect();

      this.addResult('Database', 'pass', 'Database connection successful');
    } catch (error) {
      // If connection fails, it might be because services aren't running
      if (
        error.message.includes('ECONNREFUSED') ||
        error.message.includes('getaddrinfo ENOTFOUND')
      ) {
        this.addResult(
          'Database',
          'warn',
          'Database service not available (connection refused)'
        );
      } else if (error.message.includes('PrismaClientOptions')) {
        this.addResult(
          'Database',
          'fail',
          'Database configuration error - check DATABASE_URL format'
        );
      } else {
        this.addResult(
          'Database',
          'warn',
          `Database connection failed: ${error.message}`
        );
      }
    }
  }

  /**
   * Validate Redis connection
   */
  async validateRedis(): Promise<void> {
    console.log('🔴 Validating Redis connection...');

    try {
      // Check if REDIS_URL is properly formatted
      const redisUrl = process.env.REDIS_URL;
      if (!redisUrl) {
        this.addResult('Redis', 'fail', 'REDIS_URL is not set');
        return;
      }

      // Validate URL format
      try {
        const url = new URL(redisUrl);
        if (url.protocol !== 'redis:' && url.protocol !== 'rediss:') {
          this.addResult(
            'Redis',
            'fail',
            `Invalid REDIS_URL protocol: ${url.protocol}`
          );
          return;
        }
      } catch (urlError) {
        this.addResult('Redis', 'fail', 'Invalid REDIS_URL format');
        return;
      }

      const redis = createClient({ url: redisUrl });

      await redis.connect();
      await redis.ping();
      await redis.disconnect();

      this.addResult('Redis', 'pass', 'Redis connection successful');
    } catch (error) {
      // If connection fails, it might be because services aren't running
      if (
        error.message.includes('ECONNREFUSED') ||
        error.message.includes('getaddrinfo ENOTFOUND')
      ) {
        this.addResult(
          'Redis',
          'warn',
          'Redis service not available (connection refused)'
        );
      } else {
        this.addResult(
          'Redis',
          'warn',
          `Redis connection failed: ${error.message}`
        );
      }
    }
  }

  /**
   * Validate Elasticsearch connection
   */
  async validateElasticsearch(): Promise<void> {
    console.log('🔍 Validating Elasticsearch connection...');

    const esUrl = process.env.ELASTICSEARCH_URL;
    if (!esUrl) {
      this.addResult(
        'Elasticsearch',
        'warn',
        'Elasticsearch URL not configured'
      );
      return;
    }

    try {
      // Validate URL format
      try {
        const url = new URL(esUrl);
        if (!['http:', 'https:'].includes(url.protocol)) {
          this.addResult(
            'Elasticsearch',
            'fail',
            `Invalid ELASTICSEARCH_URL protocol: ${url.protocol}`
          );
          return;
        }
      } catch (urlError) {
        this.addResult(
          'Elasticsearch',
          'fail',
          'Invalid ELASTICSEARCH_URL format'
        );
        return;
      }

      const client = new Client({
        node: esUrl,
        auth:
          process.env.ELASTICSEARCH_USERNAME &&
          process.env.ELASTICSEARCH_PASSWORD
            ? {
                username: process.env.ELASTICSEARCH_USERNAME,
                password: process.env.ELASTICSEARCH_PASSWORD,
              }
            : undefined,
        requestTimeout: 5000,
      });

      const health = await client.cluster.health();

      if (health.status === 'green' || health.status === 'yellow') {
        this.addResult(
          'Elasticsearch',
          'pass',
          `Elasticsearch connection successful (${health.status})`
        );
      } else {
        this.addResult(
          'Elasticsearch',
          'warn',
          `Elasticsearch status: ${health.status}`
        );
      }
    } catch (error) {
      // If connection fails, it might be because services aren't running
      if (
        error.message.includes('ECONNREFUSED') ||
        error.message.includes('getaddrinfo ENOTFOUND')
      ) {
        this.addResult(
          'Elasticsearch',
          'warn',
          'Elasticsearch service not available (connection refused)'
        );
      } else {
        this.addResult(
          'Elasticsearch',
          'warn',
          `Elasticsearch connection failed: ${error.message}`
        );
      }
    }
  }

  /**
   * Validate external API configurations
   */
  async validateExternalAPIs(): Promise<void> {
    console.log('🌐 Validating external API configurations...');

    const apis = [
      { name: 'OpenAI', key: env.OPENAI_API_KEY, required: false },
      {
        name: 'Google Speech-to-Text',
        key: env.GOOGLE_SPEECH_TO_TEXT_API_KEY,
        required: false,
      },
      { name: 'Azure Speech', key: env.AZURE_SPEECH_KEY, required: false },
      { name: 'SendGrid', key: env.SENDGRID_API_KEY, required: false },
      { name: 'Twilio', key: env.TWILIO_ACCOUNT_SID, required: false },
    ];

    let configuredCount = 0;

    apis.forEach(api => {
      if (api.key) {
        configuredCount++;
        if (api.key.includes('REPLACE_WITH') || api.key.includes('your-')) {
          this.addResult(
            'External APIs',
            'warn',
            `${api.name} API key appears to be a placeholder`
          );
        } else {
          this.addResult(
            'External APIs',
            'pass',
            `${api.name} API key configured`
          );
        }
      } else if (api.required) {
        this.addResult(
          'External APIs',
          'fail',
          `${api.name} API key is required but not configured`
        );
      }
    });

    if (configuredCount === 0) {
      this.addResult(
        'External APIs',
        'warn',
        'No external APIs configured - some features may not work'
      );
    }
  }

  /**
   * Validate production-specific requirements
   */
  async validateProductionRequirements(): Promise<void> {
    if (env.NODE_ENV !== 'production') {
      return;
    }

    console.log('🏭 Validating production requirements...');

    const productionChecks = validateEnv.checkProductionReadiness();

    if (productionChecks.ready) {
      this.addResult('Production', 'pass', 'Production requirements satisfied');
    } else {
      productionChecks.issues.forEach(issue => {
        this.addResult('Production', 'fail', issue);
      });
    }

    // Additional production checks
    if (!env.SENTRY_DSN) {
      this.addResult(
        'Production',
        'warn',
        'Sentry DSN not configured - error monitoring disabled'
      );
    }

    if (!env.HTTPS_ONLY) {
      this.addResult(
        'Production',
        'fail',
        'HTTPS_ONLY should be enabled in production'
      );
    }

    if (!env.SECURE_COOKIES) {
      this.addResult(
        'Production',
        'fail',
        'SECURE_COOKIES should be enabled in production'
      );
    }
  }

  /**
   * Run all validations
   */
  async runAllValidations(): Promise<ValidationResult[]> {
    console.log('🚀 Starting comprehensive environment validation...\n');

    await this.validateBasicEnvironment();
    await this.validateSecrets();
    await this.validateDatabase();
    await this.validateRedis();
    await this.validateElasticsearch();
    await this.validateExternalAPIs();
    await this.validateProductionRequirements();

    return this.results;
  }

  /**
   * Print validation results
   */
  printResults(): void {
    console.log('\n📊 Environment Validation Results');
    console.log('='.repeat(50));

    const categories = [...new Set(this.results.map(r => r.category))];

    categories.forEach(category => {
      const categoryResults = this.results.filter(r => r.category === category);
      const passCount = categoryResults.filter(r => r.status === 'pass').length;
      const warnCount = categoryResults.filter(r => r.status === 'warn').length;
      const failCount = categoryResults.filter(r => r.status === 'fail').length;

      console.log(`\n${category}:`);

      categoryResults.forEach(result => {
        const icon =
          result.status === 'pass'
            ? '✅'
            : result.status === 'warn'
              ? '⚠️'
              : '❌';
        console.log(`  ${icon} ${result.message}`);

        if (
          result.details &&
          (result.status === 'warn' || result.status === 'fail')
        ) {
          console.log(
            `     Details: ${JSON.stringify(result.details, null, 2)}`
          );
        }
      });
    });

    // Summary
    const totalPass = this.results.filter(r => r.status === 'pass').length;
    const totalWarn = this.results.filter(r => r.status === 'warn').length;
    const totalFail = this.results.filter(r => r.status === 'fail').length;
    const total = this.results.length;

    console.log(`\n${'='.repeat(50)}`);
    console.log(
      `Summary: ${totalPass} passed, ${totalWarn} warnings, ${totalFail} failed (${total} total)`
    );

    if (totalFail > 0) {
      console.log(
        '\n❌ Environment validation failed. Please fix the issues above.'
      );
      process.exit(1);
    } else if (totalWarn > 0) {
      console.log('\n⚠️  Environment validation passed with warnings.');
      process.exit(0);
    } else {
      console.log('\n✅ Environment validation passed successfully!');
      process.exit(0);
    }
  }
}

// Main execution
async function main() {
  const validator = new EnvironmentValidator();

  try {
    await validator.runAllValidations();
    validator.printResults();
  } catch (error) {
    console.error('❌ Environment validation failed with error:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

export { EnvironmentValidator };
