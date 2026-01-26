const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Mock data for opportunities
const mockOpportunities = [
  {
    id: '1',
    title: 'AI/ML Hackathon 2024',
    description: 'Build innovative AI solutions for real-world problems. Win prizes up to ₹1,00,000!',
    type: 'hackathon',
    organizer: {
      name: 'TechCorp India',
      type: 'corporate',
      logo: '🏢'
    },
    requirements: {
      skills: ['Python', 'Machine Learning', 'TensorFlow'],
      experience: 'Beginner to Intermediate',
      eligibility: ['Students', 'Working Professionals']
    },
    details: {
      mode: 'hybrid',
      location: 'Mumbai, India',
      duration: '48 hours',
      prizes: ['₹1,00,000', '₹50,000', '₹25,000']
    },
    timeline: {
      applicationDeadline: '2024-03-15',
      startDate: '2024-03-20',
      endDate: '2024-03-22'
    },
    externalUrl: 'https://example.com/ai-hackathon',
    platform: 'DevPost',
    tags: ['AI', 'Machine Learning', 'Innovation']
  },
  {
    id: '2',
    title: 'Frontend Developer Internship',
    description: 'Join our team as a Frontend Developer intern. Work on cutting-edge React applications.',
    type: 'internship',
    organizer: {
      name: 'StartupXYZ',
      type: 'startup',
      logo: '🚀'
    },
    requirements: {
      skills: ['React', 'JavaScript', 'CSS'],
      experience: 'Fresher',
      eligibility: ['Final year students', 'Recent graduates']
    },
    details: {
      mode: 'online',
      location: 'Remote',
      duration: '3 months',
      stipend: '₹15,000/month'
    },
    timeline: {
      applicationDeadline: '2024-02-28',
      startDate: '2024-03-01',
      endDate: '2024-05-31'
    },
    externalUrl: 'https://example.com/frontend-internship',
    platform: 'AngelList',
    tags: ['Frontend', 'React', 'Remote']
  },
  {
    id: '3',
    title: 'Web Development Workshop',
    description: 'Learn modern web development with hands-on projects. Free workshop for students.',
    type: 'workshop',
    organizer: {
      name: 'IIT Delhi',
      type: 'academic',
      logo: '🎓'
    },
    requirements: {
      skills: ['HTML', 'CSS', 'JavaScript'],
      experience: 'Beginner',
      eligibility: ['College students']
    },
    details: {
      mode: 'offline',
      location: 'New Delhi, India',
      duration: '2 days'
    },
    timeline: {
      applicationDeadline: '2024-02-20',
      startDate: '2024-02-25',
      endDate: '2024-02-26'
    },
    externalUrl: 'https://example.com/web-workshop',
    platform: 'Eventbrite',
    tags: ['Web Development', 'Workshop', 'Free']
  },
  {
    id: '4',
    title: 'Data Science Competition',
    description: 'Analyze real-world datasets and build predictive models. Great for portfolio building.',
    type: 'hackathon',
    organizer: {
      name: 'DataCorp',
      type: 'corporate',
      logo: '📊'
    },
    requirements: {
      skills: ['Python', 'Data Science', 'Pandas', 'Scikit-learn'],
      experience: 'Intermediate',
      eligibility: ['Students', 'Data enthusiasts']
    },
    details: {
      mode: 'online',
      location: 'Online',
      duration: '1 month',
      prizes: ['₹75,000', '₹40,000', '₹20,000']
    },
    timeline: {
      applicationDeadline: '2024-03-01',
      startDate: '2024-03-05',
      endDate: '2024-04-05'
    },
    externalUrl: 'https://example.com/data-competition',
    platform: 'Kaggle',
    tags: ['Data Science', 'Competition', 'Online']
  },
  {
    id: '5',
    title: 'Mobile App Development Internship',
    description: 'Build mobile apps using React Native. Work with experienced developers.',
    type: 'internship',
    organizer: {
      name: 'MobileFirst Solutions',
      type: 'startup',
      logo: '📱'
    },
    requirements: {
      skills: ['React Native', 'JavaScript', 'Mobile Development'],
      experience: 'Beginner to Intermediate',
      eligibility: ['Students', 'Recent graduates']
    },
    details: {
      mode: 'hybrid',
      location: 'Bangalore, India',
      duration: '6 months',
      stipend: '₹20,000/month'
    },
    timeline: {
      applicationDeadline: '2024-02-25',
      startDate: '2024-03-10',
      endDate: '2024-09-10'
    },
    externalUrl: 'https://example.com/mobile-internship',
    platform: 'LinkedIn',
    tags: ['Mobile Development', 'React Native', 'Bangalore']
  }
];

