'use client';

import { Card } from '@/components/ui/Card';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { useEffect, useState } from 'react';

interface Question {
  id: string;
  category: string;
  difficulty: string;
  question: string;
  tags: string[];
}

interface Feedback {
  score: number;
  feedback: string;
  strengths: string[];
  improvements: string[];
}

export function InterviewSession({
  userId,
  type,
  difficulty,
}: {
  userId: string;
  type: string;
  difficulty: string;
}) {
  const [sessionId, setSessionId] = useState<string>('');
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [answer, setAnswer] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [questionCount, setQuestionCount] = useState(0);
  const [startTime, setStartTime] = useState<number>(0);

  useEffect(() => {
    startSession();
  }, []);

  const startSession = async () => {
    try {
      const response = await fetch('/api/interview/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, type, difficulty }),
      });

      const result = await response.json();
      if (result.success) {
        setSessionId(result.data.session.id);
        setCurrentQuestion(result.data.firstQuestion);
        setStartTime(Date.now());
      }
    } catch (error) {
      console.error('Failed to start session:', error);
    } finally {
      setLoading(false);
    }
  };

  const submitAnswer = async () => {
    if (!answer.trim() || !currentQuestion) return;

    setSubmitting(true);
    const responseTime = Math.floor((Date.now() - startTime) / 1000);

    try {
      const response = await fetch('/api/interview/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          questionId: currentQuestion.id,
          answer,
          responseTime,
        }),
      });

      const result = await response.json();
      if (result.success) {
        setFeedback({
          score: result.data.response.score,
          feedback: result.data.response.feedback,
          strengths: result.data.response.strengths,
          improvements: result.data.response.improvements,
        });
        setQuestionCount(questionCount + 1);
      }
    } catch (error) {
      console.error('Failed to submit answer:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const nextQuestion = async () => {
    setFeedback(null);
    setAnswer('');
    setStartTime(Date.now());

    // In a real implementation, this would fetch the next question from the API
    // For now, we'll simulate it
    setLoading(true);
    setTimeout(() => {
      setCurrentQuestion({
        id: `q-${Date.now()}`,
        category: type,
        difficulty,
        question: 'Next question would appear here...',
        tags: [],
      });
      setLoading(false);
    }, 500);
  };

  const completeSession = async () => {
    try {
      const response = await fetch('/api/interview/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      });

      const result = await response.json();
      if (result.success) {
        window.location.href = `/interview/summary?sessionId=${sessionId}`;
      }
    } catch (error) {
      console.error('Failed to complete session:', error);
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className='max-w-4xl mx-auto space-y-6'>
      {/* Header */}
      <div className='flex justify-between items-center'>
        <div>
          <h1 className='text-2xl font-bold capitalize'>
            {type.replace('_', ' ')} Interview
          </h1>
          <p className='text-gray-600'>Difficulty: {difficulty}</p>
        </div>
        <div className='text-right'>
          <p className='text-sm text-gray-600'>Question {questionCount + 1}</p>
          <button
            onClick={completeSession}
            className='text-sm text-blue-600 hover:underline'
          >
            End Session
          </button>
        </div>
      </div>

      {/* Question Card */}
      {currentQuestion && !feedback && (
        <Card className='p-6'>
          <div className='mb-4'>
            <div className='flex gap-2 mb-3'>
              {currentQuestion.tags.map(tag => (
                <span
                  key={tag}
                  className='px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded'
                >
                  {tag}
                </span>
              ))}
            </div>
            <h2 className='text-xl font-semibold mb-4'>
              {currentQuestion.question}
            </h2>
          </div>

          <div className='space-y-4'>
            <textarea
              value={answer}
              onChange={e => setAnswer(e.target.value)}
              placeholder='Type your answer here...'
              className='w-full h-48 p-4 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent'
              disabled={submitting}
            />

            <div className='flex justify-between items-center'>
              <p className='text-sm text-gray-600'>
                Time: {Math.floor((Date.now() - startTime) / 1000)}s
              </p>
              <button
                onClick={submitAnswer}
                disabled={!answer.trim() || submitting}
                className='px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors'
              >
                {submitting ? 'Submitting...' : 'Submit Answer'}
              </button>
            </div>
          </div>
        </Card>
      )}

      {/* Feedback Card */}
      {feedback && (
        <Card className='p-6'>
          <div className='mb-6'>
            <div className='flex items-center justify-between mb-4'>
              <h2 className='text-xl font-semibold'>Feedback</h2>
              <div className='text-3xl font-bold text-blue-600'>
                {Math.round(feedback.score)}%
              </div>
            </div>
            <p className='text-gray-700'>{feedback.feedback}</p>
          </div>

          <div className='grid grid-cols-1 md:grid-cols-2 gap-6 mb-6'>
            <div>
              <h3 className='font-semibold text-green-700 mb-2'>Strengths</h3>
              <ul className='list-disc list-inside space-y-1 text-sm text-gray-700'>
                {feedback.strengths.map((strength, idx) => (
                  <li key={idx}>{strength}</li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className='font-semibold text-orange-700 mb-2'>
                Areas to Improve
              </h3>
              <ul className='list-disc list-inside space-y-1 text-sm text-gray-700'>
                {feedback.improvements.map((improvement, idx) => (
                  <li key={idx}>{improvement}</li>
                ))}
              </ul>
            </div>
          </div>

          <div className='flex gap-4'>
            <button
              onClick={nextQuestion}
              className='flex-1 px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors'
            >
              Next Question
            </button>
            <button
              onClick={completeSession}
              className='px-6 py-2 border border-gray-300 rounded hover:bg-gray-50 transition-colors'
            >
              End Session
            </button>
          </div>
        </Card>
      )}
    </div>
  );
}
