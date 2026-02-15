const hre = require('hardhat');

async function main() {
  console.log('Deploying CredentialVerification contract...');

  // Get the contract factory
  const CredentialVerification = await hre.ethers.getContractFactory(
    'CredentialVerification'
  );

  // Deploy the contract
  const credentialVerification = await CredentialVerification.deploy();

  await credentialVerification.waitForDeployment();

  const address = await credentialVerification.getAddress();

  console.log(`CredentialVerification deployed to: ${address}`);
  console.log(`Network: ${hre.network.name}`);
  console.log(`Deployer: ${(await hre.ethers.getSigners())[0].address}`);

  // Save deployment info
  const fs = require('fs');
  const deploymentInfo = {
    network: hre.network.name,
    contractAddress: address,
    deployer: (await hre.ethers.getSigners())[0].address,
    deployedAt: new Date().toISOString(),
    blockNumber: await hre.ethers.provider.getBlockNumber(),
  };

  const deploymentPath = `./deployments/${hre.network.name}.json`;
  fs.mkdirSync('./deployments', { recursive: true });
  fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));

  console.log(`Deployment info saved to: ${deploymentPath}`);

  // Wait for block confirmations before verification
  if (hre.network.name !== 'hardhat' && hre.network.name !== 'localhost') {
    console.log('Waiting for block confirmations...');
    await credentialVerification.deploymentTransaction().wait(6);

    console.log('Verifying contract on block explorer...');
    try {
      await hre.run('verify:verify', {
        address,
        constructorArguments: [],
      });
      console.log('Contract verified successfully');
    } catch (error) {
      console.log('Verification failed:', error.message);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
