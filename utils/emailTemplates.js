const escapeHtml = (value) => String(value ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#039;');

const BRAND_THEME = `
  <style>
    /* Reset & Base */
    body, p, h1, h2, h3, h4, h5, h6 { margin: 0; padding: 0; }
    body { background-color: #f3f4f6; -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale; }
    
    .email-shell { background-color: #f3f4f6; width: 100%; padding: 40px 0; }
    .email-table { margin: 0 auto; width: 100%; max-width: 600px; background: #ffffff; border-radius: 12px; border: 1px solid #e5e7eb; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }
    .padding { padding: 32px; }
    
    /* Typography */
    .brand-wrap { text-align: center; padding-bottom: 24px; border-bottom: 1px solid #f3f4f6; }
    .brand { font-size: 20px; font-weight: 800; color: #111827; letter-spacing: -0.02em; }
    .brand-accent { color: #10b981; }
    
    .eyebrow { font-size: 12px; font-weight: 600; color: #10b981; letter-spacing: 0.1em; text-transform: uppercase; margin-bottom: 12px; }
    .hero-title { font-size: 26px; font-weight: 700; color: #111827; line-height: 1.3; margin-bottom: 12px; letter-spacing: -0.01em; }
    .hero-copy { font-size: 16px; color: #4b5563; line-height: 1.6; margin-bottom: 24px; }
    
    /* Highlight Box */
    .highlight-wrapper { margin-bottom: 32px; }
    .highlight { background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 16px 20px; }
    .highlight p { color: #166534; font-size: 15px; font-weight: 500; line-height: 1.5; margin: 0; }
    
    /* Body & Paragraphs */
    .body-content { font-size: 15px; color: #374151; line-height: 1.6; margin-bottom: 32px; }
    .body-content p { margin-bottom: 16px; }
    .body-content p:last-child { margin-bottom: 0; }
    
    /* Data Cards */
    .card-row { width: 100%; border-collapse: separate; border-spacing: 12px 12px; margin-left: -12px; margin-top: -12px; margin-bottom: 32px; }
    .card { background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; text-align: left; }
    .card-label { font-size: 12px; color: #6b7280; font-weight: 500; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px; }
    .card-value { font-size: 15px; color: #111827; font-weight: 600; line-height: 1.4; }
    
    /* Button */
    .button-wrap { margin-top: 32px; text-align: left; }
    .button { display: inline-block; background-color: #10b981; color: #ffffff !important; font-size: 15px; font-weight: 600; padding: 14px 28px; text-decoration: none; border-radius: 8px; text-align: center; }
    
    /* Footer */
    .footer-wrap { background-color: #f9fafb; padding: 24px 32px; text-align: center; border-top: 1px solid #e5e7eb; }
    .footer-text { font-size: 13px; color: #6b7280; line-height: 1.5; margin: 0; }
    .footer-link { color: #10b981; text-decoration: none; }
  </style>
`;

function renderPremiumEmail({
  eyebrow,
  title,
  intro,
  highlight,
  body,
  cards = [],
  ctaLabel,
  ctaUrl,
  footerNote = 'SkillBridge &bull; Building real skills through real work',
}) {
  const rowHtml = cards.length > 0
    ? \`
      <table class="card-row" width="100%" cellpadding="0" cellspacing="0" style="width:100%; border-collapse:collapse; margin-top:24px; margin-bottom:8px;">
        <tr>
          \${cards.slice(0, 2).map((card) => \`<td width="48%" class="card" style="width:48%; background:#f9fafb; padding:16px; border:1px solid #e5e7eb; border-radius:8px; vertical-align:top;"><p class="card-label" style="margin:0 0 4px 0; font-size:12px; color:#6b7280; font-weight:500; text-transform:uppercase; letter-spacing:0.05em;">\${escapeHtml(card.label)}</p><p class="card-value" style="margin:0; font-size:15px; color:#111827; font-weight:600; line-height:1.4;">\${card.value}</p></td>\`).join('<td style="width:4%;"></td>')}
        </tr>
      </table>
      \${cards.length > 2 ? \`
      <table class="card-row" width="100%" cellpadding="0" cellspacing="0" style="width:100%; border-collapse:collapse; margin-bottom:8px;">
        <tr>
          \${cards.slice(2, 4).map((card) => \`<td width="48%" class="card" style="width:48%; background:#f9fafb; padding:16px; border:1px solid #e5e7eb; border-radius:8px; vertical-align:top;"><p class="card-label" style="margin:0 0 4px 0; font-size:12px; color:#6b7280; font-weight:500; text-transform:uppercase; letter-spacing:0.05em;">\${escapeHtml(card.label)}</p><p class="card-value" style="margin:0; font-size:15px; color:#111827; font-weight:600; line-height:1.4;">\${card.value}</p></td>\`).join('<td style="width:4%;"></td>')}
        </tr>
      </table>\` : ''}
      \${cards.length > 4 ? \`
      <table class="card-row" width="100%" cellpadding="0" cellspacing="0" style="width:100%; border-collapse:collapse; margin-bottom:8px;">
        <tr>
          <td class="card" style="background:#f9fafb; padding:16px; border:1px solid #e5e7eb; border-radius:8px; vertical-align:top;"><p class="card-label" style="margin:0 0 4px 0; font-size:12px; color:#6b7280; font-weight:500; text-transform:uppercase; letter-spacing:0.05em;">\${escapeHtml(cards[4].label)}</p><p class="card-value" style="margin:0; font-size:15px; color:#111827; font-weight:600; line-height:1.4;">\${cards[4].value}</p></td>
        </tr>
      </table>\` : ''}
    \`
    : '';

  return \`
    \${BRAND_THEME}
    <body style="margin:0; padding:0; background-color:#f3f4f6; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
      <table class="email-shell" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f3f4f6; padding:40px 20px;">
        <tr>
          <td align="center">
            <table class="email-table" width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff; border-radius:12px; border:1px solid #e5e7eb; overflow:hidden; text-align:left; max-width:600px; width:100%;">
              
              <!-- Header -->
              <tr>
                <td class="padding" style="padding:32px 32px 24px 32px;">
                  <div class="brand-wrap" style="text-align:left; border-bottom:none; padding-bottom:0px; margin-bottom:0;">
                    <span class="brand" style="font-size:22px; font-weight:800; color:#111827; letter-spacing:-0.02em;">SkillBridge<span class="brand-accent" style="color:#10b981;">.</span></span>
                  </div>
                </td>
              </tr>
              
              <!-- Hero Content -->
              <tr>
                <td class="padding" style="padding:0 32px 32px 32px;">
                  <p class="eyebrow" style="margin:0 0 12px 0; font-size:12px; font-weight:600; color:#10b981; letter-spacing:0.1em; text-transform:uppercase;">\${escapeHtml(eyebrow)}</p>
                  <h1 class="hero-title" style="margin:0 0 12px 0; font-size:28px; font-weight:700; color:#111827; line-height:1.3; letter-spacing:-0.01em;">\${title}</h1>
                  <p class="hero-copy" style="margin:0 0 24px 0; font-size:16px; color:#4b5563; line-height:1.6;">\${intro}</p>
                  
                  \${highlight ? \`
                  <div class="highlight-wrapper" style="margin-bottom:32px;">
                    <div class="highlight" style="background-color:#f0fdf4; border:1px solid #bbf7d0; border-radius:8px; padding:16px 20px;">
                      <p style="margin:0; color:#166534; font-size:15px; font-weight:500; line-height:1.5;">\${highlight}</p>
                    </div>
                  </div>
                  \` : ''}

                  <!-- Body & Cards -->
                  <div class="body-content" style="font-size:15px; color:#374151; line-height:1.6; margin-bottom:12px;">
                    \${body.map((paragraph) => \`<p style="margin:0 0 16px 0;">\${paragraph}</p>\`).join('')}
                  </div>
                  
                  \${rowHtml}
                  
                  <!-- CTA Button -->
                  \${ctaLabel && ctaUrl ? \`
                  <div class="button-wrap" style="margin-top:32px; text-align:left;">
                    <a href="\${ctaUrl}" class="button" style="display:inline-block; background-color:#10b981; color:#ffffff !important; font-size:15px; font-weight:600; padding:14px 28px; text-decoration:none; border-radius:8px; text-align:center;">\${ctaLabel}</a>
                  </div>
                  \` : ''}
                </td>
              </tr>
              
              <!-- Footer -->
              <tr>
                <td class="footer-wrap" style="background-color:#f9fafb; padding:24px 32px; text-align:center; border-top:1px solid #e5e7eb;">
                  <p class="footer-text" style="font-size:13px; color:#6b7280; line-height:1.5; margin:0;">\${footerNote}</p>
                  <p style="margin:8px 0 0 0; font-size:12px; color:#9ca3af;">Please do not reply to this email. For assistance, contact support.</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
  \`;
}

function getWelcomeEmailHtml({ name }) {
  return renderPremiumEmail({
    eyebrow: 'SKILLBRIDGE • WELCOME',
    title: 'Welcome to SkillBridge',
    intro: 'Your account is ready. Start exploring internships and learning paths.',
    highlight: 'Your account has been created successfully.',
    body: [
      `Hi <strong>${escapeHtml(name)}</strong>,`,
      'Your account has been created successfully. You can now explore internships and start your journey.',
      'Your account is ready. Log in anytime to continue your onboarding and start learning.',
    ],
    cards: [
      { label: 'Platform', value: 'SkillBridge' },
      { label: 'Status', value: 'Account ready' },
    ],
    ctaLabel: 'Open Dashboard',
    ctaUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard`,
    footerNote: 'SkillBridge • Welcome communication',
  });
}

