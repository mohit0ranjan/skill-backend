const { adminOnly } = require('../middleware/rbacMiddleware');

function createNextCollector() {
  const calls = [];
  const next = (arg) => calls.push(arg);
  return { next, calls };
}

describe('RBAC adminOnly middleware', () => {
  it('allows uppercase ADMIN role', async () => {
    const req = { user: { id: 'u1', role: 'ADMIN' } };
    const { next, calls } = createNextCollector();

    await adminOnly(req, {}, next);

    expect(calls).toHaveLength(1);
    expect(calls[0]).toBeUndefined();
  });

  it('allows lowercase admin role', async () => {
    const req = { user: { id: 'u1', role: 'admin' } };
    const { next, calls } = createNextCollector();

    await adminOnly(req, {}, next);

    expect(calls).toHaveLength(1);
    expect(calls[0]).toBeUndefined();
  });

  it('returns 401 with clear message for non-admin user', async () => {
    const req = { user: { id: 'u2', role: 'USER' } };
    const { next, calls } = createNextCollector();

    await adminOnly(req, {}, next);

    expect(calls).toHaveLength(1);
    expect(calls[0]).toBeDefined();
    expect(calls[0].statusCode).toBe(401);
    expect(calls[0].message).toBe('Unauthorized: admin access required');
  });

  it('returns 401 with clear message when user is missing', async () => {
    const req = {};
    const { next, calls } = createNextCollector();

    await adminOnly(req, {}, next);

    expect(calls).toHaveLength(1);
    expect(calls[0]).toBeDefined();
    expect(calls[0].statusCode).toBe(401);
    expect(calls[0].message).toBe('Unauthorized: admin access required');
  });
});
