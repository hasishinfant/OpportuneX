// Test script to verify frontend-backend connectivity
const https = require('https');
const http = require('http');

async function testBackendConnection() {
  try {
    console.log('Testing backend connection...');
    
    const backendUrl = 'http://localhost:5002/api/opportunities?limit=12';
    
    return new Promise((resolve, reject) => {
      const req = http.get(backendUrl, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          try {
            const jsonData = JSON.parse(data);
            
            console.log('✅ Backend connection successful!');
            console.log('Response structure:', {
              success: jsonData.success,
              dataCount: jsonData.data ? jsonData.data.length : 0,
              hasData: !!jsonData.data,
              firstOpportunity: jsonData.data && jsonData.data[0] ? {
                id: jsonData.data[0]._id,
                title: jsonData.data[0].title,
                type: jsonData.data[0].type,
                location: jsonData.data[0].location
              } : null
            });

            // Test data transformation (same as frontend)
            if (jsonData.success && jsonData.data) {
              const transformedData = jsonData.data.map((opportunity) => ({
                ...opportunity,
                category: opportunity.type,
                official_link: opportunity.external_url,
                start_date: opportunity.dates?.start_date || opportunity.start_date,
                deadline: opportunity.dates?.registration_deadline || opportunity.deadline,
                location: {
                  city: opportunity.location?.city || 'Various',
                  state: opportunity.location?.state || '',
                  country: opportunity.location?.country || 'Global',
                },
                organizer_type: opportunity.organizer_type || 'company',
                platform: opportunity.source?.platform || 'MLH',
              }));

              console.log('✅ Data transformation successful!');
              console.log('Transformed first opportunity:', {
                id: transformedData[0]._id,
                title: transformedData[0].title,
                category: transformedData[0].category,
                official_link: transformedData[0].official_link,
                platform: transformedData[0].platform
              });
            }
            
            resolve();
          } catch (parseError) {
            reject(new Error('Failed to parse JSON: ' + parseError.message));
          }
        });
      });
      
      req.on('error', (error) => {
        reject(error);
      });
    });

  } catch (error) {
    console.error('❌ Backend connection failed:', error.message);
  }
}

testBackendConnection();