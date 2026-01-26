const mongoose = require('mongoose');
const MLHFetcher = require('../services/fetchers/mlhFetcher');
const dataService = require('../services/dataService');

class OpportunitySync {
  constructor() {
    this.mlhFetcher = new MLHFetcher();
  }

  async syncAll() {
    console.log('🔄 Starting opportunity sync job...');
    const startTime = Date.now();
    
    try {
      // Check if MongoDB is available
      const useMongoDb = mongoose.connection.readyState === 1;
      dataService.setMongoDbStatus(useMongoDb);
      
      if (useMongoDb) {
        console.log('📊 Using MongoDB for data storage');
      } else {
        console.log('📁 Using JSON file storage');
      }

      // Sync MLH opportunities
      const mlhResults = await this.syncMLHOpportunities();
      
      // Clean up expired opportunities
      const cleanupResults = await this.cleanupExpiredOpportunities();

      const totalTime = Date.now() - startTime;
      
      console.log('✅ Sync job completed successfully');
      console.log(`📊 Sync Summary:
        - MLH: ${mlhResults.new} new, ${mlhResults.updated} updated, ${mlhResults.skipped} skipped
        - Cleanup: ${cleanupResults.deactivated} deactivated
        - Total time: ${totalTime}ms
      `);

      return {
        success: true,
        mlh: mlhResults,
        cleanup: cleanupResults,
        duration: totalTime
      };

    } catch (error) {
      console.error('❌ Sync job failed:', error);
      return {
        success: false,
        error: error.message,
        duration: Date.now() - startTime
      };
    }
  }

  async syncMLHOpportunities() {
    console.log('🔍 Syncing MLH opportunities...');
    
    try {
      const opportunities = await this.mlhFetcher.fetchOpportunities();
      let newCount = 0;
      let updatedCount = 0;
      let skippedCount = 0;

      for (const opportunityData of opportunities) {
        try {
          const result = await this.upsertOpportunity(opportunityData);
          
          if (result.created) {
            newCount++;
            console.log(`✨ Created: ${opportunityData.title}`);
          } else if (result.updated) {
            updatedCount++;
            console.log(`🔄 Updated: ${opportunityData.title}`);
          } else {
            skippedCount++;
          }
        } catch (error) {
          console.warn(`⚠️ Failed to process opportunity "${opportunityData.title}":`, error.message);
          skippedCount++;
        }
      }

      return { new: newCount, updated: updatedCount, skipped: skippedCount };

    } catch (error) {
      console.error('❌ Error syncing MLH opportunities:', error);
      return { new: 0, updated: 0, skipped: 0, error: error.message };
    }
  }

  async upsertOpportunity(opportunityData) {
    // Check if opportunity already exists
    const query = {
      $or: [
        { 'source.source_id': opportunityData.source.source_id },
        { external_url: opportunityData.external_url },
        { 
          title: opportunityData.title,
          'source.platform': opportunityData.source.platform
        }
      ]
    };

    return await dataService.upsertOpportunity(query, opportunityData);
  }

  shouldUpdateOpportunity(existing, newData) {
    // Always update if the source data is newer
    const existingLastUpdated = existing.source.last_updated || existing.updatedAt;
    const timeDiff = Date.now() - existingLastUpdated.getTime();
    
    // Update if it's been more than 1 hour since last update
    if (timeDiff > 60 * 60 * 1000) {
      return true;
    }

    // Check for significant changes
    const significantFields = [
      'title',
      'description',
      'dates.start_date',
      'dates.end_date',
      'dates.registration_deadline',
      'location.city',
      'registration.is_open',
      'external_url'
    ];

    for (const field of significantFields) {
      const existingValue = this.getNestedValue(existing, field);
      const newValue = this.getNestedValue(newData, field);
      
      if (this.valuesAreDifferent(existingValue, newValue)) {
        console.log(`📝 Field changed for "${existing.title}": ${field}`);
        return true;
      }
    }

    return false;
  }

  getNestedValue(obj, path) {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  valuesAreDifferent(val1, val2) {
    if (val1 instanceof Date && val2 instanceof Date) {
      return Math.abs(val1.getTime() - val2.getTime()) > 1000; // 1 second tolerance
    }
    
    if (typeof val1 === 'string' && typeof val2 === 'string') {
      return val1.trim().toLowerCase() !== val2.trim().toLowerCase();
    }
    
    return val1 !== val2;
  }

  async cleanupExpiredOpportunities() {
    console.log('🧹 Cleaning up expired opportunities...');
    
    try {
      if (dataService.useMongoDb) {
        const Opportunity = require('../models/Opportunity');
        const result = await Opportunity.updateMany(
          {
            is_active: true,
            'dates.end_date': { $lt: new Date() }
          },
          {
            $set: { 
              is_active: false,
              'source.last_updated': new Date()
            }
          }
        );
        
        console.log(`🗑️ Deactivated ${result.modifiedCount} expired opportunities`);
        return { deactivated: result.modifiedCount };
      } else {
        // JSON fallback
        const data = dataService.readJsonData();
        const now = new Date();
        let deactivated = 0;
        
        data.forEach(item => {
          if (item.is_active && item.dates && new Date(item.dates.end_date) < now) {
            item.is_active = false;
            item.source = item.source || {};
            item.source.last_updated = new Date().toISOString();
            deactivated++;
          }
        });
        
        if (deactivated > 0) {
          dataService.writeJsonData(data);
        }
        
        console.log(`🗑️ Deactivated ${deactivated} expired opportunities`);
        return { deactivated };
      }

    } catch (error) {
      console.error('❌ Error during cleanup:', error);
      return { deactivated: 0, error: error.message };
    }
  }

  async getStats() {
    try {
      return await dataService.getStats();
    } catch (error) {
      console.error('❌ Error getting stats:', error);
      return null;
    }
  }
}

// If running directly (not imported)
if (require.main === module) {
  const sync = new OpportunitySync();
  
  sync.syncAll()
    .then(result => {
      console.log('Sync result:', result);
      process.exit(result.success ? 0 : 1);
    })
    .catch(error => {
      console.error('Sync failed:', error);
      process.exit(1);
    });
}

module.exports = OpportunitySync;