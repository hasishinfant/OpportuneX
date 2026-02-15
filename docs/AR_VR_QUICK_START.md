# AR/VR Features Quick Start Guide

## Prerequisites

- Node.js 18+
- PostgreSQL 15+
- Modern browser with WebGL support
- Camera access (for AR features)

## Installation

### 1. Install Dependencies

```bash
npm install
```

The following packages are required for AR/VR features:

- `three` - 3D graphics library
- `@react-three/fiber` - React renderer for Three.js
- `@react-three/drei` - Useful helpers for R3F
- `socket.io` - Real-time communication
- `simple-peer` - WebRTC peer connections

### 2. Database Setup

Run the migration to add virtual events tables:

```bash
# Apply migration
psql -U your_user -d opportunex < prisma/migrations/add_virtual_events.sql

# Or use Prisma
npx prisma db push
```

### 3. Environment Variables

Add to your `.env` file:

```bash
# Virtual Events Configuration
ENABLE_VIRTUAL_EVENTS=true
MAX_PARTICIPANTS_PER_SPACE=100
WEBRTC_STUN_SERVER=stun:stun.l.google.com:19302

# Optional: Custom TURN server for better connectivity
WEBRTC_TURN_SERVER=turn:your-turn-server.com:3478
WEBRTC_TURN_USERNAME=username
WEBRTC_TURN_CREDENTIAL=password
```

## Quick Start

### 1. Create Your First Virtual Event Space

```typescript
// pages/api/create-space.ts
import { virtualEventsService } from '@/lib/services/virtual-events.service';

export default async function handler(req, res) {
  const space = await virtualEventsService.createEventSpace({
    name: 'My First Virtual Event',
    spaceType: 'conference',
    sceneConfig: {
      environment: 'indoor',
      lighting: {
        ambient: '#ffffff',
        directional: [
          {
            color: '#ffffff',
            intensity: 1,
            position: { x: 10, y: 20, z: 10 },
          },
        ],
      },
      floor: {
        color: '#34495e',
        size: { width: 50, depth: 50 },
      },
      objects: [],
    },
  });

  res.json(space);
}
```

### 2. Create a Virtual Event Page

```typescript
// app/virtual-event/[spaceId]/page.tsx
'use client';

import { useEffect } from 'react';
import { useVirtualEvents } from '@/hooks/useVirtualEvents';
import VirtualEventSpace from '@/components/virtual-events/VirtualEventSpace';

export default function VirtualEventPage({ params }) {
  const { fetchSpace, joinSpace, currentSpace, currentSession } = useVirtualEvents();

  useEffect(() => {
    fetchSpace(params.spaceId);
  }, [params.spaceId]);

  const handleJoin = async () => {
    await joinSpace(params.spaceId);
  };

  if (!currentSpace) {
    return <div>Loading...</div>;
  }

  if (!currentSession) {
    return (
      <div className="flex items-center justify-center h-screen">
        <button
          onClick={handleJoin}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg"
        >
          Join Virtual Event
        </button>
      </div>
    );
  }

  return (
    <VirtualEventSpace
      space={currentSpace}
      userPosition={{ x: 0, y: 0, z: 5 }}
      performanceMode="medium"
    />
  );
}
```

### 3. Set Up AR Business Cards

```typescript
// app/profile/business-card/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useArBusinessCard } from '@/hooks/useVirtualEvents';

export default function BusinessCardPage() {
  const { card, fetchCard, saveCard, generateQrCode } = useArBusinessCard();
  const [qrCode, setQrCode] = useState<string | null>(null);

  useEffect(() => {
    fetchCard();
  }, []);

  const handleCreate = async () => {
    await saveCard({
      name: 'Your Name',
      title: 'Your Title',
      company: 'Your Company',
      email: 'your@email.com',
      skills: ['Skill 1', 'Skill 2']
    });

    const qr = await generateQrCode();
    setQrCode(qr);
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">AR Business Card</h1>

      {!card ? (
        <button
          onClick={handleCreate}
          className="px-4 py-2 bg-blue-600 text-white rounded"
        >
          Create Business Card
        </button>
      ) : (
        <div>
          <h2>{card.cardData.name}</h2>
          <p>{card.cardData.title}</p>
          {qrCode && <img src={qrCode} alt="QR Code" />}
        </div>
      )}
    </div>
  );
}
```

### 4. Customize Avatar

