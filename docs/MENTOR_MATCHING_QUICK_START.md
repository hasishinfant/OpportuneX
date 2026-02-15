# Mentor Matching Quick Start Guide

## Setup (5 minutes)

### 1. Run Database Migration

```bash
# Connect to your PostgreSQL database
psql -U postgres -d opportunex

# Run the migration
\i prisma/migrations/add_mentor_matching.sql

# Verify tables were created
\dt mentor*
```

### 2. Update API Gateway

Add mentor routes to your API gateway:

```typescript
// src/server/api-gateway-server.ts
import { createMentorRoutes } from '../lib/routes/mentor';

// Add to your Express app
app.use('/api/mentor', createMentorRoutes(pool));
```

### 3. Test the Setup

```bash
# Run the tests
npm run test -- mentor-matching.service.test.ts

# Start the development server
npm run dev
```

## For Mentors: Getting Started

### Step 1: Create Your Profile

Navigate to `/mentor/profile` and fill in:

- **Bio**: Brief introduction about yourself
- **Expertise Areas**: Your technical skills (e.g., React, Python, Machine Learning)
- **Domains**: Your areas of expertise (e.g., Web Development, Data Science)
- **Experience**: Years of professional experience
- **Languages**: Languages you can mentor in
- **Availability**: Set your available time slots

Example:

```
Bio: "Senior Software Engineer with 8 years of experience in full-stack development.
Passionate about helping students transition into tech careers."

Expertise: React, Node.js, TypeScript, PostgreSQL, AWS
Domains: Web Development, Full Stack, Cloud Architecture
Experience: 8 years
Languages: English, Hindi
```

### Step 2: Set Your Availability

Click "Add Time Slot" and set when you're available:

```
Monday: 18:00 - 20:00
Wednesday: 18:00 - 20:00
Saturday: 10:00 - 14:00
```

### Step 3: Review Requests

Check `/mentor/requests` to see student requests. You can:

- Accept requests
- View student profiles
- Schedule sessions

### Step 4: Manage Sessions

Use the session dashboard at `/mentor/sessions` to:

- View upcoming sessions
- Start sessions
- Add notes and action items
- Track student progress

## For Students: Finding a Mentor

### Step 1: Search for Mentors

Navigate to `/mentor/search` and specify:

- **Skills**: What you want to learn (e.g., React, Python)
- **Domains**: Area of interest (e.g., Web Development)
- **Languages**: Preferred communication language
- **Minimum Rating**: Filter by mentor quality

### Step 2: Review Matches

The system will show you mentors ranked by match score. Each result shows:

- Match percentage (higher is better)
- Mentor's expertise and experience
- Average rating and total sessions
- Available time slots
- Why they're a good match

### Step 3: Request Mentorship

Click "Request Mentorship" on a mentor's profile and provide:

- **Topic**: What you want help with
- **Description**: More details about your needs
- **Urgency**: How soon you need help

### Step 4: Schedule a Session

Once a mentor accepts:

1. Click "Schedule Session"
2. Choose a time from their available slots
3. Add session title and agenda
4. Select meeting platform (Google Meet, Zoom, etc.)

### Step 5: Attend and Review

After the session:

1. Add notes about what you learned
2. Mark action items
3. Leave a review to help other students

## Quick API Examples

### Find Mentors (Student)

```bash
curl -X POST http://localhost:3000/api/mentor/match \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "skills": ["React", "Node.js"],
    "domains": ["Web Development"],
    "languages": ["English"],
    "experienceLevel": "intermediate"
  }'
```

### Create Mentor Profile

```bash
curl -X POST http://localhost:3000/api/mentor/profile \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "bio": "Experienced software engineer",
    "expertiseAreas": ["React", "Node.js"],
    "domains": ["Web Development"],
    "yearsOfExperience": 5,
    "languages": ["English", "Hindi"],
    "maxMentees": 5
  }'
```

### Schedule Session

```bash
curl -X POST http://localhost:3000/api/mentor/sessions \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "mentorId": "mentor-123",
    "title": "Career Guidance",
    "scheduledAt": "2024-12-25T10:00:00Z",
    "durationMinutes": 60,
    "meetingPlatform": "google-meet"
  }'
```

## Understanding Match Scores

The system calculates match scores based on:

| Score Range | Meaning                              |
| ----------- | ------------------------------------ |
| 80-100      | Excellent match - Highly recommended |
| 60-79       | Good match - Worth considering       |
| 40-59       | Moderate match - Some alignment      |
| 0-39        | Poor match - Limited alignment       |

**What affects your score:**

- **Skills overlap**: Do they know what you want to learn?
- **Domain expertise**: Are they experienced in your area?
- **Language compatibility**: Can you communicate effectively?
- **Availability**: Do your schedules align?
- **Experience level**: Are they at the right level for you?
- **Success rate**: How successful are their past mentorships?

## Best Practices

### For Mentors

1. **Keep your profile updated**: Update skills and availability regularly
2. **Be responsive**: Reply to requests within 24-48 hours
3. **Set clear expectations**: Define what you can help with
4. **Prepare for sessions**: Review student's background before meeting
5. **Follow up**: Check in on action items from previous sessions
6. **Be honest**: If you can't help, recommend someone who can

### For Students

1. **Be specific**: Clearly state what you want to learn
2. **Do your homework**: Research the mentor before requesting
3. **Come prepared**: Have questions and topics ready
4. **Be respectful**: Show up on time and be engaged
5. **Take notes**: Document key learnings and action items
6. **Follow through**: Complete action items before next session
7. **Give feedback**: Leave honest reviews to help others

## Common Workflows

### Workflow 1: One-time Career Advice

```
Student → Search mentors → Request session → Schedule → Attend → Review
```

### Workflow 2: Ongoing Mentorship

```
Student → Find mentor → Request ongoing mentorship →
Schedule regular sessions → Track progress → Review periodically
```

### Workflow 3: Project Review

```
Student → Search for domain expert → Request project review →
Share project details → Schedule session → Get feedback → Iterate
```

## Troubleshooting

**Q: I can't find any mentors**

- Try broadening your search criteria
- Check if you've selected too many required skills
- Try searching by domain instead of specific skills

**Q: My session request was declined**

- The mentor might be at capacity
- Try other mentors with similar expertise
- Make your request more specific

**Q: I can't schedule a session**

- Check if the time slot is still available
- Verify you're within the mentor's availability
- Ensure you've provided all required information

**Q: How do I cancel a session?**

- Go to your session dashboard
- Click on the session
- Select "Cancel" and provide a reason
- Do this at least 24 hours in advance

## Next Steps

1. **Explore the full documentation**: See `docs/MENTOR_MATCHING.md`
2. **Check the API reference**: Review all available endpoints
3. **Join the community**: Connect with other mentors and students
4. **Provide feedback**: Help us improve the system

## Support

Need help?

- Check the full documentation
- Review the API examples
- Contact support team

Happy mentoring! 🎓
