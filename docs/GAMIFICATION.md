# Gamification System Documentation

## Overview

OpportuneX includes a comprehensive gamification system to increase user engagement and motivation. The system includes points, levels, badges, leaderboards, daily challenges, streaks, and rewards.

## Features

### 1. Points and Levels

Users earn points for various activities on the platform:

- **Complete Profile**: 50 points
- **First Search**: 10 points
- **Search**: 2 points per search
- **Save Opportunity**: 5 points
- **Create Roadmap**: 25 points
- **Complete Roadmap Phase**: 15 points
- **Follow User**: 3 points
- **Join Team**: 20 points
- **Create Team**: 30 points
- **Post Discussion**: 10 points
- **Comment**: 5 points
- **Share Opportunity**: 8 points
- **Daily Login**: 5 points
- **Complete Challenge**: 50 points
- **Interview Practice**: 15 points

**Level Calculation**: Level = floor(points / 100) + 1

### 2. Badges

Badges are earned by completing specific achievements:

#### Milestone Badges

- **First Steps**: Complete your profile
- **Explorer**: Search for 10 opportunities
- **Bookworm**: Save 5 opportunities

#### Streak Badges

- **Dedicated**: 7-day login streak
- **Committed**: 30-day login streak

#### Achievement Badges

- **Roadmap Creator**: Create your first roadmap
- **Social Butterfly**: Follow 10 users
- **Team Player**: Join a team

#### Special Badges

- **Early Bird**: Login before 6 AM
- **Night Owl**: Login after 10 PM

### 3. Leaderboards

Four leaderboard periods:

- **Daily**: Resets every day at midnight
- **Weekly**: Resets every Monday
- **Monthly**: Resets on the 1st of each month
- **All Time**: Never resets

### 4. Daily Challenges

Three new challenges are generated each day from a pool of challenge types:

- Search Explorer (5 searches)
- Opportunity Collector (3 saves)
- Profile Perfectionist (update profile)
- Roadmap Builder (create roadmap)
- Social Connector (follow 2 users)
- Community Contributor (post discussion)
- Interview Warrior (practice 3 questions)
- Team Player (join/create team)

### 5. Streak System

- **Current Streak**: Consecutive days of login
- **Longest Streak**: Best streak ever achieved
- **Streak Bonus**: 10 points for every 7-day milestone
- Streak breaks if user doesn't login for a day

### 6. Rewards Shop

Users can spend points on virtual rewards:

#### Themes (100-150 points)

- Dark Blue theme
- Sunset theme

#### Features (200-300 points)

- Badge Showcase (display 5 badges on profile)
- Priority Notifications (1 hour earlier)

#### Cosmetics (250 points)

- Custom Avatar Borders

## API Endpoints

### Get User Stats

```
GET /api/v1/gamification/stats
```

Returns user's points, level, streak, badges earned, and recent achievements.

### Award Points

```
POST /api/v1/gamification/points
Body: { "action": "search", "metadata": {} }
```

Awards points for a specific action.

### Get Badges

```
GET /api/v1/gamification/badges
```

Returns user's earned badges.

### Get Available Badges

```
GET /api/v1/gamification/badges/available
```

Returns badges not yet earned.

### Get Leaderboard

```
GET /api/v1/gamification/leaderboard?period=all_time&limit=100
```

Returns leaderboard for specified period.

### Get User Rank

```
GET /api/v1/gamification/rank?period=all_time
```

Returns user's rank in leaderboard.

### Get Daily Challenges

```
GET /api/v1/gamification/challenges
```

Returns today's challenges with progress.

### Update Streak

```
POST /api/v1/gamification/streak
```

Updates user's login streak.

### Get Rewards

```
GET /api/v1/gamification/rewards
```

Returns available rewards in the shop.

### Claim Reward

```
POST /api/v1/gamification/rewards/:rewardId/claim
```

Claims a reward if user has enough points.

## React Components

### GamificationDashboard

Main dashboard showing stats, badges, and challenges.

```tsx
import { GamificationDashboard } from '@/components/gamification/GamificationDashboard';

<GamificationDashboard />;
```

### Leaderboard

Display rankings of users.

```tsx
import { Leaderboard } from '@/components/gamification/Leaderboard';

<Leaderboard />;
```

### RewardsShop

