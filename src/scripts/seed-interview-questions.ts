/**
 * Seed script for interview questions
 * Run with: npx tsx src/scripts/seed-interview-questions.ts
 */

interface Question {
  category: string;
  subcategory?: string;
  difficulty: string;
  question: string;
  expectedAnswer?: string;
  tags: string[];
  companySpecific?: string;
}

const technicalQuestions: Question[] = [
  {
    category: 'technical',
    subcategory: 'Data Structures',
    difficulty: 'beginner',
    question: 'What is an array and when would you use it?',
    tags: ['data-structures', 'arrays', 'fundamentals'],
  },
  {
    category: 'technical',
    subcategory: 'Data Structures',
    difficulty: 'intermediate',
    question:
      'Explain the difference between a stack and a queue. Provide use cases for each.',
    tags: ['data-structures', 'stack', 'queue'],
  },
  {
    category: 'technical',
    subcategory: 'Algorithms',
    difficulty: 'intermediate',
    question:
      'What is the time complexity of binary search? Explain how it works.',
    tags: ['algorithms', 'binary-search', 'complexity'],
  },
  {
    category: 'technical',
    subcategory: 'Web Development',
    difficulty: 'intermediate',
    question:
      'Explain the difference between REST and GraphQL APIs. What are the pros and cons?',
    tags: ['web', 'api', 'rest', 'graphql'],
  },
  {
    category: 'technical',
    subcategory: 'Databases',
    difficulty: 'intermediate',
    question: 'What is database normalization? Why is it important?',
    tags: ['database', 'normalization', 'sql'],
  },
];

const behavioralQuestions: Question[] = [
  {
    category: 'behavioral',
    difficulty: 'intermediate',
    question:
      'Tell me about a time when you had to work with a difficult team member. How did you handle it?',
    tags: ['teamwork', 'conflict-resolution', 'communication'],
  },
  {
    category: 'behavioral',
    difficulty: 'intermediate',
    question:
      'Describe a project where you had to learn a new technology quickly. What was your approach?',
    tags: ['learning', 'adaptability', 'self-motivation'],
  },
  {
    category: 'behavioral',
    difficulty: 'intermediate',
    question:
      'Give an example of a time when you failed. What did you learn from it?',
    tags: ['failure', 'growth-mindset', 'resilience'],
  },
  {
    category: 'behavioral',
    difficulty: 'advanced',
    question:
      'Tell me about a time when you had to make a difficult decision with incomplete information.',
    tags: ['decision-making', 'leadership', 'critical-thinking'],
  },
];

const systemDesignQuestions: Question[] = [
  {
    category: 'system_design',
    difficulty: 'advanced',
    question:
      'Design a URL shortening service like bit.ly. Consider scalability and reliability.',
    tags: ['system-design', 'scalability', 'databases', 'distributed-systems'],
  },
  {
    category: 'system_design',
    difficulty: 'advanced',
    question:
      'How would you design a real-time chat application? Discuss architecture and technology choices.',
    tags: ['system-design', 'real-time', 'websockets', 'scalability'],
  },
  {
    category: 'system_design',
    difficulty: 'advanced',
    question:
      'Design a rate limiting system for an API. How would you handle distributed scenarios?',
    tags: ['system-design', 'rate-limiting', 'distributed-systems'],
  },
];

const codingQuestions: Question[] = [
  {
    category: 'coding',
    difficulty: 'beginner',
    question: 'Write a function to reverse a string. Explain your approach.',
    tags: ['coding', 'strings', 'algorithms'],
  },
  {
    category: 'coding',
    difficulty: 'intermediate',
    question:
      'Write a function to reverse a linked list. Analyze the time and space complexity.',
    tags: ['coding', 'linked-list', 'algorithms'],
  },
  {
    category: 'coding',
    difficulty: 'intermediate',
    question:
      'Implement a function to find the longest palindromic substring in a given string.',
    tags: ['coding', 'strings', 'dynamic-programming'],
  },
  {
    category: 'coding',
    difficulty: 'advanced',
    question: 'Design and implement an LRU (Least Recently Used) cache.',
    tags: ['coding', 'data-structures', 'cache', 'design'],
  },
];

async function seedQuestions() {
  console.log('🌱 Seeding interview questions...\n');

  const allQuestions = [
    ...technicalQuestions,
    ...behavioralQuestions,
    ...systemDesignQuestions,
    ...codingQuestions,
  ];

  console.log(`Total questions to seed: ${allQuestions.length}\n`);

  console.log('Question breakdown:');
  console.log(`- Technical: ${technicalQuestions.length}`);
  console.log(`- Behavioral: ${behavioralQuestions.length}`);
  console.log(`- System Design: ${systemDesignQuestions.length}`);
  console.log(`- Coding: ${codingQuestions.length}\n`);

  // In a real implementation, this would insert into the database
  // For now, we'll just log the questions
  console.log('Sample questions:\n');

  allQuestions.slice(0, 5).forEach((q, idx) => {
    console.log(`${idx + 1}. [${q.category}] ${q.difficulty}`);
    console.log(`   ${q.question}`);
    console.log(`   Tags: ${q.tags.join(', ')}\n`);
  });

  console.log('✅ Question seeding complete!');
  console.log(
    '\nNote: In production, these would be inserted into the database.'
  );
  console.log(
    'Run the SQL migration first: prisma/migrations/add_interview_prep.sql'
  );
}

// Run the seed function
seedQuestions().catch(console.error);
