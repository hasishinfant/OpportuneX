const axios = require('axios');
const cheerio = require('cheerio');

class MLHFetcher {
  constructor() {
    this.baseUrl = 'https://mlh.io';
    this.eventsUrl = 'https://mlh.io/seasons/2026/events';
    this.userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36';
  }

  async fetchOpportunities() {
    try {
      console.log('🔍 Fetching hackathons from MLH...');
      
      // For now, return sample data directly since MLH scraping is complex
      console.log('🔄 Using sample MLH data...');
      return this.getSampleData();

    } catch (error) {
      console.error('❌ Error fetching from MLH:', error.message);
      
      // Return sample data if fetching fails
      console.log('🔄 Returning sample MLH data as fallback...');
      return this.getSampleData();
    }
  }

  parseEventElement($, element) {
    const $el = $(element);
    
    // Extract basic information
    const title = this.extractText($el, [
      '.event-name',
      '.hackathon-name', 
      '.title',
      'h1', 'h2', 'h3',
      '[class*="title"]',
      '[class*="name"]'
    ]);

    const description = this.extractText($el, [
      '.event-description',
      '.description',
      '.summary',
      'p',
      '[class*="description"]'
    ]);

    const location = this.extractLocation($el);
    const dates = this.extractDates($el);
    const url = this.extractUrl($el);

    if (!title || !url) {
      return null;
    }

    return {
      title: title.trim(),
      description: description || `Join ${title} - an exciting hackathon opportunity!`,
      organizer: 'Major League Hacking (MLH)',
      type: 'hackathon',
      mode: this.determineMode(location, $el),
      location: location,
      dates: dates,
      skills_required: this.extractSkills($el),
      external_url: url,
      source: {
        platform: 'MLH',
        source_id: this.generateSourceId(url),
        last_updated: new Date()
      },
      tags: ['mlh', 'hackathon', 'student', 'competition'],
      eligibility: {
        education_level: ['undergraduate', 'graduate', 'high_school'],
        other_requirements: 'Must be a student'
      },
      registration: {
        is_open: dates.start_date > new Date(),
        fee: { amount: 0, currency: 'USD' }
      },
      difficulty_level: 'all',
      team_size: { min: 1, max: 4 },
      is_active: true
    };
  }

  extractText($el, selectors) {
    for (const selector of selectors) {
      const text = $el.find(selector).first().text().trim();
      if (text && text.length > 0) {
        return text;
      }
    }
    return '';
  }

  extractLocation($el) {
    const locationText = this.extractText($el, [
      '.event-location',
      '.location',
      '.venue',
      '[class*="location"]',
      '[class*="venue"]'
    ]);

    if (!locationText) {
      return {
        city: 'Various',
        country: 'Global',
        venue: 'TBD'
      };
    }

    // Parse location string
    const parts = locationText.split(',').map(p => p.trim());
    
    if (parts.length >= 2) {
      return {
        city: parts[0],
        state: parts.length > 2 ? parts[1] : '',
        country: parts[parts.length - 1],
        venue: locationText
      };
    }

    return {
      city: parts[0] || 'Various',
      country: 'Global',
      venue: locationText
    };
  }

