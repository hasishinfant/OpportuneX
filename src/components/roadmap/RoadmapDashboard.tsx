'use client';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { cn } from '@/lib/utils';
import type { RoadmapPhase, RoadmapResponse } from '@/types';
import { BarChart3, ClipboardList, TrendingUp } from 'lucide-react';
import { useCallback, useState } from 'react';
import { ProgressTracker } from './ProgressTracker';
import { RoadmapCard } from './RoadmapCard';

interface RoadmapDashboardProps {
  roadmaps: RoadmapResponse[];
  loading?: boolean;
  onGenerateRoadmap?: (opportunityId: string) => void;
  onStartPhase?: (roadmapId: string, phaseId: string) => void;
  onViewPhaseDetails?: (roadmapId: string, phaseId: string) => void;
  className?: string;
}

export function RoadmapDashboard({
  roadmaps,
  loading = false,
  onGenerateRoadmap,
  onStartPhase,
  onViewPhaseDetails,
  className,
}: RoadmapDashboardProps) {
  const [selectedRoadmapId, setSelectedRoadmapId] = useState<string | null>(
    roadmaps.length > 0 ? roadmaps[0].roadmap.id : null
  );
  const [viewMode, setViewMode] = useState<'overview' | 'phases' | 'progress'>(
    'overview'
  );

  const selectedRoadmap = roadmaps.find(
    r => r.roadmap.id === selectedRoadmapId
  );

  const handleStartPhase = useCallback(
    (phaseId: string) => {
      if (selectedRoadmapId && onStartPhase) {
        onStartPhase(selectedRoadmapId, phaseId);
      }
    },
    [selectedRoadmapId, onStartPhase]
  );

  const handleViewPhaseDetails = useCallback(
    (phaseId: string) => {
      if (selectedRoadmapId && onViewPhaseDetails) {
        onViewPhaseDetails(selectedRoadmapId, phaseId);
      }
    },
    [selectedRoadmapId, onViewPhaseDetails]
  );

  const getCurrentPhase = (phases: RoadmapPhase[]) => {
    // Find the first phase that's not completed
    return phases.find(phase => !phase.tasks.every(task => task.completed));
  };

  if (loading) {
    return (
      <div className={cn('flex items-center justify-center py-12', className)}>
        <div className='text-center'>
          <LoadingSpinner size='lg' />
          <p className='mt-4 text-secondary-600'>
            Generating your personalized roadmap...
          </p>
        </div>
      </div>
    );
  }

  if (roadmaps.length === 0) {
    return (
      <div className={cn('text-center py-12', className)}>
        <div className='max-w-md mx-auto'>
          <svg
            className='mx-auto h-12 w-12 text-secondary-400 mb-4'
            fill='none'
            stroke='currentColor'
            viewBox='0 0 24 24'
          >
            <path
              strokeLinecap='round'
              strokeLinejoin='round'
              strokeWidth={2}
              d='M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7'
            />
          </svg>
          <h3 className='text-lg font-medium text-secondary-900 mb-2'>
            No Roadmaps Yet
          </h3>
          <p className='text-secondary-600 mb-6'>
            Generate personalized learning roadmaps for opportunities you're
            interested in.
          </p>
          {onGenerateRoadmap && (
            <Button onClick={() => onGenerateRoadmap('sample-opportunity')}>
              Generate Your First Roadmap
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4'>
        <div>
          <h2 className='text-2xl font-bold text-secondary-900'>
            AI Learning Roadmaps
          </h2>
          <p className='text-secondary-600'>
            Personalized preparation paths for your target opportunities
          </p>
        </div>

        {onGenerateRoadmap && (
          <Button onClick={() => onGenerateRoadmap('new-opportunity')}>
            Generate New Roadmap
          </Button>
        )}
      </div>

      {/* Roadmap Selector */}
      {roadmaps.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Your Roadmaps</CardTitle>
          </CardHeader>
          <CardContent>
            <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3'>
              {roadmaps.map(roadmapResponse => {
                const { roadmap } = roadmapResponse;
                const isSelected = roadmap.id === selectedRoadmapId;
                const totalTasks = roadmap.phases.reduce(
                  (sum, phase) => sum + phase.tasks.length,
                  0
                );
                const completedTasks = roadmap.phases.reduce(
                  (sum, phase) =>
                    sum + phase.tasks.filter(task => task.completed).length,
                  0
                );
                const progress =
                  totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

                return (
                  <button
                    key={roadmap.id}
                    onClick={() => setSelectedRoadmapId(roadmap.id)}
                    className={cn(
                      'p-4 rounded-lg border-2 text-left transition-all',
                      isSelected
                        ? 'border-primary-500 bg-primary-50'
                        : 'border-secondary-200 hover:border-secondary-300'
                    )}
                  >
                    <h3 className='font-medium text-secondary-900 mb-1'>
                      {roadmap.title}
                    </h3>
                    <p className='text-sm text-secondary-600 mb-2 line-clamp-2'>
                      {roadmap.description}
                    </p>
                    <div className='flex items-center justify-between text-xs'>
                      <span className='text-secondary-600'>
                        {roadmap.phases.length} phases
                      </span>
                      <span className='font-medium text-primary-600'>
                        {Math.round(progress)}% complete
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {selectedRoadmap && (
        <>
          {/* View Mode Selector */}
          <div className='flex space-x-1 bg-secondary-100 p-1 rounded-lg w-fit'>
            {[
              { key: 'overview', label: 'Overview', icon: <BarChart3 className="h-4 w-4" /> },
              { key: 'phases', label: 'Phases', icon: <ClipboardList className="h-4 w-4" /> },
              { key: 'progress', label: 'Progress', icon: <TrendingUp className="h-4 w-4" /> },
            ].map(({ key, label, icon }) => (
              <button
                key={key}
                onClick={() => setViewMode(key as any)}
                className={cn(
                  'px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2',
                  viewMode === key
                    ? 'bg-white text-primary-600 shadow-sm'
                    : 'text-secondary-600 hover:text-secondary-900'
                )}
              >
                <span>{icon}</span>
                {label}
              </button>
            ))}
          </div>

          {/* Content based on view mode */}
          {viewMode === 'overview' && (
            <div className='grid grid-cols-1 lg:grid-cols-3 gap-6'>
              {/* Roadmap Overview */}
              <div className='lg:col-span-2 space-y-6'>
                <Card>
                  <CardHeader>
                    <CardTitle>{selectedRoadmap.roadmap.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className='text-secondary-600 mb-4'>
                      {selectedRoadmap.roadmap.description}
                    </p>

                    <div className='grid grid-cols-2 md:grid-cols-4 gap-4 mb-6'>
                      <div className='text-center'>
                        <div className='text-2xl font-bold text-primary-600'>
                          {selectedRoadmap.roadmap.phases.length}
                        </div>
                        <div className='text-sm text-secondary-600'>Phases</div>
                      </div>
                      <div className='text-center'>
                        <div className='text-2xl font-bold text-primary-600'>
                          {selectedRoadmap.roadmap.estimatedDuration}
                        </div>
                        <div className='text-sm text-secondary-600'>Days</div>
                      </div>
                      <div className='text-center'>
                        <div className='text-2xl font-bold text-primary-600'>
                          {selectedRoadmap.roadmap.resources.length}
                        </div>
                        <div className='text-sm text-secondary-600'>
                          Resources
                        </div>
                      </div>
                      <div className='text-center'>
                        <div className='text-2xl font-bold text-primary-600'>
                          {selectedRoadmap.roadmap.milestones.length}
                        </div>
                        <div className='text-sm text-secondary-600'>
                          Milestones
                        </div>
                      </div>
                    </div>

                    {/* Personalized Tips */}
                    {selectedRoadmap.personalizedTips.length > 0 && (
                      <div className='bg-blue-50 border border-blue-200 rounded-lg p-4'>
                        <h4 className='font-medium text-blue-900 mb-2 flex items-center gap-2'>
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
                              d='M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z'
                            />
                          </svg>
                          Personalized Tips
                        </h4>
                        <ul className='space-y-1 text-sm text-blue-800'>
                          {selectedRoadmap.personalizedTips.map(
                            (tip, index) => (
                              <li
                                key={index}
                                className='flex items-start gap-2'
                              >
                                <span className='text-blue-500 mt-0.5'>•</span>
                                {tip}
                              </li>
                            )
                          )}
                        </ul>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Current Phase */}
                {(() => {
                  const currentPhase = getCurrentPhase(
                    selectedRoadmap.roadmap.phases
                  );
                  if (currentPhase) {
                    return (
                      <Card>
                        <CardHeader>
                          <CardTitle className='flex items-center gap-2'>
                            <Badge variant='info'>Current Phase</Badge>
                            {currentPhase.title}
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <RoadmapCard
                            phase={currentPhase}
                            isActive={true}
                            onStartPhase={handleStartPhase}
                            onViewDetails={handleViewPhaseDetails}
                          />
                        </CardContent>
                      </Card>
                    );
                  }
                  return null;
                })()}
              </div>

              {/* Sidebar */}
              <div className='space-y-6'>
                <ProgressTracker
                  phases={selectedRoadmap.roadmap.phases}
                  milestones={selectedRoadmap.roadmap.milestones}
                  currentPhaseId={
                    getCurrentPhase(selectedRoadmap.roadmap.phases)?.id
                  }
                />
              </div>
            </div>
          )}

          {viewMode === 'phases' && (
            <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
              {selectedRoadmap.roadmap.phases.map(phase => {
                const isCompleted = phase.tasks.every(task => task.completed);
                const currentPhase = getCurrentPhase(
                  selectedRoadmap.roadmap.phases
                );
                const isActive = phase.id === currentPhase?.id;

                return (
                  <RoadmapCard
                    key={phase.id}
                    phase={phase}
                    isActive={isActive}
                    isCompleted={isCompleted}
                    onStartPhase={handleStartPhase}
                    onViewDetails={handleViewPhaseDetails}
                  />
                );
              })}
            </div>
          )}

          {viewMode === 'progress' && (
            <div className='max-w-4xl'>
              <ProgressTracker
                phases={selectedRoadmap.roadmap.phases}
                milestones={selectedRoadmap.roadmap.milestones}
                currentPhaseId={
                  getCurrentPhase(selectedRoadmap.roadmap.phases)?.id
                }
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}
