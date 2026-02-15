# AR/VR Features for Virtual Events

## Overview

OpportuneX now supports immersive AR/VR features for virtual events, enabling students to participate in hackathons, workshops, and networking events through virtual 3D spaces. This feature is designed with accessibility in mind, working on common devices like smartphones and laptops without requiring expensive VR headsets.

## Key Features

### 1. Virtual Event Spaces

- **3D Conference Halls**: Immersive spaces for presentations and talks
- **Exhibition Halls**: Virtual booths for sponsors and companies
- **Networking Lounges**: Casual spaces for participant interaction
- **Workshop Rooms**: Interactive spaces for hands-on sessions

### 2. AR Business Cards

- **Digital Business Cards**: Create AR-enabled business cards with QR codes
- **Quick Exchange**: Scan QR codes to instantly exchange contact information
- **Networking Analytics**: Track connections and card exchanges
- **Profile Integration**: Automatically populate from user profile

### 3. Avatar System

- **Customizable Avatars**: Personalize appearance, outfit, and accessories
- **Multiple Presets**: Quick-start with default avatar configurations
- **Animations**: Idle, walk, talk, and gesture animations
- **Real-time Sync**: See other participants' avatars in real-time

### 4. Spatial Audio

- **Proximity-based Audio**: Hear conversations based on distance
- **Broadcast Channels**: Listen to presentations and announcements
- **Private Channels**: One-on-one or group conversations

### 5. Virtual Booths

- **Company Showcases**: Display logos, banners, and promotional materials
- **Interactive Content**: Videos, documents, and 3D models
- **Representative Avatars**: Connect with company representatives
- **Analytics**: Track booth visits and engagement

## Technology Stack

### Frontend

- **React Three Fiber**: 3D rendering with React
- **Three.js**: WebGL-based 3D graphics
- **@react-three/drei**: Useful helpers for R3F
- **WebXR API**: VR/AR device support

### Backend

- **PostgreSQL**: Store virtual event data
- **Socket.io**: Real-time multiplayer synchronization
- **WebRTC**: Peer-to-peer audio/video communication

### AR Features

- **QR Code Generation**: Business card markers
- **Camera Access**: Mobile AR scanning
- **Marker Detection**: AR.js or similar libraries

## Device Support

### Supported Devices

#### High Performance (VR Mode)

- Meta Quest 2/3
- HTC Vive
- Valve Index
- PlayStation VR
- Desktop with VR headset

**Features**: Full VR immersion, hand tracking, spatial audio, high-quality graphics

#### Medium Performance (WebGL Mode)

- Modern smartphones (iPhone 10+, Android flagship)
- Desktop computers
- Tablets (iPad Pro, high-end Android)

**Features**: 3D environment, avatar rendering, basic interactions, AR business cards

#### Low Performance (2D Fallback)

- Budget smartphones
- Older devices
- Low-bandwidth connections

**Features**: 2D interface, text chat, profile viewing, basic networking

### Browser Support

- Chrome 90+ (recommended)
- Firefox 88+
- Safari 14.5+ (iOS)
- Edge 90+

## Getting Started

### For Event Organizers

#### 1. Create a Virtual Event Space

```typescript
import { virtualEventsService } from '@/lib/services/virtual-events.service';

const space = await virtualEventsService.createEventSpace({
  opportunityId: 'hackathon-id',
  name: 'TechHack 2024 Virtual Space',
  description: 'Main conference hall for TechHack 2024',
  spaceType: 'conference',
  maxParticipants: 100,
  sceneConfig: {
    environment: 'indoor',
    lighting: {
      ambient: '#ffffff',
      directional: [
        {
          color: '#ffffff',
          intensity: 1.5,
          position: { x: 10, y: 20, z: 10 },
        },
      ],
    },
    floor: {
      color: '#2c3e50',
      size: { width: 100, depth: 100 },
    },
    objects: [],
  },
});
```

#### 2. Add Virtual Booths

```typescript
const booth = await virtualEventsService.createBooth({
  spaceId: space.id,
  companyName: 'Tech Corp',
  boothConfig: {
    design: 'modern',
    colors: {
      primary: '#0066cc',
      secondary: '#ffffff',
      accent: '#ff6600',
    },
    logo: 'https://example.com/logo.png',
    banners: ['banner1.jpg', 'banner2.jpg'],
    videos: [
      {
        url: 'https://example.com/promo.mp4',
        position: { x: 0, y: 2, z: -2 },
        size: { width: 4, height: 2.25 },
      },
    ],
    documents: [
      {
        title: 'Company Brochure',
        url: 'https://example.com/brochure.pdf',
        thumbnail: 'thumb.jpg',
      },
    ],
    representatives: [
      {
        name: 'John Doe',
        role: 'Recruiter',
        avatar: 'avatar.jpg',
        available: true,
      },
    ],
  },
  position: { x: 20, y: 0, z: 10 },
});
```

