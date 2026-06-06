import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { PDFDocument } from 'npm:pdf-lib@1.17.1';
import crypto from 'node:crypto';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { activity_id, participant_id, template_id, activity_config, activity, participant, attendance } = await req.json();

    if (!activity_id || !participant_id || !template_id) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Fetch template
    const templates = await base44.entities.CertificateTemplate.list();
    const template = templates.find(t => t.id === template_id);
    if (!template) {
      return Response.json({ error: 'Template not found' }, { status: 404 });
    }

    // Determine credential type
    const normalizedCred = normalizeCredential(participant.title || '');
    const isPhysician = ['MD', 'DO', 'MBBS'].includes(normalizedCred);

    // Build payload
    const payload = buildPayload({
      participant,
      activity,
      activity_config,
      attendance,
      normalizedCred,
      isPhysician,
      hospital: activity.hospital_name || ''
    });

    // Validate required fields
    const missingFields = validatePayload(payload, template.layout_json);
    if (missingFields.length > 0) {
      return Response.json({ 
        error: 'Missing required fields in certificate', 
        missing: missingFields 
      }, { status: 400 });
    }

    // Generate PDF with background overlay
    const pdfBytes = await renderCertificatePDF(template, payload);
    
    // Calculate hash
    const hash = crypto.createHash('sha256')
      .update(JSON.stringify(payload) + template.id + template.version)
      .digest('hex');

    // Store CertificateIssue record
    const issue = await base44.entities.CertificateIssue.create({
      activity_id,
      participant_id,
      hospital_id: template.hospital_id,
      template_id,
      template_version: template.version,
      template_type: isPhysician ? 'physician' : 'other',
      issued_at: new Date().toISOString(),
      issued_by_user_id: user.id,
      payload_snapshot_json: payload,
      pdf_file_id: '',
      hash,
      status: 'issued'
    });

    return Response.json({
      success: true,
      pdfBytes: Array.from(pdfBytes),
      certificateIssueId: issue.id,
      payload
    });
  } catch (error) {
    console.error('Certificate generation error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

function normalizeCredential(cred) {
  if (!cred) return '';
  const normalized = cred.trim().toUpperCase().replace(/[.\s]/g, '');
  
  const mappings = {
    'MD': 'MD',
    'DO': 'DO',
    'MBBS': 'MBBS',
    'MBChB': 'MBBS',
    'BMBS': 'MBBS',
    'MBBCH': 'MBBS'
  };
  
  return mappings[normalized] || normalized;
}

function buildPayload({ participant, activity, activity_config, attendance, normalizedCred, isPhysician, hospital }) {
  const issueDate = activity_config?.issue_date_rule === 'completion_date' 
    ? activity_config?.manual_issue_date || new Date().toISOString().split('T')[0]
    : activity_config?.issue_date_rule === 'manual'
    ? activity_config?.manual_issue_date || new Date().toISOString().split('T')[0]
    : activity?.begin_date || new Date().toISOString().split('T')[0];

  return {
    participant_name: `${participant.first_name || ''} ${participant.last_name || ''}`.trim(),
    participant_credential: normalizedCred,
    activity_title: activity?.title || '',
    activity_date: formatDate(activity?.begin_date),
    hours_attended: attendance?.attended_units || activity?.credit_hours || 0,
    credit_amount: activity?.credit_hours || 0,
    credit_type: activity?.credit_type || '',
    course_director_name: activity?.speaker_names || '',
    accreditation_statement: activity_config?.accreditation_statement || '',
    credit_designation_statement: isPhysician ? (activity_config?.credit_designation_statement || '') : '',
    client_name: activity_config?.client_name || '',
    hospital_name: hospital,
    issue_date: formatDate(issueDate)
  };
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  } catch {
    return dateStr;
  }
}

function validatePayload(payload, layoutJson) {
  const missing = [];
  const requiredKeys = ['participant_name', 'activity_title', 'activity_date', 'accreditation_statement'];
  
  requiredKeys.forEach(key => {
    if (!payload[key] || payload[key].toString().trim() === '') {
      missing.push(key);
    }
  });
  
  return missing;
}

async function renderCertificatePDF(template, payload) {
  let pdfDoc;

  // Load background PDF if available, otherwise create blank
  if (template.background_pdf_file_id) {
    try {
      const response = await fetch(template.background_pdf_file_id);
      const bgPdfBytes = await response.arrayBuffer();
      pdfDoc = await PDFDocument.load(bgPdfBytes);
    } catch (e) {
      console.warn('Background PDF not found, creating blank', e);
      pdfDoc = await PDFDocument.create();
      pdfDoc.addPage([612, 792]); // Letter size
    }
  } else {
    pdfDoc = await PDFDocument.create();
    pdfDoc.addPage([612, 792]); // Letter size
  }

  const page = pdfDoc.getPage(0);
  const { width, height } = page.getSize();
  const layout = template.layout_json || {};

  // Map of template property names to payload keys
  const textMapping = [
    { key: 'clientName', text: layout.clientName || payload.client_name || '' },
    { key: 'certifiesThat', text: 'Certifies that:' },
    { key: 'participantName', text: `${payload.participant_name}` },
    { key: 'participation', text: `has participated in the activity titled` },
    { key: 'activityTitle', text: payload.activity_title || '' },
    { key: 'onText', text: 'on' },
    { key: 'completionDate', text: payload.issue_date || payload.activity_date || '' },
    { key: 'attendedHours', text: `attended ${payload.hours_attended || 0} ${(payload.hours_attended || 0) === 1 ? 'hour' : 'hours'} of this accredited activity.` },
    { key: 'courseDirector', text: '___________________________________\nCourse Director' },
    { key: 'creditDesignation', text: `(This activity was designated for ${payload.credit_amount || ''} ${payload.credit_type || ''} Credits™)` },
    { key: 'accreditationStatement', text: payload.accreditation_statement || '' }
  ];

  textMapping.forEach(({ key, text }) => {
    if (!text || text.trim() === '') return;

    const fontSize = layout[`${key}FontSize`] || 12;
    const colorHex = layout[`${key}Color`] || '#000000';
    const color = parseColor(colorHex);
    
    // Calculate Y position from percentage (convert from top)
    const topPercent = layout[`${key}TopOffset`] || layout[`${key}topOffset`] || 50;
    const yFromTop = (topPercent / 100) * height;
    const yPos = height - yFromTop;

    const xPercent = layout[`${key}LeftOffset`] || layout[`${key}leftOffset`] || 50;
    const xPos = (xPercent / 100) * width;

    page.drawText(text, {
      x: xPos,
      y: yPos,
      size: fontSize,
      color: color
    });
  });

  const pdfBytes = await pdfDoc.save();
  return new Uint8Array(pdfBytes);
}

function parseColor(hexColor) {
  const hex = hexColor.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16) / 255;
  const g = parseInt(hex.substring(2, 4), 16) / 255;
  const b = parseInt(hex.substring(4, 6), 16) / 255;
  return { r, g, b };
}