'use client';

import { Badge } from '@/components/ui/Badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { cn } from '@/lib/utils';
import type { Milestone, RoadmapPhase } from '@/types';

interface ProgressTrackerProps {
  phases: RoadmapPhase[];
  milestones: Milestone[];
  currentPhaseId?: string;
  className?: string;
}

export function ProgressTracker({
  phases,
  milestones,
  currentPhaseId,
  className,
}: ProgressTrackerProps) {
  const totalTasks = phases.reduce((sum, phase) => sum + phase.tasks.length, 0);
  const completedTasks = phases.reduce(
    (sum, phase) => sum + phase.tasks.filter(task => task.completed).length,
    0
  );
  const overallProgress =
    totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

  const completedMilestones = milestones.filter(
    milestone => milestone.completed
  );
  const upcomingMilestones = milestones
    .filter(milestone => !milestone.completed)
    .sort(
      (a, b) =>
        new Date(a.targetDate).getTime() - new Date(b.targetDate).getTime()
    )
    .slice(0, 3);

  const getPhaseProgress = (phase: RoadmapPhase) => {
    const completed = phase.tasks.filter(task => task.completed).length;
    const total = phase.tasks.length;
    return total > 0 ? (completed / total) * 100 : 0;
  };

  const isPhaseCompleted = (phase: RoadmapPhase) =>
    phase.tasks.length > 0 && phase.tasks.every(task => task.completed);

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(new Date(date));
  };

  const getDaysUntil = (date: Date) => {
    const now = new Date();
    const target = new Date(date);
    const diffTime = target.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  return (
    <div className={cn('space-y-6', className)}>
      {/* Overall Progress */}
      <Card>
        <CardHeader>
          <CardTitle className='flex items-center gap-2'>
            <svg
              className='h-5 w-5 text-primary-600'
              fill='none'
              stroke='currentColor'
              viewBox='0 0 24 24'
            >
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth={2}
                d='M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z'
              />
            </svg>
            Overall Progress
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className='space-y-4'>
            <div className='flex justify-between items-center'>
              <span className='text-2xl font-bold text-secondary-900'>
                {Math.round(overallProgress)}%
              </span>
              <span className='text-sm text-secondary-600'>
                {completedTasks} of {totalTasks} tasks completed
              </span>
            </div>
            <div className='w-full bg-secondary-200 rounded-full h-3'>
              <div
                className='bg-gradient-to-r from-primary-500 to-primary-600 h-3 rounded-full transition-all duration-500'
                style={{ width: `${overallProgress}%` }}
              />
            </div>
            <div className='grid grid-cols-2 gap-4 text-sm'>
              <div className='text-center'>
                <div className='font-semibold text-green-600'>
                  {completedMilestones.length}
                </div>
                <div className='text-secondary-600'>Milestones Achieved</div>
              </div>
              <div className='text-center'>
                <div className='font-semibold text-primary-600'>
                  {phases.filter(phase => isPhaseCompleted(phase)).length}
                </div>
                <div className='text-secondary-600'>Phases Completed</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Phase Progress */}
      <Card>
        <CardHeader>
          <CardTitle className='flex items-center gap-2'>
            <svg
              className='h-5 w-5 text-primary-600'
              fill='none'
              stroke='currentColor'
              viewBox='0 0 24 24'
            >
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth={2}
                d='M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2'
              />
            </svg>
            Phase Progress
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className='space-y-4'>
            {phases.map((phase, index) => {
              const progress = getPhaseProgress(phase);
              const isCompleted = isPhaseCompleted(phase);
              const isCurrent = phase.id === currentPhaseId;

              return (
                <div key={phase.id} className='relative'>
                  {/* Connection Line */}
                  {index < phases.length - 1 && (
                    <div className='absolute left-4 top-8 w-0.5 h-8 bg-secondary-200' />
                  )}

                  <div className='flex items-start gap-3'>
                    {/* Phase Indicator */}
                    <div
                      className={cn(
                        'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium border-2 bg-white',
                        isCompleted
                          ? 'border-green-500 text-green-600'
                          : isCurrent
                            ? 'border-primary-500 text-primary-600'
                            : 'border-secondary-300 text-secondary-500'
                      )}
                    >
                      {isCompleted ? (
                        <svg
                          className='h-4 w-4'
                          fill='currentColor'
                          viewBox='0 0 20 20'
                        >
                          <path
                            fillRule='evenodd'
                            d='M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z'
                            clipRule='evenodd'
                          />
                        </svg>
                      ) : (
                        index + 1
                      )}
                    </div>

                    {/* Phase Details */}
                    <div className='flex-1 min-w-0'>
                      <div className='flex items-center gap-2 mb-1'>
                        <h4
                          className={cn(
                            'font-medium',
                            isCurrent
                              ? 'text-primary-900'
                              : 'text-secondary-900'
                          )}
                        >
                          {phase.title}
                        </h4>
                        {isCurrent && (
                          <Badge variant='info' className='text-xs'>
                            Current
                          </Badge>
                        )}
                      </div>

                      <div className='flex items-center gap-4 text-sm text-secondary-600 mb-2'>
                        <span>{phase.duration} days</span>
                        <span>{phase.tasks.length} tasks</span>
                      </div>

                      {/* Progress Bar */}
                      <div className='flex items-center gap-2'>
                        <div className='flex-1 bg-secondary-200 rounded-full h-1.5'>
                          <div
                            className={cn(
                              'h-1.5 rounded-full transition-all duration-300',
                              isCompleted ? 'bg-green-500' : 'bg-primary-500'
                            )}
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                        <span className='text-xs text-secondary-600 w-10 text-right'>
                          {Math.round(progress)}%
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Upcoming Milestones */}
      {upcomingMilestones.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className='flex items-center gap-2'>
              <svg
                className='h-5 w-5 text-primary-600'
                fill='none'
                stroke='currentColor'
                viewBox='0 0 24 24'
              >
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth={2}
                  d='M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z'
                />
              </svg>
              Upcoming Milestones
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className='space-y-3'>
              {upcomingMilestones.map(milestone => {
                const daysUntil = getDaysUntil(milestone.targetDate);
                const isOverdue = daysUntil < 0;
                const isUpcoming = daysUntil <= 7 && daysUntil >= 0;

                return (
                  <div
                    key={milestone.id}
                    className='flex items-start gap-3 p-3 rounded-lg bg-secondary-50'
                  >
                    <div
                      className={cn(
                        'w-2 h-2 rounded-full mt-2 flex-shrink-0',
                        isOverdue
                          ? 'bg-red-500'
                          : isUpcoming
                            ? 'bg-yellow-500'
                            : 'bg-primary-500'
                      )}
                    />
                    <div className='flex-1 min-w-0'>
                      <h4 className='font-medium text-secondary-900 mb-1'>
                        {milestone.title}
                      </h4>
                      <p className='text-sm text-secondary-600 mb-2'>
                        {milestone.description}
                      </p>
                      <div className='flex items-center gap-4 text-xs'>
                        <span
                          className={cn(
                            'font-medium',
                            isOverdue
                              ? 'text-red-600'
                              : isUpcoming
                                ? 'text-yellow-600'
                                : 'text-secondary-600'
                          )}
                        >
                          {formatDate(milestone.targetDate)}
                        </span>
                        <span
                          className={cn(
                            isOverdue
                              ? 'text-red-600'
                              : isUpcoming
                                ? 'text-yellow-600'
                                : 'text-secondary-600'
                          )}
                        >
                          {isOverdue
                            ? `${Math.abs(daysUntil)} days overdue`
                            : daysUntil === 0
                              ? 'Due today'
                              : `${daysUntil} days remaining`}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
