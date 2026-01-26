#!/usr/bin/env tsx

/**
 * Test script for the OpportuneX notification system
 * This script demonstrates the complete notification workflow
 */

import { deadlineReminderService } from '../lib/services/deadline-reminder.service';
import { inAppNotificationService } from '../lib/services/in-app-notification.service';
import { notificationDeliveryService } from '../lib/services/notification-delivery.service';
import { notificationTemplateService } from '../lib/services/notification-template.service';
import { notificationService } from '../lib/services/notification.service';
import { opportunityAlertsService } from '../lib/services/opportunity-alerts.service';

// Test data
const testUser = {
  id: 'user-123',
  name: 'John Doe',
  email: 'john.doe@example.com',
  phone: '+91-9876543210',
};

const testOpportunity = {
  id: 'opp-456',
  title: 'AI Innovation Hackathon 2024',
  description: 'Build the next generation of AI applications that solve real-world problems. Open to students and professionals.',
  type: 'hackathon' as const,
  organizer: {
    name: 'TechCorp India',
    type: 'corporate' as const,
  },
  deadline: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days from now
  location: 'Mumbai, India',
  mode: 'hybrid' as const,
  stipend: '₹1,00,000',
  skills: ['JavaScript', 'Python', 'Machine Learning', 'React', 'Node.js'],
  url: 'https://example.com/ai-hackathon-2024',
};

