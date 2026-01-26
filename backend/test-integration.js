#!/usr/bin/env node

const axios = require('axios');

const BACKEND_URL = 'http://localhost:5002';
const FRONTEND_URL = 'http://localhost:3000';

async function testBackendDirectly() {
  console.log('🔍 Testing backend directly...');
  
  try {
    // Test health endpoint
    const healthResponse = await axios.get(`${BACKEND_URL}/api/health`);
    console.log('✅ Health check:', healthResponse.data.status);
    
    // Test opportunities endpoint
    const opportunitiesResponse = await axios.get(`${BACKEND_URL}/api/opportunities`);
    console.log('✅ Opportunities:', opportunitiesResponse.data.pagination.total_items, 'items');
    
    // Test search
    const searchResponse = await axios.get(`${BACKEND_URL}/api/opportunities?search=hackathon`);
    console.log('✅ Search results:', searchResponse.data.pagination.total_items, 'items');
    
    // Test stats
    const statsResponse = await axios.get(`${BACKEND_URL}/api/opportunities/stats/overview`);
    console.log('✅ Stats:', statsResponse.data.data.overview);
    
    return true;
  } catch (error) {
    console.error('❌ Backend test failed:', error.message);
    return false;
  }
}

async function testFrontendIntegration() {
  console.log('🔍 Testing frontend integration...');
  
  try {
    // Test frontend API route
    const response = await axios.get(`${FRONTEND_URL}/api/opportunities`);
    console.log('✅ Frontend API:', response.data.pagination?.total_items || 'No pagination', 'items');
    
    return true;
  } catch (error) {
    console.error('❌ Frontend integration test failed:', error.message);
    console.log('💡 Make sure the frontend is running on port 3000');
    return false;
  }
}

async function runTests() {
  console.log('🚀 OpportuneX Backend Integration Test\n');
  
  const backendOk = await testBackendDirectly();
  console.log('');
  
  if (backendOk) {
    await testFrontendIntegration();
  } else {
    console.log('⚠️ Skipping frontend test due to backend issues');
  }
  
  console.log('\n📊 Test Summary:');
  console.log(`Backend: ${backendOk ? '✅ Working' : '❌ Failed'}`);
  console.log('Frontend: Run `npm run dev` in the main directory to test frontend integration');
  
  console.log('\n🔗 Useful URLs:');
  console.log(`Backend API: ${BACKEND_URL}/`);
  console.log(`Backend Health: ${BACKEND_URL}/api/health`);
  console.log(`Backend Opportunities: ${BACKEND_URL}/api/opportunities`);
  console.log(`Frontend: ${FRONTEND_URL}`);
}

if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = { testBackendDirectly, testFrontendIntegration };