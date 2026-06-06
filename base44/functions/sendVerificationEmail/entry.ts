import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Generate a simple verification token (in production, use a secure token)
    const verificationToken = crypto.randomUUID();
    const verificationLink = `${Deno.env.get('BASE44_APP_URL')}/verify-email?token=${verificationToken}&email=${encodeURIComponent(user.email)}`;

    // Send verification email
    await base44.integrations.Core.SendEmail({
      to: user.email,
      subject: 'Verify Your Email - CE Reporter',
      body: `
        <p>Hi ${user.full_name || user.email},</p>
        <p>Welcome to CE Reporter! Please verify your email to activate your account.</p>
        <p><a href="${verificationLink}" style="background-color: #4F46E5; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">Verify Email</a></p>
        <p>If you didn't create this account, you can safely ignore this email.</p>
        <p>This link expires in 24 hours.</p>
      `
    });

    // Store the token temporarily (in a real app, you'd save this to a table)
    console.log(`Verification email sent to ${user.email}`);

    return Response.json({ success: true, message: 'Verification email sent' });
  } catch (error) {
    console.error('Error sending verification email:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});