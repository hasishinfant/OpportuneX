import type { ApiResponse, Opportunity, UserProfile } from '../../types';

export interface MLModel {
  id: string;
  name: string;
  type:
    | 'collaborative_filtering'
    | 'content_based'
    | 'hybrid'
    | 'neural_network';
  version: string;
  accuracy: number;
  trainingData: {
    userCount: number;
    opportunityCount: number;
    interactionCount: number;
    lastTrainingDate: Date;
  };
  hyperparameters: { [key: string]: any };
  isActive: boolean;
}

export interface TrainingData {
  userId: string;
  opportunityId: string;
  interaction: 'view' | 'click' | 'apply' | 'favorite';
  rating: number; // 1-5 scale
  timestamp: Date;
  context: {
    searchQuery?: string;
    userProfile: UserProfile;
    opportunityFeatures: any;
  };
}

export interface ModelPrediction {
  opportunityId: string;
  userId: string;
  predictedRating: number;
  confidence: number;
  modelUsed: string;
}

export interface ABTestConfig {
  id: string;
  name: string;
  description: string;
  models: string[]; // Model IDs to test
  trafficSplit: { [modelId: string]: number }; // Percentage allocation
  metrics: string[]; // Metrics to track
  startDate: Date;
  endDate: Date;
  isActive: boolean;
}

export interface ABTestResult {
  testId: string;
  modelId: string;
  metrics: {
    clickThroughRate: number;
    conversionRate: number;
    userSatisfaction: number;
    engagementTime: number;
  };
  sampleSize: number;
  confidence: number;
}

export class MLTrainingService {
  private models: Map<string, MLModel> = new Map();
  private trainingData: TrainingData[] = [];
  private abTests: Map<string, ABTestConfig> = new Map();
  private abTestResults: Map<string, ABTestResult[]> = new Map();

  /**
   * Initialize ML models with default configurations
   */
  async initializeModels(): Promise<ApiResponse<MLModel[]>> {
    try {
      const defaultModels: MLModel[] = [
        {
          id: 'collaborative-v1',
          name: 'Collaborative Filtering Model',
          type: 'collaborative_filtering',
          version: '1.0.0',
          accuracy: 0.75,
          trainingData: {
            userCount: 0,
            opportunityCount: 0,
            interactionCount: 0,
            lastTrainingDate: new Date(),
          },
          hyperparameters: {
            numFactors: 50,
            learningRate: 0.01,
            regularization: 0.1,
            iterations: 100,
          },
          isActive: true,
        },
        {
          id: 'content-based-v1',
          name: 'Content-Based Filtering Model',
          type: 'content_based',
          version: '1.0.0',
          accuracy: 0.68,
          trainingData: {
            userCount: 0,
            opportunityCount: 0,
            interactionCount: 0,
            lastTrainingDate: new Date(),
          },
          hyperparameters: {
            skillWeightDecay: 0.9,
            typePreferenceWeight: 0.3,
            locationWeight: 0.2,
            freshnessDecay: 0.95,
          },
          isActive: true,
        },
        {
          id: 'hybrid-v1',
          name: 'Hybrid Recommendation Model',
          type: 'hybrid',
          version: '1.0.0',
          accuracy: 0.82,
          trainingData: {
            userCount: 0,
            opportunityCount: 0,
            interactionCount: 0,
            lastTrainingDate: new Date(),
          },
          hyperparameters: {
            collaborativeWeight: 0.6,
            contentWeight: 0.4,
            ensembleMethod: 'weighted_average',
            adaptiveLearning: true,
          },
          isActive: true,
        },
      ];

      for (const model of defaultModels) {
        this.models.set(model.id, model);
      }

      return {
        success: true,
        data: defaultModels,
        message: 'ML models initialized successfully',
      };
    } catch (error) {
      console.error('Initialize models error:', error);
      return {
        success: false,
        error: 'Failed to initialize ML models',
      };
    }
  }

