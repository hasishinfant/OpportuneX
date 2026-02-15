/**
 * Privacy Policy and Terms of Service content for OpportuneX
 */
export class PrivacyPolicyContent {
  /**
   * Generate privacy policy content
   */
  static getPrivacyPolicy(): {
    title: string;
    lastUpdated: string;
    sections: Array<{
      title: string;
      content: string;
      subsections?: Array<{
        title: string;
        content: string;
      }>;
    }>;
  } {
    return {
      title: 'Privacy Policy',
      lastUpdated: new Date().toISOString().split('T')[0],
      sections: [
        {
          title: '1. Introduction',
          content: `
OpportuneX ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our platform to discover hackathons, internships, and workshops.

This policy applies to all users of OpportuneX, particularly students from Tier 2 and Tier 3 cities in India who are our primary focus.

By using OpportuneX, you consent to the data practices described in this policy.
          `,
        },
        {
          title: '2. Information We Collect',
          content:
            'We collect several types of information to provide and improve our services:',
          subsections: [
            {
              title: '2.1 Personal Information',
              content: `
• Name and email address (required for account creation)
• Phone number (optional, for SMS notifications)
• Educational background (institution, degree, year of study)
• Skills and technical competencies
• Location information (city, state)
• Career interests and preferences
              `,
            },
            {
              title: '2.2 Usage Information',
              content: `
• Search queries and filters applied
• Opportunities viewed and favorited
• AI roadmap requests and interactions
• Voice search recordings (temporarily stored for processing)
• Platform usage patterns and preferences
              `,
            },
            {
              title: '2.3 Technical Information',
              content: `
• IP address and device information
• Browser type and version
• Operating system
• Cookies and similar tracking technologies
• Log files and analytics data
              `,
            },
          ],
        },
        {
          title: '3. How We Use Your Information',
          content: 'We use your information for the following purposes:',
          subsections: [
            {
              title: '3.1 Core Services',
              content: `
• Provide personalized opportunity recommendations
• Generate AI-powered preparation roadmaps
• Process voice search requests
• Send relevant notifications about opportunities
• Maintain your user profile and preferences
              `,
            },
            {
              title: '3.2 Service Improvement',
              content: `
• Analyze usage patterns to improve our platform
• Develop new features and functionality
• Conduct research on opportunity trends
• Optimize search algorithms and recommendations
              `,
            },
            {
              title: '3.3 Communication',
              content: `
• Send important service updates
• Respond to your inquiries and support requests
• Deliver requested notifications about opportunities
• Share relevant educational content and tips
              `,
            },
          ],
        },
        {
          title: '4. Legal Basis for Processing (GDPR)',
          content:
            'For users in the European Union, we process your data based on:',
          subsections: [
            {
              title: '4.1 Consent',
              content: `
• AI-powered recommendations and roadmap generation
• Marketing communications and promotional content
• Voice search processing and storage
• Optional data sharing for research purposes
              `,
            },
            {
              title: '4.2 Legitimate Interests',
              content: `
• Providing core opportunity discovery services
• Platform security and fraud prevention
• Analytics and service improvement
• Customer support and communication
              `,
            },
            {
              title: '4.3 Contractual Necessity',
              content: `
• Account creation and management
• Service delivery and functionality
• Payment processing (if applicable)
              `,
            },
          ],
        },
        {
          title: '5. Information Sharing and Disclosure',
          content:
            'We may share your information in the following circumstances:',
          subsections: [
            {
              title: '5.1 Service Providers',
              content: `
• Cloud hosting providers (AWS, Google Cloud)
• Email service providers (SendGrid)
• SMS service providers (Twilio)
• AI service providers (OpenAI)
• Analytics providers (anonymized data only)
              `,
            },
            {
              title: '5.2 Opportunity Providers',
              content: `
• When you apply for opportunities, we may share relevant profile information with organizers
• Only information necessary for application evaluation is shared
• You will be notified before any data sharing occurs
              `,
            },
            {
              title: '5.3 Legal Requirements',
              content: `
• To comply with applicable laws and regulations
• To respond to legal process or government requests
• To protect our rights, property, or safety
• To prevent fraud or security threats
              `,
            },
          ],
        },
        {
          title: '6. Data Security',
          content: `
We implement comprehensive security measures to protect your information:

• End-to-end encryption for sensitive data
• Secure data transmission using HTTPS/TLS
• Regular security audits and penetration testing
• Access controls and authentication systems
• Employee training on data protection
• Incident response procedures

However, no method of transmission over the internet is 100% secure. We cannot guarantee absolute security but continuously work to improve our protections.
          `,
        },
        {
          title: '7. Data Retention',
          content:
            'We retain your information for different periods based on data type:',
          subsections: [
            {
              title: '7.1 Account Data',
              content:
                'Retained until you delete your account or request deletion',
            },
            {
              title: '7.2 Search History',
              content: 'Retained for 1 year to improve recommendations',
            },
            {
              title: '7.3 Voice Recordings',
              content: 'Processed immediately and deleted within 24 hours',
            },
            {
              title: '7.4 Analytics Data',
              content:
                'Anonymized data retained for 2 years for service improvement',
            },
            {
              title: '7.5 Legal Records',
              content:
                'Consent records and audit logs retained for 7 years as required by law',
            },
          ],
        },
        {
          title: '8. Your Rights and Choices',
          content:
            'You have the following rights regarding your personal information:',
          subsections: [
            {
              title: '8.1 Access and Portability',
              content: `
• Request a copy of all personal data we hold about you
• Export your data in a machine-readable format
• Access your data processing history
              `,
            },
            {
              title: '8.2 Correction and Updates',
              content: `
• Update your profile information at any time
• Correct inaccurate or incomplete data
• Modify your preferences and settings
              `,
            },
            {
              title: '8.3 Deletion and Erasure',
              content: `
• Delete your account and associated data
• Request removal of specific information
• Exercise your "right to be forgotten" under GDPR
              `,
            },
            {
              title: '8.4 Consent Management',
              content: `
• Withdraw consent for specific data processing activities
• Opt out of marketing communications
• Manage notification preferences
• Control cookie settings
              `,
            },
          ],
        },
        {
          title: '9. Cookies and Tracking',
          content: `
We use cookies and similar technologies to enhance your experience:

• Essential cookies for platform functionality
• Analytics cookies to understand usage patterns
• Preference cookies to remember your settings
• Marketing cookies for relevant advertisements (with consent)

You can control cookie settings through your browser or our cookie preference center.
          `,
        },
        {
          title: '10. International Data Transfers',
          content: `
Your information may be transferred to and processed in countries other than your own. We ensure adequate protection through:

• Standard Contractual Clauses (SCCs)
• Adequacy decisions by relevant authorities
• Privacy Shield frameworks where applicable
• Binding Corporate Rules for internal transfers

We only transfer data to countries with adequate data protection laws or appropriate safeguards.
          `,
        },
        {
          title: "11. Children's Privacy",
          content: `
OpportuneX is designed for students who are typically 18 years or older. We do not knowingly collect personal information from children under 13 (or 16 in the EU).

If you are under 18, please ensure you have parental consent before using our services. If we become aware that we have collected information from a child without proper consent, we will delete it promptly.
          `,
        },
        {
          title: '12. Changes to This Policy',
          content: `
We may update this Privacy Policy periodically to reflect changes in our practices or applicable laws. We will:

• Notify you of material changes via email or platform notification
• Post the updated policy on our website
• Maintain previous versions for reference
• Provide a summary of key changes

Your continued use of OpportuneX after changes constitutes acceptance of the updated policy.
          `,
        },
        {
          title: '13. Contact Information',
          content: `
For questions about this Privacy Policy or our data practices, contact us:

• Email: privacy@opportunex.com
• Data Protection Officer: dpo@opportunex.com
• Address: [Company Address]
• Phone: [Contact Number]

For EU residents, you also have the right to lodge a complaint with your local data protection authority.
          `,
        },
      ],
    };
  }

