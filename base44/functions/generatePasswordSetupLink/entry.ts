import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    if (user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { email } = await req.json();

    if (!email) {
      return Response.json({ error: 'Email is required' }, { status: 400 });
    }

    // Generate invitation which returns activation URL
    const inviteResult = await base44.asServiceRole.users.inviteUser(email, 'user');
    
    if (!inviteResult || !inviteResult.activationUrl) {
      return Response.json({ error: 'Failed to generate activation URL' }, { status: 500 });
    }

    return Response.json({ 
      setupLink: inviteResult.activationUrl,
      email 
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});