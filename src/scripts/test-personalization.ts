#!/usr/bin/env tsx

import { mlTrainingService } from '../lib/services/ml-training.service';
import { personalizationService } from '../lib/services/personalization.service';
import type { Opportunity, SearchQuery, UserProfile } from '../types';

async function testPersonalizationServices() {
  console.log('🎯 Testing Personalization and ML Training Services...\n');

  // Mock data
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
      technical: ['JavaScript', 'Python', 'React', 'Machine Learning'],
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

  const mockOpportunities: Opportunity[] = [
    {
      id: 'opp-1',
      title: 'AI/ML Hackathon 2024',
      description: 'Build innovative AI solutions',
      type: 'hackathon',
      organizer: {
        name: 'TechCorp',
        type: 'corporate',
      },
      requirements: {
        skills: ['Python', 'Machine Learning', 'TensorFlow'],
        eligibility: ['Students', 'Professionals'],
      },
      details: {
        mode: 'hybrid',
        location: 'Mumbai',
        duration: '48 hours',
        prizes: ['₹1,00,000', '₹50,000', '₹25,000'],
      },
      timeline: {
        applicationDeadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        startDate: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000),
        endDate: new Date(Date.now() + 47 * 24 * 60 * 60 * 1000),
      },
      externalUrl: 'https://example.com/hackathon',
      sourceId: 'source-1',
      tags: ['AI', 'ML', 'Innovation'],
      createdAt: new Date(),
      updatedAt: new Date(),
      isActive: true,
    },
    {
      id: 'opp-2',
      title: 'Web Development Internship',
      description: 'Full-stack development internship',
      type: 'internship',
      organizer: {
        name: 'StartupXYZ',
        type: 'startup',
      },
      requirements: {
        skills: ['JavaScript', 'React', 'Node.js'],
        eligibility: ['Final year students'],
      },
      details: {
        mode: 'online',
        duration: '3 months',
        stipend: '₹15,000/month',
      },
      timeline: {
        applicationDeadline: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
        startDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
      externalUrl: 'https://example.com/internship',
      sourceId: 'source-2',
      tags: ['Web Dev', 'Full Stack', 'Remote'],
      createdAt: new Date(),
      updatedAt: new Date(),
      isActive: true,
    },
  ];

  const mockSearchQuery: SearchQuery = {
    id: 'search-1',
    query: 'machine learning hackathon',
    filters: {
      skills: ['Python', 'Machine Learning'],
      type: 'hackathon',
      mode: 'hybrid',
    },
    timestamp: new Date(),
    resultCount: 5,
  };

  // Test 1: Analyze User Behavior
  console.log('📊 Test 1: Analyze User Behavior');
  try {
    const behaviorResult = await personalizationService.analyzeUserBehavior(
      'user-123',
      {
        searchQuery: mockSearchQuery,
        clickedOpportunity: 'opp-1',
        timeSpent: { opportunityId: 'opp-1', duration: 120 },
      }
    );

    console.log('✅ Analyze User Behavior Result:', {
      success: behaviorResult.success,
      hasData: !!behaviorResult.data,
      message: behaviorResult.message,
    });

    if (behaviorResult.data) {
      console.log('   📈 Behavior Details:', {
        searchQueriesCount: behaviorResult.data.searchQueries.length,
        clickedOpportunitiesCount:
          behaviorResult.data.clickedOpportunities.length,
        engagementScore: behaviorResult.data.engagementScore,
        preferredSkillsCount:
          behaviorResult.data.searchPatterns.preferredSkills.length,
      });
    }
  } catch (error) {
    console.log('❌ Analyze User Behavior Error:', error);
  }

  console.log();

  // Test 2: Generate Collaborative Recommendations
  console.log('🤝 Test 2: Generate Collaborative Recommendations');
  try {
    const collabResult =
      await personalizationService.generateCollaborativeRecommendations(
        'user-123',
        mockOpportunities,
        5
      );

    console.log('✅ Collaborative Recommendations Result:', {
      success: collabResult.success,
      recommendationsCount: collabResult.data?.length || 0,
      message: collabResult.message,
    });

    if (collabResult.data && collabResult.data.length > 0) {
      console.log('   🎯 Top Recommendation:', {
        opportunityId: collabResult.data[0].opportunityId,
        score: collabResult.data[0].score.toFixed(3),
        confidence: collabResult.data[0].confidence.toFixed(3),
        reasonsCount: collabResult.data[0].reasons.length,
      });
    }
  } catch (error) {
    console.log('❌ Collaborative Recommendations Error:', error);
  }

  console.log();

  // Test 3: Generate Content-Based Recommendations
  console.log('📝 Test 3: Generate Content-Based Recommendations');
  try {
    const contentResult =
      await personalizationService.generateContentBasedRecommendations(
        mockUserProfile,
        mockOpportunities,
        5
      );

    console.log('✅ Content-Based Recommendations Result:', {
      success: contentResult.success,
      recommendationsCount: contentResult.data?.length || 0,
      message: contentResult.message,
    });

    if (contentResult.data && contentResult.data.length > 0) {
      console.log('   🎯 Top Recommendation:', {
        opportunityId: contentResult.data[0].opportunityId,
        score: contentResult.data[0].score.toFixed(3),
        confidence: contentResult.data[0].confidence.toFixed(3),
        reasonsCount: contentResult.data[0].reasons.length,
      });
    }
  } catch (error) {
    console.log('❌ Content-Based Recommendations Error:', error);
  }

  console.log();

  // Test 4: Personalize Search Results
  console.log('🔍 Test 4: Personalize Search Results');
  try {
    const personalizedResult =
      await personalizationService.personalizeSearchResults(
        'user-123',
        mockOpportunities,
        mockUserProfile
      );

    console.log('✅ Personalized Search Results:', {
      success: personalizedResult.success,
      resultsCount: personalizedResult.data?.length || 0,
      message: personalizedResult.message,
    });

    if (personalizedResult.data) {
      console.log(
        '   📋 Results Order:',
        personalizedResult.data.map(opp => ({
          id: opp.id,
          title: `${opp.title.substring(0, 30)}...`,
        }))
      );
    }
  } catch (error) {
    console.log('❌ Personalized Search Results Error:', error);
  }

  console.log();

  // Test 5: Initialize ML Models
  console.log('🤖 Test 5: Initialize ML Models');
  try {
    const modelsResult = await mlTrainingService.initializeModels();

    console.log('✅ Initialize ML Models Result:', {
      success: modelsResult.success,
      modelsCount: modelsResult.data?.length || 0,
      message: modelsResult.message,
    });

    if (modelsResult.data) {
      console.log(
        '   🧠 Models:',
        modelsResult.data.map(model => ({
          id: model.id,
          type: model.type,
          accuracy: model.accuracy.toFixed(3),
          isActive: model.isActive,
        }))
      );
    }
  } catch (error) {
    console.log('❌ Initialize ML Models Error:', error);
  }

  console.log();

  // Test 6: Collect Training Data
  console.log('📚 Test 6: Collect Training Data');
  try {
    const trainingResult = await mlTrainingService.collectTrainingData(
      'user-123',
      'opp-1',
      'click',
      mockUserProfile,
      mockOpportunities[0],
      'machine learning hackathon'
    );

    console.log('✅ Collect Training Data Result:', {
      success: trainingResult.success,
      message: trainingResult.message,
    });
  } catch (error) {
    console.log('❌ Collect Training Data Error:', error);
  }

  console.log();

  // Test 7: Train Models
  console.log('🏋️ Test 7: Train Models');
  try {
    const trainResult = await mlTrainingService.trainModels(['hybrid-v1']);

    console.log('✅ Train Models Result:', {
      success: trainResult.success,
      trainedModelsCount: trainResult.data?.length || 0,
      message: trainResult.message,
    });

    if (trainResult.data && trainResult.data.length > 0) {
      console.log('   📊 Trained Model:', {
        id: trainResult.data[0].id,
        accuracy: trainResult.data[0].accuracy.toFixed(3),
        interactionCount: trainResult.data[0].trainingData.interactionCount,
      });
    }
  } catch (error) {
    console.log('❌ Train Models Error:', error);
  }

  console.log();

  // Test 8: Generate Predictions
  console.log('🔮 Test 8: Generate Predictions');
  try {
    const predictionsResult = await mlTrainingService.generatePredictions(
      'user-123',
      ['opp-1', 'opp-2'],
      'hybrid-v1'
    );

    console.log('✅ Generate Predictions Result:', {
      success: predictionsResult.success,
      predictionsCount: predictionsResult.data?.length || 0,
      message: predictionsResult.message,
    });

    if (predictionsResult.data) {
      console.log(
        '   🎯 Predictions:',
        predictionsResult.data.map(pred => ({
          opportunityId: pred.opportunityId,
          rating: pred.predictedRating.toFixed(2),
          confidence: pred.confidence.toFixed(3),
          model: pred.modelUsed,
        }))
      );
    }
  } catch (error) {
    console.log('❌ Generate Predictions Error:', error);
  }

  console.log();

  // Test 9: Create A/B Test
  console.log('🧪 Test 9: Create A/B Test');
  try {
    const abTestResult = await mlTrainingService.createABTest({
      name: 'Recommendation Algorithm Test',
      description: 'Compare collaborative vs hybrid models',
      models: ['collaborative-v1', 'hybrid-v1'],
      trafficSplit: {
        'collaborative-v1': 50,
        'hybrid-v1': 50,
      },
      metrics: ['clickThroughRate', 'conversionRate'],
      startDate: new Date(),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      isActive: true,
    });

    console.log('✅ Create A/B Test Result:', {
      success: abTestResult.success,
      testId: abTestResult.data?.id,
      message: abTestResult.message,
    });
  } catch (error) {
    console.log('❌ Create A/B Test Error:', error);
  }

  console.log();

  // Test 10: Get Personalization Metrics
  console.log('📈 Test 10: Get Personalization Metrics');
  try {
    const metricsResult =
      await personalizationService.getPersonalizationMetrics('user-123');

    console.log('✅ Personalization Metrics Result:', {
      success: metricsResult.success,
      hasData: !!metricsResult.data,
      message: metricsResult.message,
    });

    if (metricsResult.data) {
      console.log('   📊 Metrics:', {
        totalRecommendations: metricsResult.data.totalRecommendations,
        clickThroughRate: metricsResult.data.clickThroughRate.toFixed(3),
        conversionRate: metricsResult.data.conversionRate.toFixed(3),
        averageEngagementTime:
          metricsResult.data.averageEngagementTime.toFixed(1),
        preferenceAccuracy: metricsResult.data.preferenceAccuracy.toFixed(3),
      });
    }
  } catch (error) {
    console.log('❌ Personalization Metrics Error:', error);
  }

  console.log(
    '\n🎉 Personalization and ML Training Services testing completed!'
  );
}

// Run the test
testPersonalizationServices().catch(console.error);
