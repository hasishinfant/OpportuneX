const express = require('express');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

// In-memory storage for demo
let users = [];
let userSessions = new Map();
let notifications = [];
let searchHistory = [];

// Mock data for opportunities (expanded)
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

// User Authentication Endpoints
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  
  // Simple mock authentication
  let user = users.find(u => u.email === email);
  if (!user) {
    user = {
      id: Date.now(),
      email,
      name: email.split('@')[0],
      preferences: {
        skills: [],
        location: '',
        types: ['hackathon', 'internship', 'workshop']
      },
      createdAt: new Date()
    };
    users.push(user);
  }
  
  const sessionToken = 'token_' + Date.now();
  userSessions.set(sessionToken, user);
  
  res.json({
    user,
    token: sessionToken,
    message: 'Login successful'
  });
});

app.post('/api/auth/logout', (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (token) {
    userSessions.delete(token);
  }
  res.json({ message: 'Logout successful' });
});

// User Profile Endpoints
app.get('/api/user/profile', (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  const user = userSessions.get(token);
  
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  res.json(user);
});

app.put('/api/user/profile', (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  const user = userSessions.get(token);
  
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  Object.assign(user, req.body);
  res.json(user);
});

// Voice Search Endpoint
app.post('/api/voice/search', (req, res) => {
  const { transcript, language = 'en' } = req.body;
  
  // Process voice transcript and convert to search query
  const processedQuery = transcript.toLowerCase()
    .replace(/find me|show me|search for|looking for/g, '')
    .trim();
  
  // Simulate voice search processing
  const suggestions = [
    'AI hackathons',
    'React internships',
    'data science workshops',
    'remote opportunities'
  ].filter(s => s.includes(processedQuery.split(' ')[0]));
  
  res.json({
    originalTranscript: transcript,
    processedQuery,
    suggestions,
    confidence: 0.95
  });
});

// Notifications Endpoints
app.get('/api/notifications', (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  const user = userSessions.get(token);
  
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  const userNotifications = notifications.filter(n => n.userId === user.id);
  res.json(userNotifications);
});

app.post('/api/notifications/mark-read', (req, res) => {
  const { notificationId } = req.body;
  const token = req.headers.authorization?.replace('Bearer ', '');
  const user = userSessions.get(token);
  
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  const notification = notifications.find(n => n.id === notificationId && n.userId === user.id);
  if (notification) {
    notification.read = true;
  }
  
  res.json({ success: true });
});

// Search Analytics
app.post('/api/analytics/search', (req, res) => {
  const { query, filters, results } = req.body;
  const token = req.headers.authorization?.replace('Bearer ', '');
  const user = userSessions.get(token);
  
  const searchEntry = {
    id: Date.now(),
    userId: user?.id,
    query,
    filters,
    resultCount: results,
    timestamp: new Date()
  };
  
  searchHistory.push(searchEntry);
  res.json({ success: true });
});

// Personalized Recommendations
app.get('/api/recommendations', (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  const user = userSessions.get(token);
  
  if (!user) {
    return res.json({ opportunities: mockOpportunities.slice(0, 3) });
  }
  
  // Simple recommendation based on user preferences
  let recommended = [...mockOpportunities];
  
  if (user.preferences.skills.length > 0) {
    recommended = recommended.filter(opp =>
      opp.requirements.skills.some(skill =>
        user.preferences.skills.some(userSkill =>
          skill.toLowerCase().includes(userSkill.toLowerCase())
        )
      )
    );
  }
  
  if (user.preferences.location) {
    recommended = recommended.filter(opp =>
      !opp.details.location || 
      opp.details.location.toLowerCase().includes(user.preferences.location.toLowerCase()) ||
      opp.details.mode === 'online'
    );
  }
  
  res.json({
    opportunities: recommended.slice(0, 5),
    reason: 'Based on your preferences'
  });
});

// Push Notification Subscription
app.post('/api/notifications/subscribe', (req, res) => {
  const { subscription } = req.body;
  const token = req.headers.authorization?.replace('Bearer ', '');
  const user = userSessions.get(token);
  
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  // Store subscription (in real app, save to database)
  user.pushSubscription = subscription;
  
  res.json({ success: true });
});

// Opportunity Alerts
app.post('/api/alerts/create', (req, res) => {
  const { keywords, filters } = req.body;
  const token = req.headers.authorization?.replace('Bearer ', '');
  const user = userSessions.get(token);
  
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  const alert = {
    id: Date.now(),
    userId: user.id,
    keywords,
    filters,
    active: true,
    createdAt: new Date()
  };
  
  // Store alert (in real app, save to database)
  if (!user.alerts) user.alerts = [];
  user.alerts.push(alert);
  
  res.json(alert);
});

// Generate mock notifications for demo
function generateMockNotifications() {
  const mockNotifs = [
    {
      id: Date.now() + 1,
      userId: null, // For all users
      title: 'New AI Hackathon',
      message: 'AI/ML Hackathon 2024 registration is now open!',
      type: 'opportunity',
      read: false,
      createdAt: new Date()
    },
    {
      id: Date.now() + 2,
      userId: null,
      title: 'Deadline Reminder',
      message: 'Frontend Developer Internship deadline is tomorrow',
      type: 'deadline',
      read: false,
      createdAt: new Date()
    }
  ];
  
  notifications.push(...mockNotifs);
}

// Initialize mock data
generateMockNotifications();

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'OpportuneX MVP Server is running' });
});

// Serve the main HTML file
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`🚀 OpportuneX MVP Server running on http://localhost:${PORT}`);
  console.log(`📱 Open your browser and visit: http://localhost:${PORT}`);
});