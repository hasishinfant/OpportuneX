# Social Features Documentation

## Overview

The OpportuneX platform includes comprehensive social collaboration features that enable students to connect, collaborate, and support each other in their journey to discover and prepare for opportunities.

## Features

### 1. User Profiles

**Public Profile Visibility**

- Users can view public profiles of other students
- Profiles display:
  - Name and institution
  - Technical skills and domains
  - Follower/following counts
  - Academic information (degree, institution)

**Privacy Settings**

- Profile information is selectively shared
- Sensitive data (email, phone) remains private
- Users control what information is visible

### 2. Follow System

**Following Users**

- Follow other students to see their activities
- View follower and following lists
- Unfollow functionality
- Cannot follow yourself (validation in place)

**API Endpoints**

- `POST /api/v1/social/follow` - Follow a user
- `DELETE /api/v1/social/follow/:followingId` - Unfollow a user
- `GET /api/v1/social/followers/:userId` - Get user's followers
- `GET /api/v1/social/following/:userId` - Get users being followed

### 3. Activity Feed

**Feed Content**

- Shows activities from followed users
- Activity types:
  - Saved opportunities
  - Completed roadmaps
  - Joined teams
  - Shared opportunities
  - Completed milestones

**Features**

- Paginated feed (20 items per page)
- Real-time updates when users perform actions
- Chronological ordering (newest first)

**API Endpoint**

- `GET /api/v1/social/feed` - Get activity feed (requires authentication)

### 4. Discussion Forums

**Opportunity Discussions**

- Create discussion threads on opportunities
- Comment on discussions
- Nested replies (parent-child comments)
- View comment counts

**Features**

- Thread-based conversations
- User attribution for all posts
- Soft delete (isActive flag)
- Chronological ordering

**API Endpoints**

- `GET /api/v1/social/discussions/:opportunityId` - Get discussions
- `POST /api/v1/social/discussions` - Create discussion
- `GET /api/v1/social/comments/:discussionId` - Get comments
- `POST /api/v1/social/comments` - Add comment

### 5. Team Formation

**Team Features**

- Create teams for hackathons or study groups
- Set team size limits (2-20 members)
- Public/private team visibility
- Link teams to specific opportunities

**Team Management**

- Creator becomes admin automatically
- Join/leave team functionality
- View team member count
- Team capacity management

**API Endpoints**

- `GET /api/v1/social/teams` - Get teams (optional opportunityId filter)
- `POST /api/v1/social/teams` - Create team
- `POST /api/v1/social/teams/:teamId/join` - Join team
- `DELETE /api/v1/social/teams/:teamId/leave` - Leave team

### 6. Direct Messaging

**Messaging Features**

- One-on-one messaging between users
- Message read status tracking
- Chronological message history
- Paginated message retrieval

**Features**

- Real-time message delivery
- Auto-mark as read when viewing
- Message history (50 messages per page)
- Sender/receiver identification

**API Endpoints**

- `POST /api/v1/social/messages` - Send message
- `GET /api/v1/social/messages/:otherUserId` - Get conversation

### 7. Content Sharing

**Share Features**

- Share opportunities with specific users
- Share roadmaps publicly or privately
- Add custom messages to shares
- Track shared content

**Sharing Options**

- Direct share to specific user
- Public share (visible to all followers)
- Private share with message

**API Endpoints**

- `POST /api/v1/social/share` - Share content
- `GET /api/v1/social/shared` - Get shared content

## Database Schema

### New Models

**UserFollow**

- Tracks follower/following relationships
- Unique constraint on follower-following pair
- Cascade delete on user deletion

**ActivityFeed**

- Stores user activities
- Indexed by userId and createdAt
- JSON metadata for flexible activity data

**Discussion**

- Discussion threads on opportunities
- Soft delete support
- User attribution

**Comment**

- Comments on discussions
- Nested replies support (parent-child)
- Soft delete support

**Team**

- Team information and settings
- Creator tracking
- Member capacity management

**TeamMember**

- Team membership records
- Role-based access (admin/member)
- Unique constraint on team-user pair

**DirectMessage**

- One-on-one messages
- Read status tracking
- Indexed for efficient retrieval

**SharedContent**

- Shared opportunities and roadmaps
- Public/private sharing
- Optional message attachment

## React Components

### UserProfileCard

- Displays public user profile
- Follow/unfollow button
- Skills and stats display

### ActivityFeed

- Shows activity stream
- Infinite scroll pagination
- Activity type formatting

### DiscussionThread

- Discussion list and creation
- Comment display
- Nested comment support

### TeamList

- Team browsing and creation
- Join team functionality
- Team capacity display

### DirectMessaging

- Chat interface
- Message history
- Real-time message sending

## Custom Hooks

### useSocial

Provides methods for:

- `followUser(followingId)` - Follow a user
- `unfollowUser(followingId)` - Unfollow a user
- `getPublicProfile(userId)` - Get user profile
- `shareContent(...)` - Share content
- `sendMessage(receiverId, content)` - Send DM
- `createTeam(...)` - Create team
- `joinTeam(teamId)` - Join team
- `createDiscussion(...)` - Create discussion
- `addComment(...)` - Add comment

## Usage Examples

### Following a User

```typescript
import { useSocial } from '@/hooks/useSocial';

const { followUser, loading, error } = useSocial();

const handleFollow = async () => {
  try {
    await followUser('user-id-123');
    console.log('Successfully followed user');
  } catch (err) {
    console.error('Failed to follow:', err);
  }
};
```

### Creating a Team

```typescript
import { useSocial } from '@/hooks/useSocial';

const { createTeam } = useSocial();

const handleCreateTeam = async () => {
  const team = await createTeam(
    'Hackathon Team',
    'Looking for developers',
    'opportunity-id-123',
    5,
    true
  );
  console.log('Team created:', team);
};
```

### Sending a Message

```typescript
import { useSocial } from '@/hooks/useSocial';

const { sendMessage } = useSocial();

const handleSendMessage = async () => {
  const message = await sendMessage(
    'receiver-id-123',
    'Hello! Want to collaborate?'
  );
  console.log('Message sent:', message);
};
```

## Security Considerations

1. **Authentication Required**: Most endpoints require JWT authentication
2. **Authorization**: Users can only perform actions on their own behalf
3. **Input Validation**: All inputs validated using Zod schemas
4. **Rate Limiting**: API gateway rate limiting applies to all endpoints
5. **Data Privacy**: Sensitive user data not exposed in public profiles

## Performance Optimizations

1. **Pagination**: All list endpoints support pagination
2. **Indexing**: Database indexes on frequently queried fields
3. **Selective Loading**: Only load necessary data for each view
4. **Caching**: Consider Redis caching for frequently accessed data

## Future Enhancements

1. **Real-time Updates**: WebSocket support for live messaging
2. **Notifications**: Push notifications for social interactions
3. **User Search**: Advanced user discovery and search
4. **Team Chat**: Group messaging within teams
5. **Content Reactions**: Like/upvote system for discussions
6. **User Blocking**: Block/report functionality
7. **Privacy Controls**: Granular privacy settings
8. **Activity Analytics**: Track engagement metrics

## Migration Guide

To enable social features in your database:

```bash
# Generate Prisma client with new schema
npm run db:generate

# Push schema changes to database
npm run db:push

# Or create and run migration
npm run db:migrate
```

## Testing

Run social feature tests:

```bash
npm run test -- social.service.test.ts
```

## API Documentation

Full API documentation available at:

- Development: `http://localhost:3001/api/v1/docs`
- Production: `https://api.opportunex.com/v1/docs`