  /**
   * Generate terms of service content
   */
  static getTermsOfService(): {
    title: string;
    lastUpdated: string;
    sections: Array<{
      title: string;
      content: string;
      subsections?: Array<{
        title: string;
        content: string;
      }>;
    }>;
  } {
    return {
      title: 'Terms of Service',
      lastUpdated: new Date().toISOString().split('T')[0],
      sections: [
        {
          title: '1. Acceptance of Terms',
          content: `
By accessing or using OpportuneX ("the Service"), you agree to be bound by these Terms of Service ("Terms"). If you do not agree to these Terms, please do not use the Service.

These Terms constitute a legally binding agreement between you and OpportuneX regarding your use of the Service.
          `,
        },
        {
          title: '2. Description of Service',
          content: `
OpportuneX is an AI-powered platform that helps students discover and access hackathons, internships, and workshops. Our services include:

• Opportunity discovery and search
• AI-powered preparation roadmaps
• Voice search capabilities
• Personalized recommendations
• Notification services
• Educational content and resources
          `,
        },
        {
          title: '3. User Accounts and Registration',
          content:
            'To use certain features of the Service, you must create an account:',
          subsections: [
            {
              title: '3.1 Account Creation',
              content: `
• You must provide accurate and complete information
• You are responsible for maintaining account security
• You must be at least 13 years old (16 in the EU)
• One account per person is permitted
              `,
            },
            {
              title: '3.2 Account Security',
              content: `
• Keep your password confidential and secure
• Notify us immediately of any unauthorized access
• You are responsible for all activities under your account
• Use strong passwords and enable two-factor authentication when available
              `,
            },
          ],
        },
        {
          title: '4. Acceptable Use Policy',
          content:
            'You agree to use the Service responsibly and in compliance with these Terms:',
          subsections: [
            {
              title: '4.1 Permitted Uses',
              content: `
• Search for legitimate educational and career opportunities
• Create and maintain accurate profile information
• Use AI features for educational and career development
• Share feedback to improve the Service
              `,
            },
            {
              title: '4.2 Prohibited Uses',
              content: `
• Violate any applicable laws or regulations
• Impersonate others or provide false information
• Attempt to gain unauthorized access to the Service
• Use automated tools to scrape or harvest data
• Distribute malware, spam, or harmful content
• Interfere with the Service's operation or security
• Use the Service for commercial purposes without permission
              `,
            },
          ],
        },
        {
          title: '5. Content and Intellectual Property',
          content:
            'Rights and responsibilities regarding content on the Service:',
          subsections: [
            {
              title: '5.1 Your Content',
              content: `
• You retain ownership of content you submit
• You grant us a license to use your content to provide the Service
• You are responsible for the accuracy and legality of your content
• You must not submit copyrighted material without permission
              `,
            },
            {
              title: '5.2 Our Content',
              content: `
• OpportuneX owns all intellectual property in the Service
• You may not copy, modify, or distribute our content without permission
• Opportunity listings are provided by third parties and subject to their terms
• AI-generated content is provided for educational purposes only
              `,
            },
          ],
        },
        {
          title: '6. Third-Party Services and Content',
          content: `
The Service may contain links to or integrate with third-party services:

• We are not responsible for third-party content or services
• Third-party terms and privacy policies apply to their services
• We do not endorse or guarantee third-party opportunities
• You interact with third parties at your own risk
• Report any suspicious or fraudulent opportunities to us
          `,
        },
        {
          title: '7. Privacy and Data Protection',
          content: `
Your privacy is important to us. Our Privacy Policy explains:

• What information we collect and how we use it
• How we protect your personal data
• Your rights regarding your information
• How to contact us with privacy concerns

By using the Service, you consent to our Privacy Policy.
          `,
        },
        {
          title: '8. Service Availability and Modifications',
          content: `
We strive to provide reliable service but cannot guarantee:

• Uninterrupted or error-free operation
• Availability at all times
• Compatibility with all devices or browsers
• Accuracy of all opportunity information

We reserve the right to:
• Modify or discontinue features
• Update these Terms
• Suspend or terminate accounts for violations
• Perform maintenance and updates
          `,
        },
        {
          title: '9. Disclaimers and Limitations of Liability',
          content: `
The Service is provided "as is" without warranties of any kind:

• We disclaim all warranties, express or implied
• We are not liable for indirect, incidental, or consequential damages
• Our total liability is limited to the amount you paid for the Service
• Some jurisdictions do not allow these limitations

You use the Service at your own risk and discretion.
          `,
        },
        {
          title: '10. Indemnification',
          content: `
You agree to indemnify and hold harmless OpportuneX from claims arising from:

• Your use of the Service
• Your violation of these Terms
• Your violation of any third-party rights
• Any content you submit to the Service
• Your negligent or wrongful conduct
          `,
        },
        {
          title: '11. Termination',
          content: 'Either party may terminate this agreement:',
          subsections: [
            {
              title: '11.1 Termination by You',
              content: `
• You may delete your account at any time
• Termination does not relieve you of obligations incurred before termination
• Some provisions survive termination
              `,
            },
            {
              title: '11.2 Termination by Us',
              content: `
• We may suspend or terminate accounts for Terms violations
• We may discontinue the Service with reasonable notice
• We will provide data export options where feasible
              `,
            },
          ],
        },
        {
          title: '12. Dispute Resolution',
          content: `
For disputes arising from these Terms:

• First, contact us to resolve the issue informally
• If unresolved, disputes will be settled through binding arbitration
• Arbitration will be conducted under [Arbitration Rules]
• You waive the right to participate in class action lawsuits
• Some jurisdictions may not enforce these provisions
          `,
        },
        {
          title: '13. Governing Law',
          content: `
These Terms are governed by the laws of [Jurisdiction] without regard to conflict of law principles.

For international users, local consumer protection laws may also apply.
          `,
        },
        {
          title: '14. Changes to Terms',
          content: `
We may update these Terms periodically:

• Material changes will be communicated via email or platform notification
• Continued use constitutes acceptance of updated Terms
• Previous versions will be archived for reference
• You may terminate your account if you disagree with changes
          `,
        },
        {
          title: '15. Contact Information',
          content: `
For questions about these Terms, contact us:

• Email: legal@opportunex.com
• Support: support@opportunex.com
• Address: [Company Address]
• Phone: [Contact Number]

We will respond to inquiries within a reasonable time.
          `,
        },
      ],
    };
  }

