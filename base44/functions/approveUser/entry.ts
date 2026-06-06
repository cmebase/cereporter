import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const currentUser = await base44.auth.me();

    if (!currentUser) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    if (currentUser.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const payload = await req.json();
    const { userId, role, hospitalIds, years, managerId, notes } = payload;

    console.log('Approving user:', { userId, role, hospitalIds, years });

    // Validate inputs
    if (!role) {
      return Response.json({ error: 'Role is required' }, { status: 400 });
    }
    if (role !== 'super_admin' && (!hospitalIds || hospitalIds.length === 0)) {
      return Response.json({ error: 'At least one hospital is required' }, { status: 400 });
    }
    if (role === 'coordinator' && !managerId) {
      return Response.json({ error: 'Manager is required for coordinators' }, { status: 400 });
    }

    // Get user data
    const users = await base44.asServiceRole.entities.User.list();
    const user = users.find(u => u.id === userId);
    
    if (!user) {
      return Response.json({ error: 'User not found' }, { status: 404 });
    }

    // Update user status
    await base44.asServiceRole.entities.User.update(userId, {
      status: 'ACTIVE',
      approved_by: currentUser.email,
      approved_at: new Date().toISOString(),
      approval_notes: notes || '',
    });

    console.log('User status updated to ACTIVE');

    // Create assignments
    const hospitals = await base44.asServiceRole.entities.Hospital.list();
    
    for (const hospitalId of hospitalIds || []) {
      const hospital = hospitals.find(h => h.id === hospitalId);
      await base44.asServiceRole.entities.Assignment.create({
        user_email: user.email,
        hospital_id: hospitalId,
        hospital_name: hospital?.name || '',
        years: (years && years.length > 0) ? years : null,
        role: role,
        is_active: true,
      });
      console.log(`Assignment created for ${hospital?.name}`);
    }

    // Set manager for coordinator
    if (role === 'coordinator' && managerId) {
      await base44.asServiceRole.entities.User.update(userId, {
        manager_id: managerId,
      });
      console.log('Manager assigned to coordinator');
    }

    // Log audit trail
    await base44.asServiceRole.entities.AuditLog.create({
      user_email: currentUser.email,
      action: 'update',
      entity_type: 'User',
      entity_id: userId,
      entity_name: user.email,
      field_changed: 'status',
      before_value: 'PENDING',
      after_value: 'ACTIVE',
    });

    console.log('✅ User approval complete');

    return Response.json({ 
      success: true, 
      message: `User ${user.email} approved as ${role}` 
    });

  } catch (error) {
    console.error('❌ Approval failed:', error);
    return Response.json({ 
      error: error.message || 'Failed to approve user' 
    }, { status: 500 });
  }
});