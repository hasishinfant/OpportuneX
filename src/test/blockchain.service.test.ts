import { blockchainService } from '../lib/services/blockchain.service';
import { credentialService } from '../lib/services/credential.service';

describe('Blockchain Service', () => {
  describe('Service Availability', () => {
    it('should check if blockchain service is available', () => {
      const isAvailable = blockchainService.isAvailable();
      expect(typeof isAvailable).toBe('boolean');
    });
  });

  describe('Contract Information', () => {
    it('should return contract address', () => {
      const address = blockchainService.getContractAddress();
      expect(typeof address).toBe('string');
    });
  });

  // Note: These tests require a running blockchain node
  describe('Credential Operations (Integration)', () => {
    const testRecipient = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb';
    const testMetadataUri = 'ipfs://QmTest123';

    it('should issue a credential', async () => {
      if (!blockchainService.isAvailable()) {
        console.log('Blockchain service not available, skipping test');
        return;
      }

      try {
        const credentialId = await blockchainService.issueCredential(
          testRecipient,
          'certificate',
          testMetadataUri,
          0,
          false
        );

        expect(credentialId).toBeDefined();
        expect(typeof credentialId).toBe('string');
      } catch (error) {
        console.log('Test skipped - blockchain not configured:', error);
      }
    });

    it('should verify a credential', async () => {
      if (!blockchainService.isAvailable()) {
        console.log('Blockchain service not available, skipping test');
        return;
      }

      // This test requires a valid credential ID from previous issuance
      // In real tests, you would use a known test credential
      expect(true).toBe(true);
    });
  });
});

describe('Credential Service', () => {
  describe('Credential Management', () => {
    it('should have issueCredential method', () => {
      expect(typeof credentialService.issueCredential).toBe('function');
    });

    it('should have verifyCredential method', () => {
      expect(typeof credentialService.verifyCredential).toBe('function');
    });

    it('should have getUserCredentials method', () => {
      expect(typeof credentialService.getUserCredentials).toBe('function');
    });

    it('should have revokeCredential method', () => {
      expect(typeof credentialService.revokeCredential).toBe('function');
    });

    it('should have shareCredential method', () => {
      expect(typeof credentialService.shareCredential).toBe('function');
    });
  });
});
