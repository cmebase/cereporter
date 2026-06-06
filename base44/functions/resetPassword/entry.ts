import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const { token, newPassword } = await req.json();

    if (!token || !newPassword) {
      return Response.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    if (newPassword.length < 8) {
      return Response.json(
        { error: 'Password must be at least 8 characters' },
        { status: 400 }
      );
    }

    // Use Base44's built-in password reset validation
    try {
      await base44.asServiceRole.auth.resetPasswordWithToken(token, newPassword);

      return Response.json({
        success: true,
        message: 'Password has been reset successfully'
      });
    } catch (authError) {
      console.error('Auth reset error:', authError.message);
      
      return Response.json(
        { error: 'Failed to reset password. Token may have expired or is invalid.' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Password reset error:', error);
    return Response.json(
      { error: error.message || 'An error occurred while resetting password' },
      { status: 500 }
    );
  }
});