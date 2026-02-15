# Gamification Quick Start Guide

Get the gamification system up and running in 5 minutes.

## 1. Run Database Migration

```bash
# Apply gamification schema
psql -U postgres -d opportunex < prisma/migrations/add_gamification.sql
```

This creates:

- User points/level/streak columns
- Badges and user_badges tables
- Leaderboard tables
- Daily challenges tables
- Rewards system tables

## 2. Seed Initial Data

The migration automatically seeds:

- 10 default badges
- 5 default rewards

To seed daily challenges:

```bash
# Add script to package.json
npm pkg set scripts.seed:challenges="ts-node src/scripts/seed-daily-challenges.ts"

# Run seeding
npm run seed:challenges
```

## 3. Add Routes to API Gateway

The gamification routes are already integrated in `src/lib/api-gateway.ts`:

```typescript
this.app.use(`${apiPrefix}/gamification`, authMiddleware, gamificationRouter);
```

## 4. Test the API

```bash
# Start API Gateway
npm run api-gateway:dev

# Test endpoints (replace TOKEN with your JWT)
curl -H "Authorization: Bearer TOKEN" http://localhost:3001/api/v1/gamification/stats
curl -H "Authorization: Bearer TOKEN" http://localhost:3001/api/v1/gamification/leaderboard
curl -H "Authorization: Bearer TOKEN" http://localhost:3001/api/v1/gamification/challenges
```

## 5. Use in Your App

### Award Points

```typescript
import { gamificationService } from '@/lib/services/gamification.service';

// Award points for any action
await gamificationService.awardPoints(userId, 'search');
await gamificationService.awardPoints(userId, 'save_opportunity');
await gamificationService.awardPoints(userId, 'create_roadmap');
```

### Display Gamification UI

```typescript
// Add to your app
import { GamificationDashboard } from '@/components/gamification/GamificationDashboard';

// In your page
<GamificationDashboard />
```

### Show Leaderboard

```typescript
import { Leaderboard } from '@/components/gamification/Leaderboard';

<Leaderboard />
```

### Add Badge Showcase to Profile

```typescript
import { BadgeShowcase } from '@/components/gamification/BadgeShowcase';

<BadgeShowcase maxDisplay={3} compact={true} />
```

## 6. Integrate with Existing Features

### On User Login

```typescript
// Update streak and award daily login points
const streakResult = await gamificationService.updateStreak(userId);
await gamificationService.awardPoints(userId, 'daily_login');
```

### On Search

```typescript
// Award points for searching
await gamificationService.awardPoints(userId, 'search', { query });
```

### On Save Opportunity

```typescript
// Award points for saving
await gamificationService.awardPoints(userId, 'save_opportunity', {
  opportunityId,
});
```

### On Create Roadmap

```typescript
// Award points for roadmap creation
await gamificationService.awardPoints(userId, 'create_roadmap', { roadmapId });
```

## 7. Set Up Daily Challenge Automation

Create a cron job to generate new challenges daily:

```bash
# Add to crontab (runs at midnight)
0 0 * * * cd /path/to/opportunex && npm run seed:challenges
```

Or use a task scheduler service in production.

## Available Actions for Points

| Action                 | Points | Description              |
| ---------------------- | ------ | ------------------------ |
| complete_profile       | 50     | Complete user profile    |
| first_search           | 10     | First search ever        |
| search                 | 2      | Each search              |
| save_opportunity       | 5      | Save to favorites        |
| create_roadmap         | 25     | Create a roadmap         |
| complete_roadmap_phase | 15     | Complete roadmap phase   |
| follow_user            | 3      | Follow another user      |
| join_team              | 20     | Join a team              |
| create_team            | 30     | Create a team            |
| post_discussion        | 10     | Post in forum            |
| comment                | 5      | Comment on discussion    |
| share_opportunity      | 8      | Share opportunity        |
| daily_login            | 5      | Daily login bonus        |
| complete_challenge     | 50     | Complete daily challenge |
| interview_practice     | 15     | Practice interview       |

## Navigation Links

Add these to your app navigation:

```typescript
const navLinks = [
  { href: '/gamification', label: 'Progress', icon: '🎮' },
  { href: '/leaderboard', label: 'Leaderboard', icon: '🏆' },
  { href: '/rewards', label: 'Rewards', icon: '🎁' },
];
```

## Testing

```bash
# Run gamification tests
npm test src/test/gamification.service.test.ts
```

## Monitoring

Track these metrics:

- Daily active users with streaks
- Average points per user
- Challenge completion rate
- Reward redemption rate
- Leaderboard engagement

## Troubleshooting

### Points not updating?

- Check database connection
- Verify user ID is valid
- Check action name matches POINTS_CONFIG

### Leaderboard empty?

- Ensure users have points > 0
- Check period parameter is valid
- Verify leaderboard_entries table is populated

### Challenges not showing?

- Run seed script for today's date
- Check active_date matches current date
- Verify is_active = true

## Next Steps

1. Customize badge icons and images
2. Add more challenge types
3. Create seasonal events
4. Implement social sharing
5. Add achievement notifications
6. Create admin dashboard for gamification analytics

## Support

For issues or questions:

- Check docs/GAMIFICATION.md for detailed documentation
- Review API endpoints in src/lib/routes/gamification.ts
- Examine service logic in src/lib/services/gamification.service.ts
