# OpportuneX Blockchain Contracts

Smart contracts for credential verification on OpportuneX platform.

## Overview

This directory contains Solidity smart contracts for issuing, verifying, and managing educational credentials on the blockchain.

## Contracts

- **CredentialVerification.sol**: Main contract for credential management

## Setup

1. Install dependencies:

```bash
npm install
```

2. Configure environment:

```bash
cp .env.example .env
# Edit .env with your configuration
```

3. Compile contracts:

```bash
npm run compile
```

## Testing

Run tests:

```bash
npm test
```

Run tests with coverage:

```bash
npx hardhat coverage
```

## Deployment

### Local Development

```bash
# Start local node
npm run node

# Deploy (in another terminal)
npm run deploy:local
```

### Testnet

```bash
# Mumbai (Polygon testnet)
npm run deploy:mumbai

# Sepolia (Ethereum testnet)
npm run deploy:sepolia
```

### Mainnet

```bash
# Polygon mainnet
npm run deploy:polygon
```

## Verification

Verify contract on block explorer:

```bash
npm run verify:mumbai
npm run verify:sepolia
```

## Contract Addresses

Deployed contract addresses are saved in `deployments/` directory.

## Security

- Never commit private keys
- Use hardware wallet for mainnet deployments
- Audit contracts before production deployment
- Test thoroughly on testnet first

## Documentation

See [BLOCKCHAIN_VERIFICATION.md](../docs/BLOCKCHAIN_VERIFICATION.md) for detailed documentation.
