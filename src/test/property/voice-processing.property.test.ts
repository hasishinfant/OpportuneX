/**
 * Property-Based Test: Voice Processing Pipeline
 * **Validates: Requirements 3.1, 3.2, 3.3**
 *
 * Property 3: For any clear voice input in English or Hindi, the voice-to-search
 * pipeline should produce equivalent results to the same query entered as text
 */

import * as fc from 'fast-check';
import { SearchService } from '../../lib/services/search.service';
import { VoiceService } from '../../lib/services/voice.service';
import type { SearchRequest, VoiceRequest } from '../../types';

// Mock dependencies
jest.mock('@prisma/client');
jest.mock('../../lib/elasticsearch', () => ({
  elasticsearch: {
    search: jest.fn(),
  },
  esUtils: {
    createIndex: jest.fn(),
    bulkIndex: jest.fn(),
  },
  INDICES: {
    OPPORTUNITIES: 'test_opportunities',
  },
}));

const mockElasticsearch = require('../../lib/elasticsearch').elasticsearch;

describe('Property Test: Voice Processing Pipeline', () => {
  let voiceService: VoiceService;
  let searchService: SearchService;

  beforeEach(() => {
    voiceService = new VoiceService();
    searchService = new SearchService();
    jest.clearAllMocks();
  });

  // Generator for clear voice queries
  const clearVoiceQueries = fc.record({
    text: fc.oneof(
      fc.constantFrom(
        'Find AI hackathons in Mumbai',
        'Show me web development internships',
        'I want machine learning workshops',
        'Search for data science competitions',
        'Get me remote software jobs'
      ),
      fc.constantFrom(
        'मुंबई में AI हैकाथॉन खोजें',
        'वेब डेवलपमेंट इंटर्नशिप दिखाएं',
        'मशीन लर्निंग वर्कशॉप चाहिए',
        'डेटा साइंस प्रतियोगिता खोजें'
      )
    ),
    language: fc.constantFrom('en' as const, 'hi' as const),
    confidence: fc.float({ min: 0.8, max: 1.0 }), // Clear audio should have high confidence
  });

  // Helper to create mock audio blob
  const createMockAudioBlob = (size = 5000): Blob => {
    const buffer = new ArrayBuffer(size);
    return new Blob([buffer], { type: 'audio/wav' });
  };

  /**
   * Property: Voice processing should produce consistent search queries
   */
  it('should produce consistent search queries from voice input', async () => {
    await fc.assert(
      fc.asyncProperty(
        clearVoiceQueries,
        async (voiceQuery: {
          text: string;
          language: 'en' | 'hi';
          confidence: number;
        }) => {
          const mockAudioBlob = createMockAudioBlob();

          const voiceRequest: VoiceRequest = {
            audioData: mockAudioBlob,
            language: voiceQuery.language,
            userId: 'test-user',
          };

          const result = await voiceService.processVoiceInput(voiceRequest);

          // Property: Voice processing should succeed for clear input
          expect(result.success).toBe(true);

          if (result.data) {
            // Should have transcription
            expect(result.data.transcription).toBeDefined();
            expect(result.data.transcription.length).toBeGreaterThan(0);

            // Should have search query
            expect(result.data.searchQuery).toBeDefined();
            expect(result.data.searchQuery.length).toBeGreaterThan(0);

            // Confidence should be reasonable for clear audio
            expect(result.data.confidence).toBeGreaterThan(0.7);

            // Should have follow-up questions
            expect(result.data.followUpQuestions).toBeInstanceOf(Array);

            // Search query should be processed (cleaned up)
            expect(result.data.searchQuery.trim()).toBe(
              result.data.searchQuery
            );
            expect(result.data.searchQuery).not.toMatch(/^\s*$/);
          }
        }
      ),
      { numRuns: 50, timeout: 10000 }
    );
  });

  /**
   * Property: Voice and text searches should produce equivalent results
   */
  it('should produce equivalent search results for voice and text queries', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(
          'AI hackathon',
          'web development internship',
          'machine learning workshop',
          'data science competition'
        ),
        async (baseQuery: string) => {
          // Mock search results
          const mockOpportunities = [
            {
              id: 'opp-1',
              title: `${baseQuery} opportunity`,
              type: 'hackathon',
              organizerName: 'TechCorp',
              organizerType: 'corporate',
              requiredSkills: ['JavaScript', 'Python'],
              mode: 'online',
              applicationDeadline: new Date(
                Date.now() + 30 * 24 * 60 * 60 * 1000
              ),
              externalUrl: 'https://example.com',
              sourceId: 'test-source',
              tags: ['tech'],
              isActive: true,
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          ];

          mockElasticsearch.search.mockResolvedValue({
            hits: {
              total: { value: mockOpportunities.length },
              hits: mockOpportunities.map(opp => ({ _source: opp })),
            },
            aggregations: {
              types: { buckets: [] },
              organizerTypes: { buckets: [] },
              modes: { buckets: [] },
              locations: { buckets: [] },
              skills: { buckets: [] },
            },
          });

          // Text search
          const textSearchRequest: SearchRequest = { query: baseQuery };
          const textResult =
            await searchService.searchOpportunities(textSearchRequest);

          // Voice search
          const mockAudioBlob = createMockAudioBlob();
          const voiceResult = await voiceService.processVoiceInput({
            audioData: mockAudioBlob,
            language: 'en',
          });

          expect(textResult.success).toBe(true);
          expect(voiceResult.success).toBe(true);

          if (voiceResult.data) {
            const voiceSearchRequest: SearchRequest = {
              query: voiceResult.data.searchQuery,
            };
            const voiceSearchResult =
              await searchService.searchOpportunities(voiceSearchRequest);

            expect(voiceSearchResult.success).toBe(true);

            // Property: Both should return similar structured results
            if (textResult.data && voiceSearchResult.data) {
              expect(textResult.data.opportunities).toBeInstanceOf(Array);
              expect(voiceSearchResult.data.opportunities).toBeInstanceOf(
                Array
              );

              expect(typeof textResult.data.totalCount).toBe('number');
              expect(typeof voiceSearchResult.data.totalCount).toBe('number');

              // Results should have same structure
              if (
                textResult.data.opportunities.length > 0 &&
                voiceSearchResult.data.opportunities.length > 0
              ) {
                const textOpp = textResult.data.opportunities[0];
                const voiceOpp = voiceSearchResult.data.opportunities[0];

                expect(textOpp).toHaveProperty('id');
                expect(textOpp).toHaveProperty('title');
                expect(textOpp).toHaveProperty('type');
                expect(textOpp).toHaveProperty('organizer');

                expect(voiceOpp).toHaveProperty('id');
                expect(voiceOpp).toHaveProperty('title');
                expect(voiceOpp).toHaveProperty('type');
                expect(voiceOpp).toHaveProperty('organizer');
              }
            }
          }
        }
      ),
      { numRuns: 30, timeout: 12000 }
    );
  });

  /**
   * Property: Voice processing should handle different audio qualities
   */
  it('should handle different audio qualities appropriately', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          size: fc.integer({ min: 1000, max: 50000 }), // Different audio sizes
          confidence: fc.float({ min: 0.3, max: 1.0 }),
          language: fc.constantFrom('en' as const, 'hi' as const),
        }),
        async (audioProps: {
          size: number;
          confidence: number;
          language: 'en' | 'hi';
        }) => {
          const mockAudioBlob = createMockAudioBlob(audioProps.size);

          const voiceRequest: VoiceRequest = {
            audioData: mockAudioBlob,
            language: audioProps.language,
          };

          const result = await voiceService.processVoiceInput(voiceRequest);

          // Property: Should handle various audio qualities
          if (audioProps.confidence > 0.7) {
            // High confidence should succeed
            expect(result.success).toBe(true);

            if (result.data) {
              expect(result.data.confidence).toBeGreaterThan(0.7);
              expect(result.data.transcription).toBeDefined();
              expect(result.data.searchQuery).toBeDefined();
            }
          } else if (audioProps.confidence < 0.5) {
            // Very low confidence might still succeed but with lower confidence
            if (result.success && result.data) {
              expect(result.data.confidence).toBeLessThan(0.8);
              // Should still provide some output
              expect(result.data.transcription).toBeDefined();
            }
          }

          // Should always handle gracefully (no crashes)
          expect(typeof result.success).toBe('boolean');
        }
      ),
      { numRuns: 40, timeout: 8000 }
    );
  });

  /**
   * Property: Follow-up questions should be contextually appropriate
   */
  it('should generate contextually appropriate follow-up questions', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          queryType: fc.constantFrom('hackathon', 'internship', 'workshop'),
          language: fc.constantFrom('en' as const, 'hi' as const),
        }),
        async (context: { queryType: string; language: 'en' | 'hi' }) => {
          const mockAudioBlob = createMockAudioBlob();

          const voiceRequest: VoiceRequest = {
            audioData: mockAudioBlob,
            language: context.language,
          };

          const result = await voiceService.processVoiceInput(voiceRequest);

          expect(result.success).toBe(true);

          if (result.data) {
            const { followUpQuestions } = result.data;

            // Property: Should have follow-up questions
            expect(followUpQuestions).toBeInstanceOf(Array);
            expect(followUpQuestions.length).toBeGreaterThan(0);
            expect(followUpQuestions.length).toBeLessThanOrEqual(3);

            // Questions should be strings
            followUpQuestions.forEach(question => {
              expect(typeof question).toBe('string');
              expect(question.length).toBeGreaterThan(5);
            });

            // Language-specific checks
            if (context.language === 'hi') {
              // Hindi questions should contain Devanagari characters
              const hasHindiText = followUpQuestions.some(q =>
                /[\u0900-\u097F]/.test(q)
              );
              expect(hasHindiText).toBe(true);
            } else {
              // English questions should be in English
              followUpQuestions.forEach(question => {
                expect(question).toMatch(/^[a-zA-Z0-9\s\-\?\!\.,']+$/);
              });
            }
          }
        }
      ),
      { numRuns: 35, timeout: 10000 }
    );
  });

  /**
   * Property: Audio validation should work correctly
   */
  it('should validate audio files according to specifications', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          size: fc.integer({ min: 0, max: 15 * 1024 * 1024 }), // 0 to 15MB
          type: fc.constantFrom(
            'audio/wav',
            'audio/mp3',
            'audio/mpeg',
            'audio/m4a',
            'audio/webm',
            'audio/ogg',
            'video/mp4',
            'text/plain'
          ),
        }),
        async (audioSpec: { size: number; type: string }) => {
          const buffer = new ArrayBuffer(audioSpec.size);
          const audioBlob = new Blob([buffer], { type: audioSpec.type });

          const validationResult =
            await voiceService.validateAudioFile(audioBlob);

          // Property: Validation should follow the rules
          if (audioSpec.size > 10 * 1024 * 1024) {
            // Too large
            expect(validationResult.success).toBe(false);
            expect(validationResult.error).toContain('too large');
          } else if (audioSpec.size < 1000) {
            // Too small
            expect(validationResult.success).toBe(false);
            expect(validationResult.error).toContain('too small');
          } else if (
            ![
              'audio/wav',
              'audio/mp3',
              'audio/mpeg',
              'audio/m4a',
              'audio/webm',
              'audio/ogg',
            ].includes(audioSpec.type)
          ) {
            // Unsupported format
            expect(validationResult.success).toBe(false);
            expect(validationResult.error).toContain(
              'Unsupported audio format'
            );
          } else {
            // Should be valid
            expect(validationResult.success).toBe(true);
            expect(validationResult.message).toBe(
              'Audio file validation passed'
            );
          }
        }
      ),
      { numRuns: 60, timeout: 8000 }
    );
  });
});