function getEnrollmentConfirmationEmailHtml({ userName, internshipTitle, internshipDuration, supportEmail, dashboardUrl }) {
  return renderPremiumEmail({
    eyebrow: 'SKILLBRIDGE • ENROLLMENT',
    title: 'Your Enrollment is Confirmed',
    intro: 'Welcome to SkillBridge. Your internship enrollment is active.',
    highlight: 'Your dashboard is ready with program details, assignments, and next steps.',
    body: [
      `Hi <strong>${escapeHtml(userName)}</strong>, your enrollment for <strong>${escapeHtml(internshipTitle)}</strong> is now active.`,
      'Your dashboard is ready with your program details, assignments, and next steps.',
    ],
    cards: [
      { label: 'Program', value: escapeHtml(internshipTitle) },
      { label: 'Duration', value: escapeHtml(internshipDuration) },
      { label: 'Status', value: 'Active' },
    ],
    ctaLabel: 'Go to Dashboard',
    ctaUrl: dashboardUrl,
    footerNote: `Support: ${supportEmail}`,
  });
}

function getPaymentSuccessEmailHtml({ userName, internshipTitle, amount, dashboardUrl }) {
  return renderPremiumEmail({
    eyebrow: 'SKILLBRIDGE • PAYMENT',
    title: 'Payment Successful',
    intro: 'Your payment has been successfully processed.',
    highlight: 'Receipt details are included below.',
    body: [
      `Hi <strong>${escapeHtml(userName)}</strong>,`,
      'Your payment has been successfully processed!',
      'Start your internship now by visiting your dashboard.',
    ],
    cards: [
      { label: 'Program', value: escapeHtml(internshipTitle) },
      { label: 'Amount Paid', value: `₹${escapeHtml(amount)}` },
      { label: 'Date', value: new Date().toLocaleDateString() },
    ],
    ctaLabel: 'Start Learning',
    ctaUrl: dashboardUrl,
    footerNote: 'SkillBridge • Payment confirmation',
  });
}

