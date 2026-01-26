const express = require('express');
const { body, query, validationResult } = require('express-validator');
const JsonDB = require('../lib/jsondb');

const router = express.Router();

// Initialize JSON database
const opportunitiesDB = new JsonDB('opportunities.json');

// Validation middleware
const validateFilters = [
  query('skill').optional().isString().trim(),
  query('category').optional().isIn(['hackathon', 'internship', 'workshop', 'quiz']),
  query('location').optional().isString().trim(),
  query('mode').optional().isIn(['online', 'offline', 'hybrid']),
  query('organizer_type').optional().isIn(['company', 'startup', 'college']),
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 50 }).toInt()
];

// GET /api/opportunities - Get filtered opportunities
router.get('/', validateFilters, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { skill, category, location, mode, organizer_type, page = 1, limit = 10 } = req.query;
    
    // Build filter object
    const filter = {};
    
    if (category) filter.category = category;
    if (mode) filter.mode = mode;
    if (organizer_type) filter.organizer_type = organizer_type;
    
    if (skill) {
      filter.skills_required = { $in: [new RegExp(skill, 'i')] };
    }
    
    if (location) {
      filter['location.city'] = { $regex: location, $options: 'i' };
    }

    // Get all matching opportunities
    let opportunities = opportunitiesDB.find(filter);
    
    // Filter by future deadlines
    opportunities = opportunities.filter(opp => new Date(opp.deadline) >= new Date());
    
    // Sort by deadline
    opportunities.sort((a, b) => new Date(a.deadline) - new Date(b.deadline));
    
    // Pagination
    const total = opportunities.length;
    const skip = (page - 1) * limit;
    const paginatedOpportunities = opportunities.slice(skip, skip + limit);

    res.json({
      opportunities: paginatedOpportunities,
      pagination: {
        current_page: page,
        total_pages: Math.ceil(total / limit),
        total_count: total,
        has_next: page < Math.ceil(total / limit),
        has_prev: page > 1
      }
    });
  } catch (error) {
    console.error('Error fetching opportunities:', error);
    res.status(500).json({ error: 'Failed to fetch opportunities' });
  }
});

// GET /api/opportunities/:id - Get single opportunity
router.get('/:id', async (req, res) => {
  try {
    const opportunity = opportunitiesDB.findById(req.params.id);
    
    if (!opportunity) {
      return res.status(404).json({ error: 'Opportunity not found' });
    }

    res.json(opportunity);
  } catch (error) {
    console.error('Error fetching opportunity:', error);
    res.status(500).json({ error: 'Failed to fetch opportunity' });
  }
});

// POST /api/opportunities - Create new opportunity (for testing)
router.post('/', [
  body('title').notEmpty().trim(),
  body('description').notEmpty().trim(),
  body('category').isIn(['hackathon', 'internship', 'workshop', 'quiz']),
  body('platform').notEmpty().trim(),
  body('organizer_type').isIn(['company', 'startup', 'college']),
  body('mode').isIn(['online', 'offline', 'hybrid']),
  body('location.city').notEmpty().trim(),
  body('location.state').notEmpty().trim(),
  body('start_date').isISO8601().toDate(),
  body('deadline').isISO8601().toDate(),
  body('official_link').isURL()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const opportunity = opportunitiesDB.insert(req.body);
    
    res.status(201).json(opportunity);
  } catch (error) {
    console.error('Error creating opportunity:', error);
    res.status(500).json({ error: 'Failed to create opportunity' });
  }
});

module.exports = router;