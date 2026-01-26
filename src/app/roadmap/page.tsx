'use client';

import { Layout } from '@/components/layout/Layout';
import { RoadmapDashboard } from '@/components/roadmap/RoadmapDashboard';
import type { RoadmapResponse } from '@/types';
import { useCallback, useState } from 'react';

// Mock roadmap data for demonstration
const MOCK_ROADMAPS: RoadmapResponse[] = [
  {
    roadmap: {
      id: '1',
      title: 'AI/ML Hackathon Preparation',
      description:
        'Complete preparation roadmap for AI/ML hackathons focusing on machine learning fundamentals, practical implementation, and project development.',
      phases: [
        {
          id: 'phase-1',
          title: 'Foundation Building',
          description:
            'Master the fundamentals of machine learning and Python programming',
          duration: 14,
          tasks: [
            {
              id: 'task-1',
              title: 'Python Programming Basics',
              description:
                'Learn Python syntax, data structures, and object-oriented programming',
              estimatedHours: 20,
              priority: 'high',
              type: 'learning',
              completed: true,
            },
            {
              id: 'task-2',
              title: 'NumPy and Pandas Mastery',
              description:
                'Master data manipulation and analysis with NumPy and Pandas',
              estimatedHours: 15,
              priority: 'high',
              type: 'practice',
              completed: true,
            },
            {
              id: 'task-3',
              title: 'Statistics and Probability',
              description:
                'Understand statistical concepts essential for machine learning',
              estimatedHours: 12,
              priority: 'medium',
              type: 'learning',
              completed: false,
            },
          ],
          resources: [
            {
              id: 'res-1',
              title: 'Python for Data Science Handbook',
              type: 'book',
              url: 'https://example.com/python-handbook',
              duration: 40,
              difficulty: 'beginner',
              free: true,
            },
            {
              id: 'res-2',
              title: 'Pandas Tutorial Series',
              type: 'video',
              url: 'https://example.com/pandas-tutorial',
              duration: 8,
              difficulty: 'beginner',
              free: true,
            },
          ],
          prerequisites: [],
        },
        {
          id: 'phase-2',
          title: 'Machine Learning Core',
          description: 'Learn core machine learning algorithms and techniques',
          duration: 21,
          tasks: [
            {
              id: 'task-4',
              title: 'Supervised Learning Algorithms',
              description:
                'Implement linear regression, decision trees, and random forests',
              estimatedHours: 25,
              priority: 'high',
              type: 'learning',
              completed: false,
            },
            {
              id: 'task-5',
              title: 'Unsupervised Learning',
              description:
                'Explore clustering and dimensionality reduction techniques',
              estimatedHours: 20,
              priority: 'medium',
              type: 'learning',
              completed: false,
            },
            {
              id: 'task-6',
              title: 'Model Evaluation and Validation',
              description:
                'Learn cross-validation, metrics, and model selection',
              estimatedHours: 15,
              priority: 'high',
              type: 'practice',
              completed: false,
            },
          ],
          resources: [
            {
              id: 'res-3',
              title: 'Scikit-learn Documentation',
              type: 'article',
              url: 'https://scikit-learn.org/stable/',
              difficulty: 'intermediate',
              free: true,
            },
          ],
          prerequisites: ['phase-1'],
        },
        {
          id: 'phase-3',
          title: 'Deep Learning & Neural Networks',
          description: 'Dive into deep learning with TensorFlow and Keras',
          duration: 28,
          tasks: [
            {
              id: 'task-7',
              title: 'Neural Network Fundamentals',
              description:
                'Understand perceptrons, backpropagation, and gradient descent',
              estimatedHours: 18,
              priority: 'high',
              type: 'learning',
              completed: false,
            },
            {
              id: 'task-8',
              title: 'TensorFlow and Keras',
              description: 'Build neural networks using TensorFlow and Keras',
              estimatedHours: 22,
              priority: 'high',
              type: 'practice',
              completed: false,
            },
            {
              id: 'task-9',
              title: 'Computer Vision Project',
              description: 'Build an image classification project using CNNs',
              estimatedHours: 30,
              priority: 'medium',
              type: 'project',
              completed: false,
            },
          ],
          resources: [
            {
              id: 'res-4',
              title: 'Deep Learning Specialization',
              type: 'course',
              url: 'https://example.com/deep-learning-course',
              duration: 60,
              difficulty: 'advanced',
              free: false,
            },
          ],
          prerequisites: ['phase-2'],
        },
        {
          id: 'phase-4',
          title: 'Hackathon Preparation',
          description: 'Final preparation and project development skills',
          duration: 14,
          tasks: [
            {
              id: 'task-10',
              title: 'End-to-End ML Project',
              description:
                'Complete a full machine learning project from data to deployment',
              estimatedHours: 40,
              priority: 'high',
              type: 'project',
              completed: false,
            },
            {
              id: 'task-11',
              title: 'Presentation Skills',
              description: 'Learn to present technical projects effectively',
              estimatedHours: 8,
              priority: 'medium',
              type: 'learning',
              completed: false,
            },
            {
              id: 'task-12',
              title: 'Mock Hackathon',
              description:
                'Participate in a practice hackathon or time-constrained project',
              estimatedHours: 24,
              priority: 'high',
              type: 'assessment',
              completed: false,
            },
          ],
          resources: [
            {
              id: 'res-5',
              title: 'Kaggle Competitions',
              type: 'practice',
              url: 'https://kaggle.com/competitions',
              difficulty: 'intermediate',
              free: true,
            },
          ],
          prerequisites: ['phase-3'],
        },
      ],
      estimatedDuration: 77,
      resources: [],
      milestones: [
        {
          id: 'milestone-1',
          title: 'Python Proficiency Achieved',
          description: 'Complete all Python and data manipulation tasks',
          targetDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
          completed: false,
          tasks: ['task-1', 'task-2'],
        },
        {
          id: 'milestone-2',
          title: 'ML Fundamentals Mastered',
          description: 'Complete core machine learning concepts and algorithms',
          targetDate: new Date(Date.now() + 35 * 24 * 60 * 60 * 1000),
          completed: false,
          tasks: ['task-4', 'task-5', 'task-6'],
        },
        {
          id: 'milestone-3',
          title: 'Deep Learning Ready',
          description:
            'Complete neural networks and deep learning fundamentals',
          targetDate: new Date(Date.now() + 63 * 24 * 60 * 60 * 1000),
          completed: false,
          tasks: ['task-7', 'task-8', 'task-9'],
        },
        {
          id: 'milestone-4',
          title: 'Hackathon Ready',
          description: 'Complete final project and presentation preparation',
          targetDate: new Date(Date.now() + 77 * 24 * 60 * 60 * 1000),
          completed: false,
          tasks: ['task-10', 'task-11', 'task-12'],
        },
      ],
    },
    personalizedTips: [
      'Focus on practical implementation alongside theory to build strong coding skills',
      'Join online ML communities and participate in discussions to deepen understanding',
      'Practice with real datasets from Kaggle to gain hands-on experience',
      'Build a portfolio of projects to showcase your skills during hackathons',
    ],
    skillGaps: [
      'Advanced deep learning architectures (CNNs, RNNs)',
      'Model deployment and MLOps practices',
      'Time series analysis and forecasting',
    ],
    recommendedActions: [
      'Start with Python fundamentals if not already comfortable',
      'Practice coding daily to build muscle memory',
      'Join study groups or find a learning partner',
      'Set up a development environment with Jupyter notebooks',
    ],
  },
  {
    roadmap: {
      id: '2',
      title: 'Full Stack Web Development Internship Prep',
      description:
        'Comprehensive preparation for full-stack development internships covering frontend, backend, and deployment.',
      phases: [
        {
          id: 'phase-web-1',
          title: 'Frontend Fundamentals',
          description: 'Master HTML, CSS, JavaScript, and React',
          duration: 21,
          tasks: [
            {
              id: 'web-task-1',
              title: 'HTML5 & CSS3 Mastery',
              description: 'Build responsive layouts with modern HTML and CSS',
              estimatedHours: 20,
              priority: 'high',
              type: 'learning',
              completed: true,
            },
            {
              id: 'web-task-2',
              title: 'JavaScript ES6+',
              description:
                'Learn modern JavaScript features and best practices',
              estimatedHours: 25,
              priority: 'high',
              type: 'learning',
              completed: true,
            },
            {
              id: 'web-task-3',
              title: 'React Development',
              description:
                'Build interactive UIs with React hooks and components',
              estimatedHours: 30,
              priority: 'high',
              type: 'practice',
              completed: false,
            },
          ],
          resources: [
            {
              id: 'web-res-1',
              title: 'MDN Web Docs',
              type: 'article',
              url: 'https://developer.mozilla.org',
              difficulty: 'beginner',
              free: true,
            },
          ],
          prerequisites: [],
        },
        {
          id: 'phase-web-2',
          title: 'Backend Development',
          description: 'Learn Node.js, Express, and database integration',
          duration: 28,
          tasks: [
            {
              id: 'web-task-4',
              title: 'Node.js & Express',
              description: 'Build RESTful APIs with Node.js and Express',
              estimatedHours: 25,
              priority: 'high',
              type: 'learning',
              completed: false,
            },
            {
              id: 'web-task-5',
              title: 'Database Integration',
              description: 'Work with MongoDB and PostgreSQL databases',
              estimatedHours: 20,
              priority: 'high',
              type: 'practice',
              completed: false,
            },
          ],
          resources: [],
          prerequisites: ['phase-web-1'],
        },
      ],
      estimatedDuration: 49,
      resources: [],
      milestones: [
        {
          id: 'web-milestone-1',
          title: 'Frontend Proficiency',
          description: 'Complete all frontend development tasks',
          targetDate: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000),
          completed: false,
          tasks: ['web-task-1', 'web-task-2', 'web-task-3'],
        },
      ],
    },
    personalizedTips: [
      'Build projects while learning to reinforce concepts',
      'Focus on clean, readable code from the beginning',
      'Learn version control with Git early in your journey',
    ],
    skillGaps: [
      'Advanced React patterns and state management',
      'Testing frameworks and methodologies',
      'DevOps and deployment practices',
    ],
    recommendedActions: [
      'Set up a development environment with VS Code',
      'Create a GitHub profile to showcase your projects',
      'Join developer communities and forums',
    ],
  },
];

