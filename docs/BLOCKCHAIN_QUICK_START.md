# Blockchain Verification - Quick Start Guide

Get the blockchain verification system up and running in 15 minutes.

## Prerequisites

- Node.js 18+ installed
- PostgreSQL running
- Basic understanding of blockchain concepts

## Step 1: Install Dependencies (2 minutes)

```bash
# Install main dependencies
npm install

# Install contract dependencies
cd contracts
npm install
cd ..
```

## Step 2: Get Free Test Tokens (3 minutes)

1. **Create/Import Wallet**:
   - Install MetaMask browser extension
   - Create new wallet or import existing
   - Save your private key securely

2. **Get Mumbai MATIC** (free):
   - Visit: https://faucet.polygon.technology/
   - Select "Mumbai" network
   - Paste your wallet address
   - Click "Submit"
   - Wait 1-2 minutes

3. **Verify Balance**:
   - Check: https://mumbai.polygonscan.com/
   - Enter your address
   - Should see ~0.5 MATIC

## Step 3: Setup IPFS (2 minutes)

**Option A: Pinata (Recommended)**

1. Go to https://www.pinata.cloud/
2. Sign up (free account)
3. Go to API Keys → New Key
4. Enable "pinFileToIPFS" and "pinJSONToIPFS"
5. Copy API Key and Secret

**Option B: Infura**

1. Go to https://infura.io/
2. Create project → Select IPFS
3. Copy Project ID and Secret

## Step 4: Configure Environment (2 minutes)

Create `.env` file:

```bash
# Copy example
cp .env.example .env

# Edit .env and add:
BLOCKCHAIN_RPC_URL=https://polygon-mumbai.g.alchemy.com/v2/YOUR_KEY
BLOCKCHAIN_PRIVATE_KEY=your_wallet_private_key
BLOCKCHAIN_NETWORK=mumbai

# Pinata
PINATA_API_KEY=your_api_key
PINATA_SECRET_KEY=your_secret_key

# Generate encryption key
ENCRYPTION_KEY=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
```

**Get Free Alchemy RPC**:

1. Go to https://www.alchemy.com/
2. Sign up → Create App
3. Select "Polygon Mumbai"
4. Copy HTTP URL

## Step 5: Deploy Smart Contract (3 minutes)

```bash
# Compile contract
cd contracts
npm run compile

# Deploy to Mumbai testnet
npm run deploy:mumbai

# Output will show contract address
# Save this address!
```

## Step 6: Setup Database (1 minute)

```bash
# Run migration
npm run db:migrate

# Or if using Prisma directly
npx prisma migrate dev
```

## Step 7: Test the System (2 minutes)

```bash
# Start the application
npm run dev

# In another terminal, test blockchain status
curl http://localhost:3000/api/blockchain/status
```

Expected response:

```json
{
  "success": true,
  "data": {
    "available": true,
    "network": { "name": "maticmum", "chainId": 80001 },
    "contractAddress": "0x...",
    "blockNumber": 12345678
  }
}
```

## Step 8: Issue Your First Credential

### Via UI:

1. Open http://localhost:3000/credentials
2. Click "Issue Credential"
3. Fill form and submit
4. Wait ~30 seconds for blockchain confirmation

### Via API:

```bash
curl -X POST http://localhost:3000/api/blockchain/credentials/issue \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "credentialType": "certificate",
    "title": "Test Certificate",
    "description": "My first blockchain credential",
    "skills": ["Blockchain", "Web3"]
  }'
```

## Step 9: Verify Credential

1. Copy the credential ID from step 8
2. Go to http://localhost:3000/verify
3. Paste credential ID
4. Click "Verify"
5. See credential details and blockchain proof!

## Troubleshooting

### "Insufficient funds" error

- Get more test MATIC from faucet
- Wait a few minutes and try again

### "Contract not deployed"

```bash
cd contracts
npm run deploy:mumbai
```

### "IPFS upload failed"

- Check API keys in `.env`
- Verify internet connection
- Try alternative IPFS provider

### "Database error"

```bash
npm run db:migrate
```

## What's Next?

- Read full documentation: `docs/BLOCKCHAIN_VERIFICATION.md`
- Explore smart contract: `contracts/CredentialVerification.sol`
- Check API routes: `src/lib/routes/blockchain.ts`
- View components: `src/components/blockchain/`

## Production Deployment

When ready for production:

1. **Switch to Polygon Mainnet**:

   ```bash
   BLOCKCHAIN_NETWORK=polygon
   BLOCKCHAIN_RPC_URL=https://polygon-mainnet.g.alchemy.com/v2/YOUR_KEY
   ```

2. **Buy Real MATIC**:
   - Purchase on exchange
   - Withdraw to your wallet
   - ~10 MATIC = ~1000 credentials

3. **Deploy to Mainnet**:

   ```bash
   cd contracts
   npm run deploy:polygon
   ```

4. **Update Environment**:
   - Update contract address
   - Test thoroughly
   - Monitor transactions

## Cost Estimate

- **Testnet**: FREE (unlimited)
- **Polygon Mainnet**: ~$0.01-0.05 per credential
- **Ethereum Mainnet**: $5-50 per credential (not recommended)

## Support

- Documentation: `docs/BLOCKCHAIN_VERIFICATION.md`
- Setup Guide: `docs/BLOCKCHAIN_SETUP_GUIDE.md`
- Issues: GitHub Issues

---

**Congratulations!** 🎉 You now have a working blockchain verification system!
