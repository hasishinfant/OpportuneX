'use client';

import { cn } from '@/lib/utils';
import { useEffect, useRef, useState } from 'react';

interface AudioVisualizerProps {
  isRecording: boolean;
  audioStream?: MediaStream;
  className?: string;
  barCount?: number;
  barColor?: string;
  backgroundColor?: string;
}

export function AudioVisualizer({
  isRecording,
  audioStream,
  className,
  barCount = 20,
  barColor = '#3B82F6',
  backgroundColor = '#F3F4F6',
}: AudioVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const dataArrayRef = useRef<Uint8Array | null>(null);
  const [isSupported, setIsSupported] = useState(true);

  useEffect(() => {
    // Check if Web Audio API is supported
    if (!window.AudioContext && !(window as any).webkitAudioContext) {
      setIsSupported(false);
      return;
    }

    if (!isRecording || !audioStream) {
      // Stop animation when not recording
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      // Clear canvas
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.fillStyle = backgroundColor;
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
      }
      return;
    }

    try {
      // Create audio context and analyser
      const AudioContext =
        window.AudioContext || (window as any).webkitAudioContext;
      const audioContext = new AudioContext();
      const analyser = audioContext.createAnalyser();
      const source = audioContext.createMediaStreamSource(audioStream);

      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.8;
      source.connect(analyser);

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      analyserRef.current = analyser;
      dataArrayRef.current = dataArray;

      // Start animation
      const animate = () => {
        if (!isRecording) return;

        const canvas = canvasRef.current;
        if (!canvas || !analyserRef.current || !dataArrayRef.current) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // @ts-ignore - TypeScript issue with Uint8Array types in Web Audio API
        analyserRef.current.getByteFrequencyData(dataArrayRef.current!);

        // Clear canvas
        ctx.fillStyle = backgroundColor;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Draw frequency bars
        const barWidth = canvas.width / barCount;
        const dataStep = Math.floor(dataArrayRef.current.length / barCount);

        for (let i = 0; i < barCount; i++) {
          const dataIndex = i * dataStep;
          const barHeight =
            (dataArrayRef.current[dataIndex] / 255) * canvas.height * 0.8;

          // Create gradient for bars
          const gradient = ctx.createLinearGradient(
            0,
            canvas.height,
            0,
            canvas.height - barHeight
          );
          gradient.addColorStop(0, barColor);
          gradient.addColorStop(1, `${barColor}80`); // Add transparency

          ctx.fillStyle = gradient;
          ctx.fillRect(
            i * barWidth + barWidth * 0.1,
            canvas.height - barHeight,
            barWidth * 0.8,
            barHeight
          );
        }

        animationRef.current = requestAnimationFrame(animate);
      };

      animate();

      // Cleanup function
      return () => {
        if (animationRef.current) {
          cancelAnimationFrame(animationRef.current);
        }
        if (audioContext.state !== 'closed') {
          audioContext.close();
        }
      };
    } catch (error) {
      console.error('Error setting up audio visualization:', error);
      setIsSupported(false);
      return () => {}; // Return empty cleanup function
    }
  }, [isRecording, audioStream, barCount, barColor, backgroundColor]);

  if (!isSupported) {
    // Fallback visualization using CSS animation
    return (
      <div
        className={cn(
          'flex items-center justify-center space-x-1 h-12',
          className
        )}
      >
        {Array.from({ length: Math.min(barCount, 10) }).map((_, i) => (
          <div
            key={i}
            className={cn(
              'w-1 bg-blue-500 rounded-full transition-all duration-150',
              isRecording ? 'animate-pulse' : 'h-2'
            )}
            style={{
              height: isRecording ? `${Math.random() * 32 + 8}px` : '8px',
              animationDelay: `${i * 100}ms`,
            }}
          />
        ))}
      </div>
    );
  }

  return (
    <canvas
      ref={canvasRef}
      width={300}
      height={60}
      className={cn('rounded-lg border border-secondary-200', className)}
      style={{ backgroundColor }}
    />
  );
}
