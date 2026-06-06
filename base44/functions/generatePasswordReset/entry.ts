import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json(
        { error: 'Unauthorized: Admin access required' },
        { status: 403 }
      );
    }

    const { email } = await req.json();

    if (!email) {
      return Response.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // Use Base44's built-in password reset token generation
    const appUrl = Deno.env.get('BASE44_APP_URL');
    if (!appUrl) {
      return Response.json(
        { error: 'APP_URL not configured' },
        { status: 500 }
      );
    }

    // Generate password reset token using Base44 auth
    const resetLink = await base44.asServiceRole.auth.generatePasswordResetLink(email, appUrl);

    // Send reset link email with HTML body
    await base44.integrations.Core.SendEmail({
      to: email,
      subject: 'Password Reset Link',
      body: `<p>Click the link below to reset your password:</p><p><a href="${resetLink}" style="color: #4F46E5; text-decoration: none; font-weight: bold;">Reset Password</a></p><p style="color: #666; font-size: 14px;">This link expires in 1 hour.</p>`,
      from_name: 'CE Reporter System'
    });

    return Response.json({
      success: true,
      email,
      resetLink,
      message: 'Password reset link sent to email'
    });
  } catch (error) {
    console.error('Error generating password reset:', error);
    return Response.json(
      { error: error.message },
      { status: 500 }
    );
  }
});