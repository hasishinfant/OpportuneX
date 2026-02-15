import { ResumeAnalyzer } from '@/components/interview/ResumeAnalyzer';

export default function ResumeAnalyzerPage() {
  // In a real app, get userId from session/auth
  const userId = 'user-123';

  return (
    <div className='container mx-auto px-4 py-8'>
      <ResumeAnalyzer userId={userId} />
    </div>
  );
}
