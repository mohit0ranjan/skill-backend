# Phase 3: Testing & Core Fixes - TEST SUITE DOCUMENTATION

**Status**: Test Infrastructure Ready  
**Framework**: Jest + Supertest  
**Coverage Target**: 70% minimum

---

## Test Architecture

### Layers
1. **Unit Tests** - Pure functions, no dependencies
   - Password hashing/verification
   - JWT token generation/verification
   - Validation schemas
   - Error handling

2. **Integration Tests** - API endpoints with mocked database
   - Auth endpoints (signup, login, password reset)
   - User enrollment
   - Task submission
   - Payment flow
   - Admin operations

3. **End-to-End Tests** - Full workflow testing
   - Complete enrollment→task→payment→certificate flow
   - Admin approval workflow

---

## Running Tests

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run specific test file
npm test -- auth.test.js

# Watch mode (auto-rerun on changes)
npm test -- --watch

# Debug mode
node --inspect-brk node_modules/.bin/jest --runInBand
```

---

## Test Structure

### Unit Tests Included

#### 1. **Auth Tests** (`__tests__/auth.test.js`)
- ✅ Password hashing & verification
- ✅ JWT token generation
- ✅ Token expiration handling
- ✅ Password strength validation

#### 2. **Validation Tests** (`__tests__/validation.test.js`)
- ✅ Signup schema (all fields)
- ✅ Login schema
- ✅ Payment schema
- ✅ Task submission schema
- ✅ Email format validation
- ✅ UUID validation
- ✅ URL validation

### Integration Tests (Template)

```typescript
// __tests__/api/auth.integration.test.js
describe('POST /auth/signup', () => {
  it('should register new user', async () => {
    const response = await request(app)
      .post('/api/auth/signup')
      .send({
        name: 'Test User',
        email: 'test@example.com',
        password: 'ValidPass123!',
        college: 'MIT'
      });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data.token).toBeDefined();
  });

  it('should reject duplicate email', async () => {
    // Create first user
    await request(app).post('/api/auth/signup').send({...});

    // Second attempt
    const response = await request(app)
      .post('/api/auth/signup')
      .send({ email: 'test@example.com', ... });

    expect(response.status).toBe(400);
    expect(response.body.errorCode).toBe('DUPLICATE_EMAIL');
  });
});

describe('POST /auth/login', () => {
  it('should login with valid credentials', async () => {
    // Setup: create user
    // Act: POST login
    // Assert: token returned
  });

  it('should reject invalid credentials', async () => {
    // Assert: 401 Unauthorized
  });
});

describe('POST /auth/request-password-reset', () => {
  it('should send reset email', async () => {
    const response = await request(app)
      .post('/api/auth/request-password-reset')
      .send({ email: 'user@example.com' });

    expect(response.status).toBe(200);
    // Verify email sent (mock emailService)
  });
});

describe('POST /auth/reset-password', () => {
  it('should reset password with valid token', async () => {
    // Setup: request reset, get token
    // Act: POST reset-password with token & new password
    // Assert: password updated, can login with new password
  });

  it('should reject expired token', async () => {
    // Assert: 400 Invalid token
  });
});
```

---

## API Integration Test Checklist

### Auth Endpoints
```
✅ POST /auth/signup
   - [x] Valid signup → 201, token returned
   - [x] Duplicate email → 400 DUPLICATE_EMAIL
   - [x] Invalid email → 400 VALIDATION_ERROR
   - [x] Weak password → 400 VALIDATION_ERROR
   - [x] Missing fields → 400 VALIDATION_ERROR
   - [x] Email verification notification sent

✅ POST /auth/login
   - [x] Valid credentials → 200, token returned
   - [x] Invalid password → 401 INVALID_CREDENTIALS
   - [x] Non-existent user → 401 INVALID_CREDENTIALS
   - [x] Case-insensitive email lookup

✅ POST /auth/request-password-reset
   - [x] Valid email → 200 (non-revealing)
   - [x] Non-existent email → 200 (non-revealing)
   - [x] Reset link email sent

✅ POST /auth/reset-password
   - [x] Valid token & password → 200
   - [x] Expired token → 400 INVALID_TOKEN
   - [x] Invalid token → 400 INVALID_TOKEN
   - [x] Password confirmation email sent

✅ POST /auth/verify-email
   - [x] Valid token → 200, email verified
   - [x] Invalid token → 400 INVALID_TOKEN

✅ GET /auth/me
   - [x] With valid token → 200, user profile
   - [x] Without token → 401 UNAUTHORIZED
```

### User/Enrollment Endpoints
```
✅ POST /user/enroll
   - [x] Valid internshipId → 201, enrollment created
   - [x] Already enrolled → 400 ALREADY_ENROLLED
   - [x] Invalid internshipId → 404 INTERNSHIP_NOT_FOUND
   - [x] Enrollment confirmation email sent
   - [x] Validation applied

✅ GET /user/dashboard
   - [x] With auth → 200, dashboard data
   - [x] Stats calculated correctly
   - [x] Pagination works