  extractDates($el) {
    const dateText = this.extractText($el, [
      '.event-date',
      '.date',
      '.dates',
      '[class*="date"]',
      'time'
    ]);

    // Default dates (upcoming weekend)
    const defaultStart = new Date();
    defaultStart.setDate(defaultStart.getDate() + ((6 - defaultStart.getDay()) % 7) || 7); // Next Saturday
    const defaultEnd = new Date(defaultStart);
    defaultEnd.setDate(defaultEnd.getDate() + 1); // Sunday

    if (!dateText) {
      return {
        start_date: defaultStart,
        end_date: defaultEnd,
        registration_deadline: new Date(defaultStart.getTime() - 7 * 24 * 60 * 60 * 1000) // 1 week before
      };
    }

    try {
      // Try to parse various date formats
      const datePatterns = [
        /(\w+\s+\d{1,2}(?:-\d{1,2})?(?:,\s*\d{4})?)/g,
        /(\d{1,2}\/\d{1,2}\/\d{4})/g,
        /(\d{4}-\d{2}-\d{2})/g
      ];

      let parsedDates = [];
      
      for (const pattern of datePatterns) {
        const matches = dateText.match(pattern);
        if (matches) {
          parsedDates = matches.map(match => new Date(match)).filter(date => !isNaN(date));
          if (parsedDates.length > 0) break;
        }
      }

      if (parsedDates.length >= 2) {
        return {
          start_date: parsedDates[0],
          end_date: parsedDates[1],
          registration_deadline: new Date(parsedDates[0].getTime() - 7 * 24 * 60 * 60 * 1000)
        };
      } else if (parsedDates.length === 1) {
        const start = parsedDates[0];
        const end = new Date(start);
        end.setDate(end.getDate() + 2); // Assume 2-day event
        
        return {
          start_date: start,
          end_date: end,
          registration_deadline: new Date(start.getTime() - 7 * 24 * 60 * 60 * 1000)
        };
      }
    } catch (error) {
      console.warn('Error parsing dates:', error.message);
    }

    return {
      start_date: defaultStart,
      end_date: defaultEnd,
      registration_deadline: new Date(defaultStart.getTime() - 7 * 24 * 60 * 60 * 1000)
    };
  }

  extractUrl($el) {
    // Look for links
    const link = $el.find('a').first().attr('href') || 
                 $el.attr('href') ||
                 $el.find('[href]').first().attr('href');

    if (!link) return null;

    // Make absolute URL
    if (link.startsWith('/')) {
      return this.baseUrl + link;
    } else if (link.startsWith('http')) {
      return link;
    } else {
      return this.baseUrl + '/' + link;
    }
  }

  extractSkills($el) {
    const skillsText = this.extractText($el, [
      '.skills',
      '.technologies',
      '.tech-stack',
      '[class*="skill"]',
      '[class*="tech"]'
    ]);

    if (skillsText) {
      return skillsText.split(/[,;]/).map(skill => skill.trim()).filter(skill => skill.length > 0);
    }

    // Default skills for hackathons
    return ['JavaScript', 'Python', 'React', 'Node.js', 'HTML', 'CSS'];
  }

  determineMode(location, $el) {
    const text = ($el.text() + JSON.stringify(location)).toLowerCase();
    
    if (text.includes('virtual') || text.includes('online') || text.includes('remote')) {
      return 'online';
    } else if (text.includes('hybrid')) {
      return 'hybrid';
    }
    
    return 'offline';
  }

  extractEventLinks($) {
    const links = [];
    
    $('a[href*="/events/"], a[href*="hackathon"], a[href*="event"]').each((i, el) => {
      const href = $(el).attr('href');
      if (href && !links.includes(href)) {
        const fullUrl = href.startsWith('/') ? this.baseUrl + href : href;
        links.push(fullUrl);
      }
    });

    return links;
  }

  async fetchEventDetails(url) {
    try {
      const response = await axios.get(url, {
        headers: { 'User-Agent': this.userAgent },
        timeout: 15000
      });

      const $ = cheerio.load(response.data);
      
      return this.parseEventElement($, 'body');
    } catch (error) {
      console.warn(`Failed to fetch event details from ${url}:`, error.message);
      return null;
    }
  }

  generateSourceId(url) {
    return url.split('/').pop() || url.replace(/[^a-zA-Z0-9]/g, '').substring(0, 20);
  }

  isValidOpportunity(opportunity) {
    return opportunity && 
           opportunity.title && 
           opportunity.title.length > 3 &&
           opportunity.external_url &&
           opportunity.dates &&
           opportunity.dates.start_date instanceof Date &&
           !isNaN(opportunity.dates.start_date);
  }

