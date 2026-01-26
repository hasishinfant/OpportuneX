import type { Request, Response } from 'express';
import { Router } from 'express';
import { body } from 'express-validator';
import type { ApiResponse, VoiceRequest } from '../../types';
import type { AuthenticatedRequest } from '../middleware/auth';
import { asyncHandler } from '../middleware/error-handler';
import { validate } from '../middleware/validation';
import { voiceService } from '../services/voice.service';

const router = Router();

/**
 * Process voice search request
 */
router.post(
  '/search',
  validate([
    body('audioData').notEmpty().withMessage('Audio data is required'),
    body('language')
      .isIn(['en', 'hi'])
      .withMessage('Language must be either "en" or "hi"'),
  ]),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    // Convert base64 audio data to Blob (if needed)
    let audioBlob: Blob;
    try {
      if (typeof req.body.audioData === 'string') {
        // Assume base64 encoded audio data
        const binaryString = atob(req.body.audioData);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        audioBlob = new Blob([bytes], { type: 'audio/webm' });
      } else {
        audioBlob = req.body.audioData;
      }
    } catch (error) {
      return res.status(400).json({
        success: false,
        error: 'Invalid audio data format',
      });
    }

    // Validate audio file
    const validationResult = await voiceService.validateAudioFile(audioBlob);
    if (!validationResult.success) {
      return res.status(400).json(validationResult);
    }

    const voiceRequest: VoiceRequest = {
      audioData: audioBlob,
      language: req.body.language,
      userId: req.user?.id,
    };

    const result = await voiceService.processVoiceInput(voiceRequest);

    if (result.success) {
      res.status(200).json(result);
    } else {
      res.status(400).json(result);
    }
  })
);

/**
 * Get supported languages for voice search
 */
router.get(
  '/languages',
  asyncHandler(async (req: Request, res: Response) => {
    const supportedLanguages = voiceService.getSupportedLanguages();

    const response: ApiResponse<typeof supportedLanguages> = {
      success: true,
      data: supportedLanguages,
      message: 'Supported languages retrieved successfully',
    };

    res.status(200).json(response);
  })
);

/**
 * Voice search configuration endpoint
 */
router.get(
  '/config',
  asyncHandler(async (req: Request, res: Response) => {
    const voiceConfig = {
      maxAudioDuration: 60, // seconds
      supportedFormats: ['wav', 'mp3', 'webm', 'm4a', 'ogg'],
      sampleRate: 16000,
      channels: 1,
      maxFileSize: 10 * 1024 * 1024, // 10MB
      confidenceThreshold: 0.7,
      supportedLanguages: voiceService.getSupportedLanguages(),
    };

    const response: ApiResponse<typeof voiceConfig> = {
      success: true,
      data: voiceConfig,
      message: 'Voice search configuration retrieved successfully',
    };

    res.status(200).json(response);
  })
);

/**
 * Get voice processing statistics
 */
router.get(
  '/stats',
  asyncHandler(async (req: Request, res: Response) => {
    const result = await voiceService.getProcessingStats();

    if (result.success) {
      res.status(200).json(result);
    } else {
      res.status(400).json(result);
    }
  })
);

/**
 * Test voice processing endpoint (for development)
 */
router.post(
  '/test',
  validate([
    body('text')
      .isString()
      .trim()
      .isLength({ min: 1, max: 500 })
      .withMessage('Test text must be between 1 and 500 characters'),
    body('language')
      .optional()
      .isIn(['en', 'hi'])
      .withMessage('Language must be either "en" or "hi"'),
  ]),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { text, language = 'en' } = req.body;

    // Create a mock audio blob for testing
    const mockAudioData = new Blob(['mock audio data'], { type: 'audio/webm' });

    const voiceRequest: VoiceRequest = {
      audioData: mockAudioData,
      language: language as 'en' | 'hi',
      userId: req.user?.id,
    };

    // Override the transcription with the provided text for testing
    const result = await voiceService.processVoiceInput(voiceRequest);

    if (result.success && result.data) {
      result.data.transcription = text;
      result.data.searchQuery = text
        .toLowerCase()
        .replace(/[^\w\s]/g, ' ')
        .trim();
      result.data.confidence = 1.0;
    }

    if (result.success) {
      res.status(200).json(result);
    } else {
      res.status(400).json(result);
    }
  })
);

export { router as voiceRouter };