Shop for claiming rewards.

```tsx
import { RewardsShop } from '@/components/gamification/RewardsShop';

<RewardsShop />;
```

### BadgeShowcase

Compact badge display for profiles.

```tsx
import { BadgeShowcase } from '@/components/gamification/BadgeShowcase';

<BadgeShowcase maxDisplay={3} compact={true} />;
```

### PointsNotification

Toast notification for points earned.

```tsx
import { PointsNotification } from '@/components/gamification/PointsNotification';

<PointsNotification
  points={10}
  action='Searched for opportunities'
  levelUp={false}
/>;
```

## React Hook

```tsx
import { useGamification } from '@/hooks/useGamification';

function MyComponent() {
  const {
    stats,
    badges,
    leaderboard,
    challenges,
    rewards,
    awardPoints,
    updateStreak,
    claimReward,
  } = useGamification();

  // Award points
  await awardPoints('search', { query: 'hackathon' });

  // Update streak on login
  await updateStreak();

  // Claim reward
  await claimReward(rewardId);
}
```

## Database Schema

### Tables

- **users**: Extended with points, level, streak fields
- **badges**: Badge definitions
- **user_badges**: User's earned badges
- **points_history**: History of points earned
- **leaderboard_entries**: Leaderboard rankings by period
- **daily_challenges**: Challenge definitions
- **user_challenge_progress**: User progress on challenges
- **achievements**: Special accomplishments
- **rewards**: Reward definitions
- **user_rewards**: User's claimed rewards

## Setup Instructions

### 1. Run Migration

```bash
psql -U your_user -d opportunex < prisma/migrations/add_gamification.sql
```

### 2. Seed Daily Challenges

```bash
npm run seed:challenges
```

Add to package.json:

```json
{
  "scripts": {
    "seed:challenges": "ts-node src/scripts/seed-daily-challenges.ts"
  }
}
```

### 3. Set Up Cron Job

Create a cron job to seed challenges daily:

```bash
0 0 * * * cd /path/to/opportunex && npm run seed:challenges
```

## Integration Examples

### Award Points on Search

```typescript
// In search service
import { gamificationService } from '@/lib/services/gamification.service';

async function performSearch(userId: string, query: string) {
  // Perform search
  const results = await searchService.search(query);

  // Award points
  if (userId) {
    await gamificationService.awardPoints(userId, 'search', { query });
  }

  return results;
}
```

### Update Streak on Login

```typescript
// In auth service
import { gamificationService } from '@/lib/services/gamification.service';

async function login(email: string, password: string) {
  // Authenticate user
  const user = await authService.authenticate(email, password);

  // Update streak
  const streakResult = await gamificationService.updateStreak(user.id);

  // Award daily login points
  await gamificationService.awardPoints(user.id, 'daily_login');

  return { user, streak: streakResult };
}
```

### Show Points Notification

```typescript
// In a component
import { usePointsNotification } from '@/components/gamification/PointsNotification';

function SearchComponent() {
  const { notification, showNotification } = usePointsNotification();

  const handleSearch = async () => {
    // Perform search
    const result = await awardPoints('search');

    // Show notification
    showNotification(result.points, 'Searched for opportunities', result.levelUp);
  };

  return (
    <>
      {/* Search UI */}
      {notification && (
        <PointsNotification {...notification} />
      )}
    </>
  );
}
```

## Best Practices

1. **Award Points Asynchronously**: Don't block user actions waiting for points
2. **Cache Leaderboards**: Use Redis to cache leaderboard data
3. **Batch Updates**: Update leaderboards in batches rather than on every point change
4. **Rate Limit**: Prevent point farming by rate limiting certain actions
5. **Validate Actions**: Always validate that the action actually occurred before awarding points
6. **Monitor Abuse**: Track unusual patterns that might indicate gaming the system

## Performance Considerations

- Leaderboard queries are indexed on period and rank
- Points history is indexed on user_id and created_at
- Use database triggers for automatic level calculation
- Consider caching user stats in Redis for frequently accessed data

## Future Enhancements

- Seasonal events with special badges
- Team-based challenges
- Achievement sharing on social media
- Personalized challenge recommendations
- Weekly tournaments with special prizes
- Badge rarity tiers (common, rare, epic, legendary)
- Point multipliers for special events
- Referral rewards
