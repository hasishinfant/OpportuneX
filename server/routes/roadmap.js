const express = require('express');
const { body, validationResult } = require('express-validator');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const JsonDB = require('../lib/jsondb');

const router = express.Router();

// Initialize JSON database
const opportunitiesDB = new JsonDB('opportunities.json');

// Mock AI service (replace with actual OpenAI integration)
const generateRoadmapWithAI = async (opportunity, userSkillLevel) => {
  // This is a mock implementation. Replace with actual OpenAI API call
  const skillLevels = ['beginner', 'intermediate', 'advanced'];
  const isValidSkillLevel = skillLevels.includes(userSkillLevel);
  
  if (!isValidSkillLevel) {
    throw new Error('Invalid skill level');
  }

  const basePhases = {
    hackathon: [
      {
        title: 'Problem Understanding & Research',
        duration: '2-3 days',
        tasks: [
          'Research the problem statement thoroughly',
          'Identify target audience and pain points',
          'Study existing solutions and their limitations',
          'Define project scope and objectives'
        ]
      },
      {
        title: 'Technical Planning & Design',
        duration: '1-2 days',
        tasks: [
          'Choose appropriate technology stack',
          'Design system architecture',
          'Create wireframes and mockups',
          'Plan database schema if needed'
        ]
      },
      {
        title: 'Development & Implementation',
        duration: '3-4 days',
        tasks: [
          'Set up development environment',
          'Implement core features',
          'Integrate APIs and services',
          'Test functionality thoroughly'
        ]
      },
      {
        title: 'Presentation & Submission',
        duration: '1 day',
        tasks: [
          'Prepare demo and presentation',
          'Create project documentation',
          'Record demo video if required',
          'Submit project before deadline'
        ]
      }
    ],
    internship: [
      {
        title: 'Application Preparation',
        duration: '1 week',
        tasks: [
          'Update resume with relevant projects',
          'Write compelling cover letter',
          'Prepare portfolio showcasing skills',
          'Research company and role requirements'
        ]
      },
      {
        title: 'Skill Enhancement',
        duration: '2-3 weeks',
        tasks: [
          'Practice coding problems on platforms like LeetCode',
          'Build projects related to the role',
          'Learn company-specific technologies',
          'Improve communication skills'
        ]
      },
      {
        title: 'Interview Preparation',
        duration: '1-2 weeks',
        tasks: [
          'Practice technical interviews',
          'Prepare for behavioral questions',
          'Mock interviews with peers',
          'Research common interview questions'
        ]
      }
    ],
    workshop: [
      {
        title: 'Pre-workshop Preparation',
        duration: '3-5 days',
        tasks: [
          'Review workshop prerequisites',
          'Set up required tools and software',
          'Read background materials',
          'Prepare questions to ask'
        ]
      },
      {
        title: 'Active Participation',
        duration: 'Workshop duration',
        tasks: [
          'Attend all sessions punctually',
          'Take detailed notes',
          'Participate in hands-on activities',
          'Network with other participants'
        ]
      },
      {
        title: 'Post-workshop Application',
        duration: '1 week',
        tasks: [
          'Review and organize notes',
          'Complete any assignments',
          'Apply learnings to personal projects',
          'Connect with instructors and peers'
        ]
      }
    ]
  };

  const phases = basePhases[opportunity.category] || basePhases.hackathon;
  
  // Adjust complexity based on skill level
  const adjustedPhases = phases.map(phase => ({
    ...phase,
    tasks: userSkillLevel === 'beginner' 
      ? [...phase.tasks, 'Seek help from mentors and online resources']
      : userSkillLevel === 'advanced'
      ? [...phase.tasks, 'Mentor others and share knowledge']
      : phase.tasks
  }));

  return {
    title: `${opportunity.title} Preparation Roadmap`,
    skill_level: userSkillLevel,
    estimated_duration: userSkillLevel === 'beginner' ? '2-3 weeks' : 
                       userSkillLevel === 'intermediate' ? '1-2 weeks' : '1 week',
    phases: adjustedPhases,
    tips: [
      'Start early to avoid last-minute rush',
      'Break down tasks into smaller, manageable chunks',
      'Set daily goals and track progress',
      'Don\'t hesitate to ask for help when needed',
      'Practice regularly to build confidence'
    ]
  };
};

// POST /api/roadmap - Generate AI roadmap
router.post('/', [
  body('opportunityId').notEmpty(),
  body('userSkillLevel').isIn(['beginner', 'intermediate', 'advanced'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { opportunityId, userSkillLevel } = req.body;

    // Fetch opportunity details
    const opportunity = opportunitiesDB.findById(opportunityId);
    if (!opportunity) {
      return res.status(404).json({ error: 'Opportunity not found' });
    }

    // Generate roadmap using AI (mock implementation)
    const roadmap = await generateRoadmapWithAI(opportunity, userSkillLevel);

    res.json({
      success: true,
      roadmap,
      opportunity: {
        title: opportunity.title,
        category: opportunity.category,
        deadline: opportunity.deadline
      }
    });
  } catch (error) {
    console.error('Error generating roadmap:', error);
    res.status(500).json({ error: 'Failed to generate roadmap' });
  }
});

// POST /api/roadmap/pdf - Generate and download PDF roadmap
router.post('/pdf', [
  body('roadmap').notEmpty(),
  body('opportunity').notEmpty()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { roadmap, opportunity } = req.body;

    // Create PDF document
    const doc = new PDFDocument({ margin: 50 });
    
    // Set response headers for PDF download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="roadmap-${opportunity.title.replace(/[^a-zA-Z0-9]/g, '-')}.pdf"`);
    
    // Pipe PDF to response
    doc.pipe(res);

    // Add content to PDF
    doc.fontSize(20).text('OpportuneX - Preparation Roadmap', { align: 'center' });
    doc.moveDown();
    
    doc.fontSize(16).text(`Opportunity: ${opportunity.title}`, { underline: true });
    doc.fontSize(12).text(`Category: ${opportunity.category}`);
    doc.text(`Skill Level: ${roadmap.skill_level}`);
    doc.text(`Estimated Duration: ${roadmap.estimated_duration}`);
    doc.moveDown();

    // Add phases
    roadmap.phases.forEach((phase, index) => {
      doc.fontSize(14).text(`Phase ${index + 1}: ${phase.title}`, { underline: true });
      doc.fontSize(10).text(`Duration: ${phase.duration}`);
      doc.moveDown(0.5);
      
      phase.tasks.forEach((task, taskIndex) => {
        doc.fontSize(10).text(`${taskIndex + 1}. ${task}`, { indent: 20 });
      });
      doc.moveDown();
    });

    // Add tips section
    if (roadmap.tips && roadmap.tips.length > 0) {
      doc.fontSize(14).text('Tips for Success:', { underline: true });
      roadmap.tips.forEach((tip, index) => {
        doc.fontSize(10).text(`• ${tip}`, { indent: 20 });
      });
    }

    // Add footer
    doc.moveDown();
    doc.fontSize(8).text('Generated by OpportuneX - AI-Powered Opportunity Discovery', { align: 'center' });
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, { align: 'center' });

    // Finalize PDF
    doc.end();
  } catch (error) {
    console.error('Error generating PDF:', error);
    res.status(500).json({ error: 'Failed to generate PDF' });
  }
});

module.exports = router;