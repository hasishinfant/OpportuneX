import { InterviewPrepService } from '../lib/services/interview-prep.service';

describe('InterviewPrepService', () => {
  let service: InterviewPrepService;

  beforeEach(() => {
    service = new InterviewPrepService();
  });

  describe('startSession', () => {
    it('should start a new interview session', async () => {
      const request = {
        userId: 'user-123',
        type: 'technical' as const,
        difficulty: 'intermediate' as const,
      };

      const result = await service.startSession(request);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.session).toBeDefined();
      expect(result.data?.firstQuestion).toBeDefined();
      expect(result.data?.session.type).toBe('technical');
      expect(result.data?.session.difficulty).toBe('intermediate');
    });

    it('should include opportunity ID when provided', async () => {
      const request = {
        userId: 'user-123',
        type: 'technical' as const,
        difficulty: 'intermediate' as const,
        opportunityId: 'opp-456',
      };

      const result = await service.startSession(request);

      expect(result.success).toBe(true);
      expect(result.data?.session.opportunityId).toBe('opp-456');
    });
  });

  describe('submitAnswer', () => {
    it('should evaluate answer and provide feedback', async () => {
      const request = {
        sessionId: 'session-123',
        questionId: 'question-456',
        answer: 'A stack is a LIFO data structure...',
        responseTime: 120,
      };

      const result = await service.submitAnswer(request);

      expect(result.success).toBe(true);
      expect(result.data?.response).toBeDefined();
      expect(result.data?.response.score).toBeGreaterThan(0);
      expect(result.data?.response.feedback).toBeDefined();
      expect(result.data?.response.strengths).toBeInstanceOf(Array);
      expect(result.data?.response.improvements).toBeInstanceOf(Array);
    });

    it('should provide next question after submission', async () => {
      const request = {
        sessionId: 'session-123',
        questionId: 'question-456',
        answer: 'Test answer',
      };

      const result = await service.submitAnswer(request);

      expect(result.success).toBe(true);
      expect(result.data?.nextQuestion).toBeDefined();
    });
  });

  describe('completeSession', () => {
    it('should complete session and provide summary', async () => {
      const result = await service.completeSession('session-123');

      expect(result.success).toBe(true);
      expect(result.data?.session).toBeDefined();
      expect(result.data?.summary).toBeDefined();
      expect(result.data?.session.status).toBe('completed');
      expect(result.data?.summary.scoreBreakdown).toBeDefined();
    });

    it('should include feedback in summary', async () => {
      const result = await service.completeSession('session-123');

      expect(result.data?.summary.strengths).toBeInstanceOf(Array);
      expect(result.data?.summary.improvements).toBeInstanceOf(Array);
      expect(result.data?.summary.recommendations).toBeInstanceOf(Array);
    });
  });

  describe('analyzeResume', () => {
    it('should analyze resume and provide feedback', async () => {
      const resumeText = `
        John Doe
        Software Engineer
        
        Experience:
        - Developed web applications using React and Node.js
        - Improved performance by 40%
        
        Skills: JavaScript, Python, React, Node.js
      `;

      const result = await service.analyzeResume('user-123', resumeText);

      expect(result.success).toBe(true);
      expect(result.data?.analysisResult).toBeDefined();
      expect(result.data?.analysisResult.overallScore).toBeGreaterThan(0);
      expect(result.data?.analysisResult.sections).toBeInstanceOf(Array);
      expect(result.data?.suggestions).toBeInstanceOf(Array);
    });

    it('should identify present and missing keywords', async () => {
      const resumeText = 'Skills: Python, JavaScript, React';

      const result = await service.analyzeResume('user-123', resumeText);

      expect(result.data?.analysisResult.keywords.present).toBeInstanceOf(
        Array
      );
      expect(result.data?.analysisResult.keywords.missing).toBeInstanceOf(
        Array
      );
    });
  });

  describe('getProgress', () => {
    it('should retrieve user interview progress', async () => {
      const result = await service.getProgress('user-123');

      expect(result.success).toBe(true);
      expect(result.data).toBeInstanceOf(Array);
      expect(result.data!.length).toBeGreaterThan(0);
    });

    it('should include progress metrics', async () => {
      const result = await service.getProgress('user-123');

      const progress = result.data![0];
      expect(progress.totalSessions).toBeDefined();
      expect(progress.averageScore).toBeDefined();
      expect(progress.improvementRate).toBeDefined();
      expect(progress.strengths).toBeInstanceOf(Array);
      expect(progress.areasToImprove).toBeInstanceOf(Array);
    });
  });

  describe('getCompanyQuestions', () => {
    it('should retrieve company-specific questions', async () => {
      const result = await service.getCompanyQuestions('Google', 'technical');

      expect(result.success).toBe(true);
      expect(result.data).toBeInstanceOf(Array);
    });

    it('should include company name in questions', async () => {
      const result = await service.getCompanyQuestions(
        'Microsoft',
        'behavioral'
      );

      expect(result.data![0].companySpecific).toBe('Microsoft');
    });
  });
});
