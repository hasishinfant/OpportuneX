# Video Conferencing Quick Start Guide

## 5-Minute Setup

### 1. Install Dependencies

Already included in `package.json`:

- `socket.io` and `socket.io-client`
- `simple-peer` (optional, for simplified WebRTC)

### 2. Configure Environment

Add to `.env`:

```bash
# Signaling Server
NEXT_PUBLIC_SIGNALING_URL=http://localhost:3001

# STUN Servers (free Google STUN)
# Already configured in code

# Optional: TURN Server for better connectivity
TURN_SERVER_URL=turn:your-server.com:3478
TURN_SERVER_USERNAME=username
TURN_SERVER_CREDENTIAL=password
```

### 3. Run Database Migration

```bash
psql -U postgres -d opportunex -f prisma/migrations/add_video_conferencing.sql
```

### 4. Start Services

```bash
# Terminal 1: Start Next.js app
npm run dev

# Terminal 2: Start API Gateway (includes signaling server)
npm run api-gateway:dev
```

### 5. Test Video Call

Create a test page at `src/app/video-test/page.tsx`:

```tsx
'use client';

import { useState } from 'react';
import { VideoCall } from '@/components/video-conferencing/VideoCall';

export default function VideoTestPage() {
  const [roomCode, setRoomCode] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [inCall, setInCall] = useState(false);

  const createRoom = async () => {
    const response = await fetch('/api/video/rooms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Test Room',
        roomType: 'group',
      }),
    });

    const { data } = await response.json();
    setRoomCode(data.roomCode);
    alert(`Room created! Code: ${data.roomCode}`);
  };

  const joinRoom = () => {
    if (roomCode && displayName) {
      setInCall(true);
    }
  };

  if (inCall) {
    return (
      <VideoCall
        roomCode={roomCode}
        displayName={displayName}
        onLeave={() => setInCall(false)}
      />
    );
  }

  return (
    <div className='min-h-screen flex items-center justify-center bg-gray-900'>
      <div className='bg-gray-800 p-8 rounded-lg shadow-xl max-w-md w-full'>
        <h1 className='text-2xl font-bold text-white mb-6'>Video Call Test</h1>

        <div className='space-y-4'>
          <button
            onClick={createRoom}
            className='w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg'
          >
            Create New Room
          </button>

          <div>
            <label className='block text-sm text-gray-300 mb-2'>
              Room Code
            </label>
            <input
              type='text'
              value={roomCode}
              onChange={e => setRoomCode(e.target.value)}
              placeholder='Enter room code'
              className='w-full px-3 py-2 bg-gray-700 text-white rounded-lg'
            />
          </div>

          <div>
            <label className='block text-sm text-gray-300 mb-2'>
              Your Name
            </label>
            <input
              type='text'
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              placeholder='Enter your name'
              className='w-full px-3 py-2 bg-gray-700 text-white rounded-lg'
            />
          </div>

          <button
            onClick={joinRoom}
            disabled={!roomCode || !displayName}
            className='w-full px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white rounded-lg'
          >
            Join Room
          </button>
        </div>
      </div>
    </div>
  );
}
```

### 6. Test the Setup

1. Open `http://localhost:3000/video-test`
2. Click "Create New Room"
3. Enter your name
4. Click "Join Room"
5. Allow camera/microphone access
6. Open another browser tab/window
7. Enter the same room code
8. Join and test video/audio

## Common Issues

### Camera/Microphone Not Working

**Solution**: Check browser permissions

- Chrome: Settings → Privacy → Site Settings → Camera/Microphone
- Firefox: Preferences → Privacy & Security → Permissions

### Cannot Connect to Other Participants

**Solution**: Configure TURN server

```bash
# Use a free TURN server or set up your own
TURN_SERVER_URL=turn:openrelay.metered.ca:80
TURN_SERVER_USERNAME=openrelayproject
TURN_SERVER_CREDENTIAL=openrelayproject
```

### Poor Video Quality

**Solution**: The system auto-adjusts, but you can force lower quality:

```typescript
// In VideoCall component
const constraints = getMediaConstraints('medium'); // or 'low'
```

## Production Deployment

### 1. Set Up TURN Server

For production, use a reliable TURN server:

**Option A: Use a service**

- [Twilio TURN](https://www.twilio.com/stun-turn)
- [Xirsys](https://xirsys.com/)
- [Metered](https://www.metered.ca/stun-turn)

**Option B: Self-host**

```bash
# Install coturn
sudo apt-get install coturn

# Configure /etc/turnserver.conf
listening-port=3478
external-ip=YOUR_SERVER_IP
realm=your-domain.com
user=username:password
```

### 2. Configure SSL

Video calls require HTTPS in production:

```nginx
server {
    listen 443 ssl;
    server_name your-domain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        proxy_pass http://localhost:3000;
    }

    location /socket.io/ {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

### 3. Scale Signaling Server

For high traffic, use Redis adapter:

```typescript
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient } from 'redis';

const pubClient = createClient({ url: 'redis://localhost:6379' });
const subClient = pubClient.duplicate();

await Promise.all([pubClient.connect(), subClient.connect()]);

io.adapter(createAdapter(pubClient, subClient));
```

### 4. Monitor Performance

Add monitoring:

```typescript
// Track active rooms
io.on('connection', socket => {
  console.log('Active connections:', io.engine.clientsCount);

  // Send metrics to monitoring service
  metrics.gauge('video.active_connections', io.engine.clientsCount);
});
```

## Integration Examples

### With Virtual Events

```typescript
// Create video room for virtual event presentation
const room = await videoService.createRoom(presenterId, {
  name: `${eventName} - Main Stage`,
  roomType: 'presentation',
  maxParticipants: 100,
});

// Link to virtual event
await db.query(
  'UPDATE virtual_event_spaces SET video_room_id = $1 WHERE id = $2',
  [room.id, virtualSpaceId]
);
```

### With Team Collaboration

```typescript
// Auto-create video room when team is formed
async function onTeamCreated(team: Team) {
  const room = await videoService.createRoom(team.creatorId, {
    name: `${team.name} - Team Room`,
    roomType: 'group',
    maxParticipants: team.maxMembers,
  });

  // Save room code to team
  await db.query('UPDATE teams SET video_room_code = $1 WHERE id = $2', [
    room.roomCode,
    team.id,
  ]);
}
```

### With Interview Prep

```typescript
// Schedule mock interview with recording
const room = await videoService.createRoom(mentorId, {
  name: 'Mock Interview - Software Engineer',
  roomType: 'interview',
  maxParticipants: 2,
  scheduledAt: interviewTime,
  settings: {
    recordingAutoStart: true,
    isWaitingRoomEnabled: false,
  },
});

// Send invite to student
await sendInterviewInvite(studentId, room.joinUrl);
```

## Next Steps

- Read the [full documentation](./VIDEO_CONFERENCING.md)
- Explore [bandwidth optimization](./VIDEO_CONFERENCING.md#bandwidth-optimization)
- Learn about [security features](./VIDEO_CONFERENCING.md#security)
- Check [API reference](./VIDEO_CONFERENCING.md#api-endpoints)

## Support

Need help? Check:

- [Troubleshooting guide](./VIDEO_CONFERENCING.md#troubleshooting)
- [GitHub issues](https://github.com/opportunex/issues)
- [Community forum](https://forum.opportunex.com)
