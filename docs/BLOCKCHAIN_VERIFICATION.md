# Blockchain Verification System

## Overview

The OpportuneX blockchain verification system provides tamper-proof credential verification for certificates, badges, achievements, and participation records. Built on Ethereum-compatible blockchains, it ensures that student credentials are verifiable, portable, and permanently recorded.

## Features

- **Immutable Credentials**: All credentials are stored on blockchain, making them tamper-proof
- **IPFS Storage**: Credential metadata stored on IPFS for decentralized access
- **Multiple Credential Types**: Support for certificates, badges, achievements, and participation records
- **Verification Portal**: Public portal for employers/institutions to verify credentials
- **Shareable Links**: Generate time-limited shareable links for credentials
- **Wallet Integration**: Each user gets a blockchain wallet for credential management
- **Revocation Support**: Issuers can revoke credentials if needed
- **Transfer Support**: Optional credential transferability

## Architecture

### Components

1. **Smart Contract** (`contracts/CredentialVerification.sol`)
   - Solidity smart contract for credential management
   - Handles issuance, verification, revocation, and transfer
   - Manages issuer registration and verification

2. **Blockchain Service** (`src/lib/services/blockchain.service.ts`)
   - TypeScript service for interacting with smart contract
   - Uses ethers.js for blockchain communication
   - Handles transaction signing and monitoring

3. **IPFS Service** (`src/lib/services/ipfs.service.ts`)
   - Manages credential metadata storage on IPFS
   - Supports Pinata and Infura IPFS gateways
   - Handles metadata retrieval and pinning

4. **Credential Service** (`src/lib/services/credential.service.ts`)
   - High-level service for credential operations
   - Manages database records and blockchain interactions
   - Handles user wallet generation and management

5. **API Routes** (`src/lib/routes/blockchain.ts`)
   - RESTful API endpoints for credential operations
   - Authentication and authorization
   - Request validation

6. **Frontend Components**
   - `CredentialCard`: Display individual credentials
   - `CredentialList`: List user's credentials
   - `VerificationPortal`: Public verification interface

## Setup

### Prerequisites

- Node.js 18+
- PostgreSQL database
- Blockchain RPC endpoint (Sepolia, Mumbai, or Polygon)
- IPFS gateway (Pinata or Infura)

### Installation

1. **Install Dependencies**

```bash
# Install main project dependencies
npm install

# Install contract dependencies
cd contracts
npm install
cd ..
```

2. **Configure Environment Variables**

Add to `.env`:

```bash
# Blockchain Configuration
BLOCKCHAIN_RPC_URL=https://rpc-mumbai.maticvigil.com
BLOCKCHAIN_PRIVATE_KEY=your_private_key_here
BLOCKCHAIN_NETWORK=mumbai

# IPFS Configuration (choose one)
# Option 1: Pinata
PINATA_API_KEY=your_pinata_api_key
PINATA_SECRET_KEY=your_pinata_secret_key
PINATA_GATEWAY=https://gateway.pinata.cloud

# Option 2: Infura
INFURA_IPFS_PROJECT_ID=your_infura_project_id
INFURA_IPFS_PROJECT_SECRET=your_infura_project_secret

# Encryption
ENCRYPTION_KEY=your_encryption_key_for_private_keys
```

3. **Compile Smart Contracts**

```bash
cd contracts
npm run compile
```

4. **Deploy Smart Contract**

For testnet (Mumbai):

```bash
cd contracts
npm run deploy:mumbai
```

For local development:

```bash
cd contracts
npm run node  # Start local Hardhat node
# In another terminal:
npm run deploy:local
```

5. **Run Database Migrations**

```bash
npm run db:migrate
```

## Usage

### Issuing Credentials

**Via API:**

```typescript
POST /api/blockchain/credentials/issue
Authorization: Bearer <token>

{
  "opportunityId": "uuid",
  "credentialType": "certificate",
  "title": "Hackathon Winner",
  "description": "First place in XYZ Hackathon",
  "skills": ["React", "Node.js", "Blockchain"],
  "expiresAt": "2025-12-31T23:59:59Z",
  "transferable": false
}
```

**Via Service:**

```typescript
import { credentialService } from '@/lib/services/credential.service';

const credential = await credentialService.issueCredential({
  userId: 'user-uuid',
  opportunityId: 'opportunity-uuid',
  credentialType: 'certificate',
  title: 'Hackathon Winner',
  description: 'First place in XYZ Hackathon',
  skills: ['React', 'Node.js', 'Blockchain'],
});
```

### Verifying Credentials

**Via API:**

```typescript
POST /api/blockchain/credentials/verify

{
  "credentialId": "0x..."
}
```

