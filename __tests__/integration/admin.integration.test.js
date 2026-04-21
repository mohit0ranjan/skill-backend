/**
 * Admin Controller Regression Tests
 */

jest.mock('bcrypt', () => ({
  hash: jest.fn(async (password) => `hashed:${password}`),
  compare: jest.fn(async (password, hashedPassword) => hashedPassword === `hashed:${password}`),
}), { virtual: true });

jest.mock('../../prisma', () => ({
  user: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
  },
  finalProjectSubmission: { findMany: jest.fn() },
  workspaceSubmission: { findMany: jest.fn() },
  userInternship: { count: jest.fn() },
  submission: { count: jest.fn() },
  certificate: { count: jest.fn() },
  payment: { count: jest.fn() },
}));

const prisma = require('../../prisma');
const { generateToken } = require('../../utils/jwt');
const { adminLogin, getAdminUsers } = require('../../controllers/adminController');

function createMockRes() {
  const res = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
}

describe('Admin controller regression checks', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('logs in an admin and returns a JWT', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'admin-1',
      name: 'Admin User',
      email: 'admin@example.com',
      password: 'hashed:ValidPass123!',
      role: 'ADMIN',
      tokenVersion: 0,
    });

    const req = { validatedBody: { email: 'admin@example.com', password: 'ValidPass123!' } };
    const res = createMockRes();
    const next = jest.fn();

    await adminLogin(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledTimes(1);
    expect(res.json.mock.calls[0][0].success).toBe(true);
    expect(res.json.mock.calls[0][0].data.token).toBeDefined();
  });

  it('rejects a non-admin login', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      name: 'Normal User',
      email: 'user@example.com',
      password: 'hashed:ValidPass123!',
      role: 'USER',
      tokenVersion: 0,
    });

    const req = { validatedBody: { email: 'user@example.com', password: 'ValidPass123!' } };
    const res = createMockRes();
    const next = jest.fn();

    await adminLogin(req, res, next);

    expect(res.json).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledTimes(1);
    expect(next.mock.calls[0][0].errorCode).toBe('INVALID_CREDENTIALS');
  });

  it('returns paginated users from the admin directory', async () => {
    const token = generateToken('admin-1', '7d', 'JWT_SECRET', 'auth', 0);
    expect(token).toBeDefined();

    prisma.user.findMany.mockResolvedValue([
      {
        id: 'user-1',
        name: 'Student One',
        email: 'student@example.com',
        college: 'Example College',
        year: '2024',
        role: 'USER',
        emailVerified: true,
        createdAt: new Date('2026-01-01T10:00:00.000Z'),
      },
    ]);
    prisma.user.count.mockResolvedValue(1);

    const req = { query: { page: '1', limit: '20' } };
    const res = createMockRes();
    const next = jest.fn();

    await getAdminUsers(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledTimes(1);
    const payload = res.json.mock.calls[0][0];
    expect(payload.success).toBe(true);
    expect(payload.data.items).toHaveLength(1);
    expect(payload.data.items[0].email).toBe('student@example.com');
  });
});