import { InterviewDashboard } from '@/components/interview/InterviewDashboard';

export default function InterviewPage() {
  // In a real app, get userId from session/auth
  const userId = 'user-123';

  return (
    <div className='container mx-auto px-4 py-8'>
      <InterviewDashboard userId={userId} />
    </div>
  );
}
