import { VerificationPortal } from '@/components/blockchain/VerificationPortal';
import { Shield } from 'lucide-react';

export default function VerifyPage() {
  return (
    <div className='container mx-auto px-4 py-8'>
      <div className='mb-8 text-center'>
        <div className='flex items-center justify-center gap-3 mb-4'>
          <Shield className='w-8 h-8 text-blue-600' />
          <h1 className='text-3xl font-bold'>Credential Verification</h1>
        </div>
        <p className='text-gray-600 max-w-2xl mx-auto'>
          Verify the authenticity of credentials issued on the OpportuneX
          platform using blockchain technology
        </p>
      </div>

      <VerificationPortal />
    </div>
  );
}
