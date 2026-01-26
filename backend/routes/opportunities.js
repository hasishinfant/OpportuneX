const express = require('express');
const dataService = require('../services/dataService');
const OpportunitySync = require('../jobs/syncOpportunities');

const router = express.Router();

// GET /api/opportunities - Get filtered opportunities with pagination
router.get('/', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      location,
      category,
      skills,
      mode,
      search,
      upcoming_only = 'true',
      sort_by = 'start_date'
    } = req.query;

    // Build query
    const query = { is_active: true };

    // Filter by upcoming events only
    if (upcoming_only === 'true') {
      query['dates.end_date'] = { $gte: new Date() };
    }

    // Location filter
    if (location) {
      query.$or = [
        { 'location.city': { $regex: location, $options: 'i' } },
        { 'location.state': { $regex: location, $options: 'i' } },
        { 'location.country': { $regex: location, $options: 'i' } }
      ];
    }

    // Category filter
    if (category && category !== 'all') {
      query.type = category;
    }

    // Mode filter
    if (mode && mode !== 'all') {
      query.mode = mode;
    }

    // Skills filter
    if (skills) {
      const skillsArray = Array.isArray(skills) ? skills : skills.split(',');
      query.skills_required = {
        $in: skillsArray.map(skill => new RegExp(skill.trim(), 'i'))
      };
    }

    // Text search
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { organizer: { $regex: search, $options: 'i' } },
        { tags: { $in: [new RegExp(search, 'i')] } }
      ];
    }

    // Sorting
    let sortOptions = {};
    switch (sort_by) {
      case 'start_date':
        sortOptions = { 'dates.start_date': 1 };
        break;
      case 'deadline':
        sortOptions = { 'dates.registration_deadline': 1 };
        break;
      case 'title':
        sortOptions = { title: 1 };
        break;
      case 'created':
        sortOptions = { createdAt: -1 };
        break;
      default:
        sortOptions = { 'dates.start_date': 1 };
    }

    // Pagination
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit))); // Max 100 per page

    // Execute query using data service
    const { opportunities, total } = await dataService.findOpportunities(query, {
      page: pageNum,
      limit: limitNum,
      sort: sortOptions
    });

    // Calculate pagination info
    const totalPages = Math.ceil(total / limitNum);
    const hasNext = pageNum < totalPages;
    const hasPrev = pageNum > 1;

    res.json({
      success: true,
      data: opportunities,
      pagination: {
        current_page: pageNum,
        total_pages: totalPages,
        total_items: total,
        items_per_page: limitNum,
        has_next: hasNext,
        has_previous: hasPrev
      },
      filters_applied: {
        location,
        category,
        skills: skills ? (Array.isArray(skills) ? skills : skills.split(',')) : null,
        mode,
        search,
        upcoming_only: upcoming_only === 'true',
        sort_by
      }
    });

  } catch (error) {
    console.error('Error fetching opportunities:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch opportunities',
      message: error.message
    });
  }
});

// GET /api/opportunities/:id - Get single opportunity by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const opportunity = await dataService.findOpportunityById(id);
    
    if (!opportunity) {
      return res.status(404).json({
        success: false,
        error: 'Opportunity not found'
      });
    }

    res.json({
      success: true,
      data: opportunity
    });

  } catch (error) {
    console.error('Error fetching opportunity:', error);
    
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        error: 'Invalid opportunity ID format'
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to fetch opportunity',
      message: error.message
    });
  }
});

// GET /api/opportunities/stats/overview - Get statistics
router.get('/stats/overview', async (req, res) => {
  try {
    const sync = new OpportunitySync();
    const stats = await sync.getStats();
    
    if (!stats) {
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch statistics'
      });
    }

    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch statistics',
      message: error.message
    });
  }
});

