# Video Conferencing Documentation

## Overview

OpportuneX video conferencing enables real-time video communication for team collaboration, interviews, virtual events, and mentor-mentee sessions. The system is optimized for varying network conditions, particularly for users in Tier 2 and Tier 3 cities in India.

## Features

### Core Features

- **One-on-one and group video calls** (up to 10 participants)
- **Screen sharing** with audio
- **Audio-only mode** for low bandwidth
- **Recording functionality** with cloud storage
- **Virtual backgrounds** (blur and custom images)
- **In-call chat** with message history
- **Adaptive bitrate** based on network conditions
- **Connection quality indicators**

### Advanced Features

- **Waiting rooms** for host control
- **Host controls** (mute, remove participants)
- **Breakout rooms** for group discussions
- **Polls and reactions** for engagement
- **Hand raise functionality**
- **Bandwidth detection** and optimization
- **Automatic quality adjustment**

## Architecture

### Technology Stack

- **WebRTC** for peer-to-peer connections
- **Socket.io** for signaling server
- **PostgreSQL** for call data and history
- **STUN/TURN servers** for NAT traversal
- **React** for UI components

### Components

```
src/
├── lib/
│   ├── services/
│   │   ├── webrtc.service.ts          # WebRTC connection management
│   │   ├── signaling.service.ts       # Signaling server
│   │   └── video-conferencing.service.ts  # Call management
│   ├── routes/
│   │   └── video-conferencing.ts      # API routes
│   └── utils/
│       └── bandwidth-optimizer.ts     # Network optimization
├── components/
│   └── video-conferencing/
│       ├── VideoCall.tsx              # Main call component
│       ├── VideoControls.tsx          # Control buttons
│       ├── ParticipantGrid.tsx        # Video grid layout
│       └── ChatPanel.tsx              # In-call chat
└── types/
    └── video-conferencing.ts          # TypeScript types
```

## Getting Started

### Prerequisites

1. **STUN/TURN Servers**: Configure ICE servers for NAT traversal
2. **PostgreSQL**: Database for call data
3. **Socket.io Server**: Signaling server for WebRTC

### Environment Variables

Add to `.env`:

```bash
# Video Conferencing
NEXT_PUBLIC_SIGNALING_URL=http://localhost:3001
TURN_SERVER_URL=turn:your-turn-server.com:3478
TURN_SERVER_USERNAME=your-username
TURN_SERVER_CREDENTIAL=your-credential

# Recording Storage (optional)
VIDEO_STORAGE_BUCKET=your-s3-bucket
VIDEO_STORAGE_REGION=us-east-1
```

### Database Setup

Run the migration:

```bash
psql -U postgres -d opportunex -f prisma/migrations/add_video_conferencing.sql
```

### Start Signaling Server

The signaling server runs alongside the API gateway:

```bash
npm run api-gateway:dev
```

## Usage

### Creating a Room

```typescript
import { VideoConferencingService } from '@/lib/services/video-conferencing.service';

const service = new VideoConferencingService(pool);

const result = await service.createRoom('user-id', {
  name: 'Team Standup',
  roomType: 'group',
  maxParticipants: 10,
  scheduledAt: new Date('2024-01-15T10:00:00Z'),
  settings: {
    allowScreenShare: true,
    allowChat: true,
    muteOnEntry: false,
  },
});

console.log('Room Code:', result.roomCode);
console.log('Join URL:', result.joinUrl);
```

### Joining a Room

```typescript
const result = await service.joinRoom(
  {
    roomCode: 'ABC123',
    displayName: 'John Doe',
    password: 'optional-password',
  },
  'user-id'
);

// Use the ICE servers and token for WebRTC connection
const { iceServers, token, participant } = result;
```

### Using the VideoCall Component

```tsx
import { VideoCall } from '@/components/video-conferencing/VideoCall';

function MeetingPage() {
  return (
    <VideoCall
      roomCode='ABC123'
      displayName='John Doe'
      onLeave={() => router.push('/dashboard')}
    />
  );
}
```

## API Endpoints

### Create Room

```
POST /api/video/rooms
Authorization: Bearer <token>

Body:
{
  "name": "Team Meeting",
  "roomType": "group",
  "maxParticipants": 10,
  "scheduledAt": "2024-01-15T10:00:00Z",
  "settings": {
    "allowScreenShare": true
  }
}

Response:
{
  "success": true,
  "data": {
    "room": { ... },
    "roomCode": "ABC123",
    "joinUrl": "https://app.com/video/ABC123"
  }
}
```

### Join Room

```
POST /api/video/rooms/:roomCode/join

Body:
{
  "displayName": "John Doe",
  "password": "optional"
}

Response:
{
  "success": true,
  "data": {
    "room": { ... },
    "participant": { ... },
    "token": "...",
    "iceServers": [...]
  }
}
```

### Update Media State

```
PATCH /api/video/participants/:participantId/media

Body:
{
  "isAudioEnabled": false,
  "isVideoEnabled": true,
  "isHandRaised": false
}
```

### Start Recording

```
POST /api/video/rooms/:roomId/recording/start
Authorization: Bearer <token>

Body:
{
  "format": "webm",
  "quality": "high"
}
```

### Send Chat Message

```
POST /api/video/rooms/:roomId/messages

Body:
{
  "participantId": "participant-id",
  "content": "Hello everyone!"
}
```

### Create Poll

```
POST /api/video/rooms/:roomId/polls
Authorization: Bearer <token>

Body:
{
  "question": "What time works best?",
  "options": ["10 AM", "2 PM", "4 PM"],
  "allowMultiple": false,
  "durationMinutes": 5
}
```

