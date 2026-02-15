'use client';

import { Layout } from '@/components/layout/Layout';
import { useTheme } from '@/contexts/ThemeContext';
import { cn } from '@/lib/utils';
import { Bot, Mic, Target } from 'lucide-react';
import Link from 'next/link';

export default function HomePage() {
  const { isClient } = useTheme();

  // Use basic styling during SSR, theme-dependent styling only after hydration
  const cardClasses = isClient
    ? 'bg-white dark:bg-secondary-800 p-6 rounded-lg shadow-lg border border-secondary-200 dark:border-secondary-700'
    : 'bg-white p-6 rounded-lg shadow-lg border border-gray-200';

  const textClasses = isClient
    ? 'text-secondary-600 dark:text-secondary-300'
    : 'text-gray-600';

  return (
    <Layout>
      <div className='max-w-4xl mx-auto text-center py-12'>
        <h1 className='text-4xl md:text-6xl font-bold text-primary-600 mb-6'>
          Welcome to OpportuneX
        </h1>
        <p
          className={cn(
            'text-xl md:text-2xl mb-8 max-w-2xl mx-auto',
            textClasses
          )}
        >
          AI-powered platform to discover hackathons, internships, and workshops
          tailored for students from Tier 2 and Tier 3 cities in India
        </p>

        <div className='grid md:grid-cols-3 gap-6 mt-12'>
          <div className={cardClasses}>
            <h3 className='text-xl font-semibold text-primary-600 mb-3 flex items-center gap-2'>
              <Target className='h-6 w-6' />
              Smart Discovery
            </h3>
            <p className={textClasses}>
              Find opportunities that match your skills and interests using
              natural language search
            </p>
          </div>

          <div className={cardClasses}>
            <h3 className='text-xl font-semibold text-primary-600 mb-3 flex items-center gap-2'>
              <Mic className='h-6 w-6' />
              Voice Search
            </h3>
            <p className={textClasses}>
              Search for opportunities using voice commands in English and Hindi
            </p>
          </div>

          <div className={cardClasses}>
            <h3 className='text-xl font-semibold text-primary-600 mb-3 flex items-center gap-2'>
              <Bot className='h-6 w-6' />
              AI Instructor
            </h3>
            <p className={textClasses}>
              Get personalized preparation roadmaps to succeed in your chosen
              opportunities
            </p>
          </div>
        </div>

        <div className='mt-12 space-y-4'>
          <div className='flex flex-col sm:flex-row gap-4 justify-center'>
            <Link
              href='/search'
              className='inline-block bg-primary-600 hover:bg-primary-700 text-white font-semibold py-3 px-8 rounded-lg transition-colors duration-200'
            >
              Start Exploring Opportunities
            </Link>
            <Link
              href='/roadmap'
              className='inline-block bg-secondary-600 hover:bg-secondary-700 text-white font-semibold py-3 px-8 rounded-lg transition-colors duration-200'
            >
              View AI Roadmaps
            </Link>
          </div>
          <div className='text-center'>
            <Link
              href='/profile'
              className='text-primary-600 hover:text-primary-700 font-medium underline'
            >
              Set up your profile for personalized recommendations
            </Link>
          </div>
        </div>
      </div>
    </Layout>
  );
}
