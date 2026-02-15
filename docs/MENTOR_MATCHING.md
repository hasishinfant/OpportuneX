# Mentor Matching System

## Overview

The Mentor Matching System is an intelligent feature that connects students with appropriate mentors based on multiple factors including skills, domains, experience, availability, and success rates. The system uses a sophisticated scoring algorithm to find the best matches.

## Features

### For Students

- **Smart Mentor Discovery**: Find mentors based on skills, domains, and preferences
- **Intelligent Matching**: AI-powered algorithm matches students with suitable mentors
- **Session Scheduling**: Easy-to-use interface for booking mentorship sessions
- **Progress Tracking**: Track goals and milestones with your mentor
- **Review System**: Rate and review mentors after sessions
- **Session Management**: View upcoming and past sessions

### For Mentors

- **Profile Management**: Create and manage comprehensive mentor profile
- **Availability Calendar**: Set your available time slots
- **Request Management**: Review and accept mentorship requests
- **Session Dashboard**: Manage all your mentorship sessions
- **Analytics**: Track your performance and impact
- **Resource Sharing**: Share materials and resources with mentees

## Architecture

### Database Schema

The system uses the following main tables:

1. **mentor_profiles**: Stores mentor information and statistics
2. **mentor_availability**: Tracks mentor available time slots
3. **mentorship_requests**: Student requests for mentorship
4. **mentorship_sessions**: Scheduled and completed sessions
5. **mentor_reviews**: Student reviews and ratings
6. **student_progress**: Goal and milestone tracking
7. **session_resources**: Shared materials and links

### Matching Algorithm

The matching algorithm calculates a score (0-100) based on weighted factors:

#### Scoring Factors

| Factor              | Weight | Description                                        |
| ------------------- | ------ | -------------------------------------------------- |
| Skills Match        | 25%    | Overlap between student needs and mentor expertise |
| Domain Match        | 20%    | Alignment of domains (e.g., Web Dev, Data Science) |
| Language Match      | 15%    | Common language proficiency                        |
| Availability Match  | 15%    | Time slot compatibility                            |
| Experience Match    | 10%    | Appropriate experience level for student           |
| Success Rate        | 10%    | Mentor's historical success rate                   |
| Mentor Availability | 5%     | Current capacity (mentees vs max)                  |

#### Scoring Logic

**Skills Match (0-100)**

```
matches = count of overlapping skills
score = (matches / requested_skills) * 100
```

**Domain Match (0-100)**

```
matches = count of overlapping domains
score = (matches / requested_domains) * 100
```

**Language Match (0-100)**

```
matches = count of common languages
score = (matches / requested_languages) * 100
```

**Availability Match (0-100)**

- 100: Exact time slot match
- 30: Same day, different time
- 0: No matching day

**Experience Match (0-100)**

- Beginner: 0-3 years optimal
- Intermediate: 2-7 years optimal
- Advanced: 5+ years optimal
- 100: Within range
- 80: Overqualified
- 30: Underqualified

**Success Rate (0-100)**

```
score = mentor's success_rate percentage
```

**Mentor Availability (0-100)**

```
score = ((max_mentees - current_mentees) / max_mentees) * 100
```

#### Final Score Calculation

```typescript
totalScore =
  skillMatch * 0.25 +
  domainMatch * 0.2 +
  languageMatch * 0.15 +
  availabilityMatch * 0.15 +
  experienceMatch * 0.1 +
  successRate * 0.1 +
  mentorAvailability * 0.05;
```

## API Endpoints

### Mentor Profile

#### Create Mentor Profile

```http
POST /api/mentor/profile
Authorization: Bearer <token>
Content-Type: application/json

{
  "bio": "Experienced software engineer...",
  "expertiseAreas": ["React", "Node.js", "TypeScript"],
  "domains": ["Web Development", "Full Stack"],
  "yearsOfExperience": 5,
  "currentRole": "Senior Engineer",
  "currentCompany": "Tech Corp",
  "languages": ["English", "Hindi"],
  "timezone": "Asia/Kolkata",
  "hourlyRate": 1000,
  "maxMentees": 5
}
```

