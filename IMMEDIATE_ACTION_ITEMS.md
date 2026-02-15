# Immediate Action Items for OpportuneX

**Priority:** HIGH  
**Timeline:** Complete within 1 week  
**Status:** Ready for execution

## Quick Start Checklist

### Step 1: Install Testing Dependencies ⏱️ 5 minutes

```bash
npm install
```

**What this does:**

- Installs jest, ts-jest, @types/jest
- Installs @testing-library/react and @testing-library/jest-dom
- Installs fast-check for property-based testing
- Updates all other dependencies

**Expected outcome:** All dependencies installed successfully

---

### Step 2: Verify Tests Pass ⏱️ 10-15 minutes

```bash
# Run all unit tests
npm run test

# Run property-based tests
npm run test:property

# Run integration tests
npm run test:integration

# Run all tests
npm run test:all
```

**Expected outcome:** All tests should pass. If any fail, note them for fixing.

**If tests fail:**

1. Review the error messages
2. Check if it's a configuration issue or actual code issue
3. Fix failing tests before proceeding

---

### Step 3: Run Code Quality Checks ⏱️ 5 minutes

```bash
# Run linting
npm run lint

# Run type checking
npm run type-check

# Run all quality checks
npm run code-quality
```

**Expected outcome:** No linting or type errors

**If errors found:**

```bash
# Auto-fix what can be fixed
npm run code-quality:fix
```

---

### Step 4: Test ML Scoring Service ⏱️ 5 minutes

```bash
# Run ML scoring tests specifically
npm test -- ml-scoring.service.test.ts
```

**Expected outcome:** All ML scoring tests pass

---

## Critical Issues to Address

### Issue 1: Data Model Inconsistency 🔴 HIGH PRIORITY

**Time Required:** 4-6 hours  
**Complexity:** Medium

**Problem:**

- Prisma schema uses flat structure: `organizerName`, `organizerType`, `organizerLogo`
- TypeScript interfaces use nested structure: `organizer: { name, type, logo }`

**Recommended Solution (Option A):**

1. **Create aligned types** (1 hour)

   ```typescript
   // src/types/database.ts
   export interface OpportunityDB {
     id: string;
     title: string;
     organizerName: string;
     organizerType: string;
     organizerLogo?: string;
     // ... other flat fields
   }
   ```

2. **Create transformation utilities** (1 hour)

   ```typescript
   // src/lib/utils/db-transforms.ts
   export function dbToOpportunity(db: OpportunityDB): Opportunity {
     return {
       ...db,
       organizer: {
         name: db.organizerName,
         type: db.organizerType,
         logo: db.organizerLogo,
       },
       // ... other transformations
     };
   }
   ```

3. **Update services** (2-3 hours)
   - Update search service to use transformations
   - Update opportunity service
   - Update API routes

4. **Test thoroughly** (1 hour)
   - Run all tests
   - Manual testing of key flows

**Alternative Solution (Option B):**

- Update Prisma schema to match TypeScript interfaces
- Requires database migration
- More disruptive but cleaner long-term

**Decision needed:** Choose Option A or B

---

### Issue 2: Database Architecture Cleanup 🟡 MEDIUM PRIORITY

**Time Required:** 1-2 hours  
**Complexity:** Low

**Problem:**

- Mongoose models exist in `src/models/` but aren't used
- Prisma is the actual ORM
- Causes confusion about database stack

**Solution:**

1. **Remove unused Mongoose models** (30 minutes)

   ```bash
   rm src/models/Opportunity.ts
   rm src/models/User.ts
   ```

2. **Check for imports** (30 minutes)

   ```bash
   # Search for any imports of these files
   grep -r "from.*models/Opportunity" src/
   grep -r "from.*models/User" src/
   ```

3. **Update any found imports** (30 minutes)
   - Replace with Prisma client usage
   - Or remove if unused

4. **Update documentation** (30 minutes)
   - Confirm PostgreSQL + Prisma in README
   - Remove MongoDB references if not used

---

### Issue 3: Environment Variables Documentation 🟢 LOW PRIORITY

**Time Required:** 2-3 hours  
**Complexity:** Low

**Problem:**

- Multiple .env files but no comprehensive documentation
- New developers may struggle with setup

**Solution:**

1. **Create comprehensive .env.example** (1 hour)

   ```bash
   # Copy from production example
   cp .env.production.example .env.example

   # Add all required variables with descriptions
   ```

2. **Document each variable** (1 hour)
   - Add comments explaining purpose
   - Add example values
   - Mark required vs optional

3. **Create setup guide** (1 hour)
   - Add to README.md
   - Step-by-step environment setup
   - Common issues and solutions

---

## Testing the ML Scoring Enhancement

### Quick Test of ML Scoring ⏱️ 10 minutes