```typescript
// app/profile/avatar/page.tsx
'use client';

import { useEffect } from 'react';
import { useAvatar } from '@/hooks/useVirtualEvents';
import AvatarCustomizer from '@/components/virtual-events/AvatarCustomizer';

export default function AvatarPage() {
  const { avatar, fetchAvatar, saveAvatar } = useAvatar();

  useEffect(() => {
    fetchAvatar();
  }, []);

  const handleSave = async (config) => {
    await saveAvatar(config);
    alert('Avatar saved!');
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Customize Avatar</h1>
      <AvatarCustomizer
        initialConfig={avatar?.avatarConfig}
        onSave={handleSave}
      />
    </div>
  );
}
```

## Testing

### Run Unit Tests

```bash
npm test -- virtual-events.service.test.ts
```

### Test in Browser

1. Start the development server:

```bash
npm run dev
```

2. Navigate to your virtual event page:

```
http://localhost:3000/virtual-event/[space-id]
```

3. Test device capabilities:

```javascript
// Open browser console
const capabilities = await fetch(
  '/api/virtual-events/device/capabilities'
).then(r => r.json());
console.log(capabilities);
```

## Device Testing

### Desktop Testing

1. Open in Chrome/Firefox
2. Use mouse to navigate
3. WASD keys to move
4. Test with different performance settings

### Mobile Testing

1. Open on smartphone
2. Test AR business card scanner
3. Verify touch controls
4. Check performance on 4G/5G

### VR Headset Testing (Optional)

1. Connect Meta Quest or similar
2. Open browser in VR mode
3. Click "Enter VR Mode" button
4. Test hand controllers

## Common Setup Issues

### Issue: Three.js not rendering

**Solution**: Ensure WebGL is enabled in browser settings

### Issue: Camera access denied

**Solution**: Grant camera permissions in browser settings

### Issue: Poor performance

**Solution**: System auto-adjusts, or manually set `performanceMode="low"`

### Issue: WebXR not available

**Solution**: Use Chrome 90+ or enable chrome://flags/#webxr

## Next Steps

1. **Read Full Documentation**: See `docs/AR_VR_FEATURES.md`
2. **Explore Examples**: Check `examples/virtual-events/`
3. **Join Community**: Discord server for support
4. **Contribute**: Submit PRs for improvements

## API Routes

The following API routes are available:

### Virtual Event Spaces

- `POST /api/virtual-events/spaces` - Create space
- `GET /api/virtual-events/spaces` - List spaces
- `GET /api/virtual-events/spaces/:id` - Get space
- `PUT /api/virtual-events/spaces/:id` - Update space
- `DELETE /api/virtual-events/spaces/:id` - Delete space

### Sessions

- `POST /api/virtual-events/spaces/:id/join` - Join space
- `POST /api/virtual-events/sessions/:id/leave` - Leave space
- `PUT /api/virtual-events/sessions/:id/position` - Update position

### AR Business Cards

- `POST /api/virtual-events/ar/business-card` - Create/update card
- `GET /api/virtual-events/ar/business-card` - Get user's card
- `POST /api/virtual-events/ar/business-card/exchange` - Exchange cards
- `POST /api/virtual-events/ar/business-card/qr-code` - Generate QR

### Avatars

- `POST /api/virtual-events/avatar` - Create/update avatar
- `GET /api/virtual-events/avatar` - Get user's avatar
- `GET /api/virtual-events/avatar/presets` - Get presets

### Device Capabilities

- `POST /api/virtual-events/device/capabilities` - Save capabilities
- `GET /api/virtual-events/device/capabilities` - Get capabilities
- `GET /api/virtual-events/device/recommended-settings` - Get settings

## Performance Tips

1. **Optimize Scene**: Limit objects to 50-100 per space
2. **Use LOD**: Implement level-of-detail for distant objects
3. **Texture Size**: Keep textures under 2048x2048
4. **Polygon Count**: Aim for <10k polygons per avatar
5. **Network**: Throttle position updates to 10Hz

## Security Best Practices

1. **Validate Input**: Always validate scene configurations
2. **Rate Limit**: Implement rate limiting on position updates
3. **Sanitize Content**: Check uploaded 3D models for malicious code
4. **Access Control**: Verify user permissions before space access
5. **Monitor Usage**: Track unusual activity patterns

## Support

Need help? Contact us:

- Email: support@opportunex.com
- Discord: discord.gg/opportunex
- Docs: docs.opportunex.com

Happy building! 🚀
