'use client';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { cn } from '@/lib/utils';
import { useCallback, useState } from 'react';

interface SearchFilters {
  skills?: string[];
  organizerType?: 'corporate' | 'startup' | 'government' | 'academic';
  mode?: 'online' | 'offline' | 'hybrid';
  location?: string;
  type?: 'hackathon' | 'internship' | 'workshop';
  deadline?: 'week' | 'month' | 'quarter' | 'any';
  experience?: 'beginner' | 'intermediate' | 'advanced' | 'any';
  stipend?: 'paid' | 'unpaid' | 'any';
}

interface SearchFiltersProps {
  filters: SearchFilters;
  onFiltersChange: (filters: SearchFilters) => void;
  onClearFilters: () => void;
  className?: string;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

const POPULAR_SKILLS = [
  'JavaScript',
  'Python',
  'React',
  'Node.js',
  'Java',
  'C++',
  'Machine Learning',
  'Data Science',
  'UI/UX Design',
  'Mobile Development',
  'DevOps',
  'Blockchain',
  'AI',
  'Cloud Computing',
  'Cybersecurity',
  'Game Development',
];

const ORGANIZER_TYPES = [
  { value: 'corporate', label: 'Corporate', icon: '🏢' },
  { value: 'startup', label: 'Startup', icon: '🚀' },
  { value: 'government', label: 'Government', icon: '🏛️' },
  { value: 'academic', label: 'Academic', icon: '🎓' },
] as const;

const OPPORTUNITY_TYPES = [
  { value: 'hackathon', label: 'Hackathons', icon: '💻' },
  { value: 'internship', label: 'Internships', icon: '💼' },
  { value: 'workshop', label: 'Workshops', icon: '🎯' },
] as const;

const MODES = [
  { value: 'online', label: 'Online', icon: '💻' },
  { value: 'offline', label: 'Offline', icon: '🏢' },
  { value: 'hybrid', label: 'Hybrid', icon: '🔄' },
] as const;

export function SearchFilters({
  filters,
  onFiltersChange,
  onClearFilters,
  className,
  isCollapsed = false,
  onToggleCollapse,
}: SearchFiltersProps) {
  const [skillInput, setSkillInput] = useState('');
  const [locationInput, setLocationInput] = useState(filters.location || '');

  const updateFilter = useCallback(
    <K extends keyof SearchFilters>(key: K, value: SearchFilters[K]) => {
      onFiltersChange({ ...filters, [key]: value });
    },
    [filters, onFiltersChange]
  );

  const addSkill = useCallback(
    (skill: string) => {
      const currentSkills = filters.skills || [];
      if (!currentSkills.includes(skill)) {
        updateFilter('skills', [...currentSkills, skill]);
      }
      setSkillInput('');
    },
    [filters.skills, updateFilter]
  );

  const removeSkill = useCallback(
    (skill: string) => {
      const currentSkills = filters.skills || [];
      updateFilter(
        'skills',
        currentSkills.filter(s => s !== skill)
      );
    },
    [filters.skills, updateFilter]
  );

  const handleSkillInputKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && skillInput.trim()) {
        e.preventDefault();
        addSkill(skillInput.trim());
      }
    },
    [skillInput, addSkill]
  );

  const handleLocationSubmit = useCallback(() => {
    updateFilter('location', locationInput.trim() || undefined);
  }, [locationInput, updateFilter]);

  const getActiveFiltersCount = () => {
    let count = 0;
    if (filters.skills?.length) count++;
    if (filters.organizerType) count++;
    if (filters.mode) count++;
    if (filters.location) count++;
    if (filters.type) count++;
    if (filters.deadline && filters.deadline !== 'any') count++;
    if (filters.experience && filters.experience !== 'any') count++;
    if (filters.stipend && filters.stipend !== 'any') count++;
    return count;
  };

  const activeFiltersCount = getActiveFiltersCount();

  if (isCollapsed) {
    return (
      <div
        className={cn(
          'flex items-center justify-between p-4 bg-white border border-secondary-200 rounded-lg',
          className
        )}
      >
        <div className='flex items-center space-x-4'>
          <Button
            variant='outline'
            size='sm'
            onClick={onToggleCollapse}
            className='flex items-center space-x-2'
          >
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
                d='M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z'
              />
            </svg>
            <span>Filters</span>
            {activeFiltersCount > 0 && (
              <Badge variant='info' size='sm'>
                {activeFiltersCount}
              </Badge>
            )}
          </Button>

          {activeFiltersCount > 0 && (
            <Button
              variant='ghost'
              size='sm'
              onClick={onClearFilters}
              className='text-secondary-600 hover:text-secondary-900'
            >
              Clear all
            </Button>
          )}
        </div>

        {/* Active Filters Preview */}
        {activeFiltersCount > 0 && (
          <div className='flex items-center space-x-2 flex-1 ml-4 overflow-x-auto'>
            {filters.type && (
              <Badge variant='secondary' size='sm'>
                {filters.type}
              </Badge>
            )}
            {filters.mode && (
              <Badge variant='secondary' size='sm'>
                {filters.mode}
              </Badge>
            )}
            {filters.organizerType && (
              <Badge variant='secondary' size='sm'>
                {filters.organizerType}
              </Badge>
            )}
            {filters.skills?.slice(0, 2).map(skill => (
              <Badge key={skill} variant='secondary' size='sm'>
                {skill}
              </Badge>
            ))}
            {(filters.skills?.length || 0) > 2 && (
              <Badge variant='secondary' size='sm'>
                +{(filters.skills?.length || 0) - 2} more
              </Badge>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <Card className={cn('', className)}>
      <CardHeader className='pb-4'>
        <div className='flex items-center justify-between'>
          <CardTitle className='text-lg'>Filters</CardTitle>
          <div className='flex items-center space-x-2'>
            {activeFiltersCount > 0 && (
              <Button
                variant='ghost'
                size='sm'
                onClick={onClearFilters}
                className='text-secondary-600 hover:text-secondary-900'
              >
                Clear all ({activeFiltersCount})
              </Button>
            )}
            {onToggleCollapse && (
              <Button
                variant='ghost'
                size='sm'
                onClick={onToggleCollapse}
                className='p-2'
                aria-label='Collapse filters'
              >
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
                    d='M6 18L18 6M6 6l12 12'
                  />
                </svg>
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className='space-y-6'>
        {/* Opportunity Type */}
        <div>
          <h4 className='text-sm font-medium text-secondary-900 mb-3'>
            Opportunity Type
          </h4>
          <div className='grid grid-cols-3 gap-2'>
            {OPPORTUNITY_TYPES.map(({ value, label, icon }) => (
              <button
                key={value}
                onClick={() =>
                  updateFilter(
                    'type',
                    filters.type === value ? undefined : value
                  )
                }
                className={cn(
                  'flex flex-col items-center p-3 rounded-lg border-2 transition-colors text-sm',
                  filters.type === value
                    ? 'border-primary-500 bg-primary-50 text-primary-700'
                    : 'border-secondary-200 hover:border-secondary-300 text-secondary-600'
                )}
              >
                <span className='text-lg mb-1'>{icon}</span>
                <span>{label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Mode */}
        <div>
          <h4 className='text-sm font-medium text-secondary-900 mb-3'>Mode</h4>
          <div className='grid grid-cols-3 gap-2'>
            {MODES.map(({ value, label, icon }) => (
              <button
                key={value}
                onClick={() =>
                  updateFilter(
                    'mode',
                    filters.mode === value ? undefined : value
                  )
                }
                className={cn(
                  'flex flex-col items-center p-3 rounded-lg border-2 transition-colors text-sm',
                  filters.mode === value
                    ? 'border-primary-500 bg-primary-50 text-primary-700'
                    : 'border-secondary-200 hover:border-secondary-300 text-secondary-600'
                )}
              >
                <span className='text-lg mb-1'>{icon}</span>
                <span>{label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Organizer Type */}
        <div>
          <h4 className='text-sm font-medium text-secondary-900 mb-3'>
            Organizer
          </h4>
          <div className='grid grid-cols-2 gap-2'>
            {ORGANIZER_TYPES.map(({ value, label, icon }) => (
              <button
                key={value}
                onClick={() =>
                  updateFilter(
                    'organizerType',
                    filters.organizerType === value ? undefined : value
                  )
                }
                className={cn(
                  'flex items-center p-3 rounded-lg border-2 transition-colors text-sm',
                  filters.organizerType === value
                    ? 'border-primary-500 bg-primary-50 text-primary-700'
                    : 'border-secondary-200 hover:border-secondary-300 text-secondary-600'
                )}
              >
                <span className='text-lg mr-2'>{icon}</span>
                <span>{label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Skills */}
        <div>
          <h4 className='text-sm font-medium text-secondary-900 mb-3'>
            Skills
          </h4>

          {/* Skill Input */}
          <div className='flex space-x-2 mb-3'>
            <Input
              placeholder='Add a skill...'
              value={skillInput}
              onChange={e => setSkillInput(e.target.value)}
              onKeyDown={handleSkillInputKeyDown}
              className='flex-1'
            />
            <Button
              onClick={() => skillInput.trim() && addSkill(skillInput.trim())}
              disabled={!skillInput.trim()}
              size='sm'
            >
              Add
            </Button>
          </div>

          {/* Selected Skills */}
          {filters.skills && filters.skills.length > 0 && (
            <div className='flex flex-wrap gap-2 mb-3'>
              {filters.skills.map(skill => (
                <Badge
                  key={skill}
                  variant='info'
                  className='cursor-pointer hover:bg-primary-200'
                  onClick={() => removeSkill(skill)}
                >
                  {skill}
                  <svg
                    className='ml-1 h-3 w-3'
                    fill='none'
                    stroke='currentColor'
                    viewBox='0 0 24 24'
                  >
                    <path
                      strokeLinecap='round'
                      strokeLinejoin='round'
                      strokeWidth={2}
                      d='M6 18L18 6M6 6l12 12'
                    />
                  </svg>
                </Badge>
              ))}
            </div>
          )}

          {/* Popular Skills */}
          <div>
            <p className='text-xs text-secondary-600 mb-2'>Popular skills:</p>
            <div className='flex flex-wrap gap-1'>
              {POPULAR_SKILLS.filter(skill => !filters.skills?.includes(skill))
                .slice(0, 8)
                .map(skill => (
                  <button
                    key={skill}
                    onClick={() => addSkill(skill)}
                    className='px-2 py-1 text-xs bg-secondary-100 hover:bg-secondary-200 text-secondary-700 rounded transition-colors'
                  >
                    {skill}
                  </button>
                ))}
            </div>
          </div>
        </div>

        {/* Location */}
        <div>
          <h4 className='text-sm font-medium text-secondary-900 mb-3'>
            Location
          </h4>
          <div className='flex space-x-2'>
            <Input
              placeholder='Enter city or state...'
              value={locationInput}
              onChange={e => setLocationInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleLocationSubmit()}
              className='flex-1'
            />
            <Button onClick={handleLocationSubmit} size='sm'>
              Apply
            </Button>
          </div>
          {filters.location && (
            <div className='mt-2'>
              <Badge
                variant='info'
                className='cursor-pointer hover:bg-primary-200'
                onClick={() => {
                  updateFilter('location', undefined);
                  setLocationInput('');
                }}
              >
                {filters.location}
                <svg
                  className='ml-1 h-3 w-3'
                  fill='none'
                  stroke='currentColor'
                  viewBox='0 0 24 24'
                >
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth={2}
                    d='M6 18L18 6M6 6l12 12'
                  />
                </svg>
              </Badge>
            </div>
          )}
        </div>

        {/* Deadline */}
        <div>
          <h4 className='text-sm font-medium text-secondary-900 mb-3'>
            Application Deadline
          </h4>
          <select
            value={filters.deadline || 'any'}
            onChange={e =>
              updateFilter(
                'deadline',
                e.target.value === 'any' ? undefined : (e.target.value as any)
              )
            }
            className='w-full border border-secondary-300 rounded-md px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-primary-500'
          >
            <option value='any'>Any time</option>
            <option value='week'>Within a week</option>
            <option value='month'>Within a month</option>
            <option value='quarter'>Within 3 months</option>
          </select>
        </div>

        {/* Experience Level */}
        <div>
          <h4 className='text-sm font-medium text-secondary-900 mb-3'>
            Experience Level
          </h4>
          <select
            value={filters.experience || 'any'}
            onChange={e =>
              updateFilter(
                'experience',
                e.target.value === 'any' ? undefined : (e.target.value as any)
              )
            }
            className='w-full border border-secondary-300 rounded-md px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-primary-500'
          >
            <option value='any'>Any level</option>
            <option value='beginner'>Beginner</option>
            <option value='intermediate'>Intermediate</option>
            <option value='advanced'>Advanced</option>
          </select>
        </div>

        {/* Stipend */}
        <div>
          <h4 className='text-sm font-medium text-secondary-900 mb-3'>
            Compensation
          </h4>
          <select
            value={filters.stipend || 'any'}
            onChange={e =>
              updateFilter(
                'stipend',
                e.target.value === 'any' ? undefined : (e.target.value as any)
              )
            }
            className='w-full border border-secondary-300 rounded-md px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-primary-500'
          >
            <option value='any'>Any</option>
            <option value='paid'>Paid only</option>
            <option value='unpaid'>Unpaid/Volunteer</option>
          </select>
        </div>
      </CardContent>
    </Card>
  );
}
