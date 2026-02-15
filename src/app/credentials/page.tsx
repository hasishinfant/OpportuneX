import { CredentialList } from '@/components/blockchain/CredentialList';
import { Award } from 'lucide-react';

export default function CredentialsPage() {
  return (
    <div className='container mx-auto px-4 py-8'>
      <div className='mb-8'>
        <div className='flex items-center gap-3 mb-4'>
          <Award className='w-8 h-8 text-blue-600' />
          <h1 className='text-3xl font-bold'>My Credentials</h1>
        </div>
        <p className='text-gray-600'>
          View and manage your blockchain-verified credentials, certificates,
          and achievements
        </p>
      </div>

      <CredentialList />
    </div>
  );
}
