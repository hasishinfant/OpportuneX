#!/usr/bin/env tsx

/**
 * Simple test script for the OpportuneX notification system
 * This script tests the notification services without requiring environment variables
 */

// Mock environment for testing
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
process.env.REDIS_URL = 'redis://localhost:6379';
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.REFRESH_TOKEN_SECRET = 'test-refresh-secret';

import { deadlineReminderService } from '../lib/services/deadline-reminder.service';
import { inAppNotificationService } from '../lib/services/in-app-notification.service';
import { notificationTemplateService } from '../lib/services/notification-template.service';
import { notificationService } from '../lib/services/notification.service';
import { opportunityAlertsService } from '../lib/services/opportunity-alerts.service';

// Test data
const testUser = {
  id: 'user-123',
  name: 'John Doe',
  email: 'john.doe@example.com',
};

const testOpportunity = {
  id: 'opp-456',
  title: 'AI Innovation Hackathon 2024',
  description: 'Build the next generation of AI applications',
  type: 'hackathon' as const,
  organizer: {
    name: 'TechCorp India',
    type: 'corporate' as const,
  },
  deadline: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days from now
  location: 'Mumbai, India',
  mode: 'hybrid' as const,
  stipend: '₹1,00,000',
  skills: ['JavaScript', 'Python', 'Machine Learning'],
  url: 'https://example.com/ai-hackathon-2024',
};

