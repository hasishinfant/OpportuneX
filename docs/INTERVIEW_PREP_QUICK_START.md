# Interview Preparation - Quick Start Guide

## Setup (5 minutes)

### 1. Run Database Migration

```bash
# Apply the interview prep schema
psql -U your_user -d opportunex -f prisma/migrations/add_interview_prep.sql
```

### 2. Configure OpenAI (Optional)

For AI-powered feedback, add to `.env`:

```bash
OPENAI_API_KEY=sk-your-api-key-here
```

Without this, the system runs in mock mode with simulated feedback.

### 3. Seed Questions (Optional)

```bash
npx tsx src/scripts/seed-interview-questions.ts
```

## Usage

### For Students

#### Start a Practice Interview

1. Navigate to `/interview`
2. Choose interview type:
   - Technical (data structures, algorithms)
   - Behavioral (STAR method scenarios)
   - System Design (architecture questions)
   - Coding (implementation challenges)
3. Select difficulty: beginner, intermediate, or advanced
4. Click "Start Interview"

#### During the Interview

1. Read the question carefully
2. Type your answer in the text area
3. Click "Submit Answer"
4. Review feedback:
   - Score (0-100)
   - Strengths
   - Areas to improve
5. Click "Next Question" or "End Session"

#### Analyze Your Resume

1. Navigate to `/interview/resume`
2. Upload resume file or paste text
3. Click "Analyze Resume"
4. Review:
   - Overall score
   - Section-by-section feedback
   - Keyword analysis
   - Formatting suggestions
5. Implement recommendations

#### Track Progress

1. View dashboard at `/interview`
2. See metrics by category:
   - Total sessions
   - Average score
   - Improvement rate
   - Strengths and weaknesses

### For Developers

#### Add Custom Questions

```typescript
// In your seed script or admin panel
const question = {
  category: 'technical',
  subcategory: 'React',
  difficulty: 'intermediate',
  question: 'Explain React hooks and their benefits',
  tags: ['react', 'hooks', 'frontend'],
};
```

#### Customize Evaluation

```typescript
// In interview-prep.service.ts
private async evaluateAnswer(questionId: string, answer: string) {
  // Add custom evaluation logic
  const score = calculateScore(answer);
  const feedback = generateFeedback(answer);
  return { score, feedback, strengths, improvements };
}
```

#### Add Company-Specific Questions

```typescript
const result = await interviewPrepService.getCompanyQuestions(
  'Google',
  'technical'
);
```

## API Quick Reference

### Start Session

```bash
curl -X POST http://localhost:3000/api/interview/start \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user-123",
    "type": "technical",
    "difficulty": "intermediate"
  }'
```

### Submit Answer

```bash
curl -X POST http://localhost:3000/api/interview/submit \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "session-123",
    "questionId": "question-456",
    "answer": "Your answer here",
    "responseTime": 120
  }'
```

### Get Progress

```bash
curl http://localhost:3000/api/interview/progress?userId=user-123
```

## Testing

### Run Tests

```bash
npm test interview-prep.service.test.ts
```

### Manual Testing

1. Start dev server: `npm run dev`
2. Navigate to `http://localhost:3000/interview`
3. Test each interview type
4. Verify feedback generation
5. Check progress tracking

## Troubleshooting

### "Session not starting"

- Check user authentication
- Verify database connection
- Review browser console

### "No feedback generated"

- Confirm OPENAI_API_KEY is set (or accept mock mode)
- Check API rate limits
- Verify network connectivity

### "Resume analysis failing"

- Ensure text is UTF-8 encoded
- Check file size (< 1MB recommended)
- Validate input format

## Best Practices

### For Students

- Practice regularly (2-3 times per week)
- Review feedback carefully
- Track improvement over time
- Practice all interview types
- Update resume based on feedback

### For Developers

- Keep question bank updated
- Monitor AI evaluation quality
- Optimize for mobile devices
- Cache frequently used questions
- Implement rate limiting

## Next Steps

1. ✅ Complete setup
2. ✅ Test basic functionality
3. 📝 Add more questions to bank
4. 🎨 Customize UI for your brand
5. 📊 Set up analytics
6. 🚀 Deploy to production

## Support

- Documentation: `/docs/INTERVIEW_PREP.md`
- Issues: GitHub Issues
- Email: support@opportunex.com

## Quick Tips

💡 **Tip 1**: Start with beginner level to build confidence
💡 **Tip 2**: Review feedback before moving to next question
💡 **Tip 3**: Practice different categories regularly
💡 **Tip 4**: Use resume analyzer before job applications
💡 **Tip 5**: Track progress to stay motivated

---

**Ready to practice?** Visit `/interview` and start your first session! 🚀
