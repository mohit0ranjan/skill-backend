/**
 * End-To-End Integrations Test
 * Validates the entire user journey: Signup -> Payment -> Task -> Final Project -> Admin Approval -> PDF Fetch
 */

const request = require('supertest');
const { generateToken } = require('../../utils/jwt');

jest.mock('../../prisma', () => {
  const prisma = {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
      count: jest.fn()
    },
    internship: {
      findUnique: jest.fn(),
      count: jest.fn(),
    },
    task: {
      findUnique: jest.fn(),
    },
    submission: {
      create: jest.fn(),
      findFirst: jest.fn(),
      count: jest.fn(),
      groupBy: jest.fn()
    },
    finalProjectSubmission: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      upsert: jest.fn(),
      count: jest.fn(),
    },
    payment: {
      findFirst: jest.fn(),
      update: jest.fn(),
      aggregate: jest.fn(),
      findUnique: jest.fn(),
    },
    userInternship: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
      count: jest.fn(),
      update: jest.fn()
    },
    certificate: {
      findUnique: jest.fn(),
      create: jest.fn(),
      count: jest.fn(),
    },
  };

  prisma.$transaction = jest.fn(async (runner) => runner(prisma));

  return prisma;
});

jest.mock('../../services/email.service', () => ({
  sendOnboardingWelcome: jest.fn().mockResolvedValue(true),
  sendEnrollmentConfirmation: jest.fn().mockResolvedValue(true),
  sendPaymentSuccess: jest.fn().mockResolvedValue(true),
  sendCertificateDelivery: jest.fn().mockResolvedValue(true),
  send: jest.fn().mockResolvedValue(true),
}));

const prisma = require('../../prisma');
const app = require('../../app');
const emailService = require('../../services/email.service');