#### 3. Schedule Presentations

```typescript
const presentation = await virtualEventsService.createPresentation({
  spaceId: space.id,
  presenterId: userId,
  title: 'Building Scalable Web Apps',
  description: 'Learn best practices for scalable architecture',
  contentType: 'slides',
  contentUrl: 'https://example.com/slides.pdf',
  scheduledAt: new Date('2024-03-15T14:00:00Z'),
});
```

### For Participants

#### 1. Join a Virtual Event

```typescript
import { useVirtualEvents } from '@/hooks/useVirtualEvents';

function EventPage() {
  const { joinSpace, currentSession } = useVirtualEvents();

  const handleJoin = async () => {
    const session = await joinSpace(spaceId, {
      x: 0,
      y: 0,
      z: 5
    });
  };

  return (
    <button onClick={handleJoin}>
      Join Virtual Event
    </button>
  );
}
```

#### 2. Create AR Business Card

```typescript
import { useArBusinessCard } from '@/hooks/useVirtualEvents';

function BusinessCardSetup() {
  const { saveCard, generateQrCode } = useArBusinessCard();

  const handleCreate = async () => {
    await saveCard({
      name: 'Jane Doe',
      title: 'Software Engineer',
      company: 'Tech Startup',
      email: 'jane@example.com',
      phone: '+1234567890',
      skills: ['React', 'Node.js', 'Python'],
      linkedin: 'https://linkedin.com/in/janedoe'
    });

    const qrCodeUrl = await generateQrCode();
    console.log('QR Code:', qrCodeUrl);
  };

  return (
    <button onClick={handleCreate}>
      Create Business Card
    </button>
  );
}
```

#### 3. Customize Avatar

```typescript
import { useAvatar } from '@/hooks/useVirtualEvents';
import AvatarCustomizer from '@/components/virtual-events/AvatarCustomizer';

function AvatarSetup() {
  const { saveAvatar } = useAvatar();

  const handleSave = async (config) => {
    await saveAvatar(config);
  };

  return (
    <AvatarCustomizer onSave={handleSave} />
  );
}
```

## Performance Optimization

### Automatic Quality Adjustment

The system automatically detects device capabilities and adjusts quality:

```typescript
import { useDeviceCapabilities } from '@/hooks/useVirtualEvents';

function VirtualEventWrapper() {
  const { capabilities, detectCapabilities } = useDeviceCapabilities();

  useEffect(() => {
    detectCapabilities();
  }, []);

  const performanceMode = capabilities?.performanceTier || 'medium';

  return (
    <VirtualEventSpace
      space={space}
      performanceMode={performanceMode}
    />
  );
}
```

### Performance Settings by Tier

| Feature          | Low | Medium | High |
| ---------------- | --- | ------ | ---- |
| Render Distance  | 20m | 50m    | 100m |
| Shadow Quality   | Off | Low    | High |
| Texture Quality  | Low | Medium | High |
| Antialiasing     | Off | On     | On   |
| Particle Effects | Off | On     | On   |
| Max Avatars      | 10  | 25     | 50   |

## API Reference

### Virtual Events Service

#### `createEventSpace(data)`

Creates a new virtual event space.

**Parameters:**

- `opportunityId` (optional): Associated opportunity ID
- `name`: Space name
- `description` (optional): Space description
- `spaceType`: 'conference' | 'exhibition' | 'networking' | 'workshop'
- `maxParticipants`: Maximum number of participants
- `sceneConfig`: 3D scene configuration

**Returns:** `VirtualEventSpace`

#### `joinEventSpace(spaceId, userId, initialPosition?)`

Join a virtual event space.

**Parameters:**

- `spaceId`: Space ID to join
- `userId`: User ID
- `initialPosition` (optional): Starting position {x, y, z}

**Returns:** `VirtualEventSession`

#### `updateUserPosition(sessionId, position, rotation)`

Update user's position in the virtual space.

**Parameters:**

- `sessionId`: Session ID
- `position`: {x, y, z} coordinates
- `rotation`: {x, y, z} rotation

#### `logInteraction(data)`

Log user interaction in virtual space.

**Parameters:**

- `spaceId`: Space ID
- `userId`: User ID
- `interactionType`: 'booth_visit' | 'presentation_attend' | 'chat' | 'gesture'
- `targetId` (optional): Target entity ID
- `metadata` (optional): Additional data

