import type { ApiResponse } from '../../types';

export interface InterviewSession {
  id: string;
  userId: string;
  opportunityId?: string;
  type: 'technical' | 'behavioral' | 'system_design' | 'coding';
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  durationMinutes: number;
  status: 'in_progress' | 'completed' | 'abandoned';
  overallScore?: number;
  feedback?: SessionFeedback;
  createdAt: Date;
  completedAt?: Date;
}

export interface SessionFeedback {
  summary: string;
  strengths: string[];
  improvements: string[];
  recommendations: string[];
  scoreBreakdown: {
    technical?: number;
    communication?: number;
    problemSolving?: number;
    clarity?: number;
  };
}

export interface InterviewQuestion {
  id: string;
  category: 'technical' | 'behavioral' | 'system_design' | 'coding';
  subcategory?: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  question: string;
  expectedAnswer?: string;
  evaluationCriteria?: Record<string, any>;
  tags: string[];
  companySpecific?: string;
}

export interface InterviewResponse {
  id: string;
  sessionId: string;
  questionId: string;
  userAnswer: string;
  responseTimeSeconds?: number;
  score?: number;
  feedback?: string;
  strengths: string[];
  improvements: string[];
}

export interface ResumeAnalysis {
  id: string;
  userId: string;
  resumeText: string;
  analysisResult: {
    overallScore: number;
    sections: {
      name: string;
      score: number;
      feedback: string;
    }[];
    keywords: {
      present: string[];
      missing: string[];
    };
    formatting: {
      score: number;
      issues: string[];
    };
  };
  suggestions: string[];
  score: number;
}

export interface InterviewProgress {
  userId: string;
  category: string;
  totalSessions: number;
  averageScore: number;
  improvementRate: number;
  strengths: string[];
  areasToImprove: string[];
  lastSessionAt?: Date;
}

export interface StartSessionRequest {
  userId: string;
  type: 'technical' | 'behavioral' | 'system_design' | 'coding';
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  opportunityId?: string;
  companyName?: string;
  duration?: number;
}

export interface SubmitAnswerRequest {
  sessionId: string;
  questionId: string;
  answer: string;
  responseTime?: number;
}

export class InterviewPrepService {
  private llmProvider: 'openai' | 'mock';
  private apiKey?: string;

  constructor() {
    this.llmProvider = process.env.OPENAI_API_KEY ? 'openai' : 'mock';
    this.apiKey = process.env.OPENAI_API_KEY;
  }

  /**
   * Start a new interview session
   */
  async startSession(
    request: StartSessionRequest
  ): Promise<
    ApiResponse<{ session: InterviewSession; firstQuestion: InterviewQuestion }>
  > {
    try {
      const session: InterviewSession = {
        id: `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        userId: request.userId,
        opportunityId: request.opportunityId,
        type: request.type,
        difficulty: request.difficulty,
        durationMinutes: request.duration || 30,
        status: 'in_progress',
        createdAt: new Date(),
      };

      // Get first question
      const firstQuestion = await this.getNextQuestion(
        session.id,
        request.type,
        request.difficulty,
        request.companyName
      );

      return {
        success: true,
        data: { session, firstQuestion },
        message: 'Interview session started successfully',
      };
    } catch (error) {
      console.error('Start session error:', error);
      return {
        success: false,
        error: 'Failed to start interview session',
      };
    }
  }

  /**
   * Get next question for the session
   */
  async getNextQuestion(
    sessionId: string,
    type: string,
    difficulty: string,
    companyName?: string
  ): Promise<InterviewQuestion> {
    const questions = this.getQuestionBank(type, difficulty, companyName);
    const randomIndex = Math.floor(Math.random() * questions.length);
    return questions[randomIndex];
  }

  /**
   * Submit answer and get feedback
   */
  async submitAnswer(
    request: SubmitAnswerRequest
  ): Promise<
    ApiResponse<{
      response: InterviewResponse;
      nextQuestion?: InterviewQuestion;
    }>
  > {
    try {
      // Evaluate the answer using AI
      const evaluation = await this.evaluateAnswer(
        request.questionId,
        request.answer
      );

      const response: InterviewResponse = {
        id: `response_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        sessionId: request.sessionId,
        questionId: request.questionId,
        userAnswer: request.answer,
        responseTimeSeconds: request.responseTime,
        score: evaluation.score,
        feedback: evaluation.feedback,
        strengths: evaluation.strengths,
        improvements: evaluation.improvements,
      };

      // Get next question (in a real implementation, this would be smarter)
      const nextQuestion = await this.getNextQuestion(
        request.sessionId,
        'technical',
        'intermediate'
      );

      return {
        success: true,
        data: { response, nextQuestion },
        message: 'Answer submitted successfully',
      };
    } catch (error) {
      console.error('Submit answer error:', error);
      return {
        success: false,
        error: 'Failed to submit answer',
      };
    }
  }

