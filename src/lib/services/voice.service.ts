import type { ApiResponse, VoiceRequest, VoiceResponse } from '../../types';

export interface SpeechToTextConfig {
  provider: 'google' | 'azure' | 'mock';
  apiKey?: string;
  region?: string;
  endpoint?: string;
}

export interface AudioProcessingResult {
  transcription: string;
  confidence: number;
  language: string;
  duration?: number;
}

export class VoiceService {
  private config: SpeechToTextConfig;

  constructor() {
    this.config = {
      provider: (process.env.SPEECH_PROVIDER as 'google' | 'azure') || 'mock',
      apiKey:
        process.env.GOOGLE_SPEECH_TO_TEXT_API_KEY ||
        process.env.AZURE_SPEECH_KEY,
      region: process.env.AZURE_SPEECH_REGION,
      endpoint: process.env.SPEECH_ENDPOINT,
    };
  }

  /**
   * Process voice input and convert to search query
   */
  async processVoiceInput(
    request: VoiceRequest
  ): Promise<ApiResponse<VoiceResponse>> {
    try {
      // Step 1: Convert audio to text
      const transcriptionResult = await this.speechToText(
        request.audioData,
        request.language
      );

      if (!transcriptionResult.success || !transcriptionResult.data) {
        return {
          success: false,
          error: 'Failed to transcribe audio',
        };
      }

      const { transcription, confidence } = transcriptionResult.data;

      // Step 2: Process transcription to extract search intent
      const searchQuery = await this.extractSearchIntent(
        transcription,
        request.language
      );

      // Step 3: Generate follow-up questions if needed
      const followUpQuestions = await this.generateFollowUpQuestions(
        transcription,
        request.language
      );

      const response: VoiceResponse = {
        transcription,
        searchQuery,
        confidence,
        followUpQuestions,
      };

      return {
        success: true,
        data: response,
        message: 'Voice input processed successfully',
      };
    } catch (error) {
      console.error('Process voice input error:', error);
      return {
        success: false,
        error: 'Failed to process voice input',
      };
    }
  }

  /**
   * Convert speech to text using configured provider
   */
  private async speechToText(
    audioData: Blob,
    language: 'en' | 'hi'
  ): Promise<ApiResponse<AudioProcessingResult>> {
    try {
      switch (this.config.provider) {
        case 'google':
          return await this.googleSpeechToText(audioData, language);
        case 'azure':
          return await this.azureSpeechToText(audioData, language);
        case 'mock':
        default:
          return await this.mockSpeechToText(audioData, language);
      }
    } catch (error) {
      console.error('Speech to text error:', error);
      return {
        success: false,
        error: 'Failed to convert speech to text',
      };
    }
  }

