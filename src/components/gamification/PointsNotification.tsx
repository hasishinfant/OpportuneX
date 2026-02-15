/**
 * Points Notification Component
 * Toast-style notification for points earned
 */

'use client';

import { useEffect, useState } from 'react';

interface PointsNotificationProps {
  points: number;
  action: string;
  levelUp?: boolean;
  onClose?: () => void;
}

export function PointsNotification({
  points,
  action,
  levelUp,
  onClose,
}: PointsNotificationProps) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      onClose?.();
    }, 3000);

    return () => clearTimeout(timer);
  }, [onClose]);

  if (!visible) return null;

  return (
    <div className='fixed top-4 right-4 z-50 animate-slide-in'>
      <div className='bg-white rounded-lg shadow-lg p-4 border-2 border-green-500 min-w-[250px]'>
        <div className='flex items-center space-x-3'>
          <div className='text-3xl'>✨</div>
          <div className='flex-1'>
            <div className='font-bold text-green-600'>+{points} Points!</div>
            <div className='text-sm text-gray-600'>{action}</div>
            {levelUp && (
              <div className='text-xs text-purple-600 font-medium mt-1'>
                🎉 Level Up!
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Hook to show points notifications
 */
export function usePointsNotification() {
  const [notification, setNotification] = useState<{
    points: number;
    action: string;
    levelUp?: boolean;
  } | null>(null);

  const showNotification = (
    points: number,
    action: string,
    levelUp?: boolean
  ) => {
    setNotification({ points, action, levelUp });
  };

  const clearNotification = () => {
    setNotification(null);
  };

  return {
    notification,
    showNotification,
    clearNotification,
  };
}