  /**
   * Collect training data from user interactions
   */
  async collectTrainingData(
    userId: string,
    opportunityId: string,
    interaction: 'view' | 'click' | 'apply' | 'favorite',
    userProfile: UserProfile,
    opportunity: Opportunity,
    searchQuery?: string
  ): Promise<ApiResponse<null>> {
    try {
      // Convert interaction to rating
      const ratingMap = {
        view: 1,
        click: 2,
        favorite: 3,
        apply: 4,
      };

      const trainingPoint: TrainingData = {
        userId,
        opportunityId,
        interaction,
        rating: ratingMap[interaction],
        timestamp: new Date(),
        context: {
          searchQuery,
          userProfile,
          opportunityFeatures: {
            type: opportunity.type,
            skills: opportunity.requirements.skills,
            mode: opportunity.details.mode,
            organizerType: opportunity.organizer.type,
            location: opportunity.details.location,
          },
        },
      };

      this.trainingData.push(trainingPoint);

      // Keep only recent training data (last 10,000 points)
      if (this.trainingData.length > 10000) {
        this.trainingData = this.trainingData.slice(-10000);
      }

      return {
        success: true,
        message: 'Training data collected successfully',
      };
    } catch (error) {
      console.error('Collect training data error:', error);
      return {
        success: false,
        error: 'Failed to collect training data',
      };
    }
  }

  /**
   * Train ML models with collected data
   */
  async trainModels(modelIds?: string[]): Promise<ApiResponse<MLModel[]>> {
    try {
      const modelsToTrain = modelIds
        ? (modelIds.map(id => this.models.get(id)).filter(Boolean) as MLModel[])
        : Array.from(this.models.values());

      const trainedModels: MLModel[] = [];

      for (const model of modelsToTrain) {
        console.log(`Training model: ${model.name}`);

        // Simulate model training (in production, this would call actual ML libraries)
        const trainingResult = await this.simulateModelTraining(model);

        // Update model with training results
        model.accuracy = trainingResult.accuracy;
        model.trainingData = {
          userCount: trainingResult.userCount,
          opportunityCount: trainingResult.opportunityCount,
          interactionCount: trainingResult.interactionCount,
          lastTrainingDate: new Date(),
        };

        this.models.set(model.id, model);
        trainedModels.push(model);
      }

      return {
        success: true,
        data: trainedModels,
        message: `Successfully trained ${trainedModels.length} models`,
      };
    } catch (error) {
      console.error('Train models error:', error);
      return {
        success: false,
        error: 'Failed to train ML models',
      };
    }
  }

  /**
   * Generate predictions using trained models
   */
  async generatePredictions(
    userId: string,
    opportunityIds: string[],
    modelId?: string
  ): Promise<ApiResponse<ModelPrediction[]>> {
    try {
      const model = modelId ? this.models.get(modelId) : this.getBestModel();

      if (!model) {
        return {
          success: false,
          error: 'Model not found',
        };
      }

      const predictions: ModelPrediction[] = [];

      for (const opportunityId of opportunityIds) {
        // Simulate prediction generation
        const prediction = await this.simulatePrediction(
          userId,
          opportunityId,
          model
        );
        predictions.push(prediction);
      }

      return {
        success: true,
        data: predictions,
        message: 'Predictions generated successfully',
      };
    } catch (error) {
      console.error('Generate predictions error:', error);
      return {
        success: false,
        error: 'Failed to generate predictions',
      };
    }
  }

  /**
   * Create A/B test for model comparison
   */
  async createABTest(
    config: Omit<ABTestConfig, 'id'>
  ): Promise<ApiResponse<ABTestConfig>> {
    try {
      const testId = `ab-test-${Date.now()}`;
      const abTest: ABTestConfig = {
        id: testId,
        ...config,
      };

      // Validate traffic split adds up to 100%
      const totalTraffic = Object.values(config.trafficSplit).reduce(
        (sum, pct) => sum + pct,
        0
      );
      if (Math.abs(totalTraffic - 100) > 0.01) {
        return {
          success: false,
          error: 'Traffic split must add up to 100%',
        };
      }

      this.abTests.set(testId, abTest);
      this.abTestResults.set(testId, []);

      return {
        success: true,
        data: abTest,
        message: 'A/B test created successfully',
      };
    } catch (error) {
      console.error('Create A/B test error:', error);
      return {
        success: false,
        error: 'Failed to create A/B test',
      };
    }
  }

