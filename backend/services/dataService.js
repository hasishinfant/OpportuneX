const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

class DataService {
  constructor() {
    this.useMongoDb = false;
    this.jsonFilePath = path.join(__dirname, '../data/opportunities.json');
    this.ensureJsonFile();
  }

  setMongoDbStatus(status) {
    this.useMongoDb = status;
  }

  ensureJsonFile() {
    const dir = path.dirname(this.jsonFilePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    if (!fs.existsSync(this.jsonFilePath)) {
      fs.writeFileSync(this.jsonFilePath, JSON.stringify([], null, 2));
    }
  }

  // JSON file operations
  readJsonData() {
    try {
      const data = fs.readFileSync(this.jsonFilePath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      console.error('Error reading JSON file:', error);
      return [];
    }
  }

  writeJsonData(data) {
    try {
      fs.writeFileSync(this.jsonFilePath, JSON.stringify(data, null, 2));
      return true;
    } catch (error) {
      console.error('Error writing JSON file:', error);
      return false;
    }
  }

  generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  // Unified API methods
  async findOpportunities(query = {}, options = {}) {
    if (this.useMongoDb) {
      const Opportunity = require('../models/Opportunity');
      const { page = 1, limit = 20, sort = {} } = options;
      const skip = (page - 1) * limit;
      
      const [opportunities, total] = await Promise.all([
        Opportunity.find(query).sort(sort).skip(skip).limit(limit).lean(),
        Opportunity.countDocuments(query)
      ]);
      
      return { opportunities, total };
    } else {
      // JSON fallback
      let data = this.readJsonData();
      
      // Apply filters
      if (Object.keys(query).length > 0) {
        data = data.filter(item => this.matchesQuery(item, query));
      }
      
      const total = data.length;
      
      // Apply sorting
      if (options.sort) {
        data = this.sortData(data, options.sort);
      }
      
      // Apply pagination
      const page = options.page || 1;
      const limit = options.limit || 20;
      const skip = (page - 1) * limit;
      const opportunities = data.slice(skip, skip + limit);
      
      return { opportunities, total };
    }
  }

  async findOpportunityById(id) {
    if (this.useMongoDb) {
      const Opportunity = require('../models/Opportunity');
      return await Opportunity.findById(id).lean();
    } else {
      const data = this.readJsonData();
      return data.find(item => item._id === id);
    }
  }

  async createOpportunity(opportunityData) {
    if (this.useMongoDb) {
      const Opportunity = require('../models/Opportunity');
      const opportunity = new Opportunity(opportunityData);
      return await opportunity.save();
    } else {
      const data = this.readJsonData();
      const newOpportunity = {
        _id: this.generateId(),
        ...opportunityData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      data.push(newOpportunity);
      this.writeJsonData(data);
      return newOpportunity;
    }
  }

  async updateOpportunity(id, updates) {
    if (this.useMongoDb) {
      const Opportunity = require('../models/Opportunity');
      return await Opportunity.findByIdAndUpdate(id, updates, { new: true }).lean();
    } else {
      const data = this.readJsonData();
      const index = data.findIndex(item => item._id === id);
      if (index !== -1) {
        data[index] = {
          ...data[index],
          ...updates,
          updatedAt: new Date().toISOString()
        };
        this.writeJsonData(data);
        return data[index];
      }
      return null;
    }
  }

  async upsertOpportunity(query, opportunityData) {
    if (this.useMongoDb) {
      const Opportunity = require('../models/Opportunity');
      const existing = await Opportunity.findOne(query);
      
      if (existing) {
        Object.assign(existing, opportunityData);
        await existing.save();
        return { created: false, updated: true, opportunity: existing };
      } else {
        const newOpportunity = new Opportunity(opportunityData);
        await newOpportunity.save();
        return { created: true, updated: false, opportunity: newOpportunity };
      }
    } else {
      const data = this.readJsonData();
      const existing = data.find(item => this.matchesQuery(item, query));
      
      if (existing) {
        const index = data.findIndex(item => item._id === existing._id);
        data[index] = {
          ...existing,
          ...opportunityData,
          _id: existing._id,
          createdAt: existing.createdAt,
          updatedAt: new Date().toISOString()
        };
        this.writeJsonData(data);
        return { created: false, updated: true, opportunity: data[index] };
      } else {
        const newOpportunity = {
          _id: this.generateId(),
          ...opportunityData,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        data.push(newOpportunity);
        this.writeJsonData(data);
        return { created: true, updated: false, opportunity: newOpportunity };
      }
    }
  }

  async countOpportunities(query = {}) {
    if (this.useMongoDb) {
      const Opportunity = require('../models/Opportunity');
      return await Opportunity.countDocuments(query);
    } else {
      const data = this.readJsonData();
      if (Object.keys(query).length === 0) {
        return data.length;
      }
      return data.filter(item => this.matchesQuery(item, query)).length;
    }
  }

  async getStats() {
    if (this.useMongoDb) {
      const Opportunity = require('../models/Opportunity');
      const stats = await Opportunity.aggregate([
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            active: { $sum: { $cond: ['$is_active', 1, 0] } },
            upcoming: { 
              $sum: { 
                $cond: [
                  { $gt: ['$dates.start_date', new Date()] }, 
                  1, 
                  0
                ] 
              } 
            }
          }
        }
      ]);

      const platformStats = await Opportunity.aggregate([
        {
          $group: {
            _id: '$source.platform',
            count: { $sum: 1 },
            active: { $sum: { $cond: ['$is_active', 1, 0] } }
          }
        }
      ]);

      return {
        overview: stats[0] || { total: 0, active: 0, upcoming: 0 },
        byPlatform: platformStats
      };
    } else {
      const data = this.readJsonData();
      const now = new Date();
      
      const total = data.length;
      const active = data.filter(item => item.is_active).length;
      const upcoming = data.filter(item => 
        item.dates && new Date(item.dates.start_date) > now
      ).length;
      
      const platformStats = {};
      data.forEach(item => {
        const platform = item.source?.platform || 'Unknown';
        if (!platformStats[platform]) {
          platformStats[platform] = { count: 0, active: 0 };
        }
        platformStats[platform].count++;
        if (item.is_active) {
          platformStats[platform].active++;
        }
      });

      return {
        overview: { total, active, upcoming },
        byPlatform: Object.entries(platformStats).map(([platform, stats]) => ({
          _id: platform,
          ...stats
        }))
      };
    }
  }

  // Helper methods for JSON operations
  matchesQuery(item, query) {
    return Object.keys(query).every(key => {
      const queryValue = query[key];
      const itemValue = this.getNestedValue(item, key);
      
      if (key === '$or') {
        // Handle $or operator
        return queryValue.some(condition => this.matchesQuery(item, condition));
      }
      
      if (queryValue && typeof queryValue === 'object') {
        // Handle MongoDB-style operators
        if (queryValue.$regex) {
          const regex = new RegExp(queryValue.$regex, queryValue.$options || 'i');
          return regex.test(itemValue);
        }
        if (queryValue.$gte) {
          return new Date(itemValue) >= new Date(queryValue.$gte);
        }
        if (queryValue.$lt) {
          return new Date(itemValue) < new Date(queryValue.$lt);
        }
        if (queryValue.$in) {
          if (Array.isArray(itemValue)) {
            // For array fields like skills_required
            return queryValue.$in.some(val => {
              if (val instanceof RegExp) {
                return itemValue.some(skill => val.test(skill));
              }
              return itemValue.includes(val);
            });
          } else if (Array.isArray(queryValue.$in) && queryValue.$in[0] instanceof RegExp) {
            // For regex searches in arrays like tags
            return queryValue.$in.some(regex => regex.test(itemValue));
          } else {
            return queryValue.$in.includes(itemValue);
          }
        }
      }
      
      return itemValue === queryValue;
    });
  }

  getNestedValue(obj, path) {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  sortData(data, sortOptions) {
    return data.sort((a, b) => {
      for (const [field, direction] of Object.entries(sortOptions)) {
        const aVal = this.getNestedValue(a, field);
        const bVal = this.getNestedValue(b, field);
        
        let comparison = 0;
        if (aVal < bVal) comparison = -1;
        if (aVal > bVal) comparison = 1;
        
        if (comparison !== 0) {
          return direction === -1 ? -comparison : comparison;
        }
      }
      return 0;
    });
  }
}

module.exports = new DataService();