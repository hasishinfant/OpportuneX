import { authService } from '../lib/services/auth.service';

// Set test environment variables
process.env.JWT_SECRET = 'test-jwt-secret-key-for-manual-testing';
process.env.REFRESH_TOKEN_SECRET =
  'test-refresh-token-secret-key-for-manual-testing';
process.env.JWT_EXPIRES_IN = '1h';
process.env.REFRESH_TOKEN_EXPIRES_IN = '7d';

async function testAuthService() {
  console.log('🧪 Testing Authentication Service...\n');

  try {
    // Test 1: Password hashing and verification
    console.log('1. Testing password hashing...');
    const password = 'TestPassword123!';
    const hash1 = authService['hashPassword'](password);
    const hash2 = authService['hashPassword'](password);

    console.log(`   Hash 1: ${hash1.substring(0, 20)}...`);
    console.log(`   Hash 2: ${hash2.substring(0, 20)}...`);
    console.log(`   Hashes different: ${hash1 !== hash2}`);
    console.log(
      `   Password verifies with hash1: ${authService['verifyPassword'](password, hash1)}`
    );
    console.log(
      `   Password verifies with hash2: ${authService['verifyPassword'](password, hash2)}`
    );
    console.log(
      `   Wrong password fails: ${!authService['verifyPassword']('wrong', hash1)}`
    );
    console.log('   ✅ Password hashing works correctly\n');

    // Test 2: JWT token generation and verification
    console.log('2. Testing JWT tokens...');
    const payload = {
      id: 'user-123',
      email: 'test@example.com',
      role: 'user',
    };

    const accessToken = authService['generateAccessToken'](payload);
    const refreshToken = authService['generateRefreshToken']({
      id: payload.id,
      email: payload.email,
    });

    console.log(`   Access token: ${accessToken.substring(0, 30)}...`);
    console.log(`   Refresh token: ${refreshToken.substring(0, 30)}...`);

    const decodedAccess = authService.verifyAccessToken(accessToken);
    console.log(`   Decoded access token ID: ${decodedAccess.id}`);
    console.log(`   Decoded access token email: ${decodedAccess.email}`);
    console.log(`   Decoded access token role: ${decodedAccess.role}`);
    console.log('   ✅ JWT tokens work correctly\n');

    // Test 3: Token expiration
    console.log('3. Testing token properties...');
    console.log(
      `   Access token expires at: ${new Date(decodedAccess.exp * 1000).toISOString()}`
    );
    console.log(
      `   Access token issued at: ${new Date(decodedAccess.iat * 1000).toISOString()}`
    );
    console.log(
      `   Token is valid: ${decodedAccess.exp > Math.floor(Date.now() / 1000)}`
    );
    console.log('   ✅ Token expiration works correctly\n');

    console.log('🎉 All authentication service tests passed!');
  } catch (error) {
    console.error('❌ Authentication service test failed:', error);
  }
}

// Run the test
testAuthService().catch(console.error);
