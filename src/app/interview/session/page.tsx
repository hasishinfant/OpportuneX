'use client';

import { InterviewSession } from '@/components/interview/InterviewSession';
import { useSearchParams } from 'next/navigation';

export default function InterviewSessionPage() {
  const searchParams = useSearchParams();
  const type = searchParams.get('type') || 'technical';
  const difficulty = searchParams.get('difficulty') || 'intermediate';

  // In a real app, get userId from session/auth
  const userId = 'user-123';

  return (
    <div className='container mx-auto px-4 py-8'>
      <InterviewSession userId={userId} type={type} difficulty={difficulty} />
    </div>
  );
}
