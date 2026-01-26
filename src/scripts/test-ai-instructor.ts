#!/usr/bin/env tsx

import { aiInstructorService } from '../lib/services/ai-instructor.service';
import type { UserProfile } from '../types';

async function testAIInstructorService() {
  console.log('🤖 Testing AI Instructor Service...\n');

  const mockUserProfile: UserProfile = {
    id: 'user-123',
    email: 'test@example.com',
    name: 'Test User',
    location: {
      city: 'Pune',
      state: 'Maharashtra',
      tier: 2,
    },
    academic: {
      institution: 'Test University',
      degree: 'Computer Science',
      year: 3,
      cgpa: 8.5,
    },
    skills: {
      technical: ['JavaScript', 'Python', 'React'],
      domains: ['Web Development', 'Data Science'],
      proficiencyLevel: 'intermediate',
    },
    preferences: {
      opportunityTypes: ['hackathon', 'internship'],
      preferredMode: 'hybrid',
      notifications: {
        email: true,
        sms: false,
        inApp: true,
        frequency: 'daily',
        types: ['new_opportunities', 'deadlines'],
      },
    },
    searchHistory: [],
    favoriteOpportunities: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  // Test 1: Generate Roadmap (will fail due to missing opportunity, but should handle gracefully)
  console.log('📋 Test 1: Generate Roadmap');
  try {
    const roadmapRequest = {
      opportunityId: 'test-opportunity-123',
      userProfile: mockUserProfile,
      targetDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      customGoals: ['Learn advanced React patterns', 'Build portfolio project'],
    };

    const result = await aiInstructorService.generateRoadmap(roadmapRequest);
    console.log('✅ Generate Roadmap Result:', {
      success: result.success,
      hasData: !!result.data,
      error: result.error,
      message: result.message,
    });

    if (result.data) {
      console.log('   📊 Roadmap Details:', {
        title: result.data.roadmap.title,
        phasesCount: result.data.roadmap.phases.length,
        estimatedDuration: result.data.roadmap.estimatedDuration,
        personalizedTipsCount: result.data.personalizedTips.length,
        skillGapsCount: result.data.skillGaps.length,
        recommendedActionsCount: result.data.recommendedActions.length,
      });
    }
  } catch (error) {
    console.log('❌ Generate Roadmap Error:', error);
  }

  console.log();

  // Test 2: Track Progress
  console.log('📈 Test 2: Track Progress');
  try {
    const result = await aiInstructorService.trackProgress(
      'roadmap-123',
      'task-123',
      true
    );
    console.log('✅ Track Progress Result:', {
      success: result.success,
      message: result.message,
      error: result.error,
    });
  } catch (error) {
    console.log('❌ Track Progress Error:', error);
  }

  console.log();

  // Test 3: Get User Roadmaps
  console.log('📚 Test 3: Get User Roadmaps');
  try {
    const result = await aiInstructorService.getUserRoadmaps('user-123');
    console.log('✅ Get User Roadmaps Result:', {
      success: result.success,
      dataLength: result.data?.length || 0,
      message: result.message,
      error: result.error,
    });
  } catch (error) {
    console.log('❌ Get User Roadmaps Error:', error);
  }

  console.log();

  // Test 4: Update Roadmap
  console.log('🔄 Test 4: Update Roadmap');
  try {
    const feedback = {
      completedTasks: ['task-1', 'task-2'],
      strugglingWith: ['advanced-concepts'],
      additionalGoals: ['learn-testing'],
    };

    const result = await aiInstructorService.updateRoadmap(
      'roadmap-123',
      feedback
    );
    console.log('✅ Update Roadmap Result:', {
      success: result.success,
      message: result.message,
      error: result.error,
    });
  } catch (error) {
    console.log('❌ Update Roadmap Error:', error);
  }

  console.log('\n🎉 AI Instructor Service testing completed!');
}

// Run the test
testAIInstructorService().catch(console.error);