describe('E2E Pipeline Integration', () => {
  let userToken;
  let adminToken;
  const userId = '123e4567-e89b-12d3-a456-426614174000';
  const adminId = '123e4567-e89b-12d3-a456-426614174001';
  const internshipId = '123e4567-e89b-12d3-a456-426614174002';
  const taskId = '123e4567-e89b-12d3-a456-426614174003';
  const submissionId = '123e4567-e89b-12d3-a456-426614174004';
  const certificateId = 'skillo-CERT-1234';

  beforeAll(() => {
    process.env.RAZORPAY_WEBHOOK_SECRET = 'test-webhook-secret';
    process.env.RAZORPAY_KEY_SECRET = 'test-payment-secret';
    userToken = generateToken(userId);
    adminToken = generateToken(adminId);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('1. Webhook Payment securely enrolls user', async () => {
    prisma.payment.findFirst.mockResolvedValue({
      id: 'pay-db-id',
      userId,
      internshipId,
      status: 'PENDING',
      amount: 50000,
      user: { email: 'student@test.com', name: 'Student' },
      internship: { title: 'Backend Eng' }
    });

    prisma.userInternship.upsert.mockResolvedValue(true);

    const webhookBody = {
      event: 'payment.captured',
      payload: { payment: { entity: { order_id: 'order_TEST', id: 'pay_RAZOR' } } }
    };
    const rawWebhookBody = JSON.stringify(webhookBody);

    // Calculate signature
    const crypto = require('crypto');
    const signature = crypto.createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET || 'test')
      .update(rawWebhookBody)
      .digest('hex');

    const res = await request(app)
      .post('/razorpay-webhook')
      .set('Content-Type', 'application/json')
      .set('x-razorpay-signature', signature)
      .send(rawWebhookBody);

    expect(res.status).toBe(200);
    expect(prisma.payment.update).toHaveBeenCalledWith(expect.objectContaining({ data: { status: 'SUCCESS', razorpayId: 'pay_RAZOR' } }));
    expect(prisma.userInternship.upsert).toHaveBeenCalled();
    expect(emailService.sendEnrollmentConfirmation).toHaveBeenCalled();
  });

  it('1b. Verify payment restores missing enrollment for an already-successful payment', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: userId, role: 'USER' });
    prisma.payment.findFirst.mockResolvedValue({
      id: 'pay-db-id',
      userId,
      internshipId,
      status: 'SUCCESS',
      amount: 50000,
      user: { id: userId, email: 'student@test.com', name: 'Student' },
      internship: { title: 'Backend Eng', duration: '12 weeks' },
      certificate: null,
    });
    prisma.userInternship.upsert.mockResolvedValue(true);

    const crypto = require('crypto');
    const orderId = 'order_TEST';
    const paymentId = 'pay_RAZOR';
    const signature = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || 'test')
      .update(`${orderId}|${paymentId}`)
      .digest('hex');

    const res = await request(app)
      .post('/verify-payment')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        razorpay_order_id: orderId,
        razorpay_payment_id: paymentId,
        razorpay_signature: signature,
        paymentId: '550e8400-e29b-41d4-a716-446655440099',
        internshipId,
      });

    expect(res.status).toBe(200);
    expect(prisma.userInternship.upsert).toHaveBeenCalledWith(expect.objectContaining({
      where: { userId_internshipId: { userId, internshipId } },
    }));
  });

  it('2. User completes final project submission', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: userId, role: 'USER' });
    prisma.internship.findUnique.mockResolvedValue({ id: internshipId, title: 'Backend', tasks: [] });
    prisma.userInternship.findUnique.mockResolvedValue({ status: 'IN_PROGRESS' });
    prisma.finalProjectSubmission.findUnique.mockResolvedValue(null); // No existing
    prisma.finalProjectSubmission.upsert.mockResolvedValue({ 
      id: submissionId, 
      status: 'SUBMITTED',
      projectTitle: 'Final SaaS',
      projectLink: 'https://github.com/test',
      description: 'Here is my massive project containing all features.',
      fileUrl: null,
      submittedAt: new Date()
    });
    prisma.user.findUnique.mockResolvedValue({ id: userId, name: 'Student', email: 'student@test.com' });

    const res = await request(app)
      .post('/submit-project')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        internshipId,
        projectTitle: 'Final SaaS',
        projectLink: 'https://github.com/test',
        description: 'Here is my massive project containing all features.'
      });

    if (res.status !== 201) process.stdout.write('Test 2 Error: ' + JSON.stringify(res.body) + '\n');
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(prisma.finalProjectSubmission.upsert).toHaveBeenCalled();
  });

  it('3. Admin parallelizes Dashboard analytics', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: adminId, role: 'ADMIN' });
    prisma.user.count.mockResolvedValue(10);
    prisma.internship.count.mockResolvedValue(2);
    prisma.userInternship.count.mockResolvedValue(5);
    prisma.submission.count.mockResolvedValue(1);
    prisma.payment.aggregate.mockResolvedValue({ _sum: { amount: 500000 } });
    prisma.certificate.count.mockResolvedValue(3);

    const res = await request(app)
      .get('/admin/dashboard')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.users.total).toBe(10);
    expect(res.body.data.revenue.total).toBe(5000); // 500000 / 100
  });

  it('4. Admin approves project & Certificate triggers Email', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: adminId, role: 'ADMIN' });
    
    // Simulate finding the final submission
    prisma.finalProjectSubmission.findUnique
      .mockResolvedValueOnce({
        id: submissionId,
        userId,
        internshipId,
        status: 'SUBMITTED'
      })
      .mockResolvedValueOnce({
        id: submissionId,
        userId,
        internshipId,
        status: 'APPROVED'
      });
      
    prisma.finalProjectSubmission.update.mockResolvedValue({ status: 'APPROVED' });
    
    // For createOrReturnCertificate mock mapping
    prisma.certificate.findUnique.mockResolvedValue(null);
    prisma.certificate.create.mockResolvedValue({ certificateId });
    prisma.user.findUnique.mockResolvedValueOnce({ id: adminId, role: 'ADMIN' }) // the admin token check
                          .mockResolvedValueOnce({ id: userId, email: 'student@test.com', name: 'Student' }); // email lookup
    prisma.internship.findUnique.mockResolvedValue({ title: 'Backend' });

    const res = await request(app)
      .patch(`/admin/final-submission/${submissionId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'APPROVED', feedback: 'Great job!' });

    if (res.status !== 200) process.stdout.write('Test 4 Error: ' + JSON.stringify(res.body) + '\n');
    expect(res.status).toBe(200);
    expect(prisma.finalProjectSubmission.update).toHaveBeenCalledWith(expect.objectContaining({ data: { status: 'APPROVED', feedback: 'Great job!' } }));
    expect(emailService.sendCertificateDelivery).toHaveBeenCalled(); // Email was dispatched!
  });

  it('5. Public Certificate PDF generator serves document', async () => {
    prisma.certificate.findUnique.mockResolvedValue({
      certificateId,
      issuedDate: new Date(),
      user: { name: 'Student User' },
      internship: { title: 'Backend Engineering' }
    });

    const res = await request(app)
      .get(`/certificate/${certificateId}/pdf`);

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toBe('application/pdf');
  });
});
