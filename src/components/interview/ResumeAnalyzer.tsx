'use client';

import { Card } from '@/components/ui/Card';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { useState } from 'react';

interface ResumeAnalysis {
  overallScore: number;
  sections: Array<{
    name: string;
    score: number;
    feedback: string;
  }>;
  keywords: {
    present: string[];
    missing: string[];
  };
  formatting: {
    score: number;
    issues: string[];
  };
}

export function ResumeAnalyzer({ userId }: { userId: string }) {
  const [resumeText, setResumeText] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<ResumeAnalysis | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);

  const analyzeResume = async () => {
    if (!resumeText.trim()) return;

    setAnalyzing(true);
    try {
      const response = await fetch('/api/interview/resume', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, resumeText }),
      });

      const result = await response.json();
      if (result.success) {
        setAnalysis(result.data.analysisResult);
        setSuggestions(result.data.suggestions);
      }
    } catch (error) {
      console.error('Failed to analyze resume:', error);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = event => {
      const text = event.target?.result as string;
      setResumeText(text);
    };
    reader.readAsText(file);
  };

  return (
    <div className='max-w-6xl mx-auto space-y-6'>
      <div>
        <h1 className='text-3xl font-bold mb-2'>Resume Analyzer</h1>
        <p className='text-gray-600'>Get AI-powered feedback on your resume</p>
      </div>

      {/* Input Section */}
      {!analysis && (
        <Card className='p-6'>
          <div className='space-y-4'>
            <div>
              <label className='block text-sm font-medium mb-2'>
                Upload Resume or Paste Text
              </label>
              <input
                type='file'
                accept='.txt,.pdf,.doc,.docx'
                onChange={handleFileUpload}
                className='mb-4 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100'
              />
              <textarea
                value={resumeText}
                onChange={e => setResumeText(e.target.value)}
                placeholder='Or paste your resume text here...'
                className='w-full h-64 p-4 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent'
              />
            </div>

            <button
              onClick={analyzeResume}
              disabled={!resumeText.trim() || analyzing}
              className='w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors'
            >
              {analyzing ? 'Analyzing...' : 'Analyze Resume'}
            </button>
          </div>
        </Card>
      )}

      {/* Analysis Results */}
      {analyzing && <LoadingSpinner />}

      {analysis && (
        <div className='space-y-6'>
          {/* Overall Score */}
          <Card className='p-6'>
            <div className='text-center'>
              <h2 className='text-2xl font-semibold mb-2'>Overall Score</h2>
              <div className='text-6xl font-bold text-blue-600 mb-2'>
                {analysis.overallScore}
              </div>
              <p className='text-gray-600'>out of 100</p>
            </div>
          </Card>

          {/* Section Scores */}
          <Card className='p-6'>
            <h2 className='text-xl font-semibold mb-4'>Section Analysis</h2>
            <div className='space-y-4'>
              {analysis.sections.map((section, idx) => (
                <div key={idx} className='border-b pb-4 last:border-b-0'>
                  <div className='flex justify-between items-center mb-2'>
                    <h3 className='font-semibold'>{section.name}</h3>
                    <span className='text-lg font-bold text-blue-600'>
                      {section.score}%
                    </span>
                  </div>
                  <p className='text-sm text-gray-600'>{section.feedback}</p>
                </div>
              ))}
            </div>
          </Card>

          {/* Keywords */}
          <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
            <Card className='p-6'>
              <h3 className='font-semibold text-green-700 mb-3'>
                Present Keywords
              </h3>
              <div className='flex flex-wrap gap-2'>
                {analysis.keywords.present.map((keyword, idx) => (
                  <span
                    key={idx}
                    className='px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm'
                  >
                    {keyword}
                  </span>
                ))}
              </div>
            </Card>

            <Card className='p-6'>
              <h3 className='font-semibold text-orange-700 mb-3'>
                Missing Keywords
              </h3>
              <div className='flex flex-wrap gap-2'>
                {analysis.keywords.missing.map((keyword, idx) => (
                  <span
                    key={idx}
                    className='px-3 py-1 bg-orange-100 text-orange-800 rounded-full text-sm'
                  >
                    {keyword}
                  </span>
                ))}
              </div>
            </Card>
          </div>

          {/* Formatting */}
          <Card className='p-6'>
            <h2 className='text-xl font-semibold mb-4'>
              Formatting Score: {analysis.formatting.score}%
            </h2>
            <ul className='list-disc list-inside space-y-2 text-sm text-gray-700'>
              {analysis.formatting.issues.map((issue, idx) => (
                <li key={idx}>{issue}</li>
              ))}
            </ul>
          </Card>

          {/* Suggestions */}
          <Card className='p-6'>
            <h2 className='text-xl font-semibold mb-4'>Recommendations</h2>
            <ul className='space-y-3'>
              {suggestions.map((suggestion, idx) => (
                <li key={idx} className='flex items-start'>
                  <span className='text-blue-600 mr-2'>•</span>
                  <span className='text-gray-700'>{suggestion}</span>
                </li>
              ))}
            </ul>
          </Card>

          {/* Actions */}
          <div className='flex gap-4'>
            <button
              onClick={() => {
                setAnalysis(null);
                setResumeText('');
              }}
              className='flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors'
            >
              Analyze Another Resume
            </button>
            <button
              onClick={() => window.print()}
              className='px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors'
            >
              Print Report
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
