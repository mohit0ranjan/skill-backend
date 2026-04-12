/**
 * Auth Integration Tests
 * Phase 4: API integration tests with mocked persistence and email.
 */

const request = require('supertest');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

jest.mock('../../prisma', () => ({
  user: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
}));

jest.mock('../../services/email.service', () => ({
  sendOnboardingWelcome: jest.fn().mockResolvedValue(true),
  send: jest.fn().mockResolvedValue(true),
}));

const prisma = require('../../prisma');
const emailService = require('../../services/email.service');
const app = require('../../app');

describe('Auth API Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /auth/signup', () => {
    it('creates a user and returns token', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue({
        id: '550e8400-e29b-41d4-a716-446655440099',
        name: 'John Doe',
        email: 'john@example.com',
        college: 'MIT',
        year: '2024',
        role: 'USER',
      });

      const response = await request(app)
        .post('/auth/signup')
        .send({
          name: 'John Doe',
          email: 'john@example.com',
          password: 'ValidPass123!',
          college: 'MIT',
          year: '2024',
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.email).toBe('john@example.com');
      expect(response.body.data.token).toBeDefined();
      expect(prisma.user.create).toHaveBeenCalledTimes(1);
      expect(emailService.sendOnboardingWelcome).toHaveBeenCalledTimes(1);
    });

    it('rejects duplicate email', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: '550e8400-e29b-41d4-a716-446655440001',
        email: 'john@example.com',
      });

      const response = await request(app)
        .post('/auth/signup')
        .send({
          name: 'John Doe',
          email: 'john@example.com',
          password: 'ValidPass123!',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.errorCode).toBe('DUPLICATE_EMAIL');
    });
  });

  describe('POST /auth/login', () => {
    it('logs in valid user', async () => {
      const hashedPassword = await bcrypt.hash('ValidPass123!', 12);
      prisma.user.findUnique.mockResolvedValue({
        id: '550e8400-e29b-41d4-a716-446655440007',
        name: 'John Doe',
        email: 'john@example.com',
        password: hashedPassword,
        role: 'USER',
      });

      const response = await request(app)
        .post('/auth/login')
        .send({ email: 'john@example.com', password: 'ValidPass123!' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.token).toBeDefined();
    });

    it('returns 401 for wrong password', async () => {
      const hashedPassword = await bcrypt.hash('ValidPass123!', 12);
      prisma.user.findUnique.mockResolvedValue({
        id: '550e8400-e29b-41d4-a716-446655440007',
        email: 'john@example.com',
        password: hashedPassword,
      });

      const response = await request(app)
        .post('/auth/login')
        .send({ email: 'john@example.com', password: 'WrongPass123!' });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.errorCode).toBe('INVALID_CREDENTIALS');
    });
  });

  describe('POST /auth/request-password-reset', () => {
    it('returns generic success for non-existing email', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      const response = await request(app)
        .post('/auth/request-password-reset')
        .send({ email: 'missing@example.com' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('If email exists, password reset link sent');
      expect(emailService.send).not.toHaveBeenCalled();
    });
  });

  describe('POST /auth/reset-password', () => {
    it('rejects invalid token', async () => {
      const response = await request(app)
        .post('/auth/reset-password')
        .send({
          token: 'invalid-token',
          newPassword: 'ValidPass123!',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.errorCode).toBe('INVALID_TOKEN');
    });

    it('resets password when token is valid', async () => {
      // Must use JWT_RESET_SECRET (not JWT_SECRET) and include iss/aud claims
      const token = jwt.sign(
        { id: '550e8400-e29b-41d4-a716-446655440555' },
        process.env.JWT_RESET_SECRET || process.env.JWT_SECRET,
        { expiresIn: '1h', issuer: 'skillbridge-api', audience: 'skillbridge-client' }
      );

      prisma.user.findUnique.mockResolvedValue({
        id: '550e8400-e29b-41d4-a716-446655440555',
        name: 'John Doe',
        email: 'john@example.com',
      });
      prisma.user.update.mockResolvedValue({ id: '550e8400-e29b-41d4-a716-446655440555' });

      const response = await request(app)
        .post('/auth/reset-password')
        .send({ token, newPassword: 'ValidPass123!' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(prisma.user.update).toHaveBeenCalledTimes(1);
      expect(emailService.send).toHaveBeenCalledTimes(1);
    });
  });
});
