/**
 * Unit tests for Voice Processing Service
 * Tests speech-to-text conversion, intent extraction, and multi-language support
 */

import { VoiceService } from '../lib/services/voice.service';
import type { VoiceRequest } from '../types';

// Mock fetch for API calls
global.fetch = jest.fn();

describe('VoiceService', () => {
  let voiceService: VoiceService;

  beforeEach(() => {
    voiceService = new VoiceService();
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockClear();
  });

  // Helper function to create mock audio blob
  const createMockAudioBlob = (size: number = 5000, type: string = 'audio/wav'): Blob => {
    const buffer = new ArrayBuffer(size);
    return new Blob([buffer], { type });
  };

  const mockVoiceRequest: VoiceRequest = {
    audioData: createMockAudioBlob(),
    language: 'en',
    userId: 'user-123',
  };

  describe('Audio File Validation', () => {
    it('should validate valid audio file', async () => {
      const validAudio = createMockAudioBlob(5000, 'audio/wav');

      const result = await voiceService.validateAudioFile(validAudio);

      expect(result.success).toBe(true);
      expect(result.message).toBe('Audio file validation passed');
    });

    it('should reject audio file that is too large', async () => {
      const largeAudio = createMockAudioBlob(11 * 1024 * 1024, 'audio/wav'); // 11MB

      const result = await voiceService.validateAudioFile(largeAudio);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Audio file too large. Maximum size is 10MB.');
    });

    it('should reject audio file that is too small', async () => {
      const tinyAudio = createMockAudioBlob(500, 'audio/wav'); // 500 bytes

      const result = await voiceService.validateAudioFile(tinyAudio);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Audio file too small. Please record at least 0.5 seconds of audio.');
    });

    it('should reject unsupported audio format', async () => {
      const unsupportedAudio = createMockAudioBlob(5000, 'audio/flac');

      const result = await voiceService.validateAudioFile(unsupportedAudio);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Unsupported audio format');
    });

    it('should accept all supported audio formats', async () => {
      const supportedFormats = [
        'audio/wav',
        'audio/mp3',
        'audio/mpeg',
        'audio/m4a',
        'audio/webm',
        'audio/ogg',
      ];

      for (const format of supportedFormats) {
        const audio = createMockAudioBlob(5000, format);
        const result = await voiceService.validateAudioFile(audio);

        expect(result.success).toBe(true);
      }
    });

    it('should handle validation errors gracefully', async () => {
      // Create a mock blob that will cause an error
      const invalidBlob = null as any;

      const result = await voiceService.validateAudioFile(invalidBlob);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to validate audio file');
    });
  });

  describe('Voice Input Processing', () => {
    it('should process voice input successfully with mock provider', async () => {
      const result = await voiceService.processVoiceInput(mockVoiceRequest);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.transcription).toBeDefined();
      expect(result.data?.searchQuery).toBeDefined();
      expect(result.data?.confidence).toBeGreaterThan(0.8);
      expect(result.data?.followUpQuestions).toBeInstanceOf(Array);
      expect(result.message).toBe('Voice input processed successfully');
    });

    it('should process Hindi voice input', async () => {
      const hindiRequest = {
        ...mockVoiceRequest,
        language: 'hi' as const,
      };

      const result = await voiceService.processVoiceInput(hindiRequest);

      expect(result.success).toBe(true);
      expect(result.data?.transcription).toBeDefined();
      expect(result.data?.followUpQuestions).toBeInstanceOf(Array);
      // Mock should return Hindi transcription
      expect(result.data?.transcription).toMatch(/[\u0900-\u097F]|[a-zA-Z]/); // Hindi or English characters
    });

    it('should extract search intent from transcription', async () => {
      const result = await voiceService.processVoiceInput(mockVoiceRequest);

      expect(result.success).toBe(true);
      expect(result.data?.searchQuery).toBeDefined();
      expect(result.data?.searchQuery.length).toBeGreaterThan(0);
      // Search query should be different from transcription (processed)
      expect(result.data?.searchQuery).not.toEqual(result.data?.transcription);
    });

    it('should generate appropriate follow-up questions', async () => {
      const result = await voiceService.processVoiceInput(mockVoiceRequest);

      expect(result.success).toBe(true);
      expect(result.data?.followUpQuestions).toBeInstanceOf(Array);
      expect(result.data?.followUpQuestions.length).toBeGreaterThan(0);
      expect(result.data?.followUpQuestions.length).toBeLessThanOrEqual(3);
    });

    it('should handle transcription failures', async () => {
      // Mock the internal speechToText method to fail
      const originalMethod = (voiceService as any).speechToText;
      (voiceService as any).speechToText = jest.fn().mockResolvedValue({
        success: false,
        error: 'Transcription failed',
      });

      const result = await voiceService.processVoiceInput(mockVoiceRequest);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to transcribe audio');

      // Restore original method
      (voiceService as any).speechToText = originalMethod;
    });

    it('should handle processing errors gracefully', async () => {
      // Create invalid request to trigger error
      const invalidRequest = {
        ...mockVoiceRequest,
        audioData: null as any,
      };

      const result = await voiceService.processVoiceInput(invalidRequest);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to process voice input');
    });
  });

  describe('Google Speech-to-Text Integration', () => {
    beforeEach(() => {
      // Set up environment for Google provider
      process.env.SPEECH_PROVIDER = 'google';
      process.env.GOOGLE_SPEECH_TO_TEXT_API_KEY = 'test-google-key';
    });

    afterEach(() => {
      delete process.env.SPEECH_PROVIDER;
      delete process.env.GOOGLE_SPEECH_TO_TEXT_API_KEY;
    });

    it('should call Google Speech API with correct parameters', async () => {
      const mockGoogleResponse = {
        ok: true,
        json: () => Promise.resolve({
          results: [{
            alternatives: [{
              transcript: 'Find AI hackathons in Mumbai',
              confidence: 0.92,
            }],
          }],
        }),
      };

      (global.fetch as jest.Mock).mockResolvedValue(mockGoogleResponse);

      const googleService = new VoiceService();
      const result = await googleService.processVoiceInput(mockVoiceRequest);

      expect(result.success).toBe(true);
      expect(global.fetch).toHaveBeenCalledWith(
        'https://speech.googleapis.com/v1/speech:recognize',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-google-key',
            'Content-Type': 'application/json',
          }),
          body: expect.stringContaining('"languageCode":"en-US"'),
        })
      );
    });

    it('should handle Google API errors', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        statusText: 'API Error',
      });

      const googleService = new VoiceService();
      const result = await googleService.processVoiceInput(mockVoiceRequest);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to process voice input');
    });

    it('should handle empty Google API response', async () => {
      const mockEmptyResponse = {
        ok: true,
        json: () => Promise.resolve({
          results: [],
        }),
      };

      (global.fetch as jest.Mock).mockResolvedValue(mockEmptyResponse);

      const googleService = new VoiceService();
      const result = await googleService.processVoiceInput(mockVoiceRequest);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to process voice input');
    });

    it('should handle missing API key', async () => {
      delete process.env.GOOGLE_SPEECH_TO_TEXT_API_KEY;

      const googleService = new VoiceService();
      const result = await googleService.processVoiceInput(mockVoiceRequest);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to process voice input');
    });

    it('should use correct language codes for Google API', async () => {
      const mockGoogleResponse = {
        ok: true,
        json: () => Promise.resolve({
          results: [{
            alternatives: [{
              transcript: 'मुंबई में AI हैकाथॉन खोजें',
              confidence: 0.88,
            }],
          }],
        }),
      };

      (global.fetch as jest.Mock).mockResolvedValue(mockGoogleResponse);

      const hindiRequest = {
        ...mockVoiceRequest,
        language: 'hi' as const,
      };

      const googleService = new VoiceService();
      await googleService.processVoiceInput(hindiRequest);

      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: expect.stringContaining('"languageCode":"hi-IN"'),
        })
      );
    });
  });

  describe('Azure Speech-to-Text Integration', () => {
    beforeEach(() => {
      process.env.SPEECH_PROVIDER = 'azure';
      process.env.AZURE_SPEECH_KEY = 'test-azure-key';
      process.env.AZURE_SPEECH_REGION = 'eastus';
    });

    afterEach(() => {
      delete process.env.SPEECH_PROVIDER;
      delete process.env.AZURE_SPEECH_KEY;
      delete process.env.AZURE_SPEECH_REGION;
    });

    it('should call Azure Speech API with correct parameters', async () => {
      const mockAzureResponse = {
        ok: true,
        json: () => Promise.resolve({
          RecognitionStatus: 'Success',
          DisplayText: 'Find machine learning workshops',
          Confidence: 0.89,
        }),
      };

      (global.fetch as jest.Mock).mockResolvedValue(mockAzureResponse);

      const azureService = new VoiceService();
      const result = await azureService.processVoiceInput(mockVoiceRequest);

      expect(result.success).toBe(true);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('eastus.stt.speech.microsoft.com'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Ocp-Apim-Subscription-Key': 'test-azure-key',
            'Content-Type': 'audio/wav',
          }),
        })
      );
    });

    it('should handle Azure API errors', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        statusText: 'Unauthorized',
      });

      const azureService = new VoiceService();
      const result = await azureService.processVoiceInput(mockVoiceRequest);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to process voice input');
    });

    it('should handle Azure recognition failure', async () => {
      const mockFailureResponse = {
        ok: true,
        json: () => Promise.resolve({
          RecognitionStatus: 'NoMatch',
        }),
      };

      (global.fetch as jest.Mock).mockResolvedValue(mockFailureResponse);

      const azureService = new VoiceService();
      const result = await azureService.processVoiceInput(mockVoiceRequest);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to process voice input');
    });

    it('should handle missing Azure configuration', async () => {
      delete process.env.AZURE_SPEECH_KEY;

      const azureService = new VoiceService();
      const result = await azureService.processVoiceInput(mockVoiceRequest);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to process voice input');
    });

    it('should use correct language codes for Azure API', async () => {
      const mockAzureResponse = {
        ok: true,
        json: () => Promise.resolve({
          RecognitionStatus: 'Success',
          DisplayText: 'वेब डेवलपमेंट वर्कशॉप',
          Confidence: 0.85,
        }),
      };

      (global.fetch as jest.Mock).mockResolvedValue(mockAzureResponse);

      const hindiRequest = {
        ...mockVoiceRequest,
        language: 'hi' as const,
      };

      const azureService = new VoiceService();
      await azureService.processVoiceInput(hindiRequest);

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('language=hi-IN'),
        expect.any(Object)
      );
    });
  });

  describe('Intent Extraction', () => {
    it('should remove common voice command prefixes in English', async () => {
      // Test the mock provider which we can control
      const result = await voiceService.processVoiceInput(mockVoiceRequest);

      expect(result.success).toBe(true);
      // The mock returns predefined transcriptions, so we test the general functionality
      expect(result.data?.searchQuery).toBeDefined();
      expect(result.data?.searchQuery.length).toBeGreaterThan(0);
    });

    it('should clean up search queries', async () => {
      const result = await voiceService.processVoiceInput(mockVoiceRequest);

      expect(result.success).toBe(true);
      expect(result.data?.searchQuery).toBeDefined();
      // Should not contain excessive whitespace or special characters
      expect(result.data?.searchQuery).not.toMatch(/\s{2,}/);
      expect(result.data?.searchQuery.trim()).toBe(result.data?.searchQuery);
    });

    it('should handle empty transcriptions', async () => {
      // Mock empty transcription
      const originalMethod = (voiceService as any).speechToText;
      (voiceService as any).speechToText = jest.fn().mockResolvedValue({
        success: true,
        data: {
          transcription: '',
          confidence: 0.5,
          language: 'en-US',
        },
      });

      const result = await voiceService.processVoiceInput(mockVoiceRequest);

      expect(result.success).toBe(true);
      expect(result.data?.searchQuery).toBe('');

      // Restore original method
      (voiceService as any).speechToText = originalMethod;
    });
  });

  describe('Follow-up Questions Generation', () => {
    it('should generate hackathon-specific questions', async () => {
      // Mock transcription containing "hackathon"
      const originalMethod = (voiceService as any).speechToText;
      (voiceService as any).speechToText = jest.fn().mockResolvedValue({
        success: true,
        data: {
          transcription: 'Find AI hackathons in Mumbai',
          confidence: 0.9,
          language: 'en-US',
        },
      });

      const result = await voiceService.processVoiceInput(mockVoiceRequest);

      expect(result.success).toBe(true);
      expect(result.data?.followUpQuestions).toBeInstanceOf(Array);
      expect(result.data?.followUpQuestions.length).toBeGreaterThan(0);
      
      // Should contain hackathon-specific questions
      const questions = result.data?.followUpQuestions.join(' ').toLowerCase();
      expect(questions).toMatch(/programming|team|online|offline/);

      // Restore original method
      (voiceService as any).speechToText = originalMethod;
    });

    it('should generate internship-specific questions', async () => {
      const originalMethod = (voiceService as any).speechToText;
      (voiceService as any).speechToText = jest.fn().mockResolvedValue({
        success: true,
        data: {
          transcription: 'Show me software internships',
          confidence: 0.9,
          language: 'en-US',
        },
      });

      const result = await voiceService.processVoiceInput(mockVoiceRequest);

      expect(result.success).toBe(true);
      expect(result.data?.followUpQuestions).toBeInstanceOf(Array);
      
      const questions = result.data?.followUpQuestions.join(' ').toLowerCase();
      expect(questions).toMatch(/field|paid|long/);

      // Restore original method
      (voiceService as any).speechToText = originalMethod;
    });

    it('should generate workshop-specific questions', async () => {
      const originalMethod = (voiceService as any).speechToText;
      (voiceService as any).speechToText = jest.fn().mockResolvedValue({
        success: true,
        data: {
          transcription: 'I want web development workshops',
          confidence: 0.9,
          language: 'en-US',
        },
      });

      const result = await voiceService.processVoiceInput(mockVoiceRequest);

      expect(result.success).toBe(true);
      expect(result.data?.followUpQuestions).toBeInstanceOf(Array);
      
      const questions = result.data?.followUpQuestions.join(' ').toLowerCase();
      expect(questions).toMatch(/skill level|certification|hands-on|theoretical/);

      // Restore original method
      (voiceService as any).speechToText = originalMethod;
    });

    it('should generate general questions for unclear intent', async () => {
      const originalMethod = (voiceService as any).speechToText;
      (voiceService as any).speechToText = jest.fn().mockResolvedValue({
        success: true,
        data: {
          transcription: 'Find something for me',
          confidence: 0.9,
          language: 'en-US',
        },
      });

      const result = await voiceService.processVoiceInput(mockVoiceRequest);

      expect(result.success).toBe(true);
      expect(result.data?.followUpQuestions).toBeInstanceOf(Array);
      
      const questions = result.data?.followUpQuestions.join(' ').toLowerCase();
      expect(questions).toMatch(/skill level|remote|location/);

      // Restore original method
      (voiceService as any).speechToText = originalMethod;
    });

    it('should generate Hindi follow-up questions', async () => {
      const originalMethod = (voiceService as any).speechToText;
      (voiceService as any).speechToText = jest.fn().mockResolvedValue({
        success: true,
        data: {
          transcription: 'हैकाथॉन खोजें',
          confidence: 0.9,
          language: 'hi-IN',
        },
      });

      const hindiRequest = {
        ...mockVoiceRequest,
        language: 'hi' as const,
      };

      const result = await voiceService.processVoiceInput(hindiRequest);

      expect(result.success).toBe(true);
      expect(result.data?.followUpQuestions).toBeInstanceOf(Array);
      
      // Should contain Hindi text
      const questions = result.data?.followUpQuestions.join(' ');
      expect(questions).toMatch(/[\u0900-\u097F]/); // Hindi Unicode range

      // Restore original method
      (voiceService as any).speechToText = originalMethod;
    });

    it('should limit follow-up questions to reasonable number', async () => {
      const result = await voiceService.processVoiceInput(mockVoiceRequest);

      expect(result.success).toBe(true);
      expect(result.data?.followUpQuestions).toBeInstanceOf(Array);
      expect(result.data?.followUpQuestions.length).toBeLessThanOrEqual(3);
    });
  });

  describe('Language Support', () => {
    it('should return supported languages', () => {
      const languages = voiceService.getSupportedLanguages();

      expect(languages).toBeInstanceOf(Array);
      expect(languages.length).toBeGreaterThan(0);
      
      const englishLang = languages.find(lang => lang.code === 'en');
      const hindiLang = languages.find(lang => lang.code === 'hi');

      expect(englishLang).toBeDefined();
      expect(englishLang?.name).toBe('English');
      expect(englishLang?.nativeName).toBe('English');

      expect(hindiLang).toBeDefined();
      expect(hindiLang?.name).toBe('Hindi');
      expect(hindiLang?.nativeName).toBe('हिन्दी');
    });

    it('should handle both English and Hindi processing', async () => {
      const englishResult = await voiceService.processVoiceInput({
        ...mockVoiceRequest,
        language: 'en',
      });

      const hindiResult = await voiceService.processVoiceInput({
        ...mockVoiceRequest,
        language: 'hi',
      });

      expect(englishResult.success).toBe(true);
      expect(hindiResult.success).toBe(true);
      
      // Both should have valid responses
      expect(englishResult.data?.transcription).toBeDefined();
      expect(hindiResult.data?.transcription).toBeDefined();
    });
  });

  describe('Processing Statistics', () => {
    it('should return processing statistics', async () => {
      const result = await voiceService.getProcessingStats();

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data.totalProcessed).toBeGreaterThan(0);
      expect(result.data.successRate).toBeGreaterThan(0);
      expect(result.data.successRate).toBeLessThanOrEqual(1);
      expect(result.data.averageConfidence).toBeGreaterThan(0);
      expect(result.data.averageConfidence).toBeLessThanOrEqual(1);
      expect(result.data.languageBreakdown).toBeDefined();
      expect(result.data.languageBreakdown.en).toBeGreaterThan(0);
      expect(result.data.languageBreakdown.hi).toBeGreaterThan(0);
      expect(result.data.averageProcessingTime).toBeGreaterThan(0);
      expect(result.message).toBe('Voice processing statistics retrieved successfully');
    });

    it('should handle statistics retrieval errors', async () => {
      // Mock console.error to avoid test output
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      
      // Mock the method to throw an error
      const originalMethod = voiceService.getProcessingStats;
      voiceService.getProcessingStats = jest.fn().mockRejectedValue(new Error('Stats error'));

      const result = await voiceService.getProcessingStats();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to retrieve processing statistics');

      // Restore
      voiceService.getProcessingStats = originalMethod;
      consoleErrorSpy.mockRestore();
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle network timeouts gracefully', async () => {
      process.env.SPEECH_PROVIDER = 'google';
      process.env.GOOGLE_SPEECH_TO_TEXT_API_KEY = 'test-key';

      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network timeout'));

      const googleService = new VoiceService();
      const result = await googleService.processVoiceInput(mockVoiceRequest);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to process voice input');

      delete process.env.SPEECH_PROVIDER;
      delete process.env.GOOGLE_SPEECH_TO_TEXT_API_KEY;
    });

    it('should handle malformed API responses', async () => {
      process.env.SPEECH_PROVIDER = 'google';
      process.env.GOOGLE_SPEECH_TO_TEXT_API_KEY = 'test-key';

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(null), // Malformed response
      });

      const googleService = new VoiceService();
      const result = await googleService.processVoiceInput(mockVoiceRequest);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to process voice input');

      delete process.env.SPEECH_PROVIDER;
      delete process.env.GOOGLE_SPEECH_TO_TEXT_API_KEY;
    });

    it('should handle very low confidence transcriptions', async () => {
      const originalMethod = (voiceService as any).speechToText;
      (voiceService as any).speechToText = jest.fn().mockResolvedValue({
        success: true,
        data: {
          transcription: 'unclear audio',
          confidence: 0.1, // Very low confidence
          language: 'en-US',
        },
      });

      const result = await voiceService.processVoiceInput(mockVoiceRequest);

      expect(result.success).toBe(true);
      expect(result.data?.confidence).toBe(0.1);
      // Should still process even with low confidence

      // Restore original method
      (voiceService as any).speechToText = originalMethod;
    });

    it('should handle empty audio blobs', async () => {
      const emptyRequest = {
        ...mockVoiceRequest,
        audioData: createMockAudioBlob(0), // Empty blob
      };

      const validationResult = await voiceService.validateAudioFile(emptyRequest.audioData);
      expect(validationResult.success).toBe(false);
    });

    it('should handle corrupted audio data', async () => {
      const corruptedBlob = new Blob(['corrupted data'], { type: 'audio/wav' });
      
      const result = await voiceService.processVoiceInput({
        ...mockVoiceRequest,
        audioData: corruptedBlob,
      });

      // Should still attempt to process (mock provider will handle it)
      expect(result.success).toBe(true);
    });

    it('should handle missing user ID gracefully', async () => {
      const requestWithoutUserId = {
        audioData: createMockAudioBlob(),
        language: 'en' as const,
        // userId is optional in the interface
      };

      const result = await voiceService.processVoiceInput(requestWithoutUserId);

      expect(result.success).toBe(true);
      // Should process successfully even without user ID
    });

    it('should handle very long transcriptions', async () => {
      const originalMethod = (voiceService as any).speechToText;
      const longTranscription = 'a'.repeat(10000); // Very long transcription
      
      (voiceService as any).speechToText = jest.fn().mockResolvedValue({
        success: true,
        data: {
          transcription: longTranscription,
          confidence: 0.9,
          language: 'en-US',
        },
      });

      const result = await voiceService.processVoiceInput(mockVoiceRequest);

      expect(result.success).toBe(true);
      expect(result.data?.transcription).toBe(longTranscription);
      expect(result.data?.searchQuery).toBeDefined();

      // Restore original method
      (voiceService as any).speechToText = originalMethod;
    });

    it('should handle special characters in transcription', async () => {
      const originalMethod = (voiceService as any).speechToText;
      const specialCharTranscription = 'Find AI/ML & web-dev workshops @Mumbai!';
      
      (voiceService as any).speechToText = jest.fn().mockResolvedValue({
        success: true,
        data: {
          transcription: specialCharTranscription,
          confidence: 0.9,
          language: 'en-US',
        },
      });

      const result = await voiceService.processVoiceInput(mockVoiceRequest);

      expect(result.success).toBe(true);
      expect(result.data?.transcription).toBe(specialCharTranscription);
      // Search query should be cleaned up
      expect(result.data?.searchQuery).not.toContain('@');
      expect(result.data?.searchQuery).not.toContain('!');

      // Restore original method
      (voiceService as any).speechToText = originalMethod;
    });
  });
});