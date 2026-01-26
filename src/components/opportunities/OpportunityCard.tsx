'use client';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardFooter } from '@/components/ui/Card';
import { cn } from '@/lib/utils';
import {
    Building,
    ExternalLink,
    GraduationCap,
    Heart,
    Map,
    MapPin,
    Monitor,
    Rocket,
    RotateCcw
} from 'lucide-react';
import { useState } from 'react';

interface BackendOpportunity {
  _id: string;
  title: string;
  description: string;
  category: 'hackathon' | 'internship' | 'workshop' | 'quiz';
  platform: string;
  skills_required: string[];
  organizer_type: 'company' | 'startup' | 'college';
  mode: 'online' | 'offline' | 'hybrid';
  location: {
    city: string;
    state: string;
    country: string;
  };
  start_date: string;
  deadline: string;
  official_link: string;
  tags: string[];
}

interface OpportunityCardProps {
  opportunity: BackendOpportunity;
  onGuideMe?: (opportunityId: string) => void;
  onFavorite?: (id: string) => void;
  isFavorited?: boolean;
  className?: string;
  showFullDescription?: boolean;
}

export function OpportunityCard({
  opportunity,
  onGuideMe,
  onFavorite,
  isFavorited = false,
  className,
  showFullDescription = false,
}: OpportunityCardProps) {
  const [isExpanded, setIsExpanded] = useState(showFullDescription);
  const [isGeneratingRoadmap, setIsGeneratingRoadmap] = useState(false);

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'hackathon':
        return 'success';
      case 'internship':
        return 'info';
      case 'workshop':
        return 'warning';
      case 'quiz':
        return 'secondary';
      default:
        return 'default';
    }
  };

  const getModeIcon = (mode: string) => {
    switch (mode) {
      case 'online':
        return <Monitor className="h-4 w-4" />;
      case 'offline':
        return <Building className="h-4 w-4" />;
      case 'hybrid':
        return <RotateCcw className="h-4 w-4" />;
      default:
        return <MapPin className="h-4 w-4" />;
    }
  };

  const getOrganizerIcon = (type: string) => {
    switch (type) {
      case 'company':
        return <Building className="h-4 w-4" />;
      case 'startup':
        return <Rocket className="h-4 w-4" />;
      case 'college':
        return <GraduationCap className="h-4 w-4" />;
      default:
        return <Building className="h-4 w-4" />;
    }
  };

  const formatDeadline = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = date.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return 'Expired';
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Tomorrow';
    if (diffDays <= 7) return `${diffDays} days left`;
    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const isDeadlineSoon = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = date.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays <= 3 && diffDays >= 0;
  };

  const truncateDescription = (text: string, maxLength = 150) => {
    if (text.length <= maxLength) return text;
    return `${text.substring(0, maxLength)}...`;
  };

  const handleGuideMe = async () => {
    if (onGuideMe) {
      setIsGeneratingRoadmap(true);
      try {
        await onGuideMe(opportunity._id);
      } finally {
        setIsGeneratingRoadmap(false);
      }
    }
  };

  const locationString = `${opportunity.location.city}, ${opportunity.location.state}`;

  return (
    <Card
      className={cn(
        'hover:shadow-lg transition-shadow duration-200',
        className
      )}
      variant='outlined'
    >
      <CardContent className='p-6'>
        {/* Header */}
        <div className='flex items-start justify-between mb-4'>
          <div className='flex-1'>
            <div className='flex items-center gap-2 mb-2'>
              <Badge variant={getTypeColor(opportunity.category)} size='sm'>
                {opportunity.category}
              </Badge>
              {isDeadlineSoon(opportunity.deadline) && (
                <Badge variant='error' size='sm'>
                  Urgent
                </Badge>
              )}
            </div>
            <h3 className='text-lg font-semibold text-secondary-900 mb-1 line-clamp-2'>
              {opportunity.title}
            </h3>
            <div className='flex items-center text-sm text-secondary-600 mb-2'>
              <span className='mr-1'>
                {getOrganizerIcon(opportunity.organizer_type)}
              </span>
              <span>{opportunity.platform}</span>
              <span className='mx-2'>•</span>
              <span className='mr-1'>
                {getModeIcon(opportunity.mode)}
              </span>
              <span className='capitalize'>{opportunity.mode}</span>
              <span className='mx-2'>•</span>
              <span className="flex items-center">
                <MapPin className="h-4 w-4 mr-1" />
                {locationString}
              </span>
            </div>
          </div>

          {/* Favorite Button */}
          {onFavorite && (
            <Button
              variant='ghost'
              size='sm'
              onClick={() => onFavorite(opportunity._id)}
              className='p-2 h-8 w-8'
              aria-label={
                isFavorited ? 'Remove from favorites' : 'Add to favorites'
              }
            >
              <Heart
                className={cn(
                  'h-4 w-4',
                  isFavorited
                    ? 'text-red-500 fill-current'
                    : 'text-secondary-400'
                )}
                fill={isFavorited ? 'currentColor' : 'none'}
              />
            </Button>
          )}
        </div>

        {/* Description */}
        <div className='mb-4'>
          <p className='text-secondary-700 text-sm leading-relaxed'>
            {isExpanded
              ? opportunity.description
              : truncateDescription(opportunity.description)}
          </p>
          {opportunity.description.length > 150 && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className='text-primary-600 hover:text-primary-700 text-sm font-medium mt-1'
            >
              {isExpanded ? 'Show less' : 'Show more'}
            </button>
          )}
        </div>

        {/* Skills */}
        {opportunity.skills_required.length > 0 && (
          <div className='mb-4'>
            <p className='text-xs font-medium text-secondary-600 mb-2'>
              Required Skills:
            </p>
            <div className='flex flex-wrap gap-1'>
              {opportunity.skills_required.slice(0, 5).map(skill => (
                <Badge key={skill} variant='secondary' size='sm'>
                  {skill}
                </Badge>
              ))}
              {opportunity.skills_required.length > 5 && (
                <Badge variant='secondary' size='sm'>
                  +{opportunity.skills_required.length - 5} more
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* Start Date */}
        <div className='text-sm mb-2'>
          <span className='text-secondary-600'>Starts:</span>
          <span className='ml-1 font-medium'>
            {new Date(opportunity.start_date).toLocaleDateString('en-IN', {
              day: 'numeric',
              month: 'short',
              year: 'numeric'
            })}
          </span>
        </div>
      </CardContent>

      <CardFooter className='px-6 py-4 bg-secondary-50 flex items-center justify-between'>
        <div className='text-sm'>
          <span className='text-secondary-600'>Deadline:</span>
          <span
            className={cn(
              'ml-1 font-medium',
              isDeadlineSoon(opportunity.deadline)
                ? 'text-red-600'
                : 'text-secondary-900'
            )}
          >
            {formatDeadline(opportunity.deadline)}
          </span>
        </div>

        <div className='flex items-center space-x-2'>
          <Button
            variant='outline'
            size='sm'
            onClick={handleGuideMe}
            disabled={isGeneratingRoadmap}
            className="flex items-center gap-1"
          >
            <Map className="h-4 w-4" />
            {isGeneratingRoadmap ? 'Generating...' : 'Guide Me'}
          </Button>
          <a
            href={opportunity.official_link}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Button size='sm' className="flex items-center gap-1">
              <ExternalLink className="h-4 w-4" />
              Apply Now
            </Button>
          </a>
        </div>
      </CardFooter>
    </Card>
  );
}
