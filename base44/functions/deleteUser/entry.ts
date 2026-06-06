import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const admin = await base44.auth.me();

    if (!admin || admin.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { email } = await req.json();

    if (!email) {
      return Response.json({ error: 'Email is required' }, { status: 400 });
    }

    // Find user by email
    const allUsers = await base44.asServiceRole.entities.User.list();
    const userToDelete = allUsers.find(u => u.email === email);

    if (!userToDelete) {
      return Response.json({ error: 'User not found' }, { status: 404 });
    }

    // Delete the user
    await base44.asServiceRole.entities.User.delete(userToDelete.id);

    // Delete all assignments for this user
    const allAssignments = await base44.asServiceRole.entities.Assignment.list();
    const userAssignments = allAssignments.filter(a => a.user_email === email);
    
    for (const assignment of userAssignments) {
      await base44.asServiceRole.entities.Assignment.delete(assignment.id);
    }

    return Response.json({ success: true, message: `User ${email} deleted successfully` });
  } catch (error) {
    console.error('Error deleting user:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});