// POST /api/opportunities/sync - Trigger manual sync
router.post('/sync', async (req, res) => {
  try {
    const sync = new OpportunitySync();
    const result = await sync.syncAll();
    
    res.json({
      success: result.success,
      data: result,
      message: result.success ? 'Sync completed successfully' : 'Sync failed'
    });

  } catch (error) {
    console.error('Error during manual sync:', error);
    res.status(500).json({
      success: false,
      error: 'Sync failed',
      message: error.message
    });
  }
});

// GET /api/opportunities/search/suggestions - Get search suggestions
router.get('/search/suggestions', async (req, res) => {
  try {
    const { q } = req.query;
    
    if (!q || q.length < 2) {
      return res.json({
        success: true,
        data: {
          titles: [],
          skills: [],
          locations: [],
          organizers: []
        }
      });
    }

    const regex = new RegExp(q, 'i');
    
    // Get suggestions from different fields
    const [titleSuggestions, skillSuggestions, locationSuggestions, organizerSuggestions] = await Promise.all([
      // Title suggestions
      Opportunity.find(
        { title: regex, is_active: true },
        { title: 1 }
      ).limit(5).lean(),
      
      // Skill suggestions
      Opportunity.aggregate([
        { $match: { is_active: true } },
        { $unwind: '$skills_required' },
        { $match: { skills_required: regex } },
        { $group: { _id: '$skills_required' } },
        { $limit: 5 }
      ]),
      
      // Location suggestions
      Opportunity.aggregate([
        { $match: { is_active: true } },
        {
          $project: {
            locations: [
              '$location.city',
              '$location.state',
              '$location.country'
            ]
          }
        },
        { $unwind: '$locations' },
        { $match: { locations: regex } },
        { $group: { _id: '$locations' } },
        { $limit: 5 }
      ]),
      
      // Organizer suggestions
      Opportunity.find(
        { organizer: regex, is_active: true },
        { organizer: 1 }
      ).limit(5).lean()
    ]);

    res.json({
      success: true,
      data: {
        titles: titleSuggestions.map(item => item.title),
        skills: skillSuggestions.map(item => item._id),
        locations: locationSuggestions.map(item => item._id).filter(Boolean),
        organizers: [...new Set(organizerSuggestions.map(item => item.organizer))]
      }
    });

  } catch (error) {
    console.error('Error fetching suggestions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch suggestions',
      message: error.message
    });
  }
});

// GET /api/opportunities/filters/options - Get filter options
router.get('/filters/options', async (req, res) => {
  try {
    const [skills, locations, organizers, types, modes] = await Promise.all([
      // Popular skills
      Opportunity.aggregate([
        { $match: { is_active: true } },
        { $unwind: '$skills_required' },
        { $group: { _id: '$skills_required', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 20 }
      ]),
      
      // Popular locations
      Opportunity.aggregate([
        { $match: { is_active: true } },
        {
          $group: {
            _id: {
              city: '$location.city',
              country: '$location.country'
            },
            count: { $sum: 1 }
          }
        },
        { $sort: { count: -1 } },
        { $limit: 15 }
      ]),
      
      // Organizers
      Opportunity.aggregate([
        { $match: { is_active: true } },
        { $group: { _id: '$organizer', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 }
      ]),
      
      // Types
      Opportunity.aggregate([
        { $match: { is_active: true } },
        { $group: { _id: '$type', count: { $sum: 1 } } }
      ]),
      
      // Modes
      Opportunity.aggregate([
        { $match: { is_active: true } },
        { $group: { _id: '$mode', count: { $sum: 1 } } }
      ])
    ]);

    res.json({
      success: true,
      data: {
        skills: skills.map(item => ({ name: item._id, count: item.count })),
        locations: locations.map(item => ({
          city: item._id.city,
          country: item._id.country,
          count: item.count
        })).filter(item => item.city),
        organizers: organizers.map(item => ({ name: item._id, count: item.count })),
        types: types.map(item => ({ name: item._id, count: item.count })),
        modes: modes.map(item => ({ name: item._id, count: item.count }))
      }
    });

  } catch (error) {
    console.error('Error fetching filter options:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch filter options',
      message: error.message
    });
  }
});

module.exports = router;