  /**
   * Get model assignment for A/B testing
   */
  async getModelForUser(
    userId: string,
    testId?: string
  ): Promise<ApiResponse<string>> {
    try {
      if (!testId) {
        // Return best performing model
        const bestModel = this.getBestModel();
        return {
          success: true,
          data: bestModel?.id || 'hybrid-v1',
          message: 'Best model assigned',
        };
      }

      const abTest = this.abTests.get(testId);
      if (!abTest || !abTest.isActive) {
        return {
          success: false,
          error: 'A/B test not found or inactive',
        };
      }

      // Use user ID hash to consistently assign users to models
      const userHash = this.hashUserId(userId);
      const modelId = this.assignUserToModel(userHash, abTest.trafficSplit);

      return {
        success: true,
        data: modelId,
        message: 'Model assigned for A/B test',
      };
    } catch (error) {
      console.error('Get model for user error:', error);
      return {
        success: false,
        error: 'Failed to assign model',
      };
    }
  }

  /**
   * Record A/B test results
   */
  async recordABTestResult(
    testId: string,
    modelId: string,
    metrics: {
      clickThroughRate: number;
      conversionRate: number;
      userSatisfaction: number;
      engagementTime: number;
    }
  ): Promise<ApiResponse<null>> {
    try {
      const results = this.abTestResults.get(testId) || [];

      const result: ABTestResult = {
        testId,
        modelId,
        metrics,
        sampleSize: 1, // In production, this would be calculated properly
        confidence: 0.95,
      };

      results.push(result);
      this.abTestResults.set(testId, results);

      return {
        success: true,
        message: 'A/B test result recorded successfully',
      };
    } catch (error) {
      console.error('Record A/B test result error:', error);
      return {
        success: false,
        error: 'Failed to record A/B test result',
      };
    }
  }

  /**
   * Get A/B test results and analysis
   */
  async getABTestResults(testId: string): Promise<
    ApiResponse<{
      test: ABTestConfig;
      results: ABTestResult[];
      analysis: {
        winningModel: string;
        significantDifference: boolean;
        recommendations: string[];
      };
    }>
  > {
    try {
      const test = this.abTests.get(testId);
      const results = this.abTestResults.get(testId) || [];

      if (!test) {
        return {
          success: false,
          error: 'A/B test not found',
        };
      }

      // Analyze results
      const analysis = this.analyzeABTestResults(results);

      return {
        success: true,
        data: {
          test,
          results,
          analysis,
        },
        message: 'A/B test results retrieved successfully',
      };
    } catch (error) {
      console.error('Get A/B test results error:', error);
      return {
        success: false,
        error: 'Failed to retrieve A/B test results',
      };
    }
  }

  // Private helper methods

  private async simulateModelTraining(model: MLModel): Promise<{
    accuracy: number;
    userCount: number;
    opportunityCount: number;
    interactionCount: number;
  }> {
    // Simulate training time
    await new Promise(resolve => setTimeout(resolve, 100));

    const userIds = new Set(this.trainingData.map(d => d.userId));
    const opportunityIds = new Set(this.trainingData.map(d => d.opportunityId));

    // Simulate accuracy improvement based on data size
    const dataSize = this.trainingData.length;
    const baseAccuracy = model.accuracy;
    const improvementFactor = Math.min(dataSize / 1000, 1) * 0.1;
    const newAccuracy = Math.min(baseAccuracy + improvementFactor, 0.95);

    return {
      accuracy: newAccuracy,
      userCount: userIds.size,
      opportunityCount: opportunityIds.size,
      interactionCount: this.trainingData.length,
    };
  }

