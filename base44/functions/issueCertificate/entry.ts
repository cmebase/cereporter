import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { activity_id, participant_id, hospital_id } = await req.json();

    if (!activity_id || !participant_id || !hospital_id) {
      return Response.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    // Fetch activity, participant, and config
    const activities = await base44.entities.CEClass.list();
    const activity = activities.find(a => a.id === activity_id);

    const participants = await base44.entities.Participant.list();
    const participant = participants.find(p => p.id === participant_id);

    const configs = await base44.entities.ActivityCertificateConfig.list();
    const config = configs.find(c => c.activity_id === activity_id);

    if (!activity || !participant || !config) {
      return Response.json({ error: 'Activity, participant, or config not found' }, { status: 404 });
    }

    // Determine certificate type based on participant title/credential
    const isPhysician = ['MD', 'DO', 'MBBS'].includes(participant.title);
    const template_id = isPhysician ? config.physician_template_id : config.other_template_id;

    if (!template_id) {
      return Response.json({ error: 'No template configured for this certificate type' }, { status: 400 });
    }

    // Fetch template
    const templates = await base44.entities.CertificateTemplate.list();
    const template = templates.find(t => t.id === template_id);

    if (!template) {
      return Response.json({ error: 'Template not found' }, { status: 404 });
    }

    // Create payload snapshot
    const payload_snapshot_json = {
      participant_name: `${participant.first_name} ${participant.last_name}`,
      activity_title: activity.title,
      activity_date: activity.begin_date,
      credit_amount: activity.credit_hours || 0,
      accreditation_statement: config.accreditation_statement,
      credit_designation_statement: isPhysician ? config.credit_designation_statement : '',
      client_name: config.client_name,
      template_type: isPhysician ? 'physician' : 'other'
    };

    // Generate simple hash for integrity
    const hashString = `${template_id}${template.version}${JSON.stringify(payload_snapshot_json)}`;
    const encoder = new TextEncoder();
    const data = encoder.encode(hashString);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    // For now, create a placeholder PDF file ID - in production this would be a real PDF
    const pdf_file_id = `cert_${activity_id}_${participant_id}_${Date.now()}`;

    // Create CertificateIssue record
    const issue = await base44.entities.CertificateIssue.create({
      activity_id,
      participant_id,
      hospital_id,
      template_id,
      template_version: template.version,
      template_type: isPhysician ? 'physician' : 'other',
      issued_at: new Date().toISOString(),
      issued_by_user_id: user.id,
      payload_snapshot_json,
      pdf_file_id,
      hash,
      status: 'issued'
    });

    return Response.json({ success: true, issue });
  } catch (error) {
    console.error('Issue certificate error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});