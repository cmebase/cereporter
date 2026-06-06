import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user record exists
    const allUsers = await base44.asServiceRole.entities.User.list();
    const existingUser = allUsers.find(u => u.email === user.email);

    if (!existingUser) {
      // Create new user record with PENDING_APPROVAL
      await base44.asServiceRole.entities.User.create({
        full_name: user.full_name || user.email,
        email: user.email,
        role: user.role || 'user',
        status: 'PENDING_APPROVAL'
      });
      return Response.json({ success: true, message: 'User created and set to pending approval' });
    } else if (!existingUser.status) {
      // Existing user without status - set to PENDING_APPROVAL
      await base44.asServiceRole.entities.User.update(existingUser.id, {
        status: 'PENDING_APPROVAL'
      });
      return Response.json({ success: true, message: 'User set to pending approval' });
    }

    return Response.json({ success: true, message: 'User already has status' });
  } catch (error) {
    console.error('Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});