#### Get Mentor Profile

```http
GET /api/mentor/profile
Authorization: Bearer <token>
```

#### Update Mentor Profile

```http
PUT /api/mentor/profile
Authorization: Bearer <token>
Content-Type: application/json

{
  "bio": "Updated bio...",
  "isAvailable": true
}
```

### Availability

#### Set Availability

```http
POST /api/mentor/availability
Authorization: Bearer <token>
Content-Type: application/json

{
  "availability": [
    {
      "dayOfWeek": 1,
      "startTime": "09:00",
      "endTime": "12:00"
    },
    {
      "dayOfWeek": 3,
      "startTime": "14:00",
      "endTime": "17:00"
    }
  ]
}
```

### Matching

#### Find Matching Mentors

```http
POST /api/mentor/match
Authorization: Bearer <token>
Content-Type: application/json

{
  "skills": ["React", "Node.js"],
  "domains": ["Web Development"],
  "languages": ["English"],
  "experienceLevel": "intermediate",
  "maxResults": 10
}
```

Response:

```json
[
  {
    "mentor": {
      "id": "mentor-123",
      "currentRole": "Senior Engineer",
      "currentCompany": "Tech Corp",
      "expertiseAreas": ["React", "Node.js", "TypeScript"],
      "averageRating": 4.8,
      "totalSessions": 50
    },
    "matchScore": 87.5,
    "scoreBreakdown": {
      "skillMatch": 100,
      "domainMatch": 100,
      "languageMatch": 100,
      "availabilityMatch": 50,
      "experienceMatch": 100,
      "successRateScore": 90,
      "availabilityScore": 60
    },
    "availableSlots": [
      {
        "dayOfWeek": 1,
        "startTime": "09:00",
        "endTime": "12:00"
      }
    ],
    "reasoning": "Strong skill alignment, Matching domain expertise, Common language proficiency"
  }
]
```

### Sessions

#### Schedule Session

```http
POST /api/mentor/sessions
Authorization: Bearer <token>
Content-Type: application/json

{
  "mentorId": "mentor-123",
  "title": "Career Guidance Session",
  "description": "Discussing career path",
  "agenda": "Career planning, skill development",
  "scheduledAt": "2024-12-25T10:00:00Z",
  "durationMinutes": 60,
  "meetingPlatform": "google-meet"
}
```

#### Get Sessions

```http
GET /api/mentor/sessions/student/all?status=scheduled
Authorization: Bearer <token>
```

#### Update Session

```http
PUT /api/mentor/sessions/:sessionId
Authorization: Bearer <token>
Content-Type: application/json

{
  "status": "completed",
  "notes": "Great session, covered all topics",
  "actionItems": [
    {
      "id": "1",
      "description": "Complete React tutorial",
      "completed": false
    }
  ]
}
```

### Reviews

#### Create Review

```http
POST /api/mentor/reviews
Authorization: Bearer <token>
Content-Type: application/json

{
  "sessionId": "session-123",
  "rating": 5,
  "communicationRating": 5,
  "knowledgeRating": 5,
  "helpfulnessRating": 5,
  "comment": "Excellent mentor!",
  "wouldRecommend": true,
  "isPublic": true
}
```

#### Get Mentor Reviews

```http
GET /api/mentor/reviews/:mentorId
Authorization: Bearer <token>
```

### Analytics

#### Get Mentor Analytics

```http
GET /api/mentor/analytics/mentor
Authorization: Bearer <token>
```

Response:

```json
{
  "totalSessions": 50,
  "completedSessions": 45,
  "cancelledSessions": 5,
  "averageRating": 4.8,
  "totalReviews": 40,
  "successRate": 90,
  "currentMentees": 3,
  "totalMentees": 15,
  "averageSessionDuration": 65,
  "responseTime": 24
}
```

## Usage Examples

### Student Flow

1. **Search for Mentors**

