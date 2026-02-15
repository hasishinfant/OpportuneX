'use client';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { cn } from '@/lib/utils';
import { Briefcase, Monitor, Target } from 'lucide-react';
import { useCallback, useState } from 'react';

interface UserProfile {
  id: string;
  email: string;
  name: string;
  phone?: string;
  location: {
    city: string;
    state: string;
    tier: 2 | 3;
  };
  academic: {
    institution: string;
    degree: string;
    year: number;
    cgpa?: number;
  };
  skills: {
    technical: string[];
    domains: string[];
    proficiencyLevel: 'beginner' | 'intermediate' | 'advanced';
  };
  preferences: {
    opportunityTypes: Array<'hackathon' | 'internship' | 'workshop'>;
    preferredMode: 'online' | 'offline' | 'hybrid' | 'any';
    maxDistance?: number;
    notifications: {
      email: boolean;
      sms: boolean;
      inApp: boolean;
      frequency: 'immediate' | 'daily' | 'weekly';
      types: Array<'new_opportunities' | 'deadlines' | 'recommendations'>;
    };
  };
}

interface UserProfileFormProps {
  profile?: UserProfile;
  onSave: (profile: Partial<UserProfile>) => Promise<void>;
  loading?: boolean;
  className?: string;
}

const TECHNICAL_SKILLS = [
  'JavaScript',
  'Python',
  'Java',
  'C++',
  'React',
  'Node.js',
  'Angular',
  'Vue.js',
  'Machine Learning',
  'Data Science',
  'AI',
  'Blockchain',
  'DevOps',
  'Cloud Computing',
  'Mobile Development',
  'UI/UX Design',
  'Cybersecurity',
  'Game Development',
];

const DOMAINS = [
  'Web Development',
  'Mobile Development',
  'Data Science',
  'Machine Learning',
  'Artificial Intelligence',
  'Cybersecurity',
  'Cloud Computing',
  'DevOps',
  'UI/UX Design',
  'Game Development',
  'Blockchain',
  'IoT',
];

const INDIAN_STATES = [
  'Andhra Pradesh',
  'Arunachal Pradesh',
  'Assam',
  'Bihar',
  'Chhattisgarh',
  'Goa',
  'Gujarat',
  'Haryana',
  'Himachal Pradesh',
  'Jharkhand',
  'Karnataka',
  'Kerala',
  'Madhya Pradesh',
  'Maharashtra',
  'Manipur',
  'Meghalaya',
  'Mizoram',
  'Nagaland',
  'Odisha',
  'Punjab',
  'Rajasthan',
  'Sikkim',
  'Tamil Nadu',
  'Telangana',
  'Tripura',
  'Uttar Pradesh',
  'Uttarakhand',
  'West Bengal',
];