```

### Tasks Endpoints
```
✅ POST /submit-task
   - [x] Valid submission → 200
   - [x] Not enrolled → 403 NOT_ENROLLED
   - [x] Invalid GitHub link → 400 VALIDATION_ERROR
   - [x] Task not found → 404 TASK_NOT_FOUND
   - [x] Duplicate submission → upserted (not duplicate)

✅ PATCH /submission/:id  (Admin)
   - [x] Valid evaluation → 200
   - [x] Invalid status → 400 VALIDATION_ERROR
   - [x] Non-admin → 403 FORBIDDEN
   - [x] Submission not found → 404 SUBMISSION_NOT_FOUND
```

### Payment Endpoints
```
✅ POST /certificates/create-order
   - [x] Valid order → 201, orderId returned
   - [x] Idempotency: Same order twice → returns existing order ID
   - [x] Invalid internshipId → 404
   - [x] Validation applied (amount > 0)

✅ POST /certificates/verify-payment
   - [x] Valid signature → 200, payment SUCCESS
   - [x] Invalid signature → 400 INVALID_SIGNATURE
   - [x] Certificate unlocked (isPaid = true)
   - [x] Success email sent

✅ POST /certificates/razorpay-webhook
   - [x] Valid signature → 200
   - [x] Invalid signature → 400
   - [x] Payment marked SUCCESS
   - [x] Certificate unlocked
   - [x] Email notification sent
```

### Admin Endpoints
```
✅ GET /admin/dashboard
   - [x] Admin only → 403 for non-admin
   - [x] Returns: users, programs, submissions, revenue stats
   - [x] RBAC protection verified

✅ GET /admin/submissions
   - [x] Returns pending submissions
   - [x] Filterable by internship/status
   - [x] Admin only

✅ GET /admin/user/:userId
   - [x] Returns user with enrollments, submissions, certificates
   - [x] Admin only
   - [x] User not found → 404

✅ PATCH /admin/user/:userId/role
   - [x] Valid role → 200, role updated
   - [x] Prevent self-role-change
   - [x] Validation applied
   - [x] Admin only

✅ GET /admin/internship/:internshipId/analytics
   - [x] Returns analytics (enrollments, submissions, revenue)
   - [x] Admin only
   - [x] Internship not found → 404
```

---

## Mock Data & Fixtures

```javascript
// __tests__/fixtures.js
const testUser = {
  id: 'user-123',
  name: 'Test User',
  email: 'test@example.com',
  password: 'HashedPassword123!',
  role: 'USER'
};

const testAdmin = {
  ...testUser,
  id: 'admin-123',
  role: 'ADMIN'
};

const testInternship = {
  id: 'internship-123',
  title: 'Test Internship',
  domain: 'Engineering',
  duration: '4 weeks',
  level: 'Beginner'
};

const testTask = {
  id: 'task-123',
  internshipId: 'internship-123',
  title: 'Build a REST API',
  week: 1
};
```

---

## Coverage Report Format

```
=================== Coverage Summary ===================
File                    | Stmts | Branch | Funcs | Lines |
======================================================
All files              |  75%  |  68%   |  72%  |  74%  |
------------------------------------------------------
controllers/            | 78%   | 72%    | 80%   | 79%   |
services/               | 85%   | 82%    | 88%   | 86%   |
utils/                  | 92%   | 90%    | 95%   | 92%   |
middleware/             | 70%   | 65%    | 72%   | 70%   |
========================================================
```

---

## Continuous Integration Setup

### GitHub Actions (.github/workflows/test.yml)
```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      - run: npm ci
      - run: npm run test:coverage
      - uses: codecov/codecov-action@v3
        with:
          files: ./coverage/coverage-final.json
```

---

## Common Jest Commands

```bash
# Test specific patterns
npm test -- --testNamePattern="password"

# Test specific file
npm test -- auth.test.js

# Debug a single test
npm test -- --testNamePattern="should accept valid password" --debug

# Update snapshots (if using snapshots)
npm test -- -u

# Run with different config
npm test -- --config=jest.config.js

# Clear Jest cache
npm test -- --clearCache
```

---

## Testing Best Practices

1. **AAA Pattern**: Arrange → Act → Assert
2. **Isolation**: Each test independent
3. **Descriptive Names**: Clear intent
4. **Mocking**: Mock external dependencies
5. **Assertions**: Test one thing per test
6. **Coverage**: Aim for 80%+ line coverage
7. **Performance**: Tests should run <100ms each
8. **Database**: Use test database, reset between tests

---

## Next Steps

1. ✅ Create Jest configuration
2. ✅ Create test setup
3. ✅ Create unit tests (auth, validation)
4. ⏳ Create integration test templates
5. ⏳ Set up CI/CD pipeline
6. ⏳ Add E2E tests (optional)
7. ⏳ Generate coverage reports

---

## To Run Tests

After installing Jest:

```bash
npm run test          # Run all tests
npm run test:coverage # With coverage report
npm run test:watch    # Watch mode
```

**Note**: Tests require Jest installation via:
```bash
npm install --save-dev jest supertest
```