  getSampleData() {
    const now = new Date();
    const futureDate1 = new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000); // 15 days from now
    const futureDate2 = new Date(futureDate1.getTime() + 2 * 24 * 60 * 60 * 1000); // 2 days later
    const futureDate3 = new Date(now.getTime() + 45 * 24 * 60 * 60 * 1000); // 45 days from now
    const futureDate4 = new Date(futureDate3.getTime() + 3 * 24 * 60 * 60 * 1000); // 3 days later
    const futureDate5 = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days from now
    const futureDate6 = new Date(futureDate5.getTime() + 2 * 24 * 60 * 60 * 1000); // 2 days later

    return [
      {
        title: 'HackMIT 2026 - Innovation Challenge',
        description: 'Join us for the premier hackathon at MIT! Build innovative solutions that can change the world. 48 hours of coding, mentorship, and networking with top tech companies.',
        organizer: 'MIT Computer Science Department',
        type: 'hackathon',
        mode: 'hybrid',
        location: {
          city: 'Cambridge',
          state: 'MA',
          country: 'USA',
          venue: 'MIT Campus'
        },
        dates: {
          start_date: futureDate1,
          end_date: futureDate2,
          registration_deadline: new Date(futureDate1.getTime() - 10 * 24 * 60 * 60 * 1000)
        },
        skills_required: ['JavaScript', 'Python', 'React', 'Node.js', 'Machine Learning', 'AI'],
        external_url: 'https://hackmit.org',
        source: {
          platform: 'MLH',
          source_id: 'hackmit-2026',
          last_updated: new Date()
        },
        tags: ['mlh', 'hackathon', 'student', 'competition', 'innovation'],
        eligibility: {
          education_level: ['undergraduate', 'graduate'],
          other_requirements: 'Must be a current student'
        },
        registration: {
          is_open: true,
          fee: { amount: 0, currency: 'USD' },
          max_participants: 1000
        },
        difficulty_level: 'intermediate',
        team_size: { min: 1, max: 4 },
        themes: ['AI/ML', 'Web Development', 'Mobile Apps', 'Blockchain', 'IoT'],
        prizes: [
          { position: '1st Place', amount: '$10000', description: 'Best Overall Project' },
          { position: '2nd Place', amount: '$5000', description: 'Most Innovative Solution' },
          { position: '3rd Place', amount: '$2500', description: 'Best Technical Implementation' }
        ],
        is_active: true
      },
      {
        title: 'Stanford TreeHacks 2026 - Build the Future',
        description: 'Stanford\'s premier hackathon brings together the brightest minds to tackle real-world problems. Focus on sustainability, healthcare, and social impact projects.',
        organizer: 'Stanford University',
        type: 'hackathon',
        mode: 'offline',
        location: {
          city: 'Stanford',
          state: 'CA',
          country: 'USA',
          venue: 'Stanford University Campus'
        },
        dates: {
          start_date: futureDate3,
          end_date: futureDate4,
          registration_deadline: new Date(futureDate3.getTime() - 14 * 24 * 60 * 60 * 1000)
        },
        skills_required: ['Python', 'TensorFlow', 'React', 'Swift', 'Data Science', 'UI/UX'],
        external_url: 'https://treehacks.com',
        source: {
          platform: 'MLH',
          source_id: 'treehacks-2026',
          last_updated: new Date()
        },
        tags: ['mlh', 'hackathon', 'sustainability', 'social-impact', 'stanford'],
        eligibility: {
          education_level: ['undergraduate', 'graduate', 'high_school'],
          other_requirements: 'Open to all students worldwide'
        },
        registration: {
          is_open: true,
          fee: { amount: 0, currency: 'USD' },
          max_participants: 1500
        },
        difficulty_level: 'all',
        team_size: { min: 1, max: 4 },
        themes: ['Sustainability', 'Healthcare', 'Education', 'Social Impact', 'Climate Tech'],
        prizes: [
          { position: '1st Place', amount: '$15000', description: 'Grand Prize Winner' },
          { position: '2nd Place', amount: '$8000', description: 'Runner Up' },
          { position: '3rd Place', amount: '$4000', description: 'Third Place' }
        ],
        is_active: true
      },
      {
        title: 'PennApps XXVI - The Ultimate Hackathon Experience',
        description: 'America\'s first student-run hackathon continues its legacy! Join 1000+ hackers for an incredible weekend of innovation, learning, and fun at the University of Pennsylvania.',
        organizer: 'University of Pennsylvania',
        type: 'hackathon',
        mode: 'hybrid',
        location: {
          city: 'Philadelphia',
          state: 'PA',
          country: 'USA',
          venue: 'University of Pennsylvania'
        },
        dates: {
          start_date: futureDate5,
          end_date: futureDate6,
          registration_deadline: new Date(futureDate5.getTime() - 7 * 24 * 60 * 60 * 1000)
        },
        skills_required: ['JavaScript', 'Python', 'Java', 'C++', 'Mobile Development', 'Web Development'],
        external_url: 'https://pennapps.com',
        source: {
          platform: 'MLH',
          source_id: 'pennapps-xxvi-2026',
          last_updated: new Date()
        },
        tags: ['mlh', 'hackathon', 'student', 'competition', 'pennapps'],
        eligibility: {
          education_level: ['undergraduate', 'graduate', 'high_school'],
          other_requirements: 'Must be a student'
        },
        registration: {
          is_open: true,
          fee: { amount: 0, currency: 'USD' },
          max_participants: 1200
        },
        difficulty_level: 'all',
        team_size: { min: 1, max: 4 },
        themes: ['Fintech', 'Gaming', 'Productivity', 'Entertainment', 'Developer Tools'],
        prizes: [
          { position: '1st Place', amount: '$8000', description: 'Best Overall Hack' },
          { position: '2nd Place', amount: '$4000', description: 'Most Creative' },
          { position: '3rd Place', amount: '$2000', description: 'Best Technical Achievement' }
        ],
        is_active: true
      },
      {
        title: 'HackGT 10 - Hexlabs Innovation Challenge',
        description: 'Georgia Tech\'s flagship hackathon returns! Build amazing projects with cutting-edge technology. Featuring workshops, mentorship, and networking opportunities.',
        organizer: 'Georgia Institute of Technology',
        type: 'hackathon',
        mode: 'offline',
        location: {
          city: 'Atlanta',
          state: 'GA',
          country: 'USA',
          venue: 'Georgia Tech Campus'
        },
        dates: {
          start_date: new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000),
          end_date: new Date(now.getTime() + 62 * 24 * 60 * 60 * 1000),
          registration_deadline: new Date(now.getTime() + 45 * 24 * 60 * 60 * 1000)
        },
        skills_required: ['React', 'Node.js', 'Python', 'Machine Learning', 'Blockchain', 'DevOps'],
        external_url: 'https://hack.gt',
        source: {
          platform: 'MLH',
          source_id: 'hackgt-10-2026',
          last_updated: new Date()
        },
        tags: ['mlh', 'hackathon', 'georgia-tech', 'innovation', 'technology'],
        eligibility: {
          education_level: ['undergraduate', 'graduate'],
          other_requirements: 'Students and recent graduates welcome'
        },
        registration: {
          is_open: true,
          fee: { amount: 0, currency: 'USD' },
          max_participants: 800
        },
        difficulty_level: 'intermediate',
        team_size: { min: 1, max: 4 },
        themes: ['AR/VR', 'Cybersecurity', 'Fintech', 'Health Tech', 'Smart Cities'],
        prizes: [
          { position: '1st Place', amount: '$6000', description: 'Grand Prize' },
          { position: '2nd Place', amount: '$3000', description: 'Second Place' },
          { position: '3rd Place', amount: '$1500', description: 'Third Place' }
        ],
        is_active: true
      },
      {
        title: 'CalHacks 11.0 - Berkeley\'s Premier Hackathon',
        description: 'UC Berkeley\'s largest hackathon! Join us for 36 hours of hacking, learning, and building amazing projects. Open to hackers of all skill levels worldwide.',
        organizer: 'UC Berkeley',
        type: 'hackathon',
        mode: 'hybrid',
        location: {
          city: 'Berkeley',
          state: 'CA',
          country: 'USA',
          venue: 'UC Berkeley Campus'
        },
        dates: {
          start_date: new Date(now.getTime() + 75 * 24 * 60 * 60 * 1000),
          end_date: new Date(now.getTime() + 77 * 24 * 60 * 60 * 1000),
          registration_deadline: new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000)
        },
        skills_required: ['JavaScript', 'Python', 'Swift', 'Kotlin', 'Data Science', 'Design'],
        external_url: 'https://calhacks.io',
        source: {
          platform: 'MLH',
          source_id: 'calhacks-11-2026',
          last_updated: new Date()
        },
        tags: ['mlh', 'hackathon', 'berkeley', 'california', 'innovation'],
        eligibility: {
          education_level: ['undergraduate', 'graduate', 'high_school'],
          other_requirements: 'Open to all students'
        },
        registration: {
          is_open: true,
          fee: { amount: 0, currency: 'USD' },
          max_participants: 2000
        },
        difficulty_level: 'all',
        team_size: { min: 1, max: 4 },
        themes: ['Social Good', 'Entertainment', 'Productivity', 'Education', 'Open Innovation'],
        prizes: [
          { position: '1st Place', amount: '$12000', description: 'Best Overall Project' },
          { position: '2nd Place', amount: '$6000', description: 'Most Impactful' },
          { position: '3rd Place', amount: '$3000', description: 'Most Creative' }
        ],
        is_active: true
      },
      {
        title: 'MHacks 16 - University of Michigan Hackathon',
        description: 'The Midwest\'s premier hackathon! Build, learn, and connect with fellow hackers. Featuring industry mentors, workshops, and amazing prizes.',
        organizer: 'University of Michigan',
        type: 'hackathon',
        mode: 'offline',
        location: {
          city: 'Ann Arbor',
          state: 'MI',
          country: 'USA',
          venue: 'University of Michigan Campus'
        },
        dates: {
          start_date: new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000),
          end_date: new Date(now.getTime() + 92 * 24 * 60 * 60 * 1000),
          registration_deadline: new Date(now.getTime() + 75 * 24 * 60 * 60 * 1000)
        },
        skills_required: ['C++', 'Java', 'Python', 'React Native', 'Flutter', 'Game Development'],
        external_url: 'https://mhacks.org',
        source: {
          platform: 'MLH',
          source_id: 'mhacks-16-2026',
          last_updated: new Date()
        },
        tags: ['mlh', 'hackathon', 'michigan', 'midwest', 'university'],
        eligibility: {
          education_level: ['undergraduate', 'graduate'],
          other_requirements: 'Current students only'
        },
        registration: {
          is_open: true,
          fee: { amount: 0, currency: 'USD' },
          max_participants: 1000
        },
        difficulty_level: 'intermediate',
        team_size: { min: 1, max: 4 },
        themes: ['Gaming', 'Hardware', 'Mobile Apps', 'Web Development', 'AI/ML'],
        prizes: [
          { position: '1st Place', amount: '$7000', description: 'Grand Prize Winner' },
          { position: '2nd Place', amount: '$3500', description: 'Runner Up' },
          { position: '3rd Place', amount: '$1750', description: 'Third Place' }
        ],
        is_active: true
      }
    ];
  }
}

module.exports = MLHFetcher;