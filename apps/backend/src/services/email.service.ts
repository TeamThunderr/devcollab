export const emailService = {
  async sendVerificationEmail(to: string, token: string) {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
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

        <hr style="border: none; border-top: 1px solid #eaeaea; margin: 20px 0;" />
        <p style="font-size: 12px; color: #999; text-align: center;">This link will expire in 24 hours.</p>
        <p style="font-size: 12px; color: #999; text-align: center;">If you didn't request this email, you can safely ignore it.</p>
      </div>
    `;

    if (process.env.BREVO_API_KEY) {
      try {
        const response = await fetch('https://api.brevo.com/v3/smtp/email', {
          method: 'POST',
          headers: {
            'accept': 'application/json',
            'api-key': process.env.BREVO_API_KEY,
            'content-type': 'application/json'
          },
          body: JSON.stringify({
            sender: {
              name: "DevCollab",
              email: process.env.BREVO_SENDER_EMAIL || "smithc.cse2024@citchennai.net"
            },
            to: [{ email: to }],
            subject: 'Verify your DevCollab account',
            htmlContent: htmlContent
          })
        });

        const data: any = await response.json();
        
        if (!response.ok) {
          throw new Error(`Brevo API Error: ${JSON.stringify(data)}`);
        }
        
        console.log('✅ Brevo email accepted:', data);
      } catch (error) {
        console.error('Failed to send verification email:', error);
        if (process.env.NODE_ENV !== 'development') {
          throw new Error('Failed to send verification email');
        }
      }
    } else if (process.env.NODE_ENV !== 'development') {
      console.warn('BREVO_API_KEY not configured. Email not sent.');
    }
  }
};
