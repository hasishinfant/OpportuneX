import { ethers } from 'ethers';
import fs from 'fs';
import path from 'path';

/**
 * Blockchain Service for OpportuneX Credential Verification
 * Handles interaction with the CredentialVerification smart contract
 */

export interface CredentialMetadata {
  title: string;
  description: string;
  recipientName: string;
  recipientEmail: string;
  issuerName: string;
  credentialType: 'certificate' | 'badge' | 'achievement' | 'participation';
  opportunityId?: string;
  opportunityTitle?: string;
  completionDate: string;
  skills?: string[];
  imageUrl?: string;
}

export interface BlockchainCredential {
  credentialId: string;
  recipient: string;
  issuer: string;
  credentialType: number;
  status: number;
  metadataURI: string;
  issuedAt: number;
  expiresAt: number;
  transferable: boolean;
}

export interface VerificationResult {
  isValid: boolean;
  credential: BlockchainCredential;
  metadata?: CredentialMetadata;
}

class BlockchainService {
  private provider: ethers.Provider | null = null;
  private contract: ethers.Contract | null = null;
  private signer: ethers.Signer | null = null;
  private contractAddress: string = '';
  private contractABI: any[] = [];

  constructor() {
    this.initialize();
  }

  /**
   * Initialize blockchain connection
   */
  private async initialize() {
    try {
      const rpcUrl = process.env.BLOCKCHAIN_RPC_URL;
      const privateKey = process.env.BLOCKCHAIN_PRIVATE_KEY;
      const network = process.env.BLOCKCHAIN_NETWORK || 'mumbai';

      if (!rpcUrl || !privateKey) {
        console.warn(
          'Blockchain credentials not configured. Service will be unavailable.'
        );
        return;
      }

      // Connect to blockchain network
      this.provider = new ethers.JsonRpcProvider(rpcUrl);
      this.signer = new ethers.Wallet(privateKey, this.provider);

      // Load contract address and ABI
      const deploymentPath = path.join(
        process.cwd(),
        'contracts',
        'deployments',
        `${network}.json`
      );

      if (fs.existsSync(deploymentPath)) {
        const deployment = JSON.parse(fs.readFileSync(deploymentPath, 'utf-8'));
        this.contractAddress = deployment.contractAddress;
      } else {
        console.warn(`Deployment file not found for network: ${network}`);
        return;
      }

      // Load contract ABI
      const artifactPath = path.join(
        process.cwd(),
        'contracts',
        'artifacts',
        'contracts',
        'CredentialVerification.sol',
        'CredentialVerification.json'
      );

      if (fs.existsSync(artifactPath)) {
        const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf-8'));
        this.contractABI = artifact.abi;
      } else {
        console.warn('Contract ABI not found. Please compile contracts first.');
        return;
      }

      // Initialize contract instance
      this.contract = new ethers.Contract(
        this.contractAddress,
        this.contractABI,
        this.signer
      );

      console.log('Blockchain service initialized successfully');
      console.log(`Network: ${network}`);
      console.log(`Contract: ${this.contractAddress}`);
    } catch (error) {
      console.error('Failed to initialize blockchain service:', error);
    }
  }

  /**
   * Check if blockchain service is available
   */
  isAvailable(): boolean {
    return this.contract !== null && this.provider !== null;
  }

  /**
   * Issue a new credential on blockchain
   */
  async issueCredential(
    recipientAddress: string,
    credentialType: 'certificate' | 'badge' | 'achievement' | 'participation',
    metadataURI: string,
    expiresAt: number = 0,
    transferable: boolean = false
  ): Promise<string> {
    if (!this.contract) {
      throw new Error('Blockchain service not initialized');
    }

    const typeMap = {
      certificate: 0,
      badge: 1,
      achievement: 2,
      participation: 3,
    };

    try {
      const tx = await this.contract.issueCredential(
        recipientAddress,
        typeMap[credentialType],
        metadataURI,
        expiresAt,
        transferable
      );

      const receipt = await tx.wait();

      // Extract credential ID from event
      const event = receipt.logs.find((log: any) => {
        try {
          const parsed = this.contract!.interface.parseLog(log);
          return parsed?.name === 'CredentialIssued';
        } catch {
          return false;
        }
      });

      if (!event) {
        throw new Error('CredentialIssued event not found');
      }

      const parsedEvent = this.contract.interface.parseLog(event);
      const credentialId = parsedEvent?.args.credentialId;

      return credentialId;
    } catch (error) {
      console.error('Failed to issue credential:', error);
      throw error;
    }
  }