```typescript
import MentorSearch from '@/components/mentor/MentorSearch';

function FindMentor() {
  const handleSelectMentor = (mentorId: string) => {
    // Navigate to mentor profile or schedule session
    router.push(`/mentor/${mentorId}`);
  };

  return <MentorSearch onSelectMentor={handleSelectMentor} />;
}
```

2. **Schedule Session**

```typescript
import SessionScheduler from '@/components/mentor/SessionScheduler';

function ScheduleSession({ mentorId }: { mentorId: string }) {
  const handleScheduled = (session) => {
    console.log('Session scheduled:', session);
    router.push('/sessions');
  };

  return (
    <SessionScheduler
      mentorId={mentorId}
      onScheduled={handleScheduled}
    />
  );
}
```

3. **View Sessions**

```typescript
import SessionDashboard from '@/components/mentor/SessionDashboard';

function MySessions() {
  return <SessionDashboard userType="student" />;
}
```

### Mentor Flow

1. **Create Profile**

```typescript
import MentorProfile from '@/components/mentor/MentorProfile';

function BecomeAMentor() {
  return <MentorProfile />;
}
```

2. **Manage Sessions**

```typescript
import SessionDashboard from '@/components/mentor/SessionDashboard';

function MentorDashboard() {
  return <SessionDashboard userType="mentor" />;
}
```

## Database Setup

### Run Migration

```bash
# Apply the mentor matching migration
psql -U postgres -d opportunex -f prisma/migrations/add_mentor_matching.sql
```

### Verify Tables

```sql
-- Check mentor profiles
SELECT * FROM mentor_profiles LIMIT 5;

-- Check availability
SELECT * FROM mentor_availability LIMIT 5;

-- Check sessions
SELECT * FROM mentorship_sessions LIMIT 5;
```

## Testing

### Run Unit Tests

```bash
npm run test -- mentor-matching.service.test.ts
```

### Test Coverage

The test suite covers:

- Profile creation and updates
- Matching algorithm accuracy
- Availability management
- Session scheduling
- Review system
- Analytics calculations

## Performance Considerations

### Indexing

The migration creates indexes on:

- `mentor_profiles.expertise_areas` (GIN index for array search)
- `mentor_profiles.domains` (GIN index)
- `mentor_profiles.languages` (GIN index)
- `mentor_profiles.average_rating` (DESC for sorting)
- `mentorship_sessions.scheduled_at` (for date queries)
- `mentor_reviews.rating` (DESC for sorting)

### Caching

Consider caching:

- Mentor profiles (1 hour TTL)
- Match results (15 minutes TTL)
- Analytics data (1 hour TTL)

### Query Optimization

- Use pagination for session lists
- Limit match results to top 10-20
- Use database triggers for automatic stat updates

## Security

### Authorization

- Students can only view their own sessions and requests
- Mentors can only view sessions where they are the mentor
- Profile updates require authentication
- Reviews can only be created by session participants

### Data Validation

- All inputs are validated using middleware
- SQL injection prevention through parameterized queries
- XSS protection on user-generated content

## Future Enhancements

1. **Video Integration**: Direct video call integration
2. **Payment Processing**: Handle paid mentorship sessions
3. **Group Sessions**: Support for group mentorship
4. **Automated Matching**: Auto-suggest mentors to students
5. **Mentor Certification**: Verification and certification system
6. **Advanced Analytics**: ML-based insights and recommendations
7. **Mobile App**: Native mobile experience
8. **Calendar Integration**: Sync with Google Calendar, Outlook

## Troubleshooting

### Common Issues

**Issue**: Matching returns no results

- Check if mentors have set availability
- Verify mentor profiles are marked as available
- Ensure search criteria aren't too restrictive

**Issue**: Session scheduling fails

- Verify mentor availability for selected time
- Check if mentor has reached max mentees
- Ensure datetime format is correct (ISO 8601)

**Issue**: Reviews not updating mentor rating

- Check database triggers are active
- Verify review was created successfully
- Run manual rating recalculation if needed

## Support

For issues or questions:

- Check the API documentation
- Review test cases for usage examples
- Contact the development team

## License

Part of the OpportuneX platform - Internal use only