  /**
   * Generate cookie policy content
   */
  static getCookiePolicy(): {
    title: string;
    lastUpdated: string;
    sections: Array<{
      title: string;
      content: string;
      cookieTypes?: Array<{
        name: string;
        purpose: string;
        duration: string;
        essential: boolean;
      }>;
    }>;
  } {
    return {
      title: 'Cookie Policy',
      lastUpdated: new Date().toISOString().split('T')[0],
      sections: [
        {
          title: '1. What Are Cookies',
          content: `
Cookies are small text files stored on your device when you visit websites. They help websites remember your preferences and improve your browsing experience.

OpportuneX uses cookies and similar technologies to provide and improve our services.
          `,
        },
        {
          title: '2. Types of Cookies We Use',
          content: 'We use different types of cookies for various purposes:',
          cookieTypes: [
            {
              name: 'Essential Cookies',
              purpose:
                'Required for basic website functionality, authentication, and security',
              duration: 'Session or up to 1 year',
              essential: true,
            },
            {
              name: 'Preference Cookies',
              purpose:
                'Remember your settings, language preferences, and customizations',
              duration: 'Up to 1 year',
              essential: false,
            },
            {
              name: 'Analytics Cookies',
              purpose:
                'Help us understand how you use the website to improve our services',
              duration: 'Up to 2 years',
              essential: false,
            },
            {
              name: 'Marketing Cookies',
              purpose:
                'Used to deliver relevant advertisements and track campaign effectiveness',
              duration: 'Up to 1 year',
              essential: false,
            },
          ],
        },
        {
          title: '3. Managing Your Cookie Preferences',
          content: `
You can control cookies through:

• Our cookie preference center (available on first visit)
• Your browser settings
• Third-party opt-out tools
• Device settings for mobile apps

Note that disabling certain cookies may affect website functionality.
          `,
        },
        {
          title: '4. Third-Party Cookies',
          content: `
We may use third-party services that set their own cookies:

• Google Analytics for website analytics
• Social media platforms for sharing features
• Advertising networks for relevant ads
• Customer support tools

These third parties have their own cookie policies.
          `,
        },
        {
          title: '5. Updates to This Policy',
          content: `
We may update this Cookie Policy to reflect changes in our practices or applicable laws. Check this page regularly for updates.

Last updated: ${new Date().toISOString().split('T')[0]}
          `,
        },
      ],
    };
  }