### AR Business Card Service

#### `createOrUpdateCard(userId, cardData)`

Create or update AR business card.

**Parameters:**

- `userId`: User ID
- `cardData`: Business card information

**Returns:** `ArBusinessCard`

#### `exchangeCards(senderId, receiverId, spaceId?)`

Exchange business cards between users.

**Parameters:**

- `senderId`: Sender user ID
- `receiverId`: Receiver user ID
- `spaceId` (optional): Virtual space ID

#### `generateQrCode(userId)`

Generate QR code for business card.

**Parameters:**

- `userId`: User ID

**Returns:** QR code URL

### Avatar Service

#### `createOrUpdateAvatar(userId, avatarConfig)`

Create or update user avatar.

**Parameters:**

- `userId`: User ID
- `avatarConfig`: Avatar configuration

**Returns:** `UserAvatar`

#### `getAvailablePresets()`

Get available avatar presets.

**Returns:** Array of preset configurations

#### `getCustomizationOptions()`

Get available customization options.

**Returns:** Object with customization arrays

## Security Considerations

### Data Privacy

- User positions are only shared within active sessions
- Business card data is only visible after exchange
- Avatar data is public within virtual spaces

### Access Control

- Authentication required for all virtual event features
- Space creators can moderate participants
- Report and block functionality for inappropriate behavior

### Rate Limiting

- Position updates: Max 10/second per user
- Interaction logging: Max 100/minute per user
- Business card exchanges: Max 50/hour per user

## Accessibility Features

### Keyboard Controls

- **WASD**: Move avatar
- **Arrow Keys**: Rotate camera
- **Space**: Jump/Interact
- **E**: Open interaction menu
- **T**: Open text chat
- **M**: Mute/Unmute audio

### Screen Reader Support

- All UI elements have ARIA labels
- Text alternatives for 3D content
- Keyboard-navigable menus

### Fallback Modes

- 2D interface for unsupported devices
- Text chat for audio issues
- Static images for 3D content

## Analytics and Insights

### Event Organizer Dashboard

Track virtual event metrics:

- Total visitors
- Active participants
- Booth visits
- Presentation attendance
- Average session duration
- Popular interaction points

```typescript
const analytics = await virtualEventsService.getSpaceAnalytics(spaceId);

console.log(`Total Visitors: ${analytics.totalVisitors}`);
console.log(`Active Now: ${analytics.activeParticipants}`);
console.log(`Booth Visits: ${analytics.boothVisits}`);
console.log(`Avg Duration: ${analytics.averageSessionDuration} minutes`);
```

### Networking Analytics

Track business card exchanges:

```typescript
const stats = await arBusinessCardService.getExchangeStats(userId);

console.log(`Cards Sent: ${stats.totalSent}`);
console.log(`Cards Received: ${stats.totalReceived}`);
console.log(`Unique Connections: ${stats.uniqueConnections}`);
console.log(`Recent Exchanges: ${stats.recentExchanges}`);
```

## Troubleshooting

### Common Issues

#### WebXR Not Supported

**Problem**: Browser doesn't support WebXR
**Solution**: Use Chrome 90+ or enable WebXR flags in browser settings

#### Camera Access Denied

**Problem**: AR features can't access camera
**Solution**: Grant camera permissions in browser settings

#### Poor Performance

**Problem**: Laggy or slow rendering
**Solution**: System automatically adjusts quality, or manually select lower performance tier

#### Audio Not Working

**Problem**: Can't hear other participants
**Solution**: Check microphone permissions, ensure spatial audio is enabled

### Debug Mode

Enable debug mode for troubleshooting:

```typescript
localStorage.setItem('vr_debug', 'true');
```

This shows:

- FPS counter
- Network latency
- Active connections
- Position coordinates
- Performance metrics

## Future Enhancements

### Planned Features

- Hand tracking for VR headsets
- Gesture recognition
- Screen sharing in presentations
- Whiteboard collaboration
- Breakout rooms
- Recording and playback
- AI-powered networking suggestions
- Multi-language spatial audio translation

### Community Contributions

We welcome contributions! See our GitHub repository for:

- Feature requests
- Bug reports
- Pull requests
- Documentation improvements

## Support

For questions or issues:

- Email: support@opportunex.com
- Discord: discord.gg/opportunex
- Documentation: docs.opportunex.com
- GitHub Issues: github.com/opportunex/issues

## License

AR/VR features are part of OpportuneX platform.
See LICENSE file for details.