1. **Create a test script** (`test-ml-scoring.ts`):

   ```typescript
   import { getMLScoringService } from './src/lib/services/ml-scoring.service';

   // Create mock user and opportunity
   const mockUser = {
     /* ... */
   };
   const mockOpportunity = {
     /* ... */
   };

   const service = getMLScoringService();
   const scored = await service.scoreOpportunity(mockUser, mockOpportunity, {
     includeBreakdown: true,
   });

   console.log('ML Score:', scored.mlScore);
   console.log('Breakdown:', scored.scoreBreakdown);
   console.log('Explanations:', service.explainScore(scored));
   ```

2. **Run the test:**

   ```bash
   npx tsx test-ml-scoring.ts
   ```

3. **Verify output:**
   - Score should be between 0 and 1
   - Breakdown should have 4 components
   - Explanations should be human-readable

---

## Integration Checklist

### Integrating ML Scoring with Existing Services

#### Option 1: Enhance Search Service (Recommended)

```typescript
// In src/lib/services/search.service.ts
import { getMLScoringService } from './ml-scoring.service';

async function search(query: string, user: UserProfile) {
  // Existing search logic
  const results = await elasticsearchSearch(query);

  // Re-rank with ML scoring
  const mlService = getMLScoringService();
  const reRanked = await mlService.reRankSearchResults(user, results);

  return reRanked;
}
```

#### Option 2: Create Recommendation Endpoint

```typescript
// In src/app/api/recommendations/route.ts
import { getMLScoringService } from '@/lib/services/ml-scoring.service';

export async function GET(request: Request) {
  const user = await getCurrentUser(request);
  const opportunities = await getAllActiveOpportunities();

  const mlService = getMLScoringService();
  const recommendations = await mlService.getRecommendations(
    user,
    opportunities,
    10 // Top 10 recommendations
  );

  return Response.json({ recommendations });
}
```

---

## Success Criteria

### Before Deployment Checklist

- [ ] All dependencies installed successfully
- [ ] All tests passing (unit, integration, property-based)
- [ ] No linting or type errors
- [ ] ML scoring tests passing
- [ ] Data model inconsistency resolved (Option A or B implemented)
- [ ] Unused Mongoose models removed
- [ ] Environment variables documented
- [ ] ML scoring integrated with at least one service
- [ ] Manual testing of key user flows completed
- [ ] Performance testing completed (search < 3 seconds)

### Optional but Recommended

- [ ] A/B testing framework set up for ML scoring
- [ ] Analytics dashboard to track ML scoring effectiveness
- [ ] User feedback mechanism for recommendations
- [ ] Monitoring alerts for ML scoring service

---

## Timeline

### Week 1 - Critical Path

**Day 1:**

- ✅ Install dependencies (DONE - just need to run npm install)
- ✅ Run tests and fix failures
- ✅ Code quality checks

**Day 2-3:**

- 🔴 Resolve data model inconsistency
- 🔴 Update services to use consistent models
- 🔴 Test thoroughly

**Day 4:**

- 🟡 Clean up database architecture
- 🟡 Remove unused Mongoose models
- 🟡 Update documentation

**Day 5:**

- 🟢 Document environment variables
- 🟢 Create setup guide
- ✅ Final testing and validation

---

## Getting Help

### If Tests Fail

1. Check the error message carefully
2. Look for configuration issues first
3. Review the test file to understand what's being tested
4. Check if dependencies are properly installed

### If Data Model Fix is Unclear

1. Review `SPEC_VERIFICATION_REPORT.md` section 2.2
2. Review `IMPROVEMENT_PLAN.md` section 1.2
3. Start with Option A (simpler, less disruptive)
4. Create transformation utilities first, then update services one by one

### If ML Scoring Integration is Unclear

1. Review `src/lib/services/ml-scoring.service.ts` documentation
2. Check the test file for usage examples
3. Start with search service re-ranking (easiest integration)
4. Test with small dataset first

---

## Quick Commands Reference

```bash
# Install dependencies
npm install

# Run all tests
npm run test:all

# Run specific test file
npm test -- ml-scoring.service.test.ts

# Code quality
npm run code-quality
npm run code-quality:fix

# Development server
npm run dev

# Build for production
npm run build

# Type checking
npm run type-check

# Database operations
npm run db:generate
npm run db:push
npm run db:migrate
npm run db:seed
```

---

## Contact and Support

**For Questions:**

- Review the comprehensive documentation in:
  - `SPEC_VERIFICATION_REPORT.md`
  - `IMPROVEMENT_PLAN.md`
  - `COMPREHENSIVE_REVIEW_SUMMARY.md`

**For Issues:**

- Check existing tests for examples
- Review service implementations
- Consult TypeScript types for interfaces

---

**Last Updated:** February 15, 2026  
**Status:** Ready for execution  
**Priority:** HIGH - Complete within 1 week
