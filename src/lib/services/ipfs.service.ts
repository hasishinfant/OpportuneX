import FormData from 'form-data';
import fetch from 'node-fetch';
import { CredentialMetadata } from './blockchain.service';

/**
 * IPFS Service for storing credential metadata
 * Uses Pinata or Infura IPFS gateway
 */

interface IPFSUploadResponse {
  IpfsHash: string;
  PinSize: number;
  Timestamp: string;
}

class IPFSService {
  private pinataApiKey: string;
  private pinataSecretKey: string;
  private pinataGateway: string;
  private useInfura: boolean;
  private infuraProjectId: string;
  private infuraProjectSecret: string;

  constructor() {
    this.pinataApiKey = process.env.PINATA_API_KEY || '';
    this.pinataSecretKey = process.env.PINATA_SECRET_KEY || '';
    this.pinataGateway =
      process.env.PINATA_GATEWAY || 'https://gateway.pinata.cloud';

    this.infuraProjectId = process.env.INFURA_IPFS_PROJECT_ID || '';
    this.infuraProjectSecret = process.env.INFURA_IPFS_PROJECT_SECRET || '';

    // Use Infura if Pinata credentials are not available
    this.useInfura = !this.pinataApiKey && !!this.infuraProjectId;
  }

  /**
   * Check if IPFS service is available
   */
  isAvailable(): boolean {
    return (
      (!!this.pinataApiKey && !!this.pinataSecretKey) ||
      (!!this.infuraProjectId && !!this.infuraProjectSecret)
    );
  }

  /**
   * Upload credential metadata to IPFS
   */
  async uploadMetadata(metadata: CredentialMetadata): Promise<string> {
    if (!this.isAvailable()) {
      throw new Error('IPFS service not configured');
    }

    try {
      if (this.useInfura) {
        return await this.uploadToInfura(metadata);
      } else {
        return await this.uploadToPinata(metadata);
      }
    } catch (error) {
      console.error('Failed to upload metadata to IPFS:', error);
      throw error;
    }
  }

  /**
   * Upload to Pinata
   */
  private async uploadToPinata(metadata: CredentialMetadata): Promise<string> {
    const url = 'https://api.pinata.cloud/pinning/pinJSONToIPFS';

    const data = {
      pinataContent: metadata,
      pinataMetadata: {
        name: `credential-${metadata.credentialType}-${Date.now()}`,
      },
      pinataOptions: {
        cidVersion: 1,
      },
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        pinata_api_key: this.pinataApiKey,
        pinata_secret_api_key: this.pinataSecretKey,
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Pinata upload failed: ${error}`);
    }

    const result = (await response.json()) as IPFSUploadResponse;
    return `ipfs://${result.IpfsHash}`;
  }

  /**
   * Upload to Infura
   */
  private async uploadToInfura(metadata: CredentialMetadata): Promise<string> {
    const url = 'https://ipfs.infura.io:5001/api/v0/add';

    const formData = new FormData();
    formData.append('file', Buffer.from(JSON.stringify(metadata)), {
      filename: `credential-${metadata.credentialType}-${Date.now()}.json`,
      contentType: 'application/json',
    });

    const auth = Buffer.from(
      `${this.infuraProjectId}:${this.infuraProjectSecret}`
    ).toString('base64');

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
      },
      body: formData as any,
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Infura upload failed: ${error}`);
    }

    const result = await response.json();
    return `ipfs://${result.Hash}`;
  }

  /**
   * Retrieve metadata from IPFS
   */
  async getMetadata(ipfsUri: string): Promise<CredentialMetadata> {
    try {
      // Extract IPFS hash from URI
      const hash = ipfsUri.replace('ipfs://', '');

      // Try multiple gateways for redundancy
      const gateways = [
        `${this.pinataGateway}/ipfs/${hash}`,
        `https://ipfs.io/ipfs/${hash}`,
        `https://cloudflare-ipfs.com/ipfs/${hash}`,
        `https://gateway.ipfs.io/ipfs/${hash}`,
      ];

      for (const gateway of gateways) {
        try {
          const response = await fetch(gateway, {
            timeout: 5000,
          } as any);

          if (response.ok) {
            return (await response.json()) as CredentialMetadata;
          }
        } catch (error) {
          // Try next gateway
          continue;
        }
      }

      throw new Error('Failed to retrieve metadata from all IPFS gateways');
    } catch (error) {
      console.error('Failed to get metadata from IPFS:', error);
      throw error;
    }
  }

  /**
   * Pin existing IPFS hash (Pinata only)
   */
  async pinByHash(ipfsHash: string): Promise<void> {
    if (this.useInfura) {
      console.warn('Pin by hash not supported with Infura');
      return;
    }

    const url = 'https://api.pinata.cloud/pinning/pinByHash';

    const data = {
      hashToPin: ipfsHash,
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        pinata_api_key: this.pinataApiKey,
        pinata_secret_api_key: this.pinataSecretKey,
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Pinata pin failed: ${error}`);
    }
  }

  /**
   * Unpin IPFS hash (Pinata only)
   */
  async unpin(ipfsHash: string): Promise<void> {
    if (this.useInfura) {
      console.warn('Unpin not supported with Infura');
      return;
    }

    const url = `https://api.pinata.cloud/pinning/unpin/${ipfsHash}`;

    const response = await fetch(url, {
      method: 'DELETE',
      headers: {
        pinata_api_key: this.pinataApiKey,
        pinata_secret_api_key: this.pinataSecretKey,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Pinata unpin failed: ${error}`);
    }
  }

  /**
   * Get pinned items (Pinata only)
   */
  async getPinnedItems(): Promise<any[]> {
    if (this.useInfura) {
      console.warn('Get pinned items not supported with Infura');
      return [];
    }

    const url = 'https://api.pinata.cloud/data/pinList';

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        pinata_api_key: this.pinataApiKey,
        pinata_secret_api_key: this.pinataSecretKey,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to get pinned items: ${error}`);
    }

    const result = await response.json();
    return result.rows || [];
  }

  /**
   * Convert IPFS URI to HTTP gateway URL
   */
  toGatewayUrl(ipfsUri: string): string {
    const hash = ipfsUri.replace('ipfs://', '');
    return `${this.pinataGateway}/ipfs/${hash}`;
  }
}

// Export singleton instance
export const ipfsService = new IPFSService();
