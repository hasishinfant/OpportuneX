#!/usr/bin/env tsx

/**
 * Database seeding script for OpportuneX
 * This script initializes the database with sample data for development
 */

import { PrismaClient } from '@prisma/client';
import { DatabaseInitializer } from '../lib/db-init';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  try {
    // Initialize database with extensions and basic setup
    await DatabaseInitializer.initialize();

    // Seed sample users
    await seedUsers();

    // Seed sample opportunities
    await seedOpportunities();

    console.log('✅ Database seeding completed successfully!');
  } catch (error) {
    console.error('❌ Database seeding failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

async function seedUsers() {
  console.log('👥 Seeding sample users...');

  const sampleUsers = [
    {
      email: 'student1@example.com',
      name: 'Rahul Sharma',
      phone: '9876543210',
      passwordHash: '$2b$10$example.hash.for.development', // In real app, use proper hashing
      city: 'Indore',
      state: 'Madhya Pradesh',
      tier: 2,
      institution: 'IIT Indore',
      degree: 'B.Tech Computer Science',
      year: 3,
      cgpa: 8.5,
      technicalSkills: ['JavaScript', 'React', 'Node.js', 'Python'],
      domains: ['Web Development', 'Machine Learning'],
      proficiencyLevel: 'intermediate' as const,
      preferredOpportunityTypes: ['hackathon', 'internship'] as const,
      preferredMode: 'hybrid' as const,
      maxDistance: 500,
    },
    {
      email: 'student2@example.com',
      name: 'Priya Patel',
      phone: '9876543211',
      passwordHash: '$2b$10$example.hash.for.development',
      city: 'Vadodara',
      state: 'Gujarat',
      tier: 2,
      institution: 'MS University',
      degree: 'B.Tech Information Technology',
      year: 2,
      cgpa: 9.0,
      technicalSkills: ['Java', 'Spring Boot', 'MySQL', 'Android'],
      domains: ['Mobile Development', 'Backend Development'],
      proficiencyLevel: 'beginner' as const,
      preferredOpportunityTypes: ['workshop', 'internship'] as const,
      preferredMode: 'online' as const,
      maxDistance: 200,
    },
    {
      email: 'student3@example.com',
      name: 'Arjun Kumar',
      phone: '9876543212',
      passwordHash: '$2b$10$example.hash.for.development',
      city: 'Mysore',
      state: 'Karnataka',
      tier: 3,
      institution: 'University of Mysore',
      degree: 'MCA',
      year: 1,
      cgpa: 7.8,
      technicalSkills: ['Python', 'Django', 'PostgreSQL', 'Docker'],
      domains: ['Backend Development', 'DevOps'],
      proficiencyLevel: 'advanced' as const,
      preferredOpportunityTypes: ['hackathon', 'workshop'] as const,
      preferredMode: 'offline' as const,
      maxDistance: 300,
    },
  ];

  for (const user of sampleUsers) {
    try {
      await prisma.user.upsert({
        where: { email: user.email },
        update: {},
        create: user,
      });
      console.log(`✅ Created user: ${user.name}`);
    } catch (error) {
      console.warn(`⚠️ Failed to create user ${user.name}:`, error);
    }
  }
}

async function seedOpportunities() {
  console.log('🎯 Seeding sample opportunities...');

  const sampleOpportunities = [
    {
      title: 'Smart India Hackathon 2024',
      description:
        'National level hackathon to solve real-world problems using innovative technology solutions. Open to all engineering students.',
      type: 'hackathon' as const,
      organizerName: 'Government of India',
      organizerType: 'government' as const,
      organizerLogo: 'https://example.com/sih-logo.png',
      requiredSkills: ['JavaScript', 'Python', 'React', 'Node.js', 'AI/ML'],
      experienceRequired: 'Beginner to Advanced',
      educationRequired: 'Engineering Students',
      eligibilityCriteria: [
        'Must be a student',
        'Team of 6 members',
        'Age limit: 25 years',
      ],
      mode: 'hybrid' as const,
      location: 'Multiple Cities',
      duration: '36 hours',
      stipend: 'No stipend',
      prizes: [
        '₹1,00,000 for Winner',
        '₹50,000 for Runner-up',
        'Certificates for all',
      ],
      applicationDeadline: new Date('2024-03-15T23:59:59Z'),
      startDate: new Date('2024-04-01T09:00:00Z'),
      endDate: new Date('2024-04-03T18:00:00Z'),
      externalUrl: 'https://sih.gov.in',
      sourceId: 'unstop',
      tags: ['hackathon', 'government', 'technology', 'innovation'],
      qualityScore: 95,
    },
    {
      title: 'Google Summer of Code 2024',
      description:
        'Global program focused on bringing more student developers into open source software development.',
      type: 'internship' as const,
      organizerName: 'Google',
      organizerType: 'corporate' as const,
      organizerLogo: 'https://example.com/google-logo.png',
      requiredSkills: ['Open Source', 'Git', 'Programming Languages'],
      experienceRequired: 'Intermediate',
      educationRequired: 'University Students',
      eligibilityCriteria: [
        'Must be 18+ years old',
        'Enrolled in university',
        'Open source experience',
      ],
      mode: 'online' as const,
      location: 'Remote',
      duration: '12 weeks',
      stipend: '$3000 USD',
      prizes: ['Stipend', 'Certificate', 'Mentorship', 'T-shirt'],
      applicationDeadline: new Date('2024-04-02T18:00:00Z'),
      startDate: new Date('2024-05-27T00:00:00Z'),
      endDate: new Date('2024-08-26T23:59:59Z'),
      externalUrl: 'https://summerofcode.withgoogle.com',
      sourceId: 'github_jobs',
      tags: ['internship', 'open-source', 'remote', 'google'],
      qualityScore: 98,
    },
    {
      title: 'Microsoft Learn Student Ambassador Program',
      description:
        'Leadership program for students to learn, lead, and make a difference in their communities.',
      type: 'workshop' as const,
      organizerName: 'Microsoft',
      organizerType: 'corporate' as const,
      organizerLogo: 'https://example.com/microsoft-logo.png',
      requiredSkills: ['Leadership', 'Communication', 'Technology'],
      experienceRequired: 'Beginner',
      educationRequired: 'University Students',
      eligibilityCriteria: [
        'Must be 16+ years old',
        'Enrolled in university',
        'Passion for technology',
      ],
      mode: 'online' as const,
      location: 'Global',
      duration: '1 year',
      stipend: 'No stipend',
      prizes: ['Certification', 'Azure Credits', 'Exclusive Events', 'Swag'],
      applicationDeadline: new Date('2024-12-31T23:59:59Z'),
      startDate: new Date('2024-01-01T00:00:00Z'),
      endDate: new Date('2024-12-31T23:59:59Z'),
      externalUrl: 'https://studentambassadors.microsoft.com',
      sourceId: 'internshala',
      tags: ['workshop', 'leadership', 'microsoft', 'ambassador'],
      qualityScore: 92,
    },
    {
      title: 'HackerEarth Deep Learning Challenge',
      description:
        'Solve complex machine learning problems and compete with developers worldwide.',
      type: 'hackathon' as const,
      organizerName: 'HackerEarth',
      organizerType: 'startup' as const,
      organizerLogo: 'https://example.com/hackerearth-logo.png',
      requiredSkills: [
        'Python',
        'Machine Learning',
        'Deep Learning',
        'TensorFlow',
        'PyTorch',
      ],
      experienceRequired: 'Intermediate to Advanced',
      educationRequired: 'No specific requirement',
      eligibilityCriteria: ['Open to all', 'Individual participation'],
      mode: 'online' as const,
      location: 'Online',
      duration: '7 days',
      stipend: 'No stipend',
      prizes: [
        '₹50,000 for Winner',
        '₹25,000 for Runner-up',
        'HackerEarth T-shirts',
      ],
      applicationDeadline: new Date('2024-02-28T23:59:59Z'),
      startDate: new Date('2024-03-01T00:00:00Z'),
      endDate: new Date('2024-03-07T23:59:59Z'),
      externalUrl: 'https://hackerearth.com/challenges',
      sourceId: 'hackerearth',
      tags: ['hackathon', 'machine-learning', 'deep-learning', 'ai'],
      qualityScore: 88,
    },
    {
      title: 'Flipkart Grid 5.0 - Software Development Track',
      description:
        'National level hackathon by Flipkart focusing on e-commerce and technology solutions.',
      type: 'hackathon' as const,
      organizerName: 'Flipkart',
      organizerType: 'corporate' as const,
      organizerLogo: 'https://example.com/flipkart-logo.png',
      requiredSkills: [
        'Full Stack Development',
        'System Design',
        'Database',
        'API Development',
      ],
      experienceRequired: 'Intermediate',
      educationRequired: 'Engineering Students',
      eligibilityCriteria: [
        'Team of 2-4 members',
        'Engineering students only',
        'Age limit: 25 years',
      ],
      mode: 'hybrid' as const,
      location: 'Bangalore',
      duration: '48 hours',
      stipend: 'No stipend',
      prizes: [
        '₹2,00,000 for Winner',
        '₹1,00,000 for Runner-up',
        'Internship opportunities',
      ],
      applicationDeadline: new Date('2024-06-15T23:59:59Z'),
      startDate: new Date('2024-07-01T09:00:00Z'),
      endDate: new Date('2024-07-03T18:00:00Z'),
      externalUrl: 'https://flipkart.com/grid',
      sourceId: 'devfolio',
      tags: ['hackathon', 'flipkart', 'e-commerce', 'full-stack'],
      qualityScore: 94,
    },
  ];

  for (const opportunity of sampleOpportunities) {
    try {
      await prisma.opportunity.create({
        data: opportunity,
      });
      console.log(`✅ Created opportunity: ${opportunity.title}`);
    } catch (error) {
      console.warn(
        `⚠️ Failed to create opportunity ${opportunity.title}:`,
        error
      );
    }
  }
}

// Run the seeding script
main().catch(e => {
  console.error('❌ Seeding script failed:', e);
  process.exit(1);
});
