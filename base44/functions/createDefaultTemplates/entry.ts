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

    // Check if defaults already exist
    const existing = await base44.entities.CertificateTemplate.list();
    const hasPhysician = existing.some(t => t.hospital_id === hospital_id && t.template_type === 'physician' && t.status === 'active');
    const hasOther = existing.some(t => t.hospital_id === hospital_id && t.template_type === 'other' && t.status === 'active');

    const created = [];

    // Create physician template
    if (!hasPhysician) {
      const physicianTemplate = await base44.entities.CertificateTemplate.create({
        hospital_id,
        name: 'Default Physician Certificate',
        template_type: 'physician',
        status: 'active',
        is_default: true,
        version: 1,
        background_image_url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6967f27ce8cf4aad99353f66/b1dd82356__CertificatePhysician.jpg',
        layout_json: {
          elements: [
            {
              type: 'text',
              payloadKey: 'participant_name',
              x: 200,
              y: 300,
              fontSize: 24,
              color: '#000000',
              defaultValue: 'Participant Name'
            },
            {
              type: 'text',
              payloadKey: 'activity_title',
              x: 200,
              y: 400,
              fontSize: 14,
              color: '#000000',
              defaultValue: 'Activity Title'
            },
            {
              type: 'text',
              payloadKey: 'activity_date',
              x: 200,
              y: 450,
              fontSize: 12,
              color: '#000000',
              defaultValue: 'Date'
            },
            {
              type: 'text',
              payloadKey: 'credit_amount',
              x: 200,
              y: 500,
              fontSize: 12,
              color: '#000000',
              defaultValue: '0'
            },
            {
              type: 'text',
              payloadKey: 'accreditation_statement',
              x: 100,
              y: 600,
              fontSize: 10,
              color: '#000000',
              maxWidth: 400,
              defaultValue: ''
            },
            {
              type: 'text',
              payloadKey: 'credit_designation_statement',
              x: 100,
              y: 700,
              fontSize: 10,
              color: '#000000',
              maxWidth: 400,
              defaultValue: ''
            }
          ]
        },
        fonts_json: {
          default: 'Helvetica',
          available: ['Helvetica', 'Times', 'Courier']
        }
      });
      created.push(physicianTemplate);
    }

    // Create other professional template
    if (!hasOther) {
      const otherTemplate = await base44.entities.CertificateTemplate.create({
        hospital_id,
        name: 'Default Professional Certificate',
        template_type: 'other',
        status: 'active',
        is_default: true,
        version: 1,
        background_image_url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6967f27ce8cf4aad99353f66/b1dd82356__CertificatePhysician.jpg',
        layout_json: {
          elements: [
            {
              type: 'text',
              payloadKey: 'participant_name',
              x: 200,
              y: 300,
              fontSize: 24,
              color: '#000000',
              defaultValue: 'Participant Name'
            },
            {
              type: 'text',
              payloadKey: 'activity_title',
              x: 200,
              y: 400,
              fontSize: 14,
              color: '#000000',
              defaultValue: 'Activity Title'
            },
            {
              type: 'text',
              payloadKey: 'activity_date',
              x: 200,
              y: 450,
              fontSize: 12,
              color: '#000000',
              defaultValue: 'Date'
            },
            {
              type: 'text',
              payloadKey: 'credit_amount',
              x: 200,
              y: 500,
              fontSize: 12,
              color: '#000000',
              defaultValue: '0'
            },
            {
              type: 'text',
              payloadKey: 'accreditation_statement',
              x: 100,
              y: 600,
              fontSize: 10,
              color: '#000000',
              maxWidth: 400,
              defaultValue: ''
            }
          ]
        },
        fonts_json: {
          default: 'Helvetica',
          available: ['Helvetica', 'Times', 'Courier']
        }
      });
      created.push(otherTemplate);
    }

    return Response.json({
      success: true,
      templatesCreated: created.length,
      templates: created
    });
  } catch (error) {
    console.error('Create default templates error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});