import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_PORT === '465',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export const emailService = {
  async sendVerificationEmail(to: string, token: string) {
    const frontendUrl = process.env.CLIENT_URL || 'http://localhost:5173';
    const verifyUrl = `${frontendUrl}/verify-email?token=${token}`;

    if (process.env.NODE_ENV === 'development') {
      console.log('====================================');
      console.log(`[DEV MODE] Verification email for: ${to}`);
      console.log(`[DEV MODE] Verification URL: ${verifyUrl}`);
      console.log('====================================');
    }

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eaeaea; border-radius: 10px;">
        <h2 style="color: #2563eb; text-align: center;">Welcome to DevCollab!</h2>
        <p style="font-size: 16px; color: #333;">Hi there,</p>
        <p style="font-size: 16px; color: #333;">Thank you for registering. Please verify your email address to complete your signup and gain access to your workspace.</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${verifyUrl}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 16px;">Verify Email</a>
        </div>
        <p style="font-size: 14px; color: #666;">If the button above does not work, copy and paste the following link into your browser:</p>
        <p style="font-size: 14px; color: #2563eb; word-break: break-all;">
          <a href="${verifyUrl}">${verifyUrl}</a>
        </p>
        <hr style="border: none; border-top: 1px solid #eaeaea; margin: 20px 0;" />
        <p style="font-size: 12px; color: #999; text-align: center;">This link will expire in 24 hours.</p>
        <p style="font-size: 12px; color: #999; text-align: center;">If you didn't request this email, you can safely ignore it.</p>
      </div>
    `;

    // Only attempt to send if SMTP user is defined (or we can always attempt, and handle errors)
    if (process.env.SMTP_USER) {
      try {
        await transporter.sendMail({
          from: `"DevCollab" <${process.env.SMTP_USER}>`,
          to,
          subject: 'Verify your DevCollab account',
          html: htmlContent,
        });
      } catch (error) {
        console.error('Failed to send verification email:', error);
        // We do not throw in development mode to allow local testing
        if (process.env.NODE_ENV !== 'development') {
          throw new Error('Failed to send verification email');
        }
      }
    } else if (process.env.NODE_ENV !== 'development') {
      console.warn('SMTP_USER not configured. Email not sent.');
    }
  }
};
