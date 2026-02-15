'use client';

import { Card } from '@/components/ui/Card';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { useEffect, useState } from 'react';

interface InterviewProgress {
  userId: string;
  category: string;
  totalSessions: number;
  averageScore: number;
  improvementRate: number;
  strengths: string[];
  areasToImprove: string[];
  lastSessionAt?: Date;
}

export function InterviewDashboard({ userId }: { userId: string }) {
  const [progress, setProgress] = useState<InterviewProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedType, setSelectedType] = useState<string>('technical');

  useEffect(() => {
    fetchProgress();
  }, [userId]);

  const fetchProgress = async () => {
    try {
      const response = await fetch(`/api/interview/progress?userId=${userId}`);
      const result = await response.json();
      if (result.success) {
        setProgress(result.data);
      }
    } catch (error) {
      console.error('Failed to fetch progress:', error);
    } finally {
      setLoading(false);
    }
  };

  const startInterview = (type: string, difficulty: string) => {
    window.location.href = `/interview/session?type=${type}&difficulty=${difficulty}`;
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className='space-y-6'>
      <div className='flex justify-between items-center'>
        <h1 className='text-3xl font-bold'>Interview Preparation</h1>
      </div>

      {/* Quick Start Section */}
      <Card className='p-6'>
        <h2 className='text-xl font-semibold mb-4'>Start Practice Interview</h2>
        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4'>
          {['technical', 'behavioral', 'system_design', 'coding'].map(type => (
            <div key={type} className='space-y-2'>
              <h3 className='font-medium capitalize'>
                {type.replace('_', ' ')}
              </h3>
              <div className='space-y-2'>
                {['beginner', 'intermediate', 'advanced'].map(difficulty => (
                  <button
                    key={difficulty}
                    onClick={() => startInterview(type, difficulty)}
                    className='w-full px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors'
                  >
                    {difficulty}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Progress Overview */}
      <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4'>
        {progress.map(prog => (
          <Card key={prog.category} className='p-4'>
            <h3 className='font-semibold capitalize mb-2'>{prog.category}</h3>
            <div className='space-y-2 text-sm'>
              <div className='flex justify-between'>
                <span className='text-gray-600'>Sessions:</span>
                <span className='font-medium'>{prog.totalSessions}</span>
              </div>
              <div className='flex justify-between'>
                <span className='text-gray-600'>Avg Score:</span>
                <span className='font-medium'>{prog.averageScore}%</span>
              </div>
              <div className='flex justify-between'>
                <span className='text-gray-600'>Improvement:</span>
                <span className='font-medium text-green-600'>
                  +{prog.improvementRate}%
                </span>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Detailed Progress */}
      {progress.length > 0 && (
        <Card className='p-6'>
          <h2 className='text-xl font-semibold mb-4'>Detailed Progress</h2>
          <div className='space-y-6'>
            {progress.map(prog => (
              <div
                key={prog.category}
                className='border-b pb-4 last:border-b-0'
              >
                <h3 className='font-semibold capitalize mb-3'>
                  {prog.category} Interviews
                </h3>
                <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                  <div>
                    <h4 className='text-sm font-medium text-gray-700 mb-2'>
                      Strengths
                    </h4>
                    <ul className='list-disc list-inside text-sm text-gray-600 space-y-1'>
                      {prog.strengths.map((strength, idx) => (
                        <li key={idx}>{strength}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h4 className='text-sm font-medium text-gray-700 mb-2'>
                      Areas to Improve
                    </h4>
                    <ul className='list-disc list-inside text-sm text-gray-600 space-y-1'>
                      {prog.areasToImprove.map((area, idx) => (
                        <li key={idx}>{area}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Additional Features */}
      <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
        <Card className='p-6'>
          <h3 className='text-lg font-semibold mb-3'>Resume Review</h3>
          <p className='text-sm text-gray-600 mb-4'>
            Get AI-powered feedback on your resume with actionable suggestions
          </p>
          <button
            onClick={() => (window.location.href = '/interview/resume')}
            className='w-full px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors'
          >
            Analyze Resume
          </button>
        </Card>

        <Card className='p-6'>
          <h3 className='text-lg font-semibold mb-3'>Company-Specific Prep</h3>
          <p className='text-sm text-gray-600 mb-4'>
            Practice with questions tailored to specific companies
          </p>
          <button
            onClick={() => (window.location.href = '/interview/companies')}
            className='w-full px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors'
          >
            Browse Companies
          </button>
        </Card>
      </div>
    </div>
  );
}