  /**
   * Google Speech-to-Text implementation
   */
  private async googleSpeechToText(
    audioData: Blob,
    language: 'en' | 'hi'
  ): Promise<ApiResponse<AudioProcessingResult>> {
    try {
      if (!this.config.apiKey) {
        throw new Error('Google Speech API key not configured');
      }

      // Convert language code
      const languageCode = language === 'hi' ? 'hi-IN' : 'en-US';

      // Convert Blob to base64
      const arrayBuffer = await audioData.arrayBuffer();
      const base64Audio = Buffer.from(arrayBuffer).toString('base64');

      // Google Speech-to-Text API request
      const response = await fetch(
        'https://speech.googleapis.com/v1/speech:recognize',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.config.apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            config: {
              encoding: 'WEBM_OPUS',
              sampleRateHertz: 48000,
              languageCode,
              enableAutomaticPunctuation: true,
              model: 'latest_long',
            },
            audio: {
              content: base64Audio,
            },
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`Google Speech API error: ${response.statusText}`);
      }

      const result = await response.json();

      if (!result.results || result.results.length === 0) {
        return {
          success: false,
          error: 'No speech detected in audio',
        };
      }

      const bestResult = result.results[0];
      const { transcript } = bestResult.alternatives[0];
      const confidence = bestResult.alternatives[0].confidence || 0.8;

      return {
        success: true,
        data: {
          transcription: transcript,
          confidence,
          language: languageCode,
        },
        message: 'Speech transcribed successfully',
      };
    } catch (error) {
      console.error('Google Speech-to-Text error:', error);
      return {
        success: false,
        error: 'Failed to transcribe with Google Speech API',
      };
    }
  }

  /**
   * Azure Speech-to-Text implementation
   */
  private async azureSpeechToText(
    audioData: Blob,
    language: 'en' | 'hi'
  ): Promise<ApiResponse<AudioProcessingResult>> {
    try {
      if (!this.config.apiKey || !this.config.region) {
        throw new Error('Azure Speech API key or region not configured');
      }

      // Convert language code
      const languageCode = language === 'hi' ? 'hi-IN' : 'en-US';

      // Azure Speech-to-Text API request
      const response = await fetch(
        `https://${this.config.region}.stt.speech.microsoft.com/speech/recognition/conversation/cognitiveservices/v1?language=${languageCode}`,
        {
          method: 'POST',
          headers: {
            'Ocp-Apim-Subscription-Key': this.config.apiKey,
            'Content-Type': 'audio/wav',
          },
          body: audioData,
        }
      );

      if (!response.ok) {
        throw new Error(`Azure Speech API error: ${response.statusText}`);
      }

      const result = await response.json();

      if (result.RecognitionStatus !== 'Success') {
        return {
          success: false,
          error: 'No speech detected in audio',
        };
      }

      return {
        success: true,
        data: {
          transcription: result.DisplayText,
          confidence: result.Confidence || 0.8,
          language: languageCode,
        },
        message: 'Speech transcribed successfully',
      };
    } catch (error) {
      console.error('Azure Speech-to-Text error:', error);
      return {
        success: false,
        error: 'Failed to transcribe with Azure Speech API',
      };
    }
  }

  /**
   * Mock speech-to-text for development/testing
   */
  private async mockSpeechToText(
    audioData: Blob,
    language: 'en' | 'hi'
  ): Promise<ApiResponse<AudioProcessingResult>> {
    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Mock transcriptions based on language
    const mockTranscriptions = {
      en: [
        'Find AI hackathons in Mumbai',
        'Show me remote internships',
        'I want to participate in web development workshops',
        'Search for machine learning competitions',
        'Find startup internships for beginners',
      ],
      hi: [
        'मुंबई में AI हैकाथॉन खोजें',
        'रिमोट इंटर्नशिप दिखाएं',
        'वेब डेवलपमेंट वर्कशॉप में भाग लेना चाहता हूं',
        'मशीन लर्निंग प्रतियोगिताएं खोजें',
        'शुरुआती लोगों के लिए स्टार्टअप इंटर्नशिप खोजें',
      ],
    };

    const transcriptions = mockTranscriptions[language];
    const randomTranscription =
      transcriptions[Math.floor(Math.random() * transcriptions.length)];

    return {
      success: true,
      data: {
        transcription: randomTranscription,
        confidence: 0.85 + Math.random() * 0.1, // Random confidence between 0.85-0.95
        language: language === 'hi' ? 'hi-IN' : 'en-US',
      },
      message: 'Mock speech transcribed successfully',
    };
  }

  /**
   * Extract search intent from transcription
   */
  private async extractSearchIntent(
    transcription: string,
    language: 'en' | 'hi'
  ): Promise<string> {
    // Simple intent extraction - in production, this could use NLP services
    let searchQuery = transcription.toLowerCase();

    // Remove common voice command prefixes
    const prefixesToRemove = {
      en: ['find', 'search for', 'show me', 'i want', 'looking for', 'get me'],
      hi: ['खोजें', 'दिखाएं', 'चाहिए', 'ढूंढें', 'मुझे चाहिए'],
    };

    const prefixes = prefixesToRemove[language];
    for (const prefix of prefixes) {
      if (searchQuery.startsWith(prefix)) {
        searchQuery = searchQuery.substring(prefix.length).trim();
        break;
      }
    }

    // Clean up the query
    searchQuery = searchQuery
      .replace(/[^\w\s]/g, ' ') // Remove special characters
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();

    return searchQuery || transcription;
  }

  /**
   * Generate follow-up questions based on transcription
   */
  private async generateFollowUpQuestions(
    transcription: string,
    language: 'en' | 'hi'
  ): Promise<string[]> {
    const lowerTranscription = transcription.toLowerCase();

    const questions = {
      en: {
        general: [
          'Would you like to filter by skill level?',
          'Are you interested in remote opportunities?',
          'Do you have a preferred location?',
        ],
        hackathon: [
          'What programming languages do you know?',
          'Are you looking for team-based or solo hackathons?',
          'Do you prefer online or offline events?',
        ],
        internship: [
          'What field are you interested in?',
          'Are you looking for paid internships?',
          'How long of an internship are you seeking?',
        ],
        workshop: [
          'What skill level are you at?',
          'Are you looking for certification?',
          'Do you prefer hands-on or theoretical workshops?',
        ],
      },
      hi: {
        general: [
          'क्या आप स्किल लेवल के आधार पर फिल्टर करना चाहते हैं?',
          'क्या आप रिमोट अवसरों में रुचि रखते हैं?',
          'क्या आपका कोई पसंदीदा स्थान है?',
        ],
        hackathon: [
          'आप कौन सी प्रोग्रामिंग भाषाएं जानते हैं?',
          'क्या आप टीम-आधारित या एकल हैकाथॉन खोज रहे हैं?',
          'क्या आप ऑनलाइन या ऑफलाइन इवेंट पसंद करते हैं?',
        ],
        internship: [
          'आप किस क्षेत्र में रुचि रखते हैं?',
          'क्या आप पेड इंटर्नशिप खोज रहे हैं?',
          'आप कितनी लंबी इंटर्नशिप चाहते हैं?',
        ],
        workshop: [
          'आपका स्किल लेवल क्या है?',
          'क्या आप सर्टिफिकेशन खोज रहे हैं?',
          'क्या आप हैंड्स-ऑन या थ्योरेटिकल वर्कशॉप पसंद करते हैं?',
        ],
      },
    };

    const langQuestions = questions[language];

    // Determine question type based on transcription content
    if (
      lowerTranscription.includes('hackathon') ||
      lowerTranscription.includes('हैकाथॉन')
    ) {
      return langQuestions.hackathon.slice(0, 2);
    } else if (
      lowerTranscription.includes('internship') ||
      lowerTranscription.includes('इंटर्नशिप')
    ) {
      return langQuestions.internship.slice(0, 2);
    } else if (
      lowerTranscription.includes('workshop') ||
      lowerTranscription.includes('वर्कशॉप')
    ) {
      return langQuestions.workshop.slice(0, 2);
    } else {
      return langQuestions.general.slice(0, 2);
    }
  }

  /**
   * Validate audio file format and size
   */
  async validateAudioFile(audioData: Blob): Promise<ApiResponse<null>> {
    try {
      // Check file size (max 10MB)
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (audioData.size > maxSize) {
        return {
          success: false,
          error: 'Audio file too large. Maximum size is 10MB.',
        };
      }

      // Check file type
      const allowedTypes = [
        'audio/wav',
        'audio/mp3',
        'audio/mpeg',
        'audio/m4a',
        'audio/webm',
        'audio/ogg',
      ];

      if (!allowedTypes.includes(audioData.type)) {
        return {
          success: false,
          error: `Unsupported audio format. Allowed formats: ${allowedTypes.join(', ')}`,
        };
      }

      // Check minimum duration (at least 0.5 seconds of audio data)
      const minSize = 1000; // 1KB minimum
      if (audioData.size < minSize) {
        return {
          success: false,
          error:
            'Audio file too small. Please record at least 0.5 seconds of audio.',
        };
      }

      return {
        success: true,
        message: 'Audio file validation passed',
      };
    } catch (error) {
      console.error('Audio validation error:', error);
      return {
        success: false,
        error: 'Failed to validate audio file',
      };
    }
  }

  /**
   * Get supported languages
   */
  getSupportedLanguages(): Array<{
    code: string;
    name: string;
    nativeName: string;
  }> {
    return [
      { code: 'en', name: 'English', nativeName: 'English' },
      { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी' },
    ];
  }

  /**
   * Get voice processing statistics
   */
  async getProcessingStats(): Promise<ApiResponse<any>> {
    try {
      // This would typically come from a database or analytics service
      const stats = {
        totalProcessed: 1250,
        successRate: 0.92,
        averageConfidence: 0.87,
        languageBreakdown: {
          en: 850,
          hi: 400,
        },
        averageProcessingTime: 1.2, // seconds
      };

      return {
        success: true,
        data: stats,
        message: 'Voice processing statistics retrieved successfully',
      };
    } catch (error) {
      console.error('Get processing stats error:', error);
      return {
        success: false,
        error: 'Failed to retrieve processing statistics',
      };
    }
  }
}

export const voiceService = new VoiceService();