  /**
   * Generate consent form content
   */
  static getConsentForm(): {
    title: string;
    description: string;
    consentItems: Array<{
      id: string;
      title: string;
      description: string;
      required: boolean;
      lawfulBasis: string;
    }>;
  } {
    return {
      title: 'Privacy Preferences',
      description:
        'Please review and customize your privacy preferences. You can change these settings at any time.',
      consentItems: [
        {
          id: 'essential_services',
          title: 'Essential Services',
          description:
            'Required for basic platform functionality, account management, and security.',
          required: true,
          lawfulBasis: 'contractual_necessity',
        },
        {
          id: 'personalized_recommendations',
          title: 'Personalized Recommendations',
          description:
            'Use your profile and search history to provide relevant opportunity recommendations.',
          required: false,
          lawfulBasis: 'consent',
        },
        {
          id: 'ai_roadmap_generation',
          title: 'AI Roadmap Generation',
          description:
            'Generate personalized preparation roadmaps using AI based on your skills and goals.',
          required: false,
          lawfulBasis: 'consent',
        },
        {
          id: 'email_notifications',
          title: 'Email Notifications',
          description:
            'Receive email notifications about new opportunities, deadlines, and platform updates.',
          required: false,
          lawfulBasis: 'consent',
        },
        {
          id: 'sms_notifications',
          title: 'SMS Notifications',
          description:
            'Receive SMS notifications for urgent deadlines and important updates.',
          required: false,
          lawfulBasis: 'consent',
        },
        {
          id: 'analytics_improvement',
          title: 'Analytics and Improvement',
          description:
            'Help us improve the platform by analyzing usage patterns (anonymized data).',
          required: false,
          lawfulBasis: 'legitimate_interests',
        },
        {
          id: 'marketing_communications',
          title: 'Marketing Communications',
          description:
            'Receive promotional content about new features, partnerships, and educational resources.',
          required: false,
          lawfulBasis: 'consent',
        },
      ],
    };
  }
}
