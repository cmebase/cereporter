import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { hospital_id } = await req.json();

    if (!hospital_id) {
      return Response.json({ error: 'Missing hospital_id' }, { status: 400 });
    }

    // Get all templates for this hospital
    const templates = await base44.asServiceRole.entities.CertificateTemplate.list();
    const hospitalTemplates = templates.filter(t => t.hospital_id === hospital_id && t.status === 'active');

    const newBackgroundUrl = 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6967f27ce8cf4aad99353f66/b1dd82356__CertificatePhysician.jpg';

    // Update all templates
    const updated = [];
    for (const template of hospitalTemplates) {
      await base44.asServiceRole.entities.CertificateTemplate.update(template.id, {
        background_image_url: newBackgroundUrl
      });
      updated.push(template.id);
    }

    return Response.json({
      success: true,
      templatesUpdated: updated.length,
      templateIds: updated
    });
  } catch (error) {
    console.error('Update template backgrounds error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});