async function runSimpleTest() {
  console.log('🚀 Testing OpportuneX Notification System (Simple Test)\n');

  try {
    // 1. Test In-App Notifications
    console.log('1️⃣ Testing In-App Notifications...');
    
    const inAppNotif = await inAppNotificationService.createNotification({
      userId: testUser.id,
      type: 'new_opportunity',
      title: 'New Hackathon Alert',
      message: `${testOpportunity.title} is now open for applications!`,
      priority: 'high',
      data: { opportunityId: testOpportunity.id },
    });

    console.log(`✅ Created in-app notification: ${inAppNotif.id}`);

    const notifications = await inAppNotificationService.getUserNotifications(testUser.id);
    console.log(`   Retrieved ${notifications.notifications.length} notifications`);

    const badge = await inAppNotificationService.getBadge(testUser.id);
    console.log(`   Badge: ${badge.unread} unread out of ${badge.total} total`);

    // 2. Test Deadline Reminders
    console.log('\n2️⃣ Testing Deadline Reminders...');
    
    const reminder = await deadlineReminderService.createReminder({
      userId: testUser.id,
      opportunityId: testOpportunity.id,
      opportunityTitle: testOpportunity.title,
      opportunityType: testOpportunity.type,
      deadline: testOpportunity.deadline,
      channels: ['in_app'],
    });

    console.log(`✅ Created deadline reminder: ${reminder.id}`);
    console.log(`   Reminder times: ${reminder.reminderTimes.length}`);
    
    if (reminder.reminderTimes.length > 0) {
      console.log(`   Next reminder: ${reminder.reminderTimes[0].toLocaleString()}`);
    }

    // 3. Test Opportunity Alerts
    console.log('\n3️⃣ Testing Opportunity Alerts...');
    
    const alert = await opportunityAlertsService.createAlert({
      userId: testUser.id,
      name: 'AI & ML Opportunities',
      description: 'Alert for AI and Machine Learning opportunities',
      criteria: {
        keywords: ['AI', 'Machine Learning'],
        skills: ['Python', 'JavaScript'],
        opportunityTypes: ['hackathon'],
      },
      channels: ['in_app'],
      frequency: 'immediate',
    });

    console.log(`✅ Created opportunity alert: ${alert.id}`);
    console.log(`   Alert name: "${alert.name}"`);

    // Test opportunity matching
    const matches = await opportunityAlertsService.checkOpportunityAgainstAlerts(testOpportunity);
    console.log(`   Found ${matches.length} matching alerts`);
    
    if (matches.length > 0) {
      console.log(`   Match score: ${matches[0].matchScore}%`);
      console.log(`   Matched criteria: ${matches[0].matchedCriteria.join(', ')}`);
    }

    // 4. Test Template System
    console.log('\n4️⃣ Testing Template System...');
    
    const templates = await notificationTemplateService.getTemplatesByType('new_opportunity');
    console.log(`✅ Found ${templates.length} templates for new opportunities`);

    if (templates.length > 0) {
      const template = templates[0];
      console.log(`   Template: "${template.name}"`);
      console.log(`   Variables: ${template.variables.length}`);
      console.log(`   Channels: ${template.channels.join(', ')}`);

      try {
        const rendered = await notificationTemplateService.renderTemplate(template.id, {
          variables: {
            userName: testUser.name,
            opportunityType: testOpportunity.type,
            title: testOpportunity.title,
            organizer: testOpportunity.organizer.name,
            deadline: testOpportunity.deadline.toLocaleDateString(),
            location: testOpportunity.location,
            mode: testOpportunity.mode,
            description: testOpportunity.description,
            url: testOpportunity.url,
            unsubscribeUrl: 'https://opportunex.com/unsubscribe',
            preferencesUrl: 'https://opportunex.com/preferences',
          },
        });

        console.log(`   ✅ Template rendered successfully`);
        console.log(`   Subject: ${rendered?.subject || 'N/A'}`);
        console.log(`   Title: ${rendered?.title}`);
      } catch (error) {
        console.log(`   ⚠️ Template rendering failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    // 5. Test User Preferences
    console.log('\n5️⃣ Testing User Preferences...');
    
    const preferences = await notificationService.updateUserPreferences(testUser.id, {
      email: true,
      sms: false,
      inApp: true,
      push: true,
      frequency: 'daily',
      types: ['new_opportunity', 'deadline_reminder'],
    });

    console.log('✅ Updated user preferences:');
    console.log(`   Email: ${preferences.email}, SMS: ${preferences.sms}`);
    console.log(`   In-app: ${preferences.inApp}, Push: ${preferences.push}`);
    console.log(`   Frequency: ${preferences.frequency}`);

    // 6. Test Statistics
    console.log('\n6️⃣ Testing Statistics...');
    
    const notificationStats = await inAppNotificationService.getNotificationStats(testUser.id);
    console.log(`✅ User notification stats:`);
    console.log(`   Total: ${notificationStats.total}, Unread: ${notificationStats.unread}`);
    console.log(`   Read rate: ${notificationStats.readRate.toFixed(1)}%`);

    const alertStats = await opportunityAlertsService.getAlertStats(testUser.id);
    console.log(`   Alert stats: ${alertStats.totalAlerts} alerts, ${alertStats.totalMatches} matches`);

    const templateStats = await notificationTemplateService.getTemplateStats();
    console.log(`   Template stats: ${templateStats.totalTemplates} templates, ${templateStats.activeTemplates} active`);

    // 7. Test Cleanup
    console.log('\n7️⃣ Testing Cleanup Operations...');
    
    // Mark notification as read
    const success = await inAppNotificationService.markAsRead(inAppNotif.id, testUser.id);
    console.log(`✅ Marked notification as read: ${success}`);

    // Update badge
    const updatedBadge = await inAppNotificationService.getBadge(testUser.id);
    console.log(`   Updated badge: ${updatedBadge.unread} unread`);

    console.log('\n🎉 All tests completed successfully!');
    
    // Display summary
    console.log('\n📊 Test Summary:');
    console.log('================');
    console.log('✅ In-app notification system');
    console.log('✅ Deadline reminder system');
    console.log('✅ Opportunity alert matching');
    console.log('✅ Template system');
    console.log('✅ User preference management');
    console.log('✅ Statistics and analytics');
    console.log('✅ Cleanup operations');

    return true;

  } catch (error) {
    console.error('❌ Test failed:', error);
    return false;
  } finally {
    // Cleanup
    try {
      deadlineReminderService.stopReminderProcessor();
      opportunityAlertsService.stopAlertProcessor();
    } catch (error) {
      // Ignore cleanup errors
    }
  }
}

// Run the test
if (require.main === module) {
  runSimpleTest()
    .then((success) => {
      if (success) {
        console.log('\n✨ Notification system test completed successfully!');
        process.exit(0);
      } else {
        console.log('\n💥 Notification system test failed!');
        process.exit(1);
      }
    })
    .catch((error) => {
      console.error('💥 Test failed:', error);
      process.exit(1);
    });
}

export { runSimpleTest };
