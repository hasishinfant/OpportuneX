#!/usr/bin/env tsx

/**
 * Redis Integration Test
 * Comprehensive test of all Redis caching features
 */

import {
  CacheManager,
  SearchCache,
  SessionCache,
  UserCache,
  OpportunityCache,
  APICache,
  RoadmapCache,
  CacheStats,
} from '../lib/cache';
import {
  getRedisClient,
  checkRedisHealth,
  closeRedisConnection,
} from '../lib/redis';

// Mock data for testing
const mockSearchRequest = {
  query: 'AI hackathon',
  filters: {
    skills: ['javascript', 'python'],
    type: 'hackathon' as const,
  },
  pagination: { page: 1, limit: 10 },
  userId: 'user-123',
};

const mockSearchResponse = {
  opportunities: [
    {
      id: 'opp-1',
      title: 'AI Hackathon 2024',
      description: 'Build AI solutions',
      type: 'hackathon' as const,
      organizer: { name: 'TechCorp', type: 'corporate' as const },
      requirements: { skills: ['AI', 'Python'], eligibility: ['Students'] },
      details: { mode: 'online' as const, duration: '48 hours' },
      timeline: {
        applicationDeadline: new Date('2024-12-31'),
        startDate: new Date('2024-01-15'),
      },
      externalUrl: 'https://example.com/hackathon',
      sourceId: 'source-1',
      tags: ['AI', 'hackathon'],
      createdAt: new Date(),
      updatedAt: new Date(),
      isActive: true,
    },
  ],
  totalCount: 1,
  suggestions: ['AI hackathon Mumbai', 'AI hackathon 2024'],
};

const mockUserProfile = {
  id: 'user-123',
  email: 'test@example.com',
  name: 'Test User',
  location: { city: 'Mumbai', state: 'Maharashtra', tier: 2 as const },
  academic: {
    institution: 'Test University',
    degree: 'Computer Science',
    year: 3,
  },
  skills: {
    technical: ['JavaScript', 'Python'],
    domains: ['Web Development'],
    proficiencyLevel: 'intermediate' as const,
  },
  preferences: {
    opportunityTypes: ['hackathon' as const, 'internship' as const],
    preferredMode: 'online' as const,
    notifications: {
      email: true,
      sms: false,
      inApp: true,
      frequency: 'daily' as const,
      types: ['new_opportunities' as const],
    },
  },
  searchHistory: [],
  favoriteOpportunities: [],
  createdAt: new Date(),
  updatedAt: new Date(),
};