export function UserProfileForm({
  profile,
  onSave,
  loading = false,
  className,
}: UserProfileFormProps) {
  const [formData, setFormData] = useState<Partial<UserProfile>>(
    profile || {
      name: '',
      phone: '',
      location: { city: '', state: '', tier: 2 },
      academic: {
        institution: '',
        degree: '',
        year: new Date().getFullYear(),
        cgpa: undefined,
      },
      skills: { technical: [], domains: [], proficiencyLevel: 'beginner' },
      preferences: {
        opportunityTypes: [],
        preferredMode: 'any',
        maxDistance: undefined,
        notifications: {
          email: true,
          sms: false,
          inApp: true,
          frequency: 'daily',
          types: ['new_opportunities', 'deadlines'],
        },
      },
    }
  );

  const [skillInput, setSkillInput] = useState('');
  const [domainInput, setDomainInput] = useState('');

  const updateField = useCallback(
    <T extends keyof UserProfile>(
      field: T,
      value: UserProfile[T] | ((prev: UserProfile[T]) => UserProfile[T])
    ) => {
      setFormData(prev => ({
        ...prev,
        [field]:
          typeof value === 'function'
            ? value((prev[field] || {}) as UserProfile[T])
            : value,
      }));
    },
    []
  );

  const updateNestedField = useCallback(
    (field: keyof UserProfile, subField: string, value: any) => {
      setFormData(prev => ({
        ...prev,
        [field]: {
          ...(prev[field] as any),
          [subField]: value,
        },
      }));
    },
    []
  );

  const addSkill = useCallback(
    (skill: string) => {
      if (skill && !formData.skills?.technical.includes(skill)) {
        updateNestedField('skills', 'technical', [
          ...(formData.skills?.technical || []),
          skill,
        ]);
      }
      setSkillInput('');
    },
    [formData.skills?.technical, updateNestedField]
  );

  const removeSkill = useCallback(
    (skill: string) => {
      updateNestedField(
        'skills',
        'technical',
        formData.skills?.technical.filter(s => s !== skill) || []
      );
    },
    [formData.skills?.technical, updateNestedField]
  );

  const addDomain = useCallback(
    (domain: string) => {
      if (domain && !formData.skills?.domains.includes(domain)) {
        updateNestedField('skills', 'domains', [
          ...(formData.skills?.domains || []),
          domain,
        ]);
      }
      setDomainInput('');
    },
    [formData.skills?.domains, updateNestedField]
  );

  const removeDomain = useCallback(
    (domain: string) => {
      updateNestedField(
        'skills',
        'domains',
        formData.skills?.domains.filter(d => d !== domain) || []
      );
    },
    [formData.skills?.domains, updateNestedField]
  );

  const toggleOpportunityType = useCallback(
    (type: 'hackathon' | 'internship' | 'workshop') => {
      const current = formData.preferences?.opportunityTypes || [];
      const updated = current.includes(type)
        ? current.filter(t => t !== type)
        : [...current, type];
      updateNestedField('preferences', 'opportunityTypes', updated);
    },
    [formData.preferences?.opportunityTypes, updateNestedField]
  );

  const toggleNotificationType = useCallback(
    (type: 'new_opportunities' | 'deadlines' | 'recommendations') => {
      const current = formData.preferences?.notifications?.types || [];
      const updated = current.includes(type)
        ? current.filter(t => t !== type)
        : [...current, type];
      updateNestedField('preferences', 'notifications', {
        email: formData.preferences?.notifications?.email || false,
        sms: formData.preferences?.notifications?.sms || false,
        inApp: formData.preferences?.notifications?.inApp || true,
        frequency: formData.preferences?.notifications?.frequency || 'daily',
        types: updated,
      });
    },
    [formData.preferences?.notifications, updateNestedField]
  );

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      await onSave(formData);
    },
    [formData, onSave]
  );

  return (
    <form onSubmit={handleSubmit} className={cn('space-y-6', className)}>
      {/* Personal Information */}
      <Card>
        <CardHeader>
          <CardTitle>Personal Information</CardTitle>
        </CardHeader>
        <CardContent className='space-y-4'>
          <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
            <Input
              label='Full Name'
              value={formData.name || ''}
              onChange={e => updateField('name', e.target.value)}
              placeholder='Enter your full name'
              required
            />
            <Input
              label='Phone Number'
              type='tel'
              value={formData.phone || ''}
              onChange={e => updateField('phone', e.target.value)}
              placeholder='+91 9876543210'
            />
          </div>

          <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
            <Input
              label='City'
              value={formData.location?.city || ''}
              onChange={e =>
                updateNestedField('location', 'city', e.target.value)
              }
              placeholder='Enter your city'
              required
            />
            <div>
              <label className='block text-sm font-medium text-secondary-700 mb-1'>
                State
              </label>
              <select
                value={formData.location?.state || ''}
                onChange={e =>
                  updateNestedField('location', 'state', e.target.value)
                }
                className='w-full h-10 border border-secondary-300 rounded-md px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-primary-500'
                required
              >
                <option value=''>Select State</option>
                {INDIAN_STATES.map(state => (
                  <option key={state} value={state}>
                    {state}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className='block text-sm font-medium text-secondary-700 mb-1'>
                City Tier
              </label>
              <select
                value={formData.location?.tier || 2}
                onChange={e =>
                  updateNestedField(
                    'location',
                    'tier',
                    parseInt(e.target.value) as 2 | 3
                  )
                }
                className='w-full h-10 border border-secondary-300 rounded-md px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-primary-500'
              >
                <option value={2}>Tier 2</option>
                <option value={3}>Tier 3</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Academic Information */}
      <Card>
        <CardHeader>
          <CardTitle>Academic Information</CardTitle>
        </CardHeader>
        <CardContent className='space-y-4'>
          <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
            <Input
              label='Institution'
              value={formData.academic?.institution || ''}
              onChange={e =>
                updateNestedField('academic', 'institution', e.target.value)
              }
              placeholder='Your college/university name'
              required
            />
            <Input
              label='Degree'
              value={formData.academic?.degree || ''}
              onChange={e =>
                updateNestedField('academic', 'degree', e.target.value)
              }
              placeholder='B.Tech Computer Science'
              required
            />
          </div>

          <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
            <Input
              label='Current Year'
              type='number'
              min='1'
              max='6'
              value={formData.academic?.year || new Date().getFullYear()}
              onChange={e =>
                updateNestedField('academic', 'year', parseInt(e.target.value))
              }
              required
            />
            <Input
              label='CGPA (Optional)'
              type='number'
              min='0'
              max='10'
              step='0.01'
              value={formData.academic?.cgpa || ''}
              onChange={e =>
                updateNestedField(
                  'academic',
                  'cgpa',
                  e.target.value ? parseFloat(e.target.value) : undefined
                )
              }
              placeholder='8.5'
            />
          </div>
        </CardContent>
      </Card>

      {/* Skills & Expertise */}
      <Card>
        <CardHeader>
          <CardTitle>Skills & Expertise</CardTitle>
        </CardHeader>
        <CardContent className='space-y-6'>
          {/* Proficiency Level */}
          <div>
            <label className='block text-sm font-medium text-secondary-700 mb-3'>
              Overall Proficiency Level
            </label>
            <div className='grid grid-cols-3 gap-2'>
              {(['beginner', 'intermediate', 'advanced'] as const).map(
                level => (
                  <button
                    key={level}
                    type='button'
                    onClick={() =>
                      updateNestedField('skills', 'proficiencyLevel', level)
                    }
                    className={cn(
                      'p-3 rounded-lg border-2 transition-colors text-sm capitalize',
                      formData.skills?.proficiencyLevel === level
                        ? 'border-primary-500 bg-primary-50 text-primary-700'
                        : 'border-secondary-200 hover:border-secondary-300 text-secondary-600'
                    )}
                  >
                    {level}
                  </button>
                )
              )}
            </div>
          </div>

          {/* Technical Skills */}
          <div>
            <label className='block text-sm font-medium text-secondary-700 mb-3'>
              Technical Skills
            </label>

            <div className='flex space-x-2 mb-3'>
              <Input
                placeholder='Add a technical skill...'
                value={skillInput}
                onChange={e => setSkillInput(e.target.value)}
                onKeyDown={e =>
                  e.key === 'Enter' &&
                  (e.preventDefault(), addSkill(skillInput.trim()))
                }
                className='flex-1'
              />
              <Button
                type='button'
                onClick={() => addSkill(skillInput.trim())}
                disabled={!skillInput.trim()}
                size='sm'
              >
                Add
              </Button>
            </div>

            {formData.skills?.technical &&
              formData.skills.technical.length > 0 && (
                <div className='flex flex-wrap gap-2 mb-3'>
                  {formData.skills.technical.map(skill => (
                    <Badge
                      key={skill}
                      variant='secondary'
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

            <div>
              <p className='text-xs text-secondary-600 mb-2'>Popular skills:</p>
              <div className='flex flex-wrap gap-1'>
                {TECHNICAL_SKILLS.filter(
                  skill => !formData.skills?.technical.includes(skill)
                )
                  .slice(0, 10)
                  .map(skill => (
                    <button
                      key={skill}
                      type='button'
                      onClick={() => addSkill(skill)}
                      className='px-2 py-1 text-xs bg-secondary-100 hover:bg-secondary-200 text-secondary-700 rounded transition-colors'
                    >
                      {skill}
                    </button>
                  ))}
              </div>
            </div>
          </div>

          {/* Domains */}
          <div>
            <label className='block text-sm font-medium text-secondary-700 mb-3'>
              Interest Domains
            </label>

            <div className='flex space-x-2 mb-3'>
              <Input
                placeholder='Add an interest domain...'
                value={domainInput}
                onChange={e => setDomainInput(e.target.value)}
                onKeyDown={e =>
                  e.key === 'Enter' &&
                  (e.preventDefault(), addDomain(domainInput.trim()))
                }
                className='flex-1'
              />
              <Button
                type='button'
                onClick={() => addDomain(domainInput.trim())}
                disabled={!domainInput.trim()}
                size='sm'
              >
                Add
              </Button>
            </div>

            {formData.skills?.domains && formData.skills.domains.length > 0 && (
              <div className='flex flex-wrap gap-2 mb-3'>
                {formData.skills.domains.map(domain => (
                  <Badge
                    key={domain}
                    variant='secondary'
                    className='cursor-pointer hover:bg-secondary-200'
                    onClick={() => removeDomain(domain)}
                  >
                    {domain}
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

            <div>
              <p className='text-xs text-secondary-600 mb-2'>
                Popular domains:
              </p>
              <div className='flex flex-wrap gap-1'>
                {DOMAINS.filter(
                  domain => !formData.skills?.domains.includes(domain)
                )
                  .slice(0, 8)
                  .map(domain => (
                    <button
                      key={domain}
                      type='button'
                      onClick={() => addDomain(domain)}
                      className='px-2 py-1 text-xs bg-secondary-100 hover:bg-secondary-200 text-secondary-700 rounded transition-colors'
                    >
                      {domain}
                    </button>
                  ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Preferences */}
      <Card>
        <CardHeader>
          <CardTitle>Preferences</CardTitle>
        </CardHeader>
        <CardContent className='space-y-6'>
          {/* Opportunity Types */}
          <div>
            <label className='block text-sm font-medium text-secondary-700 mb-3'>
              Interested Opportunity Types
            </label>
            <div className='grid grid-cols-3 gap-2'>
              {[
                {
                  value: 'hackathon',
                  label: 'Hackathons',
                  icon: <Monitor className='h-5 w-5' />,
                },
                {
                  value: 'internship',
                  label: 'Internships',
                  icon: <Briefcase className='h-5 w-5' />,
                },
                {
                  value: 'workshop',
                  label: 'Workshops',
                  icon: <Target className='h-5 w-5' />,
                },
              ].map(({ value, label, icon }) => (
                <button
                  key={value}
                  type='button'
                  onClick={() => toggleOpportunityType(value as any)}
                  className={cn(
                    'flex flex-col items-center p-3 rounded-lg border-2 transition-colors text-sm',
                    formData.preferences?.opportunityTypes.includes(
                      value as any
                    )
                      ? 'border-primary-500 bg-primary-50 text-primary-700'
                      : 'border-secondary-200 hover:border-secondary-300 text-secondary-600'
                  )}
                >
                  <span className='mb-1'>{icon}</span>
                  <span>{label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Preferred Mode */}
          <div>
            <label className='block text-sm font-medium text-secondary-700 mb-3'>
              Preferred Mode
            </label>
            <select
              value={formData.preferences?.preferredMode || 'any'}
              onChange={e =>
                updateNestedField(
                  'preferences',
                  'preferredMode',
                  e.target.value as any
                )
              }
              className='w-full h-10 border border-secondary-300 rounded-md px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-primary-500'
            >
              <option value='any'>Any</option>
              <option value='online'>Online</option>
              <option value='offline'>Offline</option>
              <option value='hybrid'>Hybrid</option>
            </select>
          </div>

          {/* Notification Preferences */}
          <div>
            <label className='block text-sm font-medium text-secondary-700 mb-3'>
              Notification Preferences
            </label>

            <div className='space-y-4'>
              <div>
                <p className='text-sm text-secondary-600 mb-2'>
                  Notification Channels:
                </p>
                <div className='space-y-2'>
                  {[
                    { key: 'email', label: 'Email notifications' },
                    { key: 'sms', label: 'SMS notifications' },
                    { key: 'inApp', label: 'In-app notifications' },
                  ].map(({ key, label }) => (
                    <label key={key} className='flex items-center'>
                      <input
                        type='checkbox'
                        checked={Boolean(
                          formData.preferences?.notifications?.[
                            key as keyof typeof formData.preferences.notifications
                          ]
                        )}
                        onChange={e =>
                          updateNestedField('preferences', 'notifications', {
                            email:
                              formData.preferences?.notifications?.email ||
                              false,
                            sms:
                              formData.preferences?.notifications?.sms || false,
                            inApp:
                              formData.preferences?.notifications?.inApp ||
                              true,
                            frequency:
                              formData.preferences?.notifications?.frequency ||
                              'daily',
                            types:
                              formData.preferences?.notifications?.types || [],
                            [key]: e.target.checked,
                          })
                        }
                        className='mr-2 h-4 w-4 text-primary-600 focus:ring-primary-500 border-secondary-300 rounded'
                      />
                      <span className='text-sm text-secondary-700'>
                        {label}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <p className='text-sm text-secondary-600 mb-2'>Frequency:</p>
                <select
                  value={
                    formData.preferences?.notifications?.frequency || 'daily'
                  }
                  onChange={e =>
                    updateNestedField('preferences', 'notifications', {
                      email:
                        formData.preferences?.notifications?.email || false,
                      sms: formData.preferences?.notifications?.sms || false,
                      inApp: formData.preferences?.notifications?.inApp || true,
                      frequency: e.target.value as
                        | 'immediate'
                        | 'daily'
                        | 'weekly',
                      types: formData.preferences?.notifications?.types || [],
                    })
                  }
                  className='w-full h-10 border border-secondary-300 rounded-md px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-primary-500'
                >
                  <option value='immediate'>Immediate</option>
                  <option value='daily'>Daily digest</option>
                  <option value='weekly'>Weekly digest</option>
                </select>
              </div>

              <div>
                <p className='text-sm text-secondary-600 mb-2'>
                  Notification Types:
                </p>
                <div className='space-y-2'>
                  {[
                    {
                      key: 'new_opportunities',
                      label: 'New opportunities matching your profile',
                    },
                    {
                      key: 'deadlines',
                      label: 'Application deadline reminders',
                    },
                    {
                      key: 'recommendations',
                      label: 'Personalized recommendations',
                    },
                  ].map(({ key, label }) => (
                    <label key={key} className='flex items-center'>
                      <input
                        type='checkbox'
                        checked={
                          formData.preferences?.notifications?.types?.includes(
                            key as any
                          ) || false
                        }
                        onChange={() => toggleNotificationType(key as any)}
                        className='mr-2 h-4 w-4 text-primary-600 focus:ring-primary-500 border-secondary-300 rounded'
                      />
                      <span className='text-sm text-secondary-700'>
                        {label}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Submit Button */}
      <div className='flex justify-end'>
        <Button type='submit' disabled={loading} size='lg'>
          {loading ? (
            <>
              <LoadingSpinner size='sm' color='white' />
              <span className='ml-2'>Saving...</span>
            </>
          ) : (
            'Save Profile'
          )}
        </Button>
      </div>
    </form>
  );
}
