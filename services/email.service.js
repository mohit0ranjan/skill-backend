/**
 * Enhanced Email Service with Templates
 * Supports Google Gmail, Sendgrid, and console logging for dev
 */

const nodemailer = require('nodemailer');
const { ApiError } = require('../utils/apiResponse');

class EmailService {
  constructor() {
    this.transporter = null;
    this.initializeTransporter();
  }

  initializeTransporter() {
    // Development mode: Log to console
    if (process.env.NODE_ENV === 'development' && (!process.env.EMAIL_USER || !process.env.EMAIL_PASS)) {
      console.log('📧 Email service in CONSOLE mode (development)');
      this.transporter = {
        sendMail: async (options) => {
          console.log('📧 EMAIL CONSOLE LOG:', {
            from: options.from,
            to: options.to,
            subject: options.subject,
            preview: options.html.substring(0, 100),
          });
          return { messageId: `mock-${Date.now()}` };
        },
      };
      return;
    }

    // Production mode: Use Gmail SMTP with App Password
    if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
      this.transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS, // Should be Gmail App Password, not account password
        },
      });
      console.log('📧 Email service configured with Gmail');
      return;
    }

    // In development with no credentials, use console
    console.warn('⚠️ Email credentials not configured. Using console mode.');
    this.transporter = {
      sendMail: async (options) => {
        console.log('📧 EMAIL (DEV):', {
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
  async sendOnboardingWelcome({ userEmail, userName, verifyLink }) {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #111827 0%, #1f2937 100%); padding: 30px; text-align: center; color: white; border-radius: 8px 8px 0 0;">
          <h1 style="margin: 0; font-size: 28px;">Welcome to SkillBridge</h1>
        </div>
        <div style="padding: 30px; background: #f9f9f9; border-radius: 0 0 8px 8px;">
          <p style="font-size: 16px; color: #333;">Hi <strong>${userName}</strong>,</p>
          <p style="font-size: 16px; color: #555; line-height: 1.6;">
            Your account has been created successfully. You can now explore internships and start your journey.
          </p>
          <p style="font-size: 16px; color: #555; line-height: 1.6;">
            Before you begin, please verify your email address.
          </p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${verifyLink}" style="display: inline-block; padding: 12px 30px; background: #10b981; color: white; text-decoration: none; border-radius: 6px; font-weight: bold;">
              Verify Email
            </a>
          </div>
          <p style="font-size: 13px; color: #6b7280; margin-top: 18px;">
            This verification link expires in 24 hours.
          </p>
        </div>
      </div>
    `;

    return this.send({
      to: userEmail,
      subject: 'Welcome to SkillBridge - Verify your email',
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
      || 'support@skillbridge.in';
    const frontendBaseUrl = process.env.FRONTEND_URL
      || process.env.APP_URL
      || (process.env.NODE_ENV === 'production' ? 'https://skillbridge.in' : 'http://localhost:3000');
    const dashboardUrl = `${frontendBaseUrl}/dashboard`;

    const html = `
      <div style="margin:0; padding:0; background-color:#f3f4f6;">
        <div style="display:none; max-height:0; overflow:hidden; opacity:0; color:transparent; mso-hide:all;">
          Your internship enrollment is confirmed. Welcome to SkillBridge.
        </div>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f3f4f6; padding:24px 16px;">
          <tr>
            <td align="center">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:640px; width:100%; border-collapse:collapse; font-family:'Inter', 'Poppins', 'Segoe UI', Arial, sans-serif;">
                <tr>
                  <td style="background:linear-gradient(135deg, #0f8b4c 0%, #10b981 55%, #0b6b3a 100%); padding:20px 24px; border-radius:20px 20px 0 0;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td valign="middle" style="width:56px; padding-right:14px;">
                          <div style="width:44px; height:44px; border-radius:14px; background:rgba(255,255,255,0.15); border:1px solid rgba(255,255,255,0.24); color:#ffffff; font-size:16px; font-weight:800; line-height:44px; text-align:center; letter-spacing:0.06em;">SB</div>
                        </td>
                        <td valign="middle" style="color:#ffffff; text-align:left;">
                          <div style="font-size:16px; line-height:1.2; font-weight:700; letter-spacing:0.01em;">SkillBridge</div>
                          <div style="font-size:12px; line-height:1.4; margin-top:4px; opacity:0.92; letter-spacing:0.02em;">Official Internship Platform</div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="background:#ffffff; padding:34px 28px 30px; text-align:center;">
                    <div style="font-size:29px; line-height:1.2; font-weight:800; color:#0f172a; margin:0; letter-spacing:-0.02em;">Your Internship Enrollment is Confirmed</div>
                    <div style="font-size:15px; line-height:1.6; color:#15803d; font-weight:600; margin-top:10px;">Welcome to SkillBridge</div>

                    <p style="margin:22px 0 0; font-size:16px; line-height:1.7; color:#475569;">
                      Hi <strong style="color:#0f172a;">${userName}</strong>, your enrollment for <strong style="color:#0f172a;">${internshipTitle}</strong> is now active.
                    </p>
                    <p style="margin:12px 0 0; font-size:16px; line-height:1.7; color:#475569;">
                      Your dashboard is ready with your program details, assignments, and next steps.
                    </p>

                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:26px auto 0;">
                      <tr>
                        <td style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:16px; padding:20px 18px; text-align:left;">
                          <div style="font-size:12px; line-height:1.4; letter-spacing:0.14em; text-transform:uppercase; color:#64748b; font-weight:700;">Program summary</div>
                          <div style="margin-top:14px; font-size:15px; line-height:1.8; color:#334155;">
                            <div><strong style="color:#0f172a;">Program:</strong> ${internshipTitle}</div>
                            <div><strong style="color:#0f172a;">Duration:</strong> ${internshipDuration}</div>
                            <div><strong style="color:#0f172a;">Status:</strong> Active</div>
                          </div>
                        </td>
                      </tr>
                    </table>

                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:28px auto 0;">
                      <tr>
                        <td align="center" style="border-radius:12px; background:#10b981;">
                          <a href="${dashboardUrl}" style="display:inline-block; padding:14px 24px; font-size:15px; font-weight:700; color:#ffffff; text-decoration:none; border-radius:12px;">Go to Dashboard</a>
                        </td>
                      </tr>
                    </table>

                    <p style="margin:18px 0 0; font-size:13px; line-height:1.6; color:#64748b;">
                      Need help? Reply to this email or contact <a href="mailto:${supportEmail}" style="color:#15803d; text-decoration:none; font-weight:600;">${supportEmail}</a>.
                    </p>
                  </td>
                </tr>
                <tr>
                  <td style="background:#f8fafc; padding:18px 24px 22px; text-align:center; border-top:1px solid #e5e7eb; border-radius:0 0 20px 20px;">
                    <div style="font-size:13px; line-height:1.6; color:#334155; font-weight:700;">SkillBridge | Official Internship Platform</div>
                    <div style="font-size:12px; line-height:1.6; color:#64748b; margin-top:6px;">Support: <a href="mailto:${supportEmail}" style="color:#15803d; text-decoration:none; font-weight:600;">${supportEmail}</a></div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </div>
    `;

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
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; text-align: center; color: white; border-radius: 8px 8px 0 0;">
          <h1 style="margin: 0; font-size: 28px;">✅ Payment Successful</h1>
        </div>
        <div style="padding: 30px; background: #f9f9f9; border-radius: 0 0 8px 8px;">
          <p style="font-size: 16px; color: #333;">Hi <strong>${userName}</strong>,</p>
          <p style="font-size: 16px; color: #555;">
            Your payment has been successfully processed!
          </p>
          <div style="background: white; padding: 20px; border-left: 4px solid #10b981; margin: 20px 0;">
            <h3 style="margin: 0 0 10px 0; color: #10b981;">Receipt Details</h3>
            <p style="margin: 5px 0;"><strong>Program:</strong> ${internshipTitle}</p>
            <p style="margin: 5px 0;"><strong>Amount Paid:</strong> ₹${amount}</p>
            <p style="margin: 5px 0;"><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
          </div>
          <p style="font-size: 16px; color: #555;">
            Start your internship now by visiting your dashboard!
          </p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard" style="display: inline-block; padding: 12px 30px; background: #10b981; color: white; text-decoration: none; border-radius: 6px; font-weight: bold;">
              Start Learning
            </a>
          </div>
        </div>
      </div>
    `;

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
      || (process.env.NODE_ENV === 'production' ? 'https://skillbridge.in' : 'http://localhost:3000');
    const certificateUrl = `${frontendBaseUrl}/certificate/${certificateId}`;
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; text-align: center; color: white; border-radius: 8px 8px 0 0;">
          <h1 style="margin: 0; font-size: 28px;">🎓 Certificate Earned!</h1>
        </div>
        <div style="padding: 30px; background: #f9f9f9; border-radius: 0 0 8px 8px;">
          <p style="font-size: 16px; color: #333;">Congratulations <strong>${userName}</strong>,</p>
          <p style="font-size: 16px; color: #555;">
            Your final submission for the <strong>${internshipTitle}</strong> program has been approved and your certificate is ready!
          </p>
          <div style="background: white; padding: 20px; border-left: 4px solid #10b981; margin: 20px 0;">
            <p style="margin: 5px 0;"><strong>Certificate ID:</strong> ${certificateId}</p>
          </div>
          <p style="font-size: 16px; color: #555;">
            You can now view, share, or download your official verified certificate online.
          </p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${certificateUrl}" style="display: inline-block; padding: 12px 30px; background: #10b981; color: white; text-decoration: none; border-radius: 6px; font-weight: bold;">
              View My Certificate
            </a>
          </div>
        </div>
      </div>
    `;

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
      || (process.env.NODE_ENV === 'production' ? 'https://skillbridge.in' : 'http://localhost:3000');
    const supportUrl = `${frontendBaseUrl}/support`;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 640px; margin: 0 auto; background: #f9fafb; padding: 24px;">
        <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 28px; text-align: center; color: white; border-radius: 14px 14px 0 0;">
          <h1 style="margin: 0; font-size: 26px;">Support Reply from SkillBridge</h1>
        </div>
        <div style="background: white; padding: 28px; border: 1px solid #e5e7eb; border-top: 0; border-radius: 0 0 14px 14px;">
          <p style="font-size: 16px; color: #374151;">Hi <strong>${userName}</strong>,</p>
          <p style="font-size: 16px; color: #4b5563; line-height: 1.7;">
            We have replied to your support request about <strong>${subject}</strong>.
          </p>
          <div style="margin: 22px 0; padding: 18px; background: #f9fafb; border-left: 4px solid #10b981; border-radius: 10px;">
            <p style="margin: 0 0 8px; font-size: 12px; letter-spacing: 0.14em; text-transform: uppercase; color: #6b7280; font-weight: 700;">Admin reply</p>
            <p style="margin: 0; font-size: 15px; line-height: 1.7; color: #111827; white-space: pre-wrap;">${replyMessage}</p>
          </div>
          <p style="font-size: 14px; color: #6b7280; line-height: 1.6;">
            If you need more help, reply from the support page and our team will take it from there.
          </p>
          <div style="text-align: center; margin-top: 26px;">
            <a href="${supportUrl}" style="display: inline-block; padding: 12px 24px; background: #10b981; color: white; text-decoration: none; border-radius: 8px; font-weight: bold;">
              Open Support Center
            </a>
          </div>
        </div>
      </div>
    `;

    return this.send({
      to: userEmail,
      subject: `Reply to your support request: ${subject}`,
      html,
    });
  }

  /**
   * Generic send email
   */
  async send({ to, subject, html, text = null }) {
    if (!this.transporter) {
      throw new ApiError('Email service not configured', 500, 'EMAIL_CONFIG_ERROR');
    }

    if (!to || !subject || !html) {
      throw new ApiError('Missing email parameters', 400, 'INVALID_EMAIL_PARAMS');
    }

    try {
      const mailOptions = {
        from: `SkillBridge <${process.env.EMAIL_USER || 'noreply@skillbridge.in'}>`,
        to,
        subject,
        html,
        text,
      };

      const info = await this.transporter.sendMail(mailOptions);
      console.log(`✅ Email sent to ${to}`);
      return info;
    } catch (error) {
      console.error('❌ Email send failed:', error.message);
      throw new ApiError(`Failed to send email: ${error.message}`, 500, 'EMAIL_SEND_ERROR');
    }
  }
}

const emailService = new EmailService();

module.exports = {
  sendEmail: (options) => emailService.send(options),
  emailService,
};