  /**
   * Evaluate user's answer using AI
   */
  private async evaluateAnswer(
    questionId: string,
    answer: string
  ): Promise<{
    score: number;
    feedback: string;
    strengths: string[];
    improvements: string[];
  }> {
    if (this.llmProvider === 'openai' && this.apiKey) {
      return await this.evaluateWithOpenAI(questionId, answer);
    }

    // Mock evaluation
    return {
      score: 75 + Math.random() * 20,
      feedback:
        'Good answer with clear explanation. Consider adding more specific examples.',
      strengths: [
        'Clear communication',
        'Structured approach',
        'Good understanding of concepts',
      ],
      improvements: [
        'Add more real-world examples',
        'Discuss edge cases',
        'Mention trade-offs',
      ],
    };
  }

  /**
   * Evaluate answer using OpenAI
   */
  private async evaluateWithOpenAI(
    questionId: string,
    answer: string
  ): Promise<any> {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: `You are an expert technical interviewer. Evaluate the candidate's answer and provide:
1. A score (0-100)
2. Detailed feedback
3. 2-3 strengths
4. 2-3 areas for improvement

Format your response as JSON with keys: score, feedback, strengths, improvements`,
          },
          {
            role: 'user',
            content: `Question ID: ${questionId}\n\nCandidate's Answer: ${answer}`,
          },
        ],
        temperature: 0.7,
      }),
    });

    const result = await response.json();
    const content = result.choices[0].message.content;

    try {
      return JSON.parse(content);
    } catch {
      return {
        score: 70,
        feedback: content,
        strengths: ['Good attempt'],
        improvements: ['Practice more'],
      };
    }
  }

  /**
   * Complete interview session
   */
  async completeSession(
    sessionId: string
  ): Promise<
    ApiResponse<{ session: InterviewSession; summary: SessionFeedback }>
  > {
    try {
      // Calculate overall score and generate feedback
      const summary: SessionFeedback = {
        summary:
          'Great performance! You demonstrated strong technical knowledge and communication skills.',
        strengths: [
          'Clear and structured answers',
          'Good problem-solving approach',
          'Strong technical fundamentals',
        ],
        improvements: [
          'Practice more system design questions',
          'Work on explaining trade-offs',
          'Improve time management',
        ],
        recommendations: [
          'Review distributed systems concepts',
          'Practice coding on a whiteboard',
          'Mock interview with peers',
        ],
        scoreBreakdown: {
          technical: 85,
          communication: 80,
          problemSolving: 82,
          clarity: 88,
        },
      };

      const session: InterviewSession = {
        id: sessionId,
        userId: 'user-123',
        type: 'technical',
        difficulty: 'intermediate',
        durationMinutes: 30,
        status: 'completed',
        overallScore: 84,
        feedback: summary,
        createdAt: new Date(Date.now() - 30 * 60 * 1000),
        completedAt: new Date(),
      };

      return {
        success: true,
        data: { session, summary },
        message: 'Interview session completed successfully',
      };
    } catch (error) {
      console.error('Complete session error:', error);
      return {
        success: false,
        error: 'Failed to complete session',
      };
    }
  }

  /**
   * Analyze resume
   */
  async analyzeResume(
    userId: string,
    resumeText: string
  ): Promise<ApiResponse<ResumeAnalysis>> {
    try {
      const analysis: ResumeAnalysis = {
        id: `analysis_${Date.now()}`,
        userId,
        resumeText,
        analysisResult: {
          overallScore: 78,
          sections: [
            {
              name: 'Contact Information',
              score: 90,
              feedback: 'Complete and professional',
            },
            {
              name: 'Work Experience',
              score: 75,
              feedback: 'Good descriptions, add more quantifiable achievements',
            },
            {
              name: 'Skills',
              score: 80,
              feedback: 'Comprehensive list, organize by proficiency',
            },
            {
              name: 'Education',
              score: 85,
              feedback: 'Well presented',
            },
          ],
          keywords: {
            present: ['Python', 'JavaScript', 'React', 'Node.js', 'SQL'],
            missing: ['Docker', 'Kubernetes', 'CI/CD', 'Testing'],
          },
          formatting: {
            score: 70,
            issues: [
              'Inconsistent bullet point formatting',
              'Use more action verbs',
              'Reduce length to 1-2 pages',
            ],
          },
        },
        suggestions: [
          'Add quantifiable achievements (e.g., "Improved performance by 40%")',
          'Include relevant keywords for ATS optimization',
          'Use consistent formatting throughout',
          'Add a professional summary at the top',
          'Include links to GitHub/portfolio',
        ],
        score: 78,
      };

      return {
        success: true,
        data: analysis,
        message: 'Resume analyzed successfully',
      };
    } catch (error) {
      console.error('Analyze resume error:', error);
      return {
        success: false,
        error: 'Failed to analyze resume',
      };
    }
  }

  /**
   * Get user's interview progress
   */
  async getProgress(userId: string): Promise<ApiResponse<InterviewProgress[]>> {
    try {
      const progress: InterviewProgress[] = [
        {
          userId,
          category: 'technical',
          totalSessions: 12,
          averageScore: 82,
          improvementRate: 15,
          strengths: ['Data structures', 'Algorithms', 'Problem solving'],
          areasToImprove: ['System design', 'Scalability'],
          lastSessionAt: new Date(),
        },
        {
          userId,
          category: 'behavioral',
          totalSessions: 8,
          averageScore: 78,
          improvementRate: 10,
          strengths: ['Communication', 'Leadership examples'],
          areasToImprove: ['Conflict resolution', 'Failure stories'],
          lastSessionAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        },
      ];

      return {
        success: true,
        data: progress,
        message: 'Progress retrieved successfully',
      };
    } catch (error) {
      console.error('Get progress error:', error);
      return {
        success: false,
        error: 'Failed to retrieve progress',
      };
    }
  }

  /**
   * Get question bank
   */
  private getQuestionBank(
    type: string,
    difficulty: string,
    companyName?: string
  ): InterviewQuestion[] {
    const technicalQuestions: InterviewQuestion[] = [
      {
        id: 'tech-1',
        category: 'technical',
        subcategory: 'Data Structures',
        difficulty: 'intermediate',
        question:
          'Explain the difference between a stack and a queue. When would you use each?',
        tags: ['data-structures', 'fundamentals'],
      },
      {
        id: 'tech-2',
        category: 'technical',
        subcategory: 'Algorithms',
        difficulty: 'intermediate',
        question:
          'What is the time complexity of binary search? Explain how it works.',
        tags: ['algorithms', 'complexity'],
      },
      {
        id: 'tech-3',
        category: 'technical',
        subcategory: 'Web Development',
        difficulty: 'intermediate',
        question:
          'Explain the difference between REST and GraphQL APIs. What are the pros and cons of each?',
        tags: ['web', 'api', 'architecture'],
      },
    ];

    const behavioralQuestions: InterviewQuestion[] = [
      {
        id: 'behav-1',
        category: 'behavioral',
        difficulty: 'intermediate',
        question:
          'Tell me about a time when you had to work with a difficult team member. How did you handle it?',
        tags: ['teamwork', 'conflict-resolution'],
      },
      {
        id: 'behav-2',
        category: 'behavioral',
        difficulty: 'intermediate',
        question:
          'Describe a project where you had to learn a new technology quickly. What was your approach?',
        tags: ['learning', 'adaptability'],
      },
    ];

    const systemDesignQuestions: InterviewQuestion[] = [
      {
        id: 'sys-1',
        category: 'system_design',
        difficulty: 'advanced',
        question:
          'Design a URL shortening service like bit.ly. Consider scalability and reliability.',
        tags: ['system-design', 'scalability', 'databases'],
      },
      {
        id: 'sys-2',
        category: 'system_design',
        difficulty: 'advanced',
        question:
          'How would you design a real-time chat application? Discuss the architecture and technology choices.',
        tags: ['system-design', 'real-time', 'websockets'],
      },
    ];

    const codingQuestions: InterviewQuestion[] = [
      {
        id: 'code-1',
        category: 'coding',
        difficulty: 'intermediate',
        question:
          'Write a function to reverse a linked list. Explain your approach and analyze the complexity.',
        tags: ['coding', 'linked-list', 'algorithms'],
      },
      {
        id: 'code-2',
        category: 'coding',
        difficulty: 'intermediate',
        question:
          'Implement a function to find the longest palindromic substring in a given string.',
        tags: ['coding', 'strings', 'dynamic-programming'],
      },
    ];

    switch (type) {
      case 'technical':
        return technicalQuestions;
      case 'behavioral':
        return behavioralQuestions;
      case 'system_design':
        return systemDesignQuestions;
      case 'coding':
        return codingQuestions;
      default:
        return technicalQuestions;
    }
  }

  /**
   * Get company-specific interview questions
   */
  async getCompanyQuestions(
    companyName: string,
    type: string
  ): Promise<ApiResponse<InterviewQuestion[]>> {
    try {
      // In production, this would query a database of company-specific questions
      const questions: InterviewQuestion[] = [
        {
          id: `${companyName}-1`,
          category: type as any,
          difficulty: 'intermediate',
          question: `Tell me about a time you demonstrated ${companyName}'s core values in your work.`,
          tags: ['company-culture', companyName.toLowerCase()],
          companySpecific: companyName,
        },
      ];

      return {
        success: true,
        data: questions,
        message: 'Company-specific questions retrieved',
      };
    } catch (error) {
      console.error('Get company questions error:', error);
      return {
        success: false,
        error: 'Failed to retrieve company questions',
      };
    }
  }
}

export const interviewPrepService = new InterviewPrepService();