### Create Breakout Rooms

```
POST /api/video/rooms/:roomId/breakout-rooms
Authorization: Bearer <token>

Body:
{
  "count": 3,
  "names": ["Room 1", "Room 2", "Room 3"],
  "autoAssign": true,
  "durationMinutes": 15
}
```

## Bandwidth Optimization

### Adaptive Bitrate

The system automatically adjusts video quality based on network conditions:

```typescript
import { AdaptiveBitrateController } from '@/lib/utils/bandwidth-optimizer';

const controller = new AdaptiveBitrateController('high');

// Monitor and adjust
const conditions = await detectNetworkConditions();
const quality = controller.updateQuality(conditions);

// Apply to WebRTC
await webrtcService.adjustVideoQuality(peerId, quality);
```

### Quality Levels

| Quality | Resolution | Frame Rate | Bitrate  | Bandwidth Required |
| ------- | ---------- | ---------- | -------- | ------------------ |
| Low     | 320x240    | 15 fps     | 150 kbps | 0.5 Mbps           |
| Medium  | 640x480    | 24 fps     | 500 kbps | 1 Mbps             |
| High    | 1280x720   | 30 fps     | 1.2 Mbps | 2 Mbps             |
| HD      | 1920x1080  | 30 fps     | 2.5 Mbps | 5 Mbps             |

### Audio-Only Mode

For very poor connections:

```typescript
import { shouldUseAudioOnly } from '@/lib/utils/bandwidth-optimizer';

const conditions = await detectNetworkConditions();

if (shouldUseAudioOnly(conditions)) {
  // Disable video, use audio only
  webrtcService.toggleVideo(false);
}
```

## Integration Points

### Virtual Event Spaces

Video conferencing integrates with virtual events for presentations:

```typescript
// Start presentation in virtual event
const room = await service.createRoom(userId, {
  name: 'Hackathon Presentation',
  roomType: 'presentation',
  maxParticipants: 100,
});

// Link to virtual event space
await linkRoomToVirtualSpace(room.id, virtualSpaceId);
```

### Team Collaboration

For hackathon teams:

```typescript
// Create team collaboration room
const room = await service.createRoom(teamLeaderId, {
  name: `Team ${teamName} Workspace`,
  roomType: 'group',
  maxParticipants: 6,
});
```

### Interview Preparation

For mock interviews:

```typescript
// Create interview room
const room = await service.createRoom(mentorId, {
  name: 'Mock Interview Session',
  roomType: 'interview',
  maxParticipants: 2,
  settings: {
    recordingAutoStart: true,
  },
});
```

## Best Practices

### For Hosts

1. **Test connection** before important calls
2. **Use waiting room** for large meetings
3. **Mute participants** on entry for webinars
4. **Enable recording** for important sessions
5. **Use breakout rooms** for group activities

### For Participants

1. **Check camera/microphone** before joining
2. **Use headphones** to prevent echo
3. **Mute when not speaking** in large calls
4. **Use virtual background** if needed
5. **Close other apps** for better performance

### For Low Bandwidth

1. **Disable video** and use audio-only
2. **Close unnecessary browser tabs**
3. **Use wired connection** if possible
4. **Reduce video quality** manually
5. **Disable virtual backgrounds**

## Troubleshooting

### Cannot Access Camera/Microphone

```typescript
// Check permissions
const support = checkWebRTCSupport();

if (!support.features.getUserMedia) {
  alert('Your browser does not support video calls');
}

// Request permissions
try {
  await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
} catch (error) {
  console.error('Permission denied:', error);
}
```

### Poor Connection Quality

```typescript
// Measure bandwidth
const conditions = await detectNetworkConditions();

console.log('Download:', conditions.downloadMbps, 'Mbps');
console.log('Upload:', conditions.uploadMbps, 'Mbps');
console.log('Latency:', conditions.latencyMs, 'ms');

// Recommend quality
const quality = recommendVideoQuality(conditions);
console.log('Recommended quality:', quality);
```

### Connection Fails

1. **Check STUN/TURN servers** are configured
2. **Verify firewall settings** allow WebRTC
3. **Test with different network**
4. **Check browser console** for errors

## Security

### Room Access Control

- **Password protection** for sensitive meetings
- **Waiting room** for host approval
- **Room locking** to prevent new joins
- **Participant removal** by host

### Data Privacy

- **End-to-end encryption** for peer connections
- **Secure signaling** over WSS
- **Recording consent** required
- **Data retention policies** enforced

## Performance Monitoring

### Connection Statistics

```typescript
// Get connection stats
const stats = await webrtcService.getConnectionStats(peerId);

stats.forEach(report => {
  if (report.type === 'inbound-rtp') {
    console.log('Packets received:', report.packetsReceived);
    console.log('Packets lost:', report.packetsLost);
    console.log('Jitter:', report.jitter);
  }
});
```

### Analytics

Track call metrics:

- Total participants
- Peak concurrent users
- Average call duration
- Connection quality distribution
- Bandwidth usage

## Future Enhancements

- [ ] AI-powered noise cancellation
- [ ] Real-time transcription
- [ ] Live translation
- [ ] Virtual hand gestures
- [ ] Whiteboard collaboration
- [ ] File sharing during calls
- [ ] Calendar integration
- [ ] Mobile app support

## Support

For issues or questions:

- Check the [troubleshooting guide](#troubleshooting)
- Review [API documentation](#api-endpoints)
- Contact support team

## License

Part of the OpportuneX platform.