export default function RoadmapPage() {
  const [roadmaps, setRoadmaps] = useState<RoadmapResponse[]>(MOCK_ROADMAPS);
  const [loading, setLoading] = useState(false);

  const handleGenerateRoadmap = useCallback(async (opportunityId: string) => {
    setLoading(true);

    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Mock new roadmap generation
    const newRoadmap: RoadmapResponse = {
      roadmap: {
        id: `roadmap-${Date.now()}`,
        title: 'New Opportunity Roadmap',
        description: 'Customized learning path for your selected opportunity',
        phases: [
          {
            id: 'new-phase-1',
            title: 'Getting Started',
            description: 'Initial preparation phase',
            duration: 7,
            tasks: [
              {
                id: 'new-task-1',
                title: 'Research and Planning',
                description: 'Understand the opportunity requirements',
                estimatedHours: 5,
                priority: 'high',
                type: 'learning',
                completed: false,
              },
            ],
            resources: [],
            prerequisites: [],
          },
        ],
        estimatedDuration: 7,
        resources: [],
        milestones: [],
      },
      personalizedTips: ['Start with thorough research of the opportunity'],
      skillGaps: [],
      recommendedActions: ['Create a study schedule'],
    };

    setRoadmaps(prev => [...prev, newRoadmap]);
    setLoading(false);
  }, []);

  const handleStartPhase = useCallback((roadmapId: string, phaseId: string) => {
    console.log(`Starting phase ${phaseId} in roadmap ${roadmapId}`);
    // Here you would typically update the phase status in your backend
    alert(`Started phase: ${phaseId}`);
  }, []);

  const handleViewPhaseDetails = useCallback(
    (roadmapId: string, phaseId: string) => {
      console.log(
        `Viewing details for phase ${phaseId} in roadmap ${roadmapId}`
      );
      // Here you would typically navigate to a detailed phase view
      alert(`Viewing details for phase: ${phaseId}`);
    },
    []
  );

  return (
    <Layout>
      <div className='min-h-screen bg-secondary-50'>
        {/* Header */}
        <div className='bg-gradient-to-br from-primary-600 to-primary-800 text-white'>
          <div className='container mx-auto px-4 sm:px-6 lg:px-8 py-12'>
            <div className='max-w-4xl mx-auto text-center'>
              <h1 className='text-3xl md:text-5xl font-bold mb-4'>
                AI Learning Roadmaps
              </h1>
              <p className='text-xl md:text-2xl text-primary-100 mb-6'>
                Personalized preparation paths powered by artificial
                intelligence
              </p>
              <p className='text-primary-200'>
                Get customized learning roadmaps for hackathons, internships,
                and workshops
              </p>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className='container mx-auto px-4 sm:px-6 lg:px-8 py-8'>
          <RoadmapDashboard
            roadmaps={roadmaps}
            loading={loading}
            onGenerateRoadmap={handleGenerateRoadmap}
            onStartPhase={handleStartPhase}
            onViewPhaseDetails={handleViewPhaseDetails}
          />
        </div>
      </div>
    </Layout>
  );
}
