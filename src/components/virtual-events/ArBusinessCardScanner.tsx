'use client';

// AR Business Card Scanner Component
// Scans QR codes and displays AR business cards

import { ArBusinessCardData } from '@/types/virtual-events';
import { useEffect, useRef, useState } from 'react';

interface ArBusinessCardScannerProps {
  onCardScanned?: (cardData: ArBusinessCardData) => void;
  onExchange?: (senderId: string, receiverId: string) => void;
}

export default function ArBusinessCardScanner({
  onCardScanned,
  onExchange,
}: ArBusinessCardScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scannedCard, setScannedCard] = useState<ArBusinessCardData | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);

  // Start camera
  const startCamera = async () => {
    try {
      setError(null);
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }, // Use back camera on mobile
        audio: false,
      });

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        setStream(mediaStream);
        setIsScanning(true);
      }
    } catch (err) {
      setError('Failed to access camera. Please grant camera permissions.');
      console.error('Camera access error:', err);
    }
  };

  // Stop camera
  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setIsScanning(false);
  };

  // Scan for QR codes (simplified - in production use a QR library)
  const scanFrame = () => {
    if (!videoRef.current || !canvasRef.current || !isScanning) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    if (!ctx || video.readyState !== video.HAVE_ENOUGH_DATA) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // In production, use a QR code detection library like jsQR
    // For now, this is a placeholder
    // const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    // const qrCode = detectQRCode(imageData);
  };

  useEffect(() => {
    let animationFrame: number;

    if (isScanning) {
      const scan = () => {
        scanFrame();
        animationFrame = requestAnimationFrame(scan);
      };
      scan();
    }

    return () => {
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }
    };
  }, [isScanning]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  // Handle card exchange
  const handleExchange = async () => {
    if (scannedCard && onExchange) {
      // In production, get actual user IDs
      onExchange('current_user_id', 'scanned_user_id');
      setScannedCard(null);
    }
  };

  return (
    <div className='flex flex-col items-center space-y-4 p-4'>
      <h2 className='text-2xl font-bold'>AR Business Card Scanner</h2>

      {error && (
        <div className='bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded'>
          {error}
        </div>
      )}

      {!isScanning && !scannedCard && (
        <div className='text-center space-y-4'>
          <p className='text-gray-600'>
            Scan a QR code to view someone's AR business card
          </p>
          <button
            onClick={startCamera}
            className='px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition'
          >
            Start Scanning
          </button>
        </div>
      )}

      {isScanning && (
        <div className='relative'>
          <video
            ref={videoRef}
            autoPlay
            playsInline
            className='w-full max-w-md rounded-lg shadow-lg'
          />
          <canvas ref={canvasRef} className='hidden' />

          {/* Scanning overlay */}
          <div className='absolute inset-0 flex items-center justify-center pointer-events-none'>
            <div className='w-64 h-64 border-4 border-blue-500 rounded-lg animate-pulse' />
          </div>

          <button
            onClick={stopCamera}
            className='mt-4 px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition'
          >
            Stop Scanning
          </button>
        </div>
      )}

      {scannedCard && (
        <div className='w-full max-w-md bg-white rounded-lg shadow-xl p-6 space-y-4'>
          <div className='flex items-center space-x-4'>
            {scannedCard.profileImage && (
              <img
                src={scannedCard.profileImage}
                alt={scannedCard.name}
                className='w-20 h-20 rounded-full object-cover'
              />
            )}
            <div>
              <h3 className='text-xl font-bold'>{scannedCard.name}</h3>
              <p className='text-gray-600'>{scannedCard.title}</p>
              <p className='text-gray-500'>{scannedCard.company}</p>
            </div>
          </div>

          <div className='space-y-2'>
            <div className='flex items-center space-x-2'>
              <span className='text-gray-600'>📧</span>
              <a
                href={`mailto:${scannedCard.email}`}
                className='text-blue-600 hover:underline'
              >
                {scannedCard.email}
              </a>
            </div>
            {scannedCard.phone && (
              <div className='flex items-center space-x-2'>
                <span className='text-gray-600'>📱</span>
                <a
                  href={`tel:${scannedCard.phone}`}
                  className='text-blue-600 hover:underline'
                >
                  {scannedCard.phone}
                </a>
              </div>
            )}
            {scannedCard.website && (
              <div className='flex items-center space-x-2'>
                <span className='text-gray-600'>🌐</span>
                <a
                  href={scannedCard.website}
                  target='_blank'
                  rel='noopener noreferrer'
                  className='text-blue-600 hover:underline'
                >
                  {scannedCard.website}
                </a>
              </div>
            )}
          </div>

          {scannedCard.bio && (
            <div>
              <h4 className='font-semibold mb-2'>About</h4>
              <p className='text-gray-700'>{scannedCard.bio}</p>
            </div>
          )}

          {scannedCard.skills && scannedCard.skills.length > 0 && (
            <div>
              <h4 className='font-semibold mb-2'>Skills</h4>
              <div className='flex flex-wrap gap-2'>
                {scannedCard.skills.map((skill, index) => (
                  <span
                    key={index}
                    className='px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm'
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className='flex space-x-3 pt-4'>
            <button
              onClick={handleExchange}
              className='flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition'
            >
              Exchange Cards
            </button>
            <button
              onClick={() => setScannedCard(null)}
              className='flex-1 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition'
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
