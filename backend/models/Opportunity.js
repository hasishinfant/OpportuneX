const mongoose = require('mongoose');

const opportunitySchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  organizer: {
    type: String,
    required: true,
    trim: true
  },
  type: {
    type: String,
    enum: ['hackathon', 'internship', 'workshop'],
    default: 'hackathon'
  },
  mode: {
    type: String,
    enum: ['online', 'offline', 'hybrid'],
    default: 'offline'
  },
  location: {
    city: String,
    state: String,
    country: String,
    venue: String
  },
  dates: {
    start_date: {
      type: Date,
      required: true
    },
    end_date: {
      type: Date,
      required: true
    },
    registration_deadline: Date
  },
  skills_required: [{
    type: String,
    trim: true
  }],
  prizes: [{
    position: String,
    amount: String,
    description: String
  }],
  eligibility: {
    min_age: Number,
    max_age: Number,
    education_level: [String],
    other_requirements: String
  },
  registration: {
    is_open: {
      type: Boolean,
      default: true
    },
    fee: {
      amount: Number,
      currency: {
        type: String,
        default: 'USD'
      }
    },
    max_participants: Number,
    current_participants: Number
  },
  contact: {
    email: String,
    phone: String,
    website: String,
    social_media: {
      twitter: String,
      linkedin: String,
      discord: String
    }
  },
  external_url: {
    type: String,
    required: true
  },
  source: {
    platform: {
      type: String,
      required: true,
      default: 'MLH'
    },
    source_id: String,
    last_updated: {
      type: Date,
      default: Date.now
    }
  },
  tags: [{
    type: String,
    trim: true
  }],
  difficulty_level: {
    type: String,
    enum: ['beginner', 'intermediate', 'advanced', 'all'],
    default: 'all'
  },
  team_size: {
    min: Number,
    max: Number
  },
  themes: [String],
  sponsors: [String],
  is_active: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better query performance
opportunitySchema.index({ 'dates.start_date': 1 });
opportunitySchema.index({ 'dates.end_date': 1 });
opportunitySchema.index({ type: 1 });
opportunitySchema.index({ mode: 1 });
opportunitySchema.index({ 'location.city': 1 });
opportunitySchema.index({ 'location.country': 1 });
opportunitySchema.index({ skills_required: 1 });
opportunitySchema.index({ tags: 1 });
opportunitySchema.index({ 'source.platform': 1 });
opportunitySchema.index({ 'source.source_id': 1 });
opportunitySchema.index({ is_active: 1 });

// Compound indexes for common queries
opportunitySchema.index({ type: 1, 'dates.start_date': 1 });
opportunitySchema.index({ 'location.country': 1, type: 1 });
opportunitySchema.index({ is_active: 1, 'dates.start_date': 1 });

// Virtual for checking if registration is still open
opportunitySchema.virtual('is_registration_open').get(function() {
  if (!this.registration.is_open) return false;
  if (this.dates.registration_deadline) {
    return new Date() < this.dates.registration_deadline;
  }
  return new Date() < this.dates.start_date;
});

// Virtual for event status
opportunitySchema.virtual('status').get(function() {
  const now = new Date();
  if (now < this.dates.start_date) {
    return 'upcoming';
  } else if (now >= this.dates.start_date && now <= this.dates.end_date) {
    return 'ongoing';
  } else {
    return 'completed';
  }
});

// Method to check if opportunity matches search criteria
opportunitySchema.methods.matchesFilters = function(filters) {
  if (filters.location && this.location.city) {
    const locationMatch = this.location.city.toLowerCase().includes(filters.location.toLowerCase()) ||
                         this.location.state?.toLowerCase().includes(filters.location.toLowerCase()) ||
                         this.location.country?.toLowerCase().includes(filters.location.toLowerCase());
    if (!locationMatch) return false;
  }

  if (filters.category && filters.category !== this.type) {
    return false;
  }

  if (filters.skills && filters.skills.length > 0) {
    const hasMatchingSkill = filters.skills.some(skill => 
      this.skills_required.some(reqSkill => 
        reqSkill.toLowerCase().includes(skill.toLowerCase())
      )
    );
    if (!hasMatchingSkill) return false;
  }

  if (filters.mode && filters.mode !== this.mode) {
    return false;
  }

  return true;
};

// Static method to find active opportunities
opportunitySchema.statics.findActive = function(filters = {}) {
  const query = { 
    is_active: true,
    'dates.end_date': { $gte: new Date() }
  };
  
  if (filters.upcoming_only) {
    query['dates.start_date'] = { $gte: new Date() };
  }
  
  return this.find(query);
};

// Pre-save middleware to set is_active based on dates
opportunitySchema.pre('save', function(next) {
  const now = new Date();
  this.is_active = this.dates.end_date > now;
  next();
});

module.exports = mongoose.model('Opportunity', opportunitySchema);