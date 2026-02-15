const { expect } = require('chai');
const { ethers } = require('hardhat');
const { time } = require('@nomicfoundation/hardhat-network-helpers');

describe('CredentialVerification', function () {
  let credentialVerification;
  let owner;
  let issuer;
  let recipient;
  let otherAccount;

  beforeEach(async function () {
    [owner, issuer, recipient, otherAccount] = await ethers.getSigners();

    const CredentialVerification = await ethers.getContractFactory(
      'CredentialVerification'
    );
    credentialVerification = await CredentialVerification.deploy();
    await credentialVerification.waitForDeployment();
  });

  describe('Deployment', function () {
    it('Should set the right owner', async function () {
      expect(await credentialVerification.owner()).to.equal(owner.address);
    });
  });

  describe('Issuer Management', function () {
    it('Should register a new issuer', async function () {
      await credentialVerification.registerIssuer(
        issuer.address,
        'Test University'
      );

      const issuerData = await credentialVerification.getIssuer(issuer.address);
      expect(issuerData.name).to.equal('Test University');
      expect(issuerData.isActive).to.be.true;
      expect(issuerData.isVerified).to.be.false;
    });

    it('Should verify an issuer', async function () {
      await credentialVerification.registerIssuer(
        issuer.address,
        'Test University'
      );
      await credentialVerification.verifyIssuer(issuer.address);

      const issuerData = await credentialVerification.getIssuer(issuer.address);
      expect(issuerData.isVerified).to.be.true;
    });

    it('Should deactivate an issuer', async function () {
      await credentialVerification.registerIssuer(
        issuer.address,
        'Test University'
      );
      await credentialVerification.deactivateIssuer(issuer.address);

      const issuerData = await credentialVerification.getIssuer(issuer.address);
      expect(issuerData.isActive).to.be.false;
    });

    it('Should not allow non-owner to register issuer', async function () {
      await expect(
        credentialVerification
          .connect(otherAccount)
          .registerIssuer(issuer.address, 'Test University')
      ).to.be.revertedWith('Only owner can call this function');
    });
  });

  describe('Credential Issuance', function () {
    beforeEach(async function () {
      await credentialVerification.registerIssuer(
        issuer.address,
        'Test University'
      );
      await credentialVerification.verifyIssuer(issuer.address);
    });

    it('Should issue a credential', async function () {
      const metadataURI = 'ipfs://QmTest123';
      const expiresAt = 0; // Non-expiring

      const tx = await credentialVerification.connect(issuer).issueCredential(
        recipient.address,
        0, // CERTIFICATE
        metadataURI,
        expiresAt,
        false
      );

      const receipt = await tx.wait();
      const event = receipt.logs.find(log => {
        try {
          return (
            credentialVerification.interface.parseLog(log).name ===
            'CredentialIssued'
          );
        } catch {
          return false;
        }
      });

      expect(event).to.not.be.undefined;
    });

    it('Should not allow unverified issuer to issue credential', async function () {
      await credentialVerification.registerIssuer(
        otherAccount.address,
        'Unverified Org'
      );

      await expect(
        credentialVerification
          .connect(otherAccount)
          .issueCredential(recipient.address, 0, 'ipfs://QmTest123', 0, false)
      ).to.be.revertedWith('Only verified issuers can issue credentials');
    });

    it('Should track recipient credentials', async function () {
      await credentialVerification
        .connect(issuer)
        .issueCredential(recipient.address, 0, 'ipfs://QmTest1', 0, false);

      await credentialVerification.connect(issuer).issueCredential(
        recipient.address,
        1, // BADGE
        'ipfs://QmTest2',
        0,
        false
      );

      const credentials = await credentialVerification.getRecipientCredentials(
        recipient.address
      );
      expect(credentials.length).to.equal(2);
    });
  });

  describe('Credential Verification', function () {
    let credentialId;

    beforeEach(async function () {
      await credentialVerification.registerIssuer(
        issuer.address,
        'Test University'
      );
      await credentialVerification.verifyIssuer(issuer.address);

      const tx = await credentialVerification
        .connect(issuer)
        .issueCredential(recipient.address, 0, 'ipfs://QmTest123', 0, false);

      const receipt = await tx.wait();
      const event = receipt.logs.find(log => {
        try {
          return (
            credentialVerification.interface.parseLog(log).name ===
            'CredentialIssued'
          );
        } catch {
          return false;
        }
      });

      credentialId =
        credentialVerification.interface.parseLog(event).args.credentialId;
    });

    it('Should verify a valid credential', async function () {
      const [isValid, credential] =
        await credentialVerification.verifyCredential(credentialId);

      expect(isValid).to.be.true;
      expect(credential.recipient).to.equal(recipient.address);
      expect(credential.issuer).to.equal(issuer.address);
    });

    it('Should not verify a revoked credential', async function () {
      await credentialVerification
        .connect(issuer)
        .revokeCredential(credentialId);

      const [isValid] =
        await credentialVerification.verifyCredential(credentialId);
      expect(isValid).to.be.false;
    });

    it('Should not verify an expired credential', async function () {
      const futureTime = (await time.latest()) + 3600; // 1 hour from now

      const tx = await credentialVerification
        .connect(issuer)
        .issueCredential(
          recipient.address,
          0,
          'ipfs://QmExpiring',
          futureTime,
          false
        );

      const receipt = await tx.wait();
      const event = receipt.logs.find(log => {
        try {
          return (
            credentialVerification.interface.parseLog(log).name ===
            'CredentialIssued'
          );
        } catch {
          return false;
        }
      });

      const expiringCredentialId =
        credentialVerification.interface.parseLog(event).args.credentialId;

      // Fast forward time
      await time.increase(3601);

      const [isValid] =
        await credentialVerification.verifyCredential(expiringCredentialId);
      expect(isValid).to.be.false;
    });
  });

  describe('Credential Revocation', function () {
    let credentialId;

    beforeEach(async function () {
      await credentialVerification.registerIssuer(
        issuer.address,
        'Test University'
      );
      await credentialVerification.verifyIssuer(issuer.address);

      const tx = await credentialVerification
        .connect(issuer)
        .issueCredential(recipient.address, 0, 'ipfs://QmTest123', 0, false);

      const receipt = await tx.wait();
      const event = receipt.logs.find(log => {
        try {
          return (
            credentialVerification.interface.parseLog(log).name ===
            'CredentialIssued'
          );
        } catch {
          return false;
        }
      });

      credentialId =
        credentialVerification.interface.parseLog(event).args.credentialId;
    });

    it('Should allow issuer to revoke credential', async function () {
      await expect(
        credentialVerification.connect(issuer).revokeCredential(credentialId)
      ).to.emit(credentialVerification, 'CredentialRevoked');

      const credential =
        await credentialVerification.getCredential(credentialId);
      expect(credential.status).to.equal(1); // REVOKED
    });

    it('Should not allow non-issuer to revoke credential', async function () {
      await expect(
        credentialVerification
          .connect(otherAccount)
          .revokeCredential(credentialId)
      ).to.be.revertedWith('Only issuer can revoke credential');
    });
  });

  describe('Credential Transfer', function () {
    let credentialId;

    beforeEach(async function () {
      await credentialVerification.registerIssuer(
        issuer.address,
        'Test University'
      );
      await credentialVerification.verifyIssuer(issuer.address);

      const tx = await credentialVerification.connect(issuer).issueCredential(
        recipient.address,
        0,
        'ipfs://QmTest123',
        0,
        true // transferable
      );

      const receipt = await tx.wait();
      const event = receipt.logs.find(log => {
        try {
          return (
            credentialVerification.interface.parseLog(log).name ===
            'CredentialIssued'
          );
        } catch {
          return false;
        }
      });

      credentialId =
        credentialVerification.interface.parseLog(event).args.credentialId;
    });

    it('Should allow recipient to transfer transferable credential', async function () {
      await expect(
        credentialVerification
          .connect(recipient)
          .transferCredential(credentialId, otherAccount.address)
      ).to.emit(credentialVerification, 'CredentialTransferred');

      const credential =
        await credentialVerification.getCredential(credentialId);
      expect(credential.recipient).to.equal(otherAccount.address);
    });

    it('Should not allow transfer of non-transferable credential', async function () {
      const tx = await credentialVerification.connect(issuer).issueCredential(
        recipient.address,
        0,
        'ipfs://QmNonTransferable',
        0,
        false // not transferable
      );

      const receipt = await tx.wait();
      const event = receipt.logs.find(log => {
        try {
          return (
            credentialVerification.interface.parseLog(log).name ===
            'CredentialIssued'
          );
        } catch {
          return false;
        }
      });

      const nonTransferableId =
        credentialVerification.interface.parseLog(event).args.credentialId;

      await expect(
        credentialVerification
          .connect(recipient)
          .transferCredential(nonTransferableId, otherAccount.address)
      ).to.be.revertedWith('Credential is not transferable');
    });
  });
});
