/**
 * Seed Daily Challenges Script
 * Creates daily challenges for gamification
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const challengeTemplates = [
  {
    title: 'Search Explorer',
    description: 'Search for 5 opportunities today',
    challengeType: 'search',
    targetValue: 5,
    pointsReward: 25,
  },
  {
    title: 'Opportunity Collector',
    description: 'Save 3 opportunities to your favorites',
    challengeType: 'save_opportunity',
    targetValue: 3,
    pointsReward: 30,
  },
  {
    title: 'Profile Perfectionist',
    description: 'Update your profile information',
    challengeType: 'complete_profile',
    targetValue: 1,
    pointsReward: 50,
  },
  {
    title: 'Roadmap Builder',
    description: 'Create a preparation roadmap',
    challengeType: 'create_roadmap',
    targetValue: 1,
    pointsReward: 40,
  },
  {
    title: 'Social Connector',
    description: 'Follow 2 new users',
    challengeType: 'follow_user',
    targetValue: 2,
    pointsReward: 20,
  },
  {
    title: 'Community Contributor',
    description: 'Post in a discussion forum',
    challengeType: 'post_discussion',
    targetValue: 1,
    pointsReward: 35,
  },
  {
    title: 'Interview Warrior',
    description: 'Practice 3 interview questions',
    challengeType: 'interview_practice',
    targetValue: 3,
    pointsReward: 45,
  },
  {
    title: 'Team Player',
    description: 'Join or create a team',
    challengeType: 'join_team',
    targetValue: 1,
    pointsReward: 30,
  },
];

async function seedDailyChallenges() {
  console.log('🎮 Seeding daily challenges...');

  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];

  // Select 3 random challenges for today
  const shuffled = challengeTemplates.sort(() => 0.5 - Math.random());
  const todaysChallenges = shuffled.slice(0, 3);

  for (const challenge of todaysChallenges) {
    await prisma.$executeRaw`
      INSERT INTO daily_challenges (
        title,
        description,
        challenge_type,
        target_value,
        points_reward,
        active_date,
        is_active
      )
      VALUES (
        ${challenge.title},
        ${challenge.description},
        ${challenge.challengeType},
        ${challenge.targetValue},
        ${challenge.pointsReward},
        ${todayStr}::date,
        true
      )
      ON CONFLICT DO NOTHING
    `;

    console.log(`✓ Created challenge: ${challenge.title}`);
  }

  console.log('✅ Daily challenges seeded successfully!');
}

async function seedFutureChallenges(days: number = 7) {
  console.log(`🎮 Seeding challenges for next ${days} days...`);

  for (let i = 1; i <= days; i++) {
    const date = new Date();
    date.setDate(date.getDate() + i);
    const dateStr = date.toISOString().split('T')[0];

    // Select 3 random challenges for each day
    const shuffled = challengeTemplates.sort(() => 0.5 - Math.random());
    const dayChallenges = shuffled.slice(0, 3);

    for (const challenge of dayChallenges) {
      await prisma.$executeRaw`
        INSERT INTO daily_challenges (
          title,
          description,
          challenge_type,
          target_value,
          points_reward,
          active_date,
          is_active
        )
        VALUES (
          ${challenge.title},
          ${challenge.description},
          ${challenge.challengeType},
          ${challenge.targetValue},
          ${challenge.pointsReward},
          ${dateStr}::date,
          true
        )
        ON CONFLICT DO NOTHING
      `;
    }

    console.log(`✓ Created challenges for ${dateStr}`);
  }

  console.log('✅ Future challenges seeded successfully!');
}

async function main() {
  try {
    await seedDailyChallenges();
    await seedFutureChallenges(7);
  } catch (error) {
    console.error('Error seeding challenges:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
