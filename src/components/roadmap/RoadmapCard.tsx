'use client';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { cn } from '@/lib/utils';
import type { RoadmapPhase, Task } from '@/types';

interface RoadmapCardProps {
  phase: RoadmapPhase;
  isActive?: boolean;
  isCompleted?: boolean;
  onStartPhase?: (phaseId: string) => void;
  onViewDetails?: (phaseId: string) => void;
  className?: string;
}

export function RoadmapCard({
  phase,
  isActive = false,
  isCompleted = false,
  onStartPhase,
  onViewDetails,
  className,
}: RoadmapCardProps) {
  const completedTasks = phase.tasks.filter(task => task.completed).length;
  const totalTasks = phase.tasks.length;
  const progressPercentage =
    totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

  const getTasksByPriority = (priority: Task['priority']) =>
    phase.tasks.filter(task => task.priority === priority);

  const highPriorityTasks = getTasksByPriority('high');
  const mediumPriorityTasks = getTasksByPriority('medium');
  const lowPriorityTasks = getTasksByPriority('low');

  return (
    <Card
      className={cn(
        'transition-all duration-200 hover:shadow-md',
        isActive && 'ring-2 ring-primary-500 shadow-lg',
        isCompleted && 'bg-green-50 border-green-200',
        className
      )}
    >
      <CardHeader className='pb-3'>
        <div className='flex items-start justify-between'>
          <div className='flex-1'>
            <CardTitle className='text-lg mb-2 flex items-center gap-2'>
              {phase.title}
              {isCompleted && (
                <Badge variant='success' className='text-xs'>
                  Completed
                </Badge>
              )}
              {isActive && (
                <Badge variant='info' className='text-xs'>
                  In Progress
                </Badge>
              )}
            </CardTitle>
            <p className='text-sm text-secondary-600 mb-3'>
              {phase.description}
            </p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className='space-y-2'>
          <div className='flex justify-between text-sm'>
            <span className='text-secondary-600'>Progress</span>
            <span className='font-medium text-secondary-900'>
              {completedTasks}/{totalTasks} tasks
            </span>
          </div>
          <div className='w-full bg-secondary-200 rounded-full h-2'>
            <div
              className={cn(
                'h-2 rounded-full transition-all duration-300',
                isCompleted ? 'bg-green-500' : 'bg-primary-500'
              )}
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        </div>
      </CardHeader>

      <CardContent className='space-y-4'>
        {/* Duration and Prerequisites */}
        <div className='flex flex-wrap gap-4 text-sm text-secondary-600'>
          <div className='flex items-center gap-1'>
            <svg
              className='h-4 w-4'
              fill='none'
              stroke='currentColor'
              viewBox='0 0 24 24'
            >
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth={2}
                d='M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z'
              />
            </svg>
            <span>{phase.duration} days</span>
          </div>
          {phase.prerequisites && phase.prerequisites.length > 0 && (
            <div className='flex items-center gap-1'>
              <svg
                className='h-4 w-4'
                fill='none'
                stroke='currentColor'
                viewBox='0 0 24 24'
              >
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth={2}
                  d='M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z'
                />
              </svg>
              <span>{phase.prerequisites.length} prerequisites</span>
            </div>
          )}
        </div>

        {/* Task Summary */}
        <div className='space-y-2'>
          <h4 className='font-medium text-secondary-900 text-sm'>
            Task Breakdown
          </h4>
          <div className='grid grid-cols-3 gap-2 text-xs'>
            {highPriorityTasks.length > 0 && (
              <div className='flex items-center gap-1'>
                <div className='w-2 h-2 bg-red-500 rounded-full'></div>
                <span>{highPriorityTasks.length} High</span>
              </div>
            )}
            {mediumPriorityTasks.length > 0 && (
              <div className='flex items-center gap-1'>
                <div className='w-2 h-2 bg-yellow-500 rounded-full'></div>
                <span>{mediumPriorityTasks.length} Medium</span>
              </div>
            )}
            {lowPriorityTasks.length > 0 && (
              <div className='flex items-center gap-1'>
                <div className='w-2 h-2 bg-green-500 rounded-full'></div>
                <span>{lowPriorityTasks.length} Low</span>
              </div>
            )}
          </div>
        </div>

        {/* Resources Count */}
        {phase.resources.length > 0 && (
          <div className='flex items-center gap-2 text-sm text-secondary-600'>
            <svg
              className='h-4 w-4'
              fill='none'
              stroke='currentColor'
              viewBox='0 0 24 24'
            >
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth={2}
                d='M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253'
              />
            </svg>
            <span>{phase.resources.length} learning resources</span>
          </div>
        )}

        {/* Action Buttons */}
        <div className='flex gap-2 pt-2'>
          {!isCompleted && !isActive && onStartPhase && (
            <Button
              onClick={() => onStartPhase(phase.id)}
              size='sm'
              className='flex-1'
            >
              Start Phase
            </Button>
          )}
          {isActive && (
            <Button
              onClick={() => onViewDetails?.(phase.id)}
              size='sm'
              variant='outline'
              className='flex-1'
            >
              Continue
            </Button>
          )}
          {onViewDetails && (
            <Button
              onClick={() => onViewDetails(phase.id)}
              size='sm'
              variant='outline'
              className={isActive ? 'flex-1' : 'flex-1'}
            >
              View Details
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