function getCertificateDeliveryEmailHtml({ userName, internshipTitle, certificateId, certificateUrl }) {
  return renderPremiumEmail({
    eyebrow: 'SKILLBRIDGE • CERTIFICATE',
    title: 'Certificate Earned',
    intro: 'Your official certificate is ready.',
    highlight: 'Congratulations on completing your program.',
    body: [
      `Congratulations <strong>${escapeHtml(userName)}</strong>,`,
      `Your final submission for the <strong>${escapeHtml(internshipTitle)}</strong> program has been approved and your certificate is ready!`,
      'You can now view, share, or download your official verified certificate online.',
    ],
    cards: [
      { label: 'Certificate ID', value: escapeHtml(certificateId) },
      { label: 'Program', value: escapeHtml(internshipTitle) },
    ],
    ctaLabel: 'View My Certificate',
    ctaUrl: certificateUrl,
    footerNote: 'SkillBridge • Certificate delivery',
  });
}

function getSupportReplyEmailHtml({ userName, subject, replyMessage, supportUrl }) {
  return renderPremiumEmail({
    eyebrow: 'SKILLBRIDGE • SUPPORT',
    title: 'Support Reply from SkillBridge',
    intro: 'We have replied to your support request.',
    highlight: 'Your support reply is included below.',
    body: [
      `Hi <strong>${escapeHtml(userName)}</strong>,`,
      `We have replied to your support request about <strong>${escapeHtml(subject)}</strong>.`,
      replyMessage,
    ],
    cards: [
      { label: 'Ticket subject', value: escapeHtml(subject) },
      { label: 'Status', value: 'Replied' },
    ],
    ctaLabel: 'Open Support Center',
    ctaUrl: supportUrl,
    footerNote: 'SkillBridge • Support communication',
  });
}

