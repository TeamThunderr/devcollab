if (!process.env.BREVO_API_KEY) {
  console.warn('⚠️ BREVO_API_KEY must be set for email delivery to work.');
}

const BREVO_API_URL = 'https://api.brevo.com/v3/smtp/email';

export const sendTestEmail = async (to: string) => {
  try {
    const response = await fetch(BREVO_API_URL, {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': process.env.BREVO_API_KEY || '',
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        sender: {
          name: "DevCollab",
          email: process.env.BREVO_SENDER_EMAIL || "smithc.cse2024@citchennai.net"
        },
        to: [{ email: to }],
        subject: 'DevCollab Email Test',
        htmlContent: '<h1>DevCollab email system working with Brevo!</h1>'
      })
    });

    const data: any = await response.json();
    if (!response.ok) throw new Error(JSON.stringify(data));

    console.log('Test email sent:', data.messageId);
    return data;
  } catch (error) {
    console.error('Error sending test email:', error);
    throw error;
  }
};

export interface SendInviteEmailOptions {
  to: string;
  inviterName: string;
  inviterEmail: string;
  workspaceName: string;
  role: string;
  token: string;
}

export const sendInviteEmail = async (options: SendInviteEmailOptions) => {
  const { to, inviterName, inviterEmail, workspaceName, role, token } = options;
  const frontendUrl = (process.env.FRONTEND_URL || 'https://devcollab-gamma.vercel.app').replace(/\/+$/, '');
  const inviteLink = `${frontendUrl}/invite/${token}`;

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px;">
      <h2 style="color: #111827; text-align: center;">You've been invited to DevCollab!</h2>
      <p style="color: #374151; font-size: 16px; line-height: 1.5; text-align: center;">
        <strong>${inviterName}</strong> (<a href="mailto:${inviterEmail}" style="color: #2563eb;">${inviterEmail}</a>) has invited you to join the <br/>
        <strong style="font-size: 18px;">${workspaceName}</strong> workspace as a <strong>${role}</strong>.
      </p>
      <div style="margin: 32px 0; text-align: center;">
        <a href="${inviteLink}" style="background-color: #2563eb; color: #ffffff; padding: 12px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; display: inline-block;">
          Accept Invitation
        </a>
      </div>
      <p style="color: #6b7280; font-size: 14px; text-align: center; margin-top: 24px;">
        If you don't have a DevCollab account, you will be able to create one securely.
      </p>
      <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 32px 0;" />
      <p style="color: #9ca3af; font-size: 12px; text-align: center;">
        Sent securely by the DevCollab platform via Brevo.<br/>
        Please do not reply to this automated email.
      </p>
    </div>
  `;

  try {
    const response = await fetch(BREVO_API_URL, {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': process.env.BREVO_API_KEY || '',
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        sender: {
          name: "DevCollab",
          email: process.env.BREVO_SENDER_EMAIL || "smithc.cse2024@citchennai.net"
        },
        to: [{ email: to }],
        subject: `Invitation to join ${workspaceName} on DevCollab`,
        htmlContent: html
      })
    });

    const data: any = await response.json();
    
    if (!response.ok) {
      throw new Error(`Brevo API Error: ${JSON.stringify(data)}`);
    }

    console.log('Invite email sent to %s (Brevo ID: %s)', to, data.messageId);
    return data;
  } catch (error) {
    console.error('Error sending invite email:', error);
    throw error;
  }
};