async function runIntegrationTest() {
  console.log('🧪 Starting Redis Integration Test...\n');

  try {
    // Test 1: Basic connection
    console.log('1. Testing Redis connection...');
    const isHealthy = await checkRedisHealth();
    if (!isHealthy) {
      throw new Error('Redis connection failed');
    }
    console.log('✅ Redis connection successful\n');

    // Test 2: Basic cache operations
    console.log('2. Testing basic cache operations...');
    const testKey = 'integration-test';
    const testValue = {
      message: 'Hello Redis!',
      timestamp: new Date().toISOString(),
    };

    await CacheManager.set(testKey, testValue, 60);
    const retrieved = await CacheManager.get(testKey);

    if (JSON.stringify(retrieved) === JSON.stringify(testValue)) {
      console.log('✅ Basic cache operations working');
    } else {
      throw new Error('Basic cache operations failed');
    }

    await CacheManager.delete(testKey);
    console.log('✅ Cache cleanup successful\n');

    // Test 3: Search cache
    console.log('3. Testing search cache...');
    await SearchCache.setSearchResults(mockSearchRequest, mockSearchResponse);
    const cachedSearch = await SearchCache.getSearchResults(mockSearchRequest);

    if (cachedSearch && cachedSearch.opportunities.length > 0) {
      console.log('✅ Search cache working');
    } else {
      throw new Error('Search cache failed');
    }

    await SearchCache.setSearchSuggestions('AI', [
      'AI hackathon',
      'AI internship',
    ]);
    const suggestions = await SearchCache.getSearchSuggestions('AI');

    if (suggestions && suggestions.length > 0) {
      console.log('✅ Search suggestions cache working');
    } else {
      throw new Error('Search suggestions cache failed');
    }
    console.log('');

    // Test 4: Session cache
    console.log('4. Testing session cache...');
    const sessionId = 'session-123';
    const sessionData = {
      userId: 'user-123',
      loginTime: new Date().toISOString(),
    };

    await SessionCache.setSession(sessionId, sessionData);
    const cachedSession = await SessionCache.getSession(sessionId);

    if (cachedSession && cachedSession.userId === 'user-123') {
      console.log('✅ Session cache working');
    } else {
      throw new Error('Session cache failed');
    }
    console.log('');

    // Test 5: User cache
    console.log('5. Testing user cache...');
    await UserCache.setUserProfile('user-123', mockUserProfile);
    const cachedProfile = await UserCache.getUserProfile('user-123');

    if (cachedProfile && cachedProfile.email === 'test@example.com') {
      console.log('✅ User profile cache working');
    } else {
      throw new Error('User profile cache failed');
    }

    const preferences = { theme: 'dark', notifications: true };
    await UserCache.setUserPreferences('user-123', preferences);
    const cachedPrefs = await UserCache.getUserPreferences('user-123');

    if (cachedPrefs && cachedPrefs.theme === 'dark') {
      console.log('✅ User preferences cache working');
    } else {
      throw new Error('User preferences cache failed');
    }
    console.log('');

    // Test 6: Opportunity cache
    console.log('6. Testing opportunity cache...');
    const opportunity = mockSearchResponse.opportunities[0];
    await OpportunityCache.setOpportunity(opportunity.id, opportunity);
    const cachedOpp = await OpportunityCache.getOpportunity(opportunity.id);

    if (cachedOpp && cachedOpp.title === opportunity.title) {
      console.log('✅ Opportunity cache working');
    } else {
      throw new Error('Opportunity cache failed');
    }

    // Test multiple opportunities
    await OpportunityCache.setOpportunities([opportunity]);
    const cachedOpps = await OpportunityCache.getOpportunities([
      opportunity.id,
    ]);

    if (cachedOpps[0] && cachedOpps[0].title === opportunity.title) {
      console.log('✅ Multiple opportunity cache working');
    } else {
      throw new Error('Multiple opportunity cache failed');
    }
    console.log('');

    // Test 7: API response cache
    console.log('7. Testing API response cache...');
    const apiResponse = {
      data: 'API response',
      timestamp: new Date().toISOString(),
    };
    await APICache.setAPIResponse(
      '/api/test',
      { param: 'value' },
      apiResponse,
      60
    );
    const cachedAPI = await APICache.getAPIResponse('/api/test', {
      param: 'value',
    });

    if (cachedAPI && cachedAPI.data === 'API response') {
      console.log('✅ API response cache working');
    } else {
      throw new Error('API response cache failed');
    }
    console.log('');

    // Test 8: Roadmap cache
    console.log('8. Testing roadmap cache...');
    const roadmap = {
      phases: [
        {
          id: '1',
          title: 'Phase 1',
          description: 'Learn basics',
          duration: 7,
          tasks: [],
          resources: [],
        },
      ],
      estimatedDuration: 30,
      resources: [],
      milestones: [],
    };

    await RoadmapCache.setRoadmap('user-123', 'opp-1', roadmap);
    const cachedRoadmap = await RoadmapCache.getRoadmap('user-123', 'opp-1');

    if (cachedRoadmap && cachedRoadmap.phases.length > 0) {
      console.log('✅ Roadmap cache working');
    } else {
      throw new Error('Roadmap cache failed');
    }
    console.log('');

    // Test 9: Cache statistics
    console.log('9. Testing cache statistics...');
    const stats = await CacheStats.getStats();

    if (stats) {
      console.log('✅ Cache statistics available');
      console.log(
        `   Memory info: ${stats.memory ? 'Available' : 'Not available'}`
      );
      console.log(
        `   Connection: ${stats.connected ? 'Connected' : 'Disconnected'}`
      );
    } else {
      console.log(
        '⚠️  Cache statistics not available (Redis might not be running)'
      );
    }
    console.log('');

    // Test 10: Multiple key operations
    console.log('10. Testing multiple key operations...');
    const keys = ['multi-1', 'multi-2', 'multi-3'];
    const values = [
      { id: 1, data: 'First' },
      { id: 2, data: 'Second' },
      { id: 3, data: 'Third' },
    ];

    // Set multiple values
    for (let i = 0; i < keys.length; i++) {
      await CacheManager.set(keys[i], values[i], 60);
    }

    // Get multiple values
    const multiResults = await CacheManager.mget(keys);

    if (
      multiResults.length === 3 &&
      multiResults.every(result => result !== null)
    ) {
      console.log('✅ Multiple key operations working');
    } else {
      throw new Error('Multiple key operations failed');
    }

    // Cleanup
    for (const key of keys) {
      await CacheManager.delete(key);
    }
    console.log('✅ Multiple key cleanup successful\n');

    console.log('🎉 All Redis integration tests passed!\n');

    console.log('📊 Test Summary:');
    console.log('   ✅ Basic cache operations');
    console.log('   ✅ Search results caching');
    console.log('   ✅ Search suggestions caching');
    console.log('   ✅ Session management');
    console.log('   ✅ User profile caching');
    console.log('   ✅ User preferences caching');
    console.log('   ✅ Opportunity caching');
    console.log('   ✅ Multiple opportunity caching');
    console.log('   ✅ API response caching');
    console.log('   ✅ AI roadmap caching');
    console.log('   ✅ Cache statistics');
    console.log('   ✅ Multiple key operations');
  } catch (error) {
    console.error('\n❌ Integration test failed:', error);
    process.exit(1);
  } finally {
    // Close Redis connection
    await closeRedisConnection();
    console.log('\n🔌 Redis connection closed');
  }
}

// Run the test
runIntegrationTest();
