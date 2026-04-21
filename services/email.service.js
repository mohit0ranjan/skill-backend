/**
 * Enhanced Email Service with Templates
 * Supports Zoho SMTP, generic SMTP, and console logging for dev
 */

const nodemailer = require('nodemailer');
const { ApiError } = require('../utils/apiResponse');
const {
  getCertificateDeliveryEmailHtml,
  getEnrollmentConfirmationEmailHtml,
  getPaymentSuccessEmailHtml,
  getSupportReplyEmailHtml,
  getWelcomeEmailHtml,
} = require('../utils/emailTemplates');

class EmailService {
  constructor() {
    this.transporter = null;
    this.senderAddress = null;
    this.initializeTransporter();
  }

  initializeTransporter() {
    // Resolve SMTP config — prefer SMTP_* vars, fall back to legacy EMAIL_*
    const smtpHost = process.env.SMTP_HOST || null;
    const smtpPort = parseInt(process.env.SMTP_PORT, 10) || 587;
    const smtpUser = process.env.SMTP_USER || process.env.EMAIL_USER || null;
    const smtpPass = process.env.SMTP_PASS || process.env.EMAIL_PASS || null;

    this.senderAddress = smtpUser || 'noreply@skillbridge.co.in';

    // Development mode with no credentials: Log to console
    if (process.env.NODE_ENV === 'development' && (!smtpUser || !smtpPass)) {
      console.log('[EMAIL] Console mode (dev, no credentials)');
      this.transporter = {
        sendMail: async (options) => {
          console.log('[EMAIL] CONSOLE LOG:', {
            from: options.from,
            to: options.to,
            subject: options.subject,
            preview: (options.html || '').substring(0, 100),
          });
          return { messageId: `mock-${Date.now()}` };
        },
      };
      return;
    }

    // Production / configured mode: Use SMTP
    if (smtpUser && smtpPass) {
      const transportConfig = {
        host: smtpHost || 'smtp.zoho.in',
        port: smtpPort,
        secure: smtpPort === 465, // true for 465, false for 587
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
        tls: {
          rejectUnauthorized: true,
        },
      };

      this.transporter = nodemailer.createTransport(transportConfig);
      console.log(`[EMAIL] Configured: ${transportConfig.host}:${transportConfig.port} as ${smtpUser}`);

      // Verify connection on startup (non-blocking)
      this.transporter.verify()
        .then(() => console.log('[EMAIL] SMTP connection verified ✅'))
        .catch((err) => console.error('[EMAIL] SMTP verify FAILED ❌:', err.message));
      return;
    }

    // Fallback: console mode
    console.warn('[EMAIL] No credentials configured. Using console mode.');
    this.transporter = {
      sendMail: async (options) => {
        console.log('[EMAIL] DEV:', {
          from: options.from,
          to: options.to,
          subject: options.subject,
        });
        return { messageId: `dev-${Date.now()}` };
      },
    };
  }

  /**
   * Send onboarding email right after account creation.
   */
  async sendOnboardingWelcome({ userEmail, userName }) {
    const html = getWelcomeEmailHtml({ name: userName });

    return this.send({
      to: userEmail,
      subject: 'Welcome to SkillBridge - Account Created',
      html,
    });
  }

  /**
   * Send enrollment confirmation email
   */
  async sendEnrollmentConfirmation({ userEmail, userName, internshipTitle, internshipDuration }) {
    const supportEmail = process.env.EMAIL_SUPPORT
      || process.env.SUPPORT_EMAIL
      || process.env.CONTACT_EMAIL
      || 'support@skillbridge.co.in';
    const frontendBaseUrl = process.env.FRONTEND_URL
      || process.env.APP_URL
      || (process.env.NODE_ENV === 'production' ? 'https://skillbridge.co.in' : 'http://localhost:3000');
    const dashboardUrl = `${frontendBaseUrl}/dashboard`;
    const html = getEnrollmentConfirmationEmailHtml({
      userName,
      internshipTitle,
      internshipDuration,
      supportEmail,
      dashboardUrl,
    });

    return this.send({
      to: userEmail,
      subject: `Your Internship Enrollment is Confirmed - ${internshipTitle}`,
      html,
    });
  }

  /**
   * Send payment success notification
   */
  async sendPaymentSuccess({ userEmail, userName, internshipTitle, amount }) {
    const dashboardUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard`;
    const html = getPaymentSuccessEmailHtml({
      userName,
      internshipTitle,
      amount,
      dashboardUrl,
    });

    return this.send({
      to: userEmail,
      subject: `✅ Payment Received - ${internshipTitle}`,
      html,
    });
  }

  /**
   * Send Certificate Delivery email
   */
  async sendCertificateDelivery({ userEmail, userName, internshipTitle, certificateId }) {
    const frontendBaseUrl = process.env.FRONTEND_URL
      || process.env.APP_URL
      || (process.env.NODE_ENV === 'production' ? 'https://skillbridge.co.in' : 'http://localhost:3000');
    const certificateUrl = `${frontendBaseUrl}/certificate/${certificateId}`;
    const html = getCertificateDeliveryEmailHtml({
      userName,
      internshipTitle,
      certificateId,
      certificateUrl,
    });

    return this.send({
      to: userEmail,
      subject: `🎓 Your Certificate is Ready - ${internshipTitle}`,
      html,
    });
  }

  /**
   * Send support ticket reply email
   */
  async sendSupportReply({ userEmail, userName, subject, replyMessage }) {
    const frontendBaseUrl = process.env.FRONTEND_URL
      || process.env.APP_URL
      || (process.env.NODE_ENV === 'production' ? 'https://skillbridge.co.in' : 'http://localhost:3000');
    const supportUrl = `${frontendBaseUrl}/support`;
    const html = getSupportReplyEmailHtml({
      userName,
      subject,
      replyMessage,
      supportUrl,
    });

    return this.send({
      to: userEmail,
      subject: `Reply to your support request: ${subject}`,
      html,
    });
  }

  /**
   * Generic send email
   */
  async send({ to, subject, html, attachments = [] }) {
    if (!this.transporter) {
      console.error('[EMAIL] FAIL: transporter not configured');
      throw new ApiError('Email service not configured', 500, 'EMAIL_CONFIG_ERROR');
    }

    if (!to || !subject || !html) {
      console.error('[EMAIL] FAIL: missing params', { to: !!to, subject: !!subject, html: !!html });
      throw new ApiError('Missing email parameters', 400, 'INVALID_EMAIL_PARAMS');
    }

    const mailOptions = {
      from: `SkillBridge <${this.senderAddress}>`,
      to,
      subject,
      html,
      ...(Array.isArray(attachments) && attachments.length > 0 ? { attachments } : {}),
    };

    const maxAttempts = 2;
    let lastError = null;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        console.log(`[EMAIL] Sending to=${to} subject="${subject}" attempt=${attempt}`);
        const info = await this.transporter.sendMail(mailOptions);
        console.log(`[EMAIL SENT] to=${to} messageId=${info.messageId} attempt=${attempt}`);
        return info;
      } catch (error) {
        lastError = error;
        console.error(`[EMAIL FAILED] to=${to} attempt=${attempt} err=${error.message}`);

        if (attempt < maxAttempts) {
          await new Promise((resolve) => setTimeout(resolve, 500 * attempt));
        }
      }
    }

    throw new ApiError(`Failed to send email: ${lastError?.message || 'unknown error'}`, 500, 'EMAIL_SEND_ERROR');
  }
}

const emailService = new EmailService();

module.exports = {
  sendEmail: (options) => emailService.send(options),
  emailService,
};