function getPasswordResetRequestEmailHtml({ name, resetLink }) {
  return renderPremiumEmail({
    eyebrow: 'SKILLBRIDGE • SECURITY',
    title: 'Password Reset Request',
    intro: 'A password reset was requested for your account.',
    highlight: 'If you did not request this, you can ignore this email.',
    body: [
      `Hi <strong>${escapeHtml(name)}</strong>,`,
      'You requested to reset your password. Click the link below to proceed.',
      'This link expires in 1 hour.',
    ],
    cards: [
      { label: 'Action', value: 'Reset password' },
      { label: 'Window', value: '1 hour' },
    ],
    ctaLabel: 'Reset Password',
    ctaUrl: resetLink,
    footerNote: 'SkillBridge • Security notice',
  });
}

function getPasswordResetSuccessEmailHtml({ name }) {
  return renderPremiumEmail({
    eyebrow: 'SKILLBRIDGE • SECURITY',
    title: 'Password Reset Successful',
    intro: 'Your password was changed successfully.',
    highlight: 'If you did not make this change, contact support immediately.',
    body: [
      `Hi <strong>${escapeHtml(name)}</strong>,`,
      'Your password has been successfully reset.',
      'You can now log in with your new password.',
    ],
    cards: [
      { label: 'Status', value: 'Updated' },
      { label: 'Support', value: 'Available' },
    ],
    footerNote: 'SkillBridge • Security confirmation',
  });
}

function getProjectSubmissionEmailHtml({ name, internshipTitle, dashboardUrl }) {
  return renderPremiumEmail({
    eyebrow: 'SKILLBRIDGE • SUBMISSION',
    title: 'Submission Received',
    intro: 'Your final project is now awaiting review.',
    highlight: 'We usually review submissions within 24 hours.',
    body: [
      `Hi <strong>${escapeHtml(name)}</strong>,`,
      `We received your final project for <strong>${escapeHtml(internshipTitle)}</strong>.`,
      'You will be notified once approved and your certificate is generated.',
    ],
    cards: [
      { label: 'Program', value: escapeHtml(internshipTitle) },
      { label: 'Review time', value: '24 hours' },
    ],
    ctaLabel: 'Open Dashboard',
    ctaUrl: dashboardUrl,
    footerNote: 'SkillBridge • Submission acknowledgement',
  });
}

module.exports = {
  getCertificateDeliveryEmailHtml,
  getEnrollmentConfirmationEmailHtml,
  getPasswordResetRequestEmailHtml,
  getPasswordResetSuccessEmailHtml,
  getPaymentSuccessEmailHtml,
  getProjectSubmissionEmailHtml,
  getSupportReplyEmailHtml,
  getWelcomeEmailHtml,
  renderPremiumEmail,
};