  private async simulatePrediction(
    userId: string,
    opportunityId: string,
    model: MLModel
  ): Promise<ModelPrediction> {
    // Simulate prediction calculation
    await new Promise(resolve => setTimeout(resolve, 10));

    // Generate mock prediction based on model type
    let predictedRating = 2.5; // Base rating
    let confidence = 0.7;

    // Adjust based on model type
    switch (model.type) {
      case 'collaborative_filtering':
        predictedRating += (Math.random() - 0.5) * 2;
        confidence = 0.8;
        break;
      case 'content_based':
        predictedRating += (Math.random() - 0.5) * 1.5;
        confidence = 0.75;
        break;
      case 'hybrid':
        predictedRating += (Math.random() - 0.5) * 1.8;
        confidence = 0.85;
        break;
    }

    predictedRating = Math.max(1, Math.min(5, predictedRating));

    return {
      opportunityId,
      userId,
      predictedRating,
      confidence,
      modelUsed: model.id,
    };
  }

  private getBestModel(): MLModel | undefined {
    let bestModel: MLModel | undefined;
    let bestAccuracy = 0;

    for (const model of this.models.values()) {
      if (model.isActive && model.accuracy > bestAccuracy) {
        bestAccuracy = model.accuracy;
        bestModel = model;
      }
    }

    return bestModel;
  }

  private hashUserId(userId: string): number {
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      const char = userId.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  private assignUserToModel(
    userHash: number,
    trafficSplit: { [modelId: string]: number }
  ): string {
    const percentage = userHash % 100;
    let cumulative = 0;

    for (const [modelId, split] of Object.entries(trafficSplit)) {
      cumulative += split;
      if (percentage < cumulative) {
        return modelId;
      }
    }

    // Fallback to first model
    return Object.keys(trafficSplit)[0];
  }

  private analyzeABTestResults(results: ABTestResult[]): {
    winningModel: string;
    significantDifference: boolean;
    recommendations: string[];
  } {
    if (results.length === 0) {
      return {
        winningModel: '',
        significantDifference: false,
        recommendations: ['Collect more data before analysis'],
      };
    }

    // Group results by model
    const modelResults = new Map<string, ABTestResult[]>();
    for (const result of results) {
      if (!modelResults.has(result.modelId)) {
        modelResults.set(result.modelId, []);
      }
      modelResults.get(result.modelId)!.push(result);
    }

    // Calculate average metrics for each model
    const modelAverages = new Map<string, any>();
    for (const [modelId, modelResultList] of modelResults.entries()) {
      const avgMetrics = {
        clickThroughRate: 0,
        conversionRate: 0,
        userSatisfaction: 0,
        engagementTime: 0,
      };

      for (const result of modelResultList) {
        avgMetrics.clickThroughRate += result.metrics.clickThroughRate;
        avgMetrics.conversionRate += result.metrics.conversionRate;
        avgMetrics.userSatisfaction += result.metrics.userSatisfaction;
        avgMetrics.engagementTime += result.metrics.engagementTime;
      }

      const count = modelResultList.length;
      avgMetrics.clickThroughRate /= count;
      avgMetrics.conversionRate /= count;
      avgMetrics.userSatisfaction /= count;
      avgMetrics.engagementTime /= count;

      modelAverages.set(modelId, avgMetrics);
    }

    // Find winning model (highest conversion rate)
    let winningModel = '';
    let bestConversionRate = 0;

    for (const [modelId, metrics] of modelAverages.entries()) {
      if (metrics.conversionRate > bestConversionRate) {
        bestConversionRate = metrics.conversionRate;
        winningModel = modelId;
      }
    }

    // Simple significance test (in production, use proper statistical tests)
    const significantDifference =
      modelAverages.size > 1 && bestConversionRate > 0.05;

    const recommendations = [
      `Model ${winningModel} shows best performance`,
      significantDifference
        ? 'Significant difference detected between models'
        : 'No significant difference detected',
      'Consider running test longer for more reliable results',
    ];

    return {
      winningModel,
      significantDifference,
      recommendations,
    };
  }
}

export const mlTrainingService = new MLTrainingService();