// API Routes
app.get('/api/opportunities', (req, res) => {
  const { query, skills, mode, location, type } = req.query;
  
  let filteredOpportunities = [...mockOpportunities];
  
  // Filter by search query
  if (query) {
    const searchTerm = query.toLowerCase();
    filteredOpportunities = filteredOpportunities.filter(opp => 
      opp.title.toLowerCase().includes(searchTerm) ||
      opp.description.toLowerCase().includes(searchTerm) ||
      opp.tags.some(tag => tag.toLowerCase().includes(searchTerm)) ||
      opp.requirements.skills.some(skill => skill.toLowerCase().includes(searchTerm))
    );
  }
  
  // Filter by skills
  if (skills) {
    const skillsArray = skills.split(',').map(s => s.trim().toLowerCase());
    filteredOpportunities = filteredOpportunities.filter(opp =>
      skillsArray.some(skill =>
        opp.requirements.skills.some(oppSkill => oppSkill.toLowerCase().includes(skill))
      )
    );
  }
  
  // Filter by mode
  if (mode && mode !== 'any') {
    filteredOpportunities = filteredOpportunities.filter(opp => opp.details.mode === mode);
  }
  
  // Filter by location
  if (location) {
    const locationTerm = location.toLowerCase();
    filteredOpportunities = filteredOpportunities.filter(opp =>
      opp.details.location && opp.details.location.toLowerCase().includes(locationTerm)
    );
  }
  
  // Filter by type
  if (type && type !== 'all') {
    filteredOpportunities = filteredOpportunities.filter(opp => opp.type === type);
  }
  
  res.json({
    opportunities: filteredOpportunities,
    totalCount: filteredOpportunities.length
  });
});

// Mock AI Roadmap endpoint
app.post('/api/roadmap', (req, res) => {
  const { opportunityId, userSkills = [] } = req.body;
  
  const opportunity = mockOpportunities.find(opp => opp.id === opportunityId);
  
  if (!opportunity) {
    return res.status(404).json({ error: 'Opportunity not found' });
  }
  
  // Generate mock roadmap based on opportunity type
  const generateRoadmap = (opp) => {
    const basePhases = {
      hackathon: [
        {
          title: 'Preparation Phase',
          duration: '1 week',
          tasks: [
            'Review problem statement and requirements',
            'Form a team or prepare for solo participation',
            'Set up development environment',
            'Research similar solutions and approaches'
          ]
        },
        {
          title: 'Skill Building',
          duration: '1-2 weeks',
          tasks: [
            `Learn ${opp.requirements.skills.slice(0, 2).join(' and ')}`,
            'Practice with small projects',
            'Study relevant documentation and tutorials',
            'Join online communities for support'
          ]
        },
        {
          title: 'Implementation',
          duration: 'During hackathon',
          tasks: [
            'Plan your solution architecture',
            'Implement core features first',
            'Test and debug your solution',
            'Prepare presentation and demo'
          ]
        }
      ],
      internship: [
        {
          title: 'Application Preparation',
          duration: '1 week',
          tasks: [
            'Update your resume with relevant projects',
            'Create a portfolio showcasing your work',
            'Write a compelling cover letter',
            'Prepare for technical interviews'
          ]
        },
        {
          title: 'Skill Enhancement',
          duration: '2-3 weeks',
          tasks: [
            `Master ${opp.requirements.skills.slice(0, 2).join(' and ')}`,
            'Build projects using required technologies',
            'Contribute to open source projects',
            'Practice coding problems and algorithms'
          ]
        },
        {
          title: 'Interview Preparation',
          duration: '1 week',
          tasks: [
            'Practice common interview questions',
            'Prepare technical explanations of your projects',
            'Research the company and role',
            'Mock interviews with peers or mentors'
          ]
        }
      ],
      workshop: [
        {
          title: 'Pre-workshop Preparation',
          duration: '3-5 days',
          tasks: [
            'Review workshop agenda and prerequisites',
            'Set up required software and tools',
            'Brush up on basic concepts',
            'Prepare questions to ask during the workshop'
          ]
        },
        {
          title: 'Active Participation',
          duration: 'During workshop',
          tasks: [
            'Attend all sessions and take notes',
            'Participate in hands-on exercises',
            'Network with other participants',
            'Ask questions and seek clarifications'
          ]
        },
        {
          title: 'Post-workshop Follow-up',
          duration: '1 week',
          tasks: [
            'Review and organize your notes',
            'Complete any assigned projects',
            'Connect with instructors and peers',
            'Apply learned concepts to personal projects'
          ]
        }
      ]
    };
    
    return basePhases[opp.type] || basePhases.hackathon;
  };
  
  const roadmap = {
    opportunityTitle: opportunity.title,
    phases: generateRoadmap(opportunity),
    estimatedDuration: opportunity.type === 'hackathon' ? '3-4 weeks' : 
                      opportunity.type === 'internship' ? '4-5 weeks' : '2 weeks',
    personalizedTips: [
      `Focus on ${opportunity.requirements.skills[0]} as it's highly relevant for this ${opportunity.type}`,
      `Since this is a ${opportunity.details.mode} opportunity, prepare accordingly`,
      'Build a portfolio project that demonstrates your skills',
      'Connect with past participants or organizers on LinkedIn'
    ]
  };
  
  res.json(roadmap);
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'OpportuneX MVP Server is running' });
});

app.listen(PORT, () => {
  console.log(`🚀 OpportuneX MVP Server running on port ${PORT}`);
});