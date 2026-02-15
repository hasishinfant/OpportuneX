import { useEffect, useState } from 'react';

interface InterviewSession {
  id: string;
  type: string;
  difficulty: string;
  status: string;
  overallScore?: number;
}

interface InterviewProgress {
  category: string;
  totalSessions: number;
  averageScore: number;
  improvementRate: number;
  strengths: string[];
  areasToImprove: string[];
}

export function useInterview(userId: string) {
  const [progress, setProgress] = useState<InterviewProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (userId) {
      fetchProgress();
    }
  }, [userId]);

  const fetchProgress = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/interview/progress?userId=${userId}`);
      const result = await response.json();

      if (result.success) {
        setProgress(result.data);
      } else {
        setError(result.error || 'Failed to fetch progress');
      }
    } catch (err) {
      setError('Network error');
      console.error('Fetch progress error:', err);
    } finally {
      setLoading(false);
    }
  };

  const startSession = async (
    type: string,
    difficulty: string,
    opportunityId?: string
  ) => {
    try {
      const response = await fetch('/api/interview/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, type, difficulty, opportunityId }),
      });

      const result = await response.json();
      return result;
    } catch (err) {
      console.error('Start session error:', err);
      return { success: false, error: 'Failed to start session' };
    }
  };

  const submitAnswer = async (
    sessionId: string,
    questionId: string,
    answer: string,
    responseTime?: number
  ) => {
    try {
      const response = await fetch('/api/interview/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, questionId, answer, responseTime }),
      });

      const result = await response.json();
      return result;
    } catch (err) {
      console.error('Submit answer error:', err);
      return { success: false, error: 'Failed to submit answer' };
    }
  };

  const completeSession = async (sessionId: string) => {
    try {
      const response = await fetch('/api/interview/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      });

      const result = await response.json();

      // Refresh progress after completing session
      if (result.success) {
        await fetchProgress();
      }

      return result;
    } catch (err) {
      console.error('Complete session error:', err);
      return { success: false, error: 'Failed to complete session' };
    }
  };

  const analyzeResume = async (resumeText: string) => {
    try {
      const response = await fetch('/api/interview/resume', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, resumeText }),
      });

      const result = await response.json();
      return result;
    } catch (err) {
      console.error('Analyze resume error:', err);
      return { success: false, error: 'Failed to analyze resume' };
    }
  };

  return {
    progress,
    loading,
    error,
    startSession,
    submitAnswer,
    completeSession,
    analyzeResume,
    refreshProgress: fetchProgress,
  };
}