  /**
   * Verify a credential
   */
  async verifyCredential(credentialId: string): Promise<VerificationResult> {
    if (!this.contract) {
      throw new Error('Blockchain service not initialized');
    }

    try {
      const [isValid, credential] =
        await this.contract.verifyCredential(credentialId);

      return {
        isValid,
        credential: {
          credentialId: credential.credentialId,
          recipient: credential.recipient,
          issuer: credential.issuer,
          credentialType: Number(credential.credentialType),
          status: Number(credential.status),
          metadataURI: credential.metadataURI,
          issuedAt: Number(credential.issuedAt),
          expiresAt: Number(credential.expiresAt),
          transferable: credential.transferable,
        },
      };
    } catch (error) {
      console.error('Failed to verify credential:', error);
      throw error;
    }
  }

  /**
   * Get credential details
   */
  async getCredential(credentialId: string): Promise<BlockchainCredential> {
    if (!this.contract) {
      throw new Error('Blockchain service not initialized');
    }

    try {
      const credential = await this.contract.getCredential(credentialId);

      return {
        credentialId: credential.credentialId,
        recipient: credential.recipient,
        issuer: credential.issuer,
        credentialType: Number(credential.credentialType),
        status: Number(credential.status),
        metadataURI: credential.metadataURI,
        issuedAt: Number(credential.issuedAt),
        expiresAt: Number(credential.expiresAt),
        transferable: credential.transferable,
      };
    } catch (error) {
      console.error('Failed to get credential:', error);
      throw error;
    }
  }

  /**
   * Get all credentials for a recipient
   */
  async getRecipientCredentials(recipientAddress: string): Promise<string[]> {
    if (!this.contract) {
      throw new Error('Blockchain service not initialized');
    }

    try {
      const credentialIds =
        await this.contract.getRecipientCredentials(recipientAddress);
      return credentialIds;
    } catch (error) {
      console.error('Failed to get recipient credentials:', error);
      throw error;
    }
  }

  /**
   * Revoke a credential
   */
  async revokeCredential(credentialId: string): Promise<void> {
    if (!this.contract) {
      throw new Error('Blockchain service not initialized');
    }

    try {
      const tx = await this.contract.revokeCredential(credentialId);
      await tx.wait();
    } catch (error) {
      console.error('Failed to revoke credential:', error);
      throw error;
    }
  }

  /**
   * Transfer a credential
   */
  async transferCredential(
    credentialId: string,
    newRecipientAddress: string
  ): Promise<void> {
    if (!this.contract) {
      throw new Error('Blockchain service not initialized');
    }

    try {
      const tx = await this.contract.transferCredential(
        credentialId,
        newRecipientAddress
      );
      await tx.wait();
    } catch (error) {
      console.error('Failed to transfer credential:', error);
      throw error;
    }
  }

  /**
   * Register a new issuer (admin only)
   */
  async registerIssuer(issuerAddress: string, name: string): Promise<void> {
    if (!this.contract) {
      throw new Error('Blockchain service not initialized');
    }

    try {
      const tx = await this.contract.registerIssuer(issuerAddress, name);
      await tx.wait();
    } catch (error) {
      console.error('Failed to register issuer:', error);
      throw error;
    }
  }

  /**
   * Verify an issuer (admin only)
   */
  async verifyIssuer(issuerAddress: string): Promise<void> {
    if (!this.contract) {
      throw new Error('Blockchain service not initialized');
    }

    try {
      const tx = await this.contract.verifyIssuer(issuerAddress);
      await tx.wait();
    } catch (error) {
      console.error('Failed to verify issuer:', error);
      throw error;
    }
  }

  /**
   * Check if an address is a verified issuer
   */
  async isVerifiedIssuer(issuerAddress: string): Promise<boolean> {
    if (!this.contract) {
      throw new Error('Blockchain service not initialized');
    }

    try {
      return await this.contract.isVerifiedIssuer(issuerAddress);
    } catch (error) {
      console.error('Failed to check issuer status:', error);
      throw error;
    }
  }

  /**
   * Get transaction receipt
   */
  async getTransactionReceipt(txHash: string) {
    if (!this.provider) {
      throw new Error('Blockchain service not initialized');
    }

    try {
      return await this.provider.getTransactionReceipt(txHash);
    } catch (error) {
      console.error('Failed to get transaction receipt:', error);
      throw error;
    }
  }

  /**
   * Get current block number
   */
  async getCurrentBlockNumber(): Promise<number> {
    if (!this.provider) {
      throw new Error('Blockchain service not initialized');
    }

    try {
      return await this.provider.getBlockNumber();
    } catch (error) {
      console.error('Failed to get block number:', error);
      throw error;
    }
  }

  /**
   * Get contract address
   */
  getContractAddress(): string {
    return this.contractAddress;
  }

  /**
   * Get network information
   */
  async getNetworkInfo() {
    if (!this.provider) {
      throw new Error('Blockchain service not initialized');
    }

    try {
      const network = await this.provider.getNetwork();
      return {
        name: network.name,
        chainId: Number(network.chainId),
      };
    } catch (error) {
      console.error('Failed to get network info:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const blockchainService = new BlockchainService();