**Via Service:**

```typescript
import { credentialService } from '@/lib/services/credential.service';

const verification = await credentialService.verifyCredential(credentialId);

if (verification.isValid) {
  console.log('Credential is valid!');
  console.log('Metadata:', verification.credential.metadata);
}
```

### Sharing Credentials

```typescript
POST /api/blockchain/credentials/:id/share
Authorization: Bearer <token>

Response:
{
  "shareUrl": "https://opportunex.com/verify/abc123",
  "shareToken": "abc123"
}
```

### Revoking Credentials

```typescript
POST /api/blockchain/credentials/:id/revoke
Authorization: Bearer <token>
```

## Frontend Integration

### Display User Credentials

```tsx
import { CredentialList } from '@/components/blockchain/CredentialList';

export default function CredentialsPage() {
  return (
    <div>
      <h1>My Credentials</h1>
      <CredentialList />
    </div>
  );
}
```

### Verification Portal

```tsx
import { VerificationPortal } from '@/components/blockchain/VerificationPortal';

export default function VerifyPage() {
  return (
    <div>
      <h1>Verify Credential</h1>
      <VerificationPortal />
    </div>
  );
}
```

### Using the Hook

```tsx
import { useBlockchain } from '@/hooks/useBlockchain';

function MyComponent() {
  const { status, issueCredential, verifyCredential } = useBlockchain();

  const handleIssue = async () => {
    const result = await issueCredential({
      credentialType: 'badge',
      title: 'JavaScript Expert',
      description: 'Completed advanced JavaScript course',
    });
  };

  return (
    <div>
      {status?.available ? (
        <p>Blockchain connected: {status.network?.name}</p>
      ) : (
        <p>Blockchain not available</p>
      )}
    </div>
  );
}
```

## Smart Contract Details

### Credential Structure

```solidity
struct Credential {
    bytes32 credentialId;
    address recipient;
    address issuer;
    CredentialType credentialType;
    CredentialStatus status;
    string metadataURI;
    uint256 issuedAt;
    uint256 expiresAt;
    bool transferable;
}
```

### Key Functions

- `issueCredential()`: Issue a new credential
- `verifyCredential()`: Verify credential validity
- `revokeCredential()`: Revoke a credential
- `transferCredential()`: Transfer credential to another address
- `registerIssuer()`: Register a new issuer (admin only)
- `verifyIssuer()`: Verify an issuer (admin only)

## Testing

### Run Smart Contract Tests

```bash
cd contracts
npm test
```

### Run Service Tests

```bash
npm run test
```

### Manual Testing

1. Start local blockchain:

```bash
cd contracts
npm run node
```

2. Deploy contract:

```bash
npm run deploy:local
```

3. Test credential issuance and verification through API

## Security Considerations

1. **Private Key Management**
   - Never commit private keys to version control
   - Use environment variables for sensitive data
   - Encrypt user private keys in database

2. **Access Control**
   - Only verified issuers can issue credentials
   - Users can only revoke their own credentials
   - Admin functions protected by owner modifier

3. **Data Privacy**
   - Minimal personal data on blockchain
   - Sensitive data stored in IPFS metadata
   - User consent required for credential sharing

4. **Smart Contract Security**
   - Audited contract code
   - Reentrancy protection
   - Input validation
   - Gas optimization

## Cost Considerations

### Testnet (Free)

- Mumbai (Polygon testnet): Free test MATIC
- Sepolia (Ethereum testnet): Free test ETH

### Mainnet

- Polygon: ~$0.01-0.05 per transaction
- Ethereum: $5-50 per transaction (not recommended)

**Recommendation**: Use Polygon mainnet for production due to low costs.

## Troubleshooting

### Contract Not Deployed

```bash
cd contracts
npm run deploy:mumbai
```

### IPFS Upload Fails

- Check API keys in `.env`
- Verify network connectivity
- Try alternative gateway

### Transaction Fails

- Check wallet has sufficient balance
- Verify RPC endpoint is accessible
- Check gas price settings

### Verification Fails

- Ensure credential ID is correct
- Check if credential has been revoked
- Verify issuer is still active

## Roadmap

- [ ] Multi-signature credential issuance
- [ ] Batch credential operations
- [ ] NFT-based credentials
- [ ] Cross-chain credential verification
- [ ] Mobile wallet integration
- [ ] QR code verification
- [ ] Credential templates
- [ ] Analytics dashboard

## Support

For issues or questions:

- GitHub Issues: [opportunex/issues](https://github.com/opportunex/issues)
- Documentation: [docs.opportunex.com](https://docs.opportunex.com)
- Email: support@opportunex.com