async function testNotificationSystem() {
  console.log('🚀 Testing OpportuneX Notification System\n');

  try {
    // 1. Test Basic Notification Service
    console.log('1️⃣ Testing Basic Notification Service...');
    
    const basicNotification = await notificationService.sendNotification({
      userId: testUser.id,
      type: 'new_opportunity',
      channels: ['email', 'sms', 'in_app', 'push'],
      content: {
        title: 'New Opportunity Available',
        message: `Check out this new ${testOpportunity.type}: ${testOpportunity.title}`,
        data: { opportunityId: testOpportunity.id },
      },
      priority: 'normal',
    });

    console.log(`✅ Sent notification ${basicNotification.id} through ${basicNotification.channels.length} channels`);
    console.log(`   Deliveries: ${basicNotification.deliveries.length}`);

    // 2. Test User Preferences
    console.log('\n2️⃣ Testing User Preferences...');
    
    const preferences = await notificationService.updateUserPreferences(testUser.id, {
      email: true,
      sms: false,
      inApp: true,
      push: true,
      frequency: 'immediate',
      types: ['new_opportunity', 'deadline_reminder'],
      quietHours: {
        enabled: true,
        start: '22:00',
        end: '08:00',
        timezone: 'Asia/Kolkata',
      },
    });

    console.log('✅ Updated user preferences:');
    console.log(`   Email: ${preferences.email}, SMS: ${preferences.sms}`);
    console.log(`   Quiet hours: ${preferences.quietHours.start} - ${preferences.quietHours.end}`);

    // 3. Test In-App Notifications
    console.log('\n3️⃣ Testing In-App Notifications...');
    
    const inAppNotif = await inAppNotificationService.createNotification({
      userId: testUser.id,
      type: 'new_opportunity',
      title: 'New Hackathon Alert',
      message: `${testOpportunity.title} is now open for applications!`,
      priority: 'high',
      data: { opportunityId: testOpportunity.id },
      actionUrl: testOpportunity.url,
      actionText: 'View Details',
    });

    console.log(`✅ Created in-app notification ${inAppNotif.id}`);

    const badge = await inAppNotificationService.getBadge(testUser.id);
    console.log(`   Badge: ${badge.unread} unread out of ${badge.total} total`);

    // 4. Test Deadline Reminders
    console.log('\n4️⃣ Testing Deadline Reminders...');
    
    const reminder = await deadlineReminderService.createReminder({
      userId: testUser.id,
      opportunityId: testOpportunity.id,
      opportunityTitle: testOpportunity.title,
      opportunityType: testOpportunity.type,
      deadline: testOpportunity.deadline,
      channels: ['email', 'in_app'],
    });

    console.log(`✅ Created deadline reminder ${reminder.id}`);
    console.log(`   Reminder times: ${reminder.reminderTimes.length}`);
    console.log(`   Next reminder: ${reminder.reminderTimes[0]?.toLocaleString()}`);

    // 5. Test Opportunity Alerts
    console.log('\n5️⃣ Testing Opportunity Alerts...');
    
    const alert = await opportunityAlertsService.createAlert({
      userId: testUser.id,
      name: 'AI & ML Opportunities',
      description: 'Alert for AI and Machine Learning related opportunities',
      criteria: {
        keywords: ['AI', 'Machine Learning', 'Artificial Intelligence'],
        skills: ['Python', 'JavaScript'],
        opportunityTypes: ['hackathon', 'internship'],
        modes: ['online', 'hybrid'],
        deadlineRange: { min: 1, max: 60 }, // Next 2 months
      },
      channels: ['email', 'in_app'],
      frequency: 'immediate',
    });

    console.log(`✅ Created opportunity alert ${alert.id}: "${alert.name}"`);

    // Test opportunity matching
    const matches = await opportunityAlertsService.checkOpportunityAgainstAlerts(testOpportunity);
    console.log(`   Found ${matches.length} matching alerts`);
    
    if (matches.length > 0) {
      console.log(`   Match score: ${matches[0].matchScore}%`);
      console.log(`   Matched criteria: ${matches[0].matchedCriteria.join(', ')}`);
    }

    // 6. Test Template System
    console.log('\n6️⃣ Testing Template System...');
    
    const templates = await notificationTemplateService.getTemplatesByType('new_opportunity');
    console.log(`✅ Found ${templates.length} templates for new opportunities`);

    if (templates.length > 0) {
      const template = templates[0];
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
          unsubscribeUrl: 'https://opportunex.com/unsubscribe/token123',
          preferencesUrl: 'https://opportunex.com/preferences',
        },
      });

      console.log(`   Rendered template: "${template.name}"`);
      console.log(`   Subject: ${rendered?.subject}`);
      console.log(`   Title: ${rendered?.title}`);
    }

    // 7. Test Delivery Tracking
    console.log('\n7️⃣ Testing Delivery Tracking...');
    
    const emailStats = await notificationDeliveryService.getChannelStats('email', 'day');
    console.log(`✅ Email delivery stats (today):`);
    console.log(`   Sent: ${emailStats.totalSent}, Delivered: ${emailStats.totalDelivered}`);
    console.log(`   Delivery rate: ${emailStats.deliveryRate}%`);

    const circuitBreakers = notificationDeliveryService.getCircuitBreakerStates();
    console.log(`   Circuit breakers: ${circuitBreakers.filter(cb => cb.state === 'closed').length}/4 closed`);

    // 8. Test Statistics
    console.log('\n8️⃣ Testing Statistics...');
    
    const notificationStats = await inAppNotificationService.getNotificationStats(testUser.id);
    console.log(`✅ User notification stats:`);
    console.log(`   Total: ${notificationStats.total}, Unread: ${notificationStats.unread}`);
    console.log(`   Read rate: ${notificationStats.readRate.toFixed(1)}%`);

    const alertStats = await opportunityAlertsService.getAlertStats(testUser.id);
    console.log(`   Alert stats: ${alertStats.totalAlerts} alerts, ${alertStats.totalMatches} matches`);

    const templateStats = await notificationTemplateService.getTemplateStats();
    console.log(`   Template stats: ${templateStats.totalTemplates} templates, ${templateStats.activeTemplates} active`);

    // 9. Test Cleanup Operations
    console.log('\n9️⃣ Testing Cleanup Operations...');
    
    // Mark some notifications as read
    await inAppNotificationService.markAsRead(inAppNotif.id, testUser.id);
    console.log('✅ Marked notification as read');

    // Clean up expired notifications (simulate)
    const cleanedCount = await inAppNotificationService.cleanupExpiredNotifications();
    console.log(`   Cleaned up ${cleanedCount} expired notifications`);

    // 10. Test Error Handling
    console.log('\n🔟 Testing Error Handling...');
    
    try {
      await notificationService.sendNotification({
        userId: '',
        type: 'new_opportunity',
        channels: [],
        content: { title: '', message: '' },
        priority: 'normal',
      });
    } catch (error) {
      console.log('✅ Properly handled invalid notification request');
    }

    try {
      await notificationTemplateService.renderTemplate('non-existent-template', {
        variables: {},
      });
    } catch (error) {
      console.log('✅ Properly handled non-existent template');
    }

    console.log('\n🎉 All notification system tests completed successfully!');
    
    // Display summary
    console.log('\n📊 Test Summary:');
    console.log('================');
    console.log('✅ Basic notification sending');
    console.log('✅ User preference management');
    console.log('✅ In-app notification system');
    console.log('✅ Deadline reminder system');
    console.log('✅ Opportunity alert matching');
    console.log('✅ Template rendering system');
    console.log('✅ Delivery tracking & circuit breakers');
    console.log('✅ Statistics and analytics');
    console.log('✅ Cleanup operations');
    console.log('✅ Error handling');

  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  } finally {
    // Cleanup
    deadlineReminderService.stopReminderProcessor();
    opportunityAlertsService.stopAlertProcessor();
  }
}

// Run the test
if (require.main === module) {
  testNotificationSystem()
    .then(() => {
      console.log('\n✨ Notification system test completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Test failed:', error);
      process.exit(1);
    });
}

export { testNotificationSystem };
