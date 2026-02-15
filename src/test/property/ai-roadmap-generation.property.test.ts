/**
 * Property-Based Test: AI Roadmap Generation
 * **Validates: Requirements 6.1, 6.3, 6.4**
 *
 * Property 7: For any opportunity and user profile combination, the AI Instructor
 * should generate a roadmap containing learning resources, timelines, milestones,
 * and content appropriate for the opportunity type
 */

import * as fc from 'fast-check';
import type {
  RoadmapRequest,
  UserProfile,
} from '../../lib/services/ai-instructor.service';
import { AIInstructorService } from '../../lib/services/ai-instructor.service';

// Mock dependencies
jest.mock('@prisma/client');

const mockPrisma = {
  opportunity: {
    findUnique: jest.fn(),
  },
  roadmap: {
    create: jest.fn(),
  },
};

(
  require('@prisma/client').PrismaClient as jest.MockedClass<any>
).mockImplementation(() => mockPrisma);

describe('Property Test: AI Roadmap Generation', () => {
  let aiInstructorService: AIInstructorService;

  beforeEach(() => {
    aiInstructorService = new AIInstructorService();
    jest.clearAllMocks();
  });

  // Generator for user profiles
  const userProfileGenerator = fc.record({
    id: fc.uuid(),
    email: fc.emailAddress(),
    name: fc.string({ minLength: 2, maxLength: 50 }),
    location: fc.record({
      city: fc.constantFrom(
        'Mumbai',
        'Delhi',
        'Bangalore',
        'Chennai',
        'Pune',
        'Hyderabad'
      ),
      state: fc.constantFrom(
        'Maharashtra',
        'Delhi',
        'Karnataka',
        'Tamil Nadu',
        'Telangana'
      ),
      tier: fc.constantFrom(2, 3),
    }),
    academic: fc.record({
      institution: fc.string({ minLength: 5, maxLength: 100 }),
      degree: fc.constantFrom(
        'Computer Science',
        'Information Technology',
        'Electronics',
        'Mechanical',
        'Civil'
      ),
      year: fc.integer({ min: 1, max: 4 }),
      cgpa: fc.option(fc.float({ min: 6.0, max: 10.0 })),
    }),
    skills: fc.record({
      technical: fc.array(
        fc.constantFrom(
          'JavaScript',
          'Python',
          'Java',
          'C++',
          'React',
          'Node.js',
          'Machine Learning',
          'Data Science',
          'AI',
          'Blockchain',
          'DevOps'
        ),
        { minLength: 1, maxLength: 10 }
      ),
      domains: fc.array(
        fc.constantFrom(
          'Web Development',
          'Mobile Development',
          'AI/ML',
          'Data Science',
          'Cybersecurity'
        ),
        { minLength: 1, maxLength: 5 }
      ),
      proficiencyLevel: fc.constantFrom('beginner', 'intermediate', 'advanced'),
    }),
    preferences: fc.record({
      opportunityTypes: fc.array(
        fc.constantFrom('hackathon', 'internship', 'workshop'),
        { minLength: 1, maxLength: 3 }
      ),
      preferredMode: fc.constantFrom('online', 'offline', 'hybrid', 'any'),
      notifications: fc.record({
        email: fc.boolean(),
        sms: fc.boolean(),
        inApp: fc.boolean(),
        frequency: fc.constantFrom('immediate', 'daily', 'weekly'),
        types: fc.array(
          fc.constantFrom('new_opportunities', 'deadlines', 'recommendations'),
          { minLength: 1, maxLength: 3 }
        ),
      }),
    }),
    searchHistory: fc.constant([]),
    favoriteOpportunities: fc.array(fc.string(), { maxLength: 5 }),
    createdAt: fc.date({ max: new Date() }),
    updatedAt: fc.date({ max: new Date() }),
  });

  // Generator for opportunities
  const opportunityGenerator = fc.record({
    id: fc.string({ minLength: 5, maxLength: 30 }),
    title: fc.string({ minLength: 10, maxLength: 150 }),
    type: fc.constantFrom('hackathon', 'internship', 'workshop'),
    organizerName: fc.string({ minLength: 3, maxLength: 100 }),
    requiredSkills: fc.array(
      fc.constantFrom(
        'JavaScript',
        'Python',
        'Java',
        'React',
        'Node.js',
        'Machine Learning',
        'Data Analysis',
        'AI',
        'Blockchain',
        'Cloud Computing',
        'DevOps'
      ),
      { minLength: 1, maxLength: 8 }
    ),
    applicationDeadline: fc.date({
      min: new Date(),
      max: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
    }),
  });

  /**
   * Property: Roadmap should always contain essential components
   */
  it('should generate roadmaps with all essential components', async () => {
    await fc.assert(
      fc.asyncProperty(
        userProfileGenerator,
        opportunityGenerator,
        async (userProfile: UserProfile, opportunity: any) => {
          // Mock opportunity lookup
          mockPrisma.opportunity.findUnique.mockResolvedValue(opportunity);
          mockPrisma.roadmap.create.mockResolvedValue({});

          const roadmapRequest: RoadmapRequest = {
            opportunityId: opportunity.id,
            userProfile,
            targetDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          };

          const result =
            await aiInstructorService.generateRoadmap(roadmapRequest);

          // Property: Should always succeed and contain essential components
          expect(result.success).toBe(true);

          if (result.data) {
            const { roadmap, personalizedTips, skillGaps, recommendedActions } =
              result.data;

            // Roadmap structure
            expect(roadmap).toBeDefined();
            expect(roadmap.id).toBeDefined();
            expect(typeof roadmap.id).toBe('string');
            expect(roadmap.id.length).toBeGreaterThan(5);

            expect(roadmap.title).toBeDefined();
            expect(typeof roadmap.title).toBe('string');
            expect(roadmap.title.length).toBeGreaterThan(5);

            expect(roadmap.description).toBeDefined();
            expect(typeof roadmap.description).toBe('string');
            expect(roadmap.description.length).toBeGreaterThan(10);

            // Phases
            expect(roadmap.phases).toBeDefined();
            expect(Array.isArray(roadmap.phases)).toBe(true);
            expect(roadmap.phases.length).toBeGreaterThan(0);
            expect(roadmap.phases.length).toBeLessThanOrEqual(10);

            roadmap.phases.forEach(phase => {
              expect(phase.id).toBeDefined();
              expect(phase.title).toBeDefined();
              expect(phase.description).toBeDefined();
              expect(typeof phase.duration).toBe('number');
              expect(phase.duration).toBeGreaterThan(0);
              expect(phase.duration).toBeLessThanOrEqual(60); // Max 60 days per phase

              expect(Array.isArray(phase.tasks)).toBe(true);
              expect(phase.tasks.length).toBeGreaterThan(0);

              phase.tasks.forEach(task => {
                expect(task.id).toBeDefined();
                expect(task.title).toBeDefined();
                expect(task.description).toBeDefined();
                expect(typeof task.estimatedHours).toBe('number');
                expect(task.estimatedHours).toBeGreaterThan(0);
                expect(['high', 'medium', 'low']).toContain(task.priority);
                expect([
                  'learning',
                  'practice',
                  'project',
                  'assessment',
                ]).toContain(task.type);
                expect(typeof task.completed).toBe('boolean');
              });

              expect(Array.isArray(phase.resources)).toBe(true);
              phase.resources.forEach(resource => {
                expect(resource.id).toBeDefined();
                expect(resource.title).toBeDefined();
                expect([
                  'article',
                  'video',
                  'course',
                  'book',
                  'practice',
                ]).toContain(resource.type);
                expect(resource.url).toBeDefined();
                expect(resource.url).toMatch(/^https?:\/\/.+/);
                expect(['beginner', 'intermediate', 'advanced']).toContain(
                  resource.difficulty
                );
                expect(typeof resource.free).toBe('boolean');
              });
            });

            // Estimated duration
            expect(typeof roadmap.estimatedDuration).toBe('number');
            expect(roadmap.estimatedDuration).toBeGreaterThan(0);
            expect(roadmap.estimatedDuration).toBeLessThanOrEqual(365); // Max 1 year

            // Resources
            expect(Array.isArray(roadmap.resources)).toBe(true);
            expect(roadmap.resources.length).toBeGreaterThan(0);

            // Milestones
            expect(Array.isArray(roadmap.milestones)).toBe(true);
            expect(roadmap.milestones.length).toBeGreaterThan(0);

            roadmap.milestones.forEach(milestone => {
              expect(milestone.id).toBeDefined();
              expect(milestone.title).toBeDefined();
              expect(milestone.description).toBeDefined();
              expect(milestone.targetDate).toBeInstanceOf(Date);
              expect(typeof milestone.completed).toBe('boolean');
              expect(Array.isArray(milestone.tasks)).toBe(true);
            });

            // Personalized tips
            expect(Array.isArray(personalizedTips)).toBe(true);
            expect(personalizedTips.length).toBeGreaterThan(0);
            personalizedTips.forEach(tip => {
              expect(typeof tip).toBe('string');
              expect(tip.length).toBeGreaterThan(10);
            });

            // Skill gaps
            expect(Array.isArray(skillGaps)).toBe(true);
            skillGaps.forEach(skill => {
              expect(typeof skill).toBe('string');
              expect(skill.length).toBeGreaterThan(1);
            });

            // Recommended actions
            expect(Array.isArray(recommendedActions)).toBe(true);
            expect(recommendedActions.length).toBeGreaterThan(0);
            recommendedActions.forEach(action => {
              expect(typeof action).toBe('string');
              expect(action.length).toBeGreaterThan(5);
            });
          }
        }
      ),
      { numRuns: 30, timeout: 15000 }
    );
  });

  /**
   * Property: Roadmap content should be appropriate for opportunity type
   */
  it('should generate content appropriate for opportunity type', async () => {
    await fc.assert(
      fc.asyncProperty(
        userProfileGenerator,
        fc.constantFrom('hackathon', 'internship', 'workshop'),
        async (
          userProfile: UserProfile,
          opportunityType: 'hackathon' | 'internship' | 'workshop'
        ) => {
          const opportunity = {
            id: 'test-opp',
            title: `Test ${opportunityType}`,
            type: opportunityType,
            organizerName: 'Test Org',
            requiredSkills: ['JavaScript', 'Python'],
            applicationDeadline: new Date(
              Date.now() + 30 * 24 * 60 * 60 * 1000
            ),
          };

          mockPrisma.opportunity.findUnique.mockResolvedValue(opportunity);
          mockPrisma.roadmap.create.mockResolvedValue({});

          const roadmapRequest: RoadmapRequest = {
            opportunityId: opportunity.id,
            userProfile,
          };

          const result =
            await aiInstructorService.generateRoadmap(roadmapRequest);

          expect(result.success).toBe(true);

          if (result.data) {
            const { roadmap } = result.data;

            // Property: Content should be appropriate for opportunity type
            const roadmapContent =
              `${roadmap.title} ${roadmap.description}`.toLowerCase();

            switch (opportunityType) {
              case 'hackathon':
                // Should focus on rapid development, teamwork, innovation
                expect(roadmap.estimatedDuration).toBeLessThanOrEqual(45); // Shorter prep time
                expect(
                  roadmap.phases.some(
                    phase =>
                      phase.title.toLowerCase().includes('project') ||
                      phase.title.toLowerCase().includes('practice')
                  )
                ).toBe(true);
                break;

              case 'internship':
                // Should focus on professional skills, longer preparation
                expect(roadmap.estimatedDuration).toBeGreaterThanOrEqual(14); // Longer prep time
                expect(
                  roadmap.phases.some(
                    phase =>
                      phase.title.toLowerCase().includes('skill') ||
                      phase.title.toLowerCase().includes('foundation')
                  )
                ).toBe(true);
                break;

              case 'workshop':
                // Should focus on specific learning outcomes
                expect(
                  roadmap.phases.some(
                    phase =>
                      phase.title.toLowerCase().includes('learn') ||
                      phase.title.toLowerCase().includes('foundation')
                  )
                ).toBe(true);
                break;
            }

            // All types should have practical components
            expect(
              roadmap.phases.some(phase =>
                phase.tasks.some(
                  task => task.type === 'practice' || task.type === 'project'
                )
              )
            ).toBe(true);
          }
        }
      ),
      { numRuns: 25, timeout: 12000 }
    );
  });

  /**
   * Property: Roadmap should consider user's current skill level
   */
  it('should adapt roadmap based on user proficiency level', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('beginner', 'intermediate', 'advanced'),
        async (proficiencyLevel: 'beginner' | 'intermediate' | 'advanced') => {
          const userProfile: UserProfile = {
            id: 'test-user',
            email: 'test@example.com',
            name: 'Test User',
            location: { city: 'Mumbai', state: 'Maharashtra', tier: 2 },
            academic: {
              institution: 'Test Uni',
              degree: 'Computer Science',
              year: 2,
            },
            skills: {
              technical: ['JavaScript'],
              domains: ['Web Development'],
              proficiencyLevel,
            },
            preferences: {
              opportunityTypes: ['hackathon'],
              preferredMode: 'online',
              notifications: {
                email: true,
                sms: false,
                inApp: true,
                frequency: 'daily',
                types: ['new_opportunities'],
              },
            },
            searchHistory: [],
            favoriteOpportunities: [],
            createdAt: new Date(),
            updatedAt: new Date(),
          };

          const opportunity = {
            id: 'test-opp',
            title: 'Advanced AI Hackathon',
            type: 'hackathon',
            organizerName: 'AI Corp',
            requiredSkills: ['Python', 'Machine Learning', 'TensorFlow'],
            applicationDeadline: new Date(
              Date.now() + 30 * 24 * 60 * 60 * 1000
            ),
          };

          mockPrisma.opportunity.findUnique.mockResolvedValue(opportunity);
          mockPrisma.roadmap.create.mockResolvedValue({});

          const result = await aiInstructorService.generateRoadmap({
            opportunityId: opportunity.id,
            userProfile,
          });

          expect(result.success).toBe(true);

          if (result.data) {
            const { roadmap, skillGaps } = result.data;

            // Property: Roadmap should adapt to proficiency level
            switch (proficiencyLevel) {
              case 'beginner':
                // Should have more foundational content and longer duration
                expect(roadmap.estimatedDuration).toBeGreaterThanOrEqual(21);
                expect(skillGaps.length).toBeGreaterThan(0); // Should have skill gaps
                expect(
                  roadmap.phases.some(
                    phase =>
                      phase.title.toLowerCase().includes('foundation') ||
                      phase.title.toLowerCase().includes('basic')
                  )
                ).toBe(true);
                break;

              case 'intermediate':
                // Should have moderate duration and some skill building
                expect(roadmap.estimatedDuration).toBeGreaterThanOrEqual(14);
                expect(roadmap.estimatedDuration).toBeLessThanOrEqual(45);
                break;

              case 'advanced':
                // Should have shorter duration and focus on specific skills
                expect(roadmap.estimatedDuration).toBeLessThanOrEqual(35);
                expect(
                  roadmap.phases.some(
                    phase =>
                      phase.title.toLowerCase().includes('advanced') ||
                      phase.title.toLowerCase().includes('specific')
                  )
                ).toBe(true);
                break;
            }

            // All levels should have practical application
            expect(
              roadmap.phases.some(phase =>
                phase.tasks.some(
                  task => task.type === 'project' || task.type === 'practice'
                )
              )
            ).toBe(true);
          }
        }
      ),
      { numRuns: 20, timeout: 10000 }
    );
  });

  /**
   * Property: Roadmap should handle edge cases gracefully
   */
  it('should handle edge cases in roadmap generation', async () => {
    const edgeCases = [
      // User with no skills
      {
        userProfile: {
          id: 'edge-user-1',
          email: 'edge1@example.com',
          name: 'Edge User 1',
          location: { city: 'Delhi', state: 'Delhi', tier: 2 },
          academic: { institution: 'Test', degree: 'Other', year: 1 },
          skills: {
            technical: [],
            domains: [],
            proficiencyLevel: 'beginner' as const,
          },
          preferences: {
            opportunityTypes: ['hackathon' as const],
            preferredMode: 'online' as const,
            notifications: {
              email: true,
              sms: false,
              inApp: true,
              frequency: 'daily' as const,
              types: ['new_opportunities' as const],
            },
          },
          searchHistory: [],
          favoriteOpportunities: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        opportunity: {
          id: 'edge-opp-1',
          title: 'Complex AI Challenge',
          type: 'hackathon',
          organizerName: 'AI Corp',
          requiredSkills: [
            'Python',
            'TensorFlow',
            'Deep Learning',
            'Computer Vision',
          ],
          applicationDeadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Very short deadline
        },
      },
      // User with many skills
      {
        userProfile: {
          id: 'edge-user-2',
          email: 'edge2@example.com',
          name: 'Edge User 2',
          location: { city: 'Bangalore', state: 'Karnataka', tier: 2 },
          academic: {
            institution: 'Test',
            degree: 'Computer Science',
            year: 4,
          },
          skills: {
            technical: [
              'JavaScript',
              'Python',
              'Java',
              'React',
              'Node.js',
              'Machine Learning',
              'AI',
              'Blockchain',
            ],
            domains: ['Web Development', 'AI/ML', 'Blockchain'],
            proficiencyLevel: 'advanced' as const,
          },
          preferences: {
            opportunityTypes: ['internship' as const],
            preferredMode: 'hybrid' as const,
            notifications: {
              email: true,
              sms: true,
              inApp: true,
              frequency: 'immediate' as const,
              types: ['new_opportunities' as const, 'deadlines' as const],
            },
          },
          searchHistory: [],
          favoriteOpportunities: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        opportunity: {
          id: 'edge-opp-2',
          title: 'Basic Web Development Workshop',
          type: 'workshop',
          organizerName: 'Web Corp',
          requiredSkills: ['HTML', 'CSS'],
          applicationDeadline: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // Long deadline
        },
      },
    ];

    for (const edgeCase of edgeCases) {
      mockPrisma.opportunity.findUnique.mockResolvedValue(edgeCase.opportunity);
      mockPrisma.roadmap.create.mockResolvedValue({});

      const result = await aiInstructorService.generateRoadmap({
        opportunityId: edgeCase.opportunity.id,
        userProfile: edgeCase.userProfile,
      });

      // Property: Should handle edge cases without errors
      expect(result.success).toBe(true);

      if (result.data) {
        const { roadmap } = result.data;

        // Should still generate valid roadmap structure
        expect(roadmap.id).toBeDefined();
        expect(roadmap.title).toBeDefined();
        expect(roadmap.phases.length).toBeGreaterThan(0);
        expect(roadmap.estimatedDuration).toBeGreaterThan(0);
        expect(roadmap.milestones.length).toBeGreaterThan(0);
        expect(roadmap.resources.length).toBeGreaterThan(0);
      }
    }
  });
});
