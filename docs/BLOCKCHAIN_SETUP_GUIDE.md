# Blockchain Verification Setup Guide

This guide walks you through setting up the blockchain verification system for OpportuneX from scratch.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Getting Test Tokens](#getting-test-tokens)
3. [Setting Up IPFS](#setting-up-ipfs)
4. [Deploying Smart Contracts](#deploying-smart-contracts)
5. [Configuring the Application](#configuring-the-application)
6. [Testing the System](#testing-the-system)
7. [Production Deployment](#production-deployment)

## Prerequisites

### Required Software

- Node.js 18+ and npm
- Git
- PostgreSQL 15+
- MetaMask or similar Web3 wallet

### Required Accounts

1. **Blockchain RPC Provider** (choose one):
   - [Alchemy](https://www.alchemy.com/) (Recommended)
   - [Infura](https://infura.io/)
   - [QuickNode](https://www.quicknode.com/)

2. **IPFS Provider** (choose one):
   - [Pinata](https://www.pinata.cloud/) (Recommended)
   - [Infura IPFS](https://infura.io/product/ipfs)

## Getting Test Tokens

### For Polygon Mumbai Testnet (Recommended)

1. **Get Mumbai MATIC**:
   - Visit [Mumbai Faucet](https://faucet.polygon.technology/)
   - Connect your wallet
   - Request test MATIC tokens
   - Wait 1-2 minutes for tokens to arrive

2. **Verify Balance**:
   ```bash
   # Check balance on Mumbai
   # Visit: https://mumbai.polygonscan.com/
   # Enter your wallet address
   ```

### For Ethereum Sepolia Testnet

1. **Get Sepolia ETH**:
   - Visit [Sepolia Faucet](https://sepoliafaucet.com/)
   - Or [Alchemy Sepolia Faucet](https://sepoliafaucet.com/)
   - Request test ETH
   - Wait for confirmation

## Setting Up IPFS

### Option 1: Pinata (Recommended)

1. **Create Account**:
   - Go to [Pinata.cloud](https://www.pinata.cloud/)
   - Sign up for free account
   - Verify email

2. **Get API Keys**:
   - Navigate to API Keys section
   - Click "New Key"
   - Enable "pinFileToIPFS" and "pinJSONToIPFS"
   - Name it "OpportuneX"
   - Copy API Key and Secret Key

3. **Configure Environment**:
   ```bash
   PINATA_API_KEY=your_api_key_here
   PINATA_SECRET_KEY=your_secret_key_here
   PINATA_GATEWAY=https://gateway.pinata.cloud
   ```

### Option 2: Infura IPFS

1. **Create Project**:
   - Go to [Infura.io](https://infura.io/)
   - Create new project
   - Select IPFS

2. **Get Credentials**:
   - Copy Project ID
   - Copy Project Secret

3. **Configure Environment**:
   ```bash
   INFURA_IPFS_PROJECT_ID=your_project_id
   INFURA_IPFS_PROJECT_SECRET=your_project_secret
   ```

## Deploying Smart Contracts

### Step 1: Install Dependencies

```bash
cd contracts
npm install
```

### Step 2: Configure Deployment

Create `contracts/.env`:

```bash
# For Mumbai Testnet
MUMBAI_RPC_URL=https://polygon-mumbai.g.alchemy.com/v2/YOUR_API_KEY
DEPLOYER_PRIVATE_KEY=your_wallet_private_key
POLYGONSCAN_API_KEY=your_polygonscan_api_key

# For Sepolia Testnet
SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_API_KEY
ETHERSCAN_API_KEY=your_etherscan_api_key
```

**⚠️ Security Warning**: Never commit private keys to version control!

### Step 3: Compile Contracts

```bash
npm run compile
```

Expected output:

```
Compiled 1 Solidity file successfully
```

### Step 4: Deploy to Testnet

**For Mumbai:**

```bash
npm run deploy:mumbai
```

**For Sepolia:**

```bash
npm run deploy:sepolia
```

Expected output:

```
Deploying CredentialVerification contract...
CredentialVerification deployed to: 0x...
Network: mumbai
Deployer: 0x...
Deployment info saved to: ./deployments/mumbai.json
```

### Step 5: Verify Contract (Optional)

```bash
npm run verify:mumbai
```

This makes your contract code visible on block explorers.

## Configuring the Application

### Step 1: Update Environment Variables

Add to your main `.env` file:

```bash
# Blockchain Configuration
BLOCKCHAIN_RPC_URL=https://polygon-mumbai.g.alchemy.com/v2/YOUR_API_KEY
BLOCKCHAIN_PRIVATE_KEY=your_deployer_private_key
BLOCKCHAIN_NETWORK=mumbai

# IPFS Configuration
PINATA_API_KEY=your_pinata_api_key
PINATA_SECRET_KEY=your_pinata_secret_key
PINATA_GATEWAY=https://gateway.pinata.cloud

# Security
ENCRYPTION_KEY=generate_a_secure_random_key_here

# Application
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Step 2: Generate Encryption Key

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Copy the output to `ENCRYPTION_KEY`.

### Step 3: Run Database Migrations

```bash
npm run db:migrate
```

### Step 4: Install Dependencies

```bash
npm install ethers@^6.9.0
```

## Testing the System

### Step 1: Start the Application

```bash
npm run dev
```

### Step 2: Check Blockchain Status

Visit: `http://localhost:3000/api/blockchain/status`

Expected response:

```json
{
  "success": true,
  "data": {
    "available": true,
    "network": {
      "name": "maticmum",
      "chainId": 80001
    },
    "contractAddress": "0x...",
    "blockNumber": 12345678
  }
}
```

### Step 3: Test Credential Issuance

1. Log in to the application
2. Navigate to `/credentials`
3. Click "Issue New Credential"
4. Fill in the form:
   - Type: Certificate
   - Title: "Test Certificate"
   - Description: "Testing blockchain verification"
5. Submit and wait for transaction confirmation

### Step 4: Test Verification

1. Copy the credential ID from the issued credential
2. Navigate to `/verify`
3. Paste the credential ID
4. Click "Verify"
5. Confirm the credential shows as valid

### Step 5: Test Sharing

1. Go to your credentials list
2. Click "Share" on a credential
3. Copy the share link
4. Open in incognito/private window
5. Verify the credential displays correctly

## Production Deployment

### Step 1: Choose Network

**Recommended: Polygon Mainnet**

- Low transaction costs (~$0.01-0.05)
- Fast confirmation times
- Ethereum-compatible

**Alternative: Ethereum Mainnet**

- Higher security
- Higher costs ($5-50 per transaction)
- Slower confirmation times

### Step 2: Get Production Tokens

For Polygon:

1. Buy MATIC on exchange (Coinbase, Binance, etc.)
2. Withdraw to your wallet
3. Bridge to Polygon if needed

### Step 3: Deploy to Production

```bash
# Update contracts/.env with mainnet RPC
POLYGON_RPC_URL=https://polygon-mainnet.g.alchemy.com/v2/YOUR_API_KEY

# Deploy
cd contracts
npm run deploy:polygon
```

### Step 4: Update Production Environment

```bash
BLOCKCHAIN_RPC_URL=https://polygon-mainnet.g.alchemy.com/v2/YOUR_API_KEY
BLOCKCHAIN_NETWORK=polygon
# ... other production configs
```

### Step 5: Register as Issuer

After deployment, register OpportuneX as a verified issuer:

```bash
# Using Hardhat console
cd contracts
npx hardhat console --network polygon

# In console:
const contract = await ethers.getContractAt("CredentialVerification", "YOUR_CONTRACT_ADDRESS");
await contract.registerIssuer("YOUR_ISSUER_ADDRESS", "OpportuneX");
await contract.verifyIssuer("YOUR_ISSUER_ADDRESS");
```

## Monitoring and Maintenance

### Monitor Transactions

- **Mumbai**: https://mumbai.polygonscan.com/
- **Polygon**: https://polygonscan.com/
- **Sepolia**: https://sepolia.etherscan.io/

### Check Wallet Balance

Ensure deployer wallet always has sufficient balance:

- Minimum: 1 MATIC for Polygon
- Recommended: 10 MATIC for production

### IPFS Monitoring

Check Pinata dashboard regularly:

- Storage usage
- Pin count
- API usage

### Backup

Regularly backup:

- Deployment information (`contracts/deployments/`)
- Database (includes credential records)
- Environment variables (securely)

## Troubleshooting

### "Insufficient funds" Error

**Solution**: Add more tokens to deployer wallet

### "Nonce too hi
