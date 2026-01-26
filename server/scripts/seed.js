const JsonDB = require('../lib/jsondb');
require('dotenv').config();

// Initialize JSON database
const opportunityDB = new JsonDB('opportunities.json');

const sampleOpportunities = [
  // Hackathons
  {
    title: 'Smart India Hackathon 2024',
    description: 'National level hackathon to solve real-world problems using innovative technology solutions. Open to all engineering students.',
    category: 'hackathon',
    platform: 'MyGov',
    skills_required: ['JavaScript', 'Python', 'React', 'Node.js', 'AI/ML'],
    organizer_type: 'government',
    mode: 'hybrid',
    location: { city: 'New Delhi', state: 'Delhi', country: 'India' },
    start_date: new Date('2026-03-15'),
    deadline: new Date('2026-02-28'),
    official_link: 'https://sih.gov.in',
    tags: ['government', 'innovation', 'technology', 'students']
  },
  {
    title: 'HackIndia 2024 - Bangalore Edition',
    description: 'Build innovative solutions for sustainable development. 48-hour coding marathon with mentorship from industry experts.',
    category: 'hackathon',
    platform: 'Devfolio',
    skills_required: ['React', 'Python', 'Django', 'PostgreSQL', 'Docker'],
    organizer_type: 'startup',
    mode: 'offline',
    location: { city: 'Bangalore', state: 'Karnataka', country: 'India' },
    start_date: new Date('2026-04-20'),
    deadline: new Date('2026-04-10'),
    official_link: 'https://hackindia.devfolio.co',
    tags: ['sustainability', 'innovation', 'startup', 'bangalore']
  },
  {
    title: 'CodeFest Mumbai 2024',
    description: 'Premier hackathon focusing on fintech solutions. Build the next generation of financial applications.',
    category: 'hackathon',
    platform: 'Unstop',
    skills_required: ['JavaScript', 'React', 'Node.js', 'MongoDB', 'Blockchain'],
    organizer_type: 'company',
    mode: 'offline',
    location: { city: 'Mumbai', state: 'Maharashtra', country: 'India' },
    start_date: new Date('2026-05-10'),
    deadline: new Date('2026-05-01'),
    official_link: 'https://unstop.com/codefest-mumbai',
    tags: ['fintech', 'blockchain', 'mumbai', 'finance']
  },
  {
    title: 'HackTheNorth India',
    description: 'International hackathon with focus on healthcare technology. Solve critical healthcare challenges.',
    category: 'hackathon',
    platform: 'HackerEarth',
    skills_required: ['Python', 'TensorFlow', 'React', 'Flask', 'Data Science'],
    organizer_type: 'company',
    mode: 'online',
    location: { city: 'Pune', state: 'Maharashtra', country: 'India' },
    start_date: new Date('2026-06-15'),
    deadline: new Date('2026-06-05'),
    official_link: 'https://hackerearth.com/hackthenorth',
    tags: ['healthcare', 'AI', 'machine learning', 'online']
  },
  {
    title: 'EduHack 2024 - Chennai',
    description: 'Educational technology hackathon. Create innovative solutions for online learning and education.',
    category: 'hackathon',
    platform: 'Devpost',
    skills_required: ['Vue.js', 'Python', 'FastAPI', 'PostgreSQL', 'AWS'],
    organizer_type: 'college',
    mode: 'hybrid',
    location: { city: 'Chennai', state: 'Tamil Nadu', country: 'India' },
    start_date: new Date('2026-07-20'),
    deadline: new Date('2026-07-10'),
    official_link: 'https://eduhack.devpost.com',
    tags: ['education', 'edtech', 'chennai', 'learning']
  },

  // Internships
  {
    title: 'Software Development Intern - Google',
    description: 'Join Google as a software development intern. Work on cutting-edge projects with world-class engineers.',
    category: 'internship',
    platform: 'Google Careers',
    skills_required: ['Java', 'Python', 'C++', 'Data Structures', 'Algorithms'],
    organizer_type: 'company',
    mode: 'hybrid',
    location: { city: 'Hyderabad', state: 'Telangana', country: 'India' },
    start_date: new Date('2026-06-01'),
    deadline: new Date('2026-03-15'),
    official_link: 'https://careers.google.com/internships',
    tags: ['google', 'software', 'internship', 'tech giant']
  },
  {
    title: 'Data Science Intern - Flipkart',
    description: 'Work with Flipkart\'s data science team to build recommendation systems and analyze customer behavior.',
    category: 'internship',
    platform: 'Flipkart Careers',
    skills_required: ['Python', 'Machine Learning', 'SQL', 'Pandas', 'Scikit-learn'],
    organizer_type: 'company',
    mode: 'offline',
    location: { city: 'Bangalore', state: 'Karnataka', country: 'India' },
    start_date: new Date('2026-05-15'),
    deadline: new Date('2026-04-01'),
    official_link: 'https://flipkart.com/careers/internships',
    tags: ['flipkart', 'data science', 'ecommerce', 'analytics']
  },
  {
    title: 'Frontend Developer Intern - Zomato',
    description: 'Build user interfaces for Zomato\'s web and mobile applications. Work with React and React Native.',
    category: 'internship',
    platform: 'Zomato Careers',
    skills_required: ['React', 'JavaScript', 'HTML', 'CSS', 'React Native'],
    organizer_type: 'company',
    mode: 'hybrid',
    location: { city: 'Gurgaon', state: 'Haryana', country: 'India' },
    start_date: new Date('2026-07-01'),
    deadline: new Date('2026-05-15'),
    official_link: 'https://zomato.com/careers/internships',
    tags: ['zomato', 'frontend', 'react', 'mobile']
  },
  {
    title: 'AI Research Intern - IIT Delhi',
    description: 'Research internship in artificial intelligence and machine learning at IIT Delhi\'s AI lab.',
    category: 'internship',
    platform: 'IIT Delhi',
    skills_required: ['Python', 'TensorFlow', 'PyTorch', 'Research', 'Mathematics'],
    organizer_type: 'college',
    mode: 'offline',
    location: { city: 'New Delhi', state: 'Delhi', country: 'India' },
    start_date: new Date('2026-06-10'),
    deadline: new Date('2026-04-20'),
    official_link: 'https://iitd.ac.in/internships',
    tags: ['IIT', 'research', 'AI', 'machine learning']
  },
  {
    title: 'Backend Developer Intern - Paytm',
    description: 'Work on Paytm\'s backend systems handling millions of transactions. Learn about scalable architecture.',
    category: 'internship',
    platform: 'Paytm Careers',
    skills_required: ['Java', 'Spring Boot', 'MySQL', 'Redis', 'Microservices'],
    organizer_type: 'company',
    mode: 'offline',
    location: { city: 'Noida', state: 'Uttar Pradesh', country: 'India' },
    start_date: new Date('2026-08-01'),
    deadline: new Date('2026-06-15'),
    official_link: 'https://paytm.com/careers/internships',
    tags: ['paytm', 'backend', 'fintech', 'scalability']
  },

  // Workshops
  {
    title: 'Full Stack Web Development Workshop',
    description: 'Comprehensive 5-day workshop covering MERN stack development. Build a complete web application.',
    category: 'workshop',
    platform: 'TechEd India',
    skills_required: ['JavaScript', 'Basic Programming'],
    organizer_type: 'company',
    mode: 'online',
    location: { city: 'Mumbai', state: 'Maharashtra', country: 'India' },
    start_date: new Date('2026-04-01'),
    deadline: new Date('2026-03-25'),
    official_link: 'https://teched.in/fullstack-workshop',
    tags: ['fullstack', 'MERN', 'web development', 'online']
  },
  {
    title: 'Machine Learning Bootcamp - IIT Bombay',
    description: 'Intensive 3-day machine learning workshop with hands-on projects and industry case studies.',
    category: 'workshop',
    platform: 'IIT Bombay',
    skills_required: ['Python', 'Mathematics', 'Statistics'],
    organizer_type: 'college',
    mode: 'offline',
    location: { city: 'Mumbai', state: 'Maharashtra', country: 'India' },
    start_date: new Date('2026-05-20'),
    deadline: new Date('2026-05-10'),
    official_link: 'https://iitb.ac.in/ml-bootcamp',
    tags: ['machine learning', 'IIT', 'bootcamp', 'hands-on']
  },
  {
    title: 'Cloud Computing Workshop - AWS',
    description: 'Learn AWS cloud services and deployment strategies. Get hands-on experience with EC2, S3, and Lambda.',
    category: 'workshop',
    platform: 'AWS Training',
    skills_required: ['Basic Programming', 'Linux', 'Networking'],
    organizer_type: 'company',
    mode: 'hybrid',
    location: { city: 'Bangalore', state: 'Karnataka', country: 'India' },
    start_date: new Date('2026-06-05'),
    deadline: new Date('2026-05-25'),
    official_link: 'https://aws.amazon.com/training/workshops',
    tags: ['AWS', 'cloud computing', 'devops', 'infrastructure']
  },
  {
    title: 'Mobile App Development with Flutter',
    description: '4-day intensive workshop on Flutter development. Build cross-platform mobile applications.',
    category: 'workshop',
    platform: 'Flutter Community',
    skills_required: ['Dart', 'Basic Programming', 'Mobile Development'],
    organizer_type: 'startup',
    mode: 'online',
    location: { city: 'Pune', state: 'Maharashtra', country: 'India' },
    start_date: new Date('2026-07-15'),
    deadline: new Date('2026-07-05'),
    official_link: 'https://flutter.dev/workshops',
    tags: ['flutter', 'mobile development', 'cross-platform', 'dart']
  },
  {
    title: 'Blockchain Development Workshop',
    description: 'Learn blockchain fundamentals and smart contract development with Ethereum and Solidity.',
    category: 'workshop',
    platform: 'Blockchain Academy',
    skills_required: ['JavaScript', 'Solidity', 'Web3'],
    organizer_type: 'startup',
    mode: 'offline',
    location: { city: 'Delhi', state: 'Delhi', country: 'India' },
    start_date: new Date('2026-08-10'),
    deadline: new Date('2026-07-30'),
    official_link: 'https://blockchainacademy.in/workshop',
    tags: ['blockchain', 'ethereum', 'smart contracts', 'web3']
  }
];

const seedDatabase = async () => {
  try {
    console.log('🌱 Starting database seeding with JSON database...');
    
    // Clear existing data
    opportunityDB.clear();
    console.log('🗑️  Cleared existing opportunities');
    
    // Insert sample data
    const insertedOpportunities = opportunityDB.insertMany(sampleOpportunities);
    console.log(`✅ Inserted ${insertedOpportunities.length} sample opportunities`);
    
    // Display summary
    const hackathonCount = opportunityDB.count({ category: 'hackathon' });
    const internshipCount = opportunityDB.count({ category: 'internship' });
    const workshopCount = opportunityDB.count({ category: 'workshop' });
    
    console.log('\n📊 Database Summary:');
    console.log(`   Hackathons: ${hackathonCount}`);
    console.log(`   Internships: ${internshipCount}`);
    console.log(`   Workshops: ${workshopCount}`);
    console.log(`   Total: ${hackathonCount + internshipCount + workshopCount}`);
    
    console.log('\n🎉 Database seeding completed successfully!');
    console.log('📁 Data stored in: server/data/opportunities.json');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  }
};

// Run seeding if this file is executed directly
if (require.main === module) {
  seedDatabase();
}

module.exports = { seedDatabase, sampleOpportunities };