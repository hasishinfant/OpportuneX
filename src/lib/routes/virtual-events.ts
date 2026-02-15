// Virtual Events API Routes
// Express routes for virtual event management

import { Request, Response, Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import { arBusinessCardService } from '../services/ar-business-card.service';
import { avatarService } from '../services/avatar.service';
import { deviceCapabilityService } from '../services/device-capability.service';
import { virtualEventsService } from '../services/virtual-events.service';

const router = Router();

// Apply authentication middleware to all routes
router.use(authMiddleware);

// ===== Virtual Event Spaces =====

// Create a new virtual event space
router.post('/spaces', async (req: Request, res: Response) => {
  try {
    const space = await virtualEventsService.createEventSpace(req.body);
    res.status(201).json(space);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Get all event spaces
router.get('/spaces', async (req: Request, res: Response) => {
  try {
    const { opportunityId, spaceType } = req.query;
    const spaces = await virtualEventsService.listEventSpaces({
      opportunityId: opportunityId as string,
      spaceType: spaceType as string,
    });
    res.json(spaces);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get a specific event space
router.get('/spaces/:spaceId', async (req: Request, res: Response) => {
  try {
    const space = await virtualEventsService.getEventSpace(req.params.spaceId);
    if (!space) {
      return res.status(404).json({ error: 'Event space not found' });
    }
    res.json(space);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Update event space
router.put('/spaces/:spaceId', async (req: Request, res: Response) => {
  try {
    const space = await virtualEventsService.updateEventSpace(
      req.params.spaceId,
      req.body
    );
    res.json(space);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Delete event space
router.delete('/spaces/:spaceId', async (req: Request, res: Response) => {
  try {
    await virtualEventsService.deleteEventSpace(req.params.spaceId);
    res.status(204).send();
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ===== Event Sessions =====

// Join an event space
router.post('/spaces/:spaceId/join', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { initialPosition } = req.body;
    const session = await virtualEventsService.joinEventSpace(
      req.params.spaceId,
      userId,
      initialPosition
    );
    res.status(201).json(session);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Leave an event space
router.post(
  '/sessions/:sessionId/leave',
  async (req: Request, res: Response) => {
    try {
      await virtualEventsService.leaveEventSpace(req.params.sessionId);
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
);

// Update user position
router.put(
  '/sessions/:sessionId/position',
  async (req: Request, res: Response) => {
    try {
      const { position, rotation } = req.body;
      await virtualEventsService.updateUserPosition(
        req.params.sessionId,
        position,
        rotation
      );
      res.status(204).send();
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }
);

// Get active participants
router.get(
  '/spaces/:spaceId/participants',
  async (req: Request, res: Response) => {
    try {
      const participants = await virtualEventsService.getActiveParticipants(
        req.params.spaceId
      );
      res.json(participants);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
);

// ===== Virtual Booths =====

// Create a booth
router.post('/spaces/:spaceId/booths', async (req: Request, res: Response) => {
  try {
    const booth = await virtualEventsService.createBooth({
      spaceId: req.params.spaceId,
      ...req.body,
    });
    res.status(201).json(booth);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Get booths in a space
router.get('/spaces/:spaceId/booths', async (req: Request, res: Response) => {
  try {
    const booths = await virtualEventsService.getBooths(req.params.spaceId);
    res.json(booths);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ===== Virtual Presentations =====

// Create a presentation
router.post(
  '/spaces/:spaceId/presentations',
  async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user.id;
      const presentation = await virtualEventsService.createPresentation({
        spaceId: req.params.spaceId,
        presenterId: userId,
        ...req.body,
      });
      res.status(201).json(presentation);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }
);

// Start a presentation
router.post(
  '/presentations/:presentationId/start',
  async (req: Request, res: Response) => {
    try {
      await virtualEventsService.startPresentation(req.params.presentationId);
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
);

// End a presentation
router.post(
  '/presentations/:presentationId/end',
  async (req: Request, res: Response) => {
    try {
      await virtualEventsService.endPresentation(req.params.presentationId);
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
);

// ===== Interactions =====

// Log an interaction
router.post(
  '/spaces/:spaceId/interactions',
  async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user.id;
      const interaction = await virtualEventsService.logInteraction({
        spaceId: req.params.spaceId,
        userId,
        ...req.body,
      });
      res.status(201).json(interaction);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }
);

// Get space analytics
router.get(
  '/spaces/:spaceId/analytics',
  async (req: Request, res: Response) => {
    try {
      const analytics = await virtualEventsService.getSpaceAnalytics(
        req.params.spaceId
      );
      res.json(analytics);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
);

// ===== AR Business Cards =====

// Create or update business card
router.post('/ar/business-card', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const card = await arBusinessCardService.createOrUpdateCard(
      userId,
      req.body
    );
    res.json(card);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Get user's business card
router.get('/ar/business-card', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const card = await arBusinessCardService.getUserCard(userId);
    if (!card) {
      return res.status(404).json({ error: 'Business card not found' });
    }
    res.json(card);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get card by marker ID
router.get(
  '/ar/business-card/marker/:markerId',
  async (req: Request, res: Response) => {
    try {
      const card = await arBusinessCardService.getCardByMarkerId(
        req.params.markerId
      );
      if (!card) {
        return res.status(404).json({ error: 'Business card not found' });
      }
      res.json(card);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
);

// Exchange business cards
router.post(
  '/ar/business-card/exchange',
  async (req: Request, res: Response) => {
    try {
      const senderId = (req as any).user.id;
      const { receiverId, spaceId } = req.body;
      await arBusinessCardService.exchangeCards(senderId, receiverId, spaceId);
      res.status(204).send();
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }
);

// Get received cards
router.get(
  '/ar/business-card/received',
  async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user.id;
      const cards = await arBusinessCardService.getReceivedCards(userId);
      res.json(cards);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
);

// Get exchange statistics
router.get('/ar/business-card/stats', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const stats = await arBusinessCardService.getExchangeStats(userId);
    res.json(stats);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Generate QR code
router.post(
  '/ar/business-card/qr-code',
  async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user.id;
      const qrCodeUrl = await arBusinessCardService.generateQrCode(userId);
      res.json({ qrCodeUrl });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }
);

// ===== Avatars =====

// Create or update avatar
router.post('/avatar', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const avatar = await avatarService.createOrUpdateAvatar(userId, req.body);
    res.json(avatar);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Get user avatar
router.get('/avatar', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const avatar = await avatarService.getUserAvatar(userId);
    if (!avatar) {
      // Create default avatar
      const defaultAvatar =
        await avatarService.getOrCreateDefaultAvatar(userId);
      return res.json(defaultAvatar);
    }
    res.json(avatar);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get avatar presets
router.get('/avatar/presets', async (req: Request, res: Response) => {
  try {
    const presets = avatarService.getAvailablePresets();
    res.json(presets);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get customization options
router.get(
  '/avatar/customization-options',
  async (req: Request, res: Response) => {
    try {
      const options = avatarService.getCustomizationOptions();
      res.json(options);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
);

// ===== Device Capabilities =====

// Detect and save capabilities
router.post('/device/capabilities', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const capability = await deviceCapabilityService.detectAndSaveCapabilities(
      userId,
      req.body
    );
    res.json(capability);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Get user capabilities
router.get('/device/capabilities', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const capability =
      await deviceCapabilityService.getUserCapabilities(userId);
    res.json(capability);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get recommended settings
router.get(
  '/device/recommended-settings',
  async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user.id;
      const capability =
        await deviceCapabilityService.getUserCapabilities(userId);
      const tier = capability?.performanceTier || 'medium';
      const settings = deviceCapabilityService.getRecommendedSettings(tier);
      res.json(settings);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
);

// Get device statistics (admin only)
router.get('/device/statistics', async (req: Request, res: Response) => {
  try {
    const stats = await deviceCapabilityService.getDeviceStatistics();
    res.json(stats);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
