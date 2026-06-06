import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Download, Eye, RotateCcw, Loader, Edit3, Printer } from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const abbreviateCredential = (credential) => {
  if (!credential) return '';
  const upperCred = credential.toUpperCase().trim();
  const abbreviations = {
    'MEDICAL DOCTOR': 'MD',
    'DOCTOR OF MEDICINE': 'MD',
    'DOCTOR OF OSTEOPATHIC MEDICINE': 'DO',
    'DOCTOR OF OSTEOPATHY': 'DO',
    'BACHELOR OF MEDICINE, BACHELOR OF SURGERY': 'MBBS',
    'REGISTERED NURSE': 'RN',
    'LICENSED PRACTICAL NURSE': 'LPN',
    'NURSE PRACTITIONER': 'NP',
    'PHYSICIAN ASSISTANT': 'PA',
    'PHYSICAL THERAPIST': 'PT',
    'OCCUPATIONAL THERAPIST': 'OT',
    'PHARMACIST': 'PharmD',
    'DOCTOR OF PHARMACY': 'PharmD'
  };
  
  return abbreviations[upperCred] || credential;
};

const replaceShortcodes = (text, attendee, activity) => {
  if (!text) return text;
  
  let result = text;
  
  // Participant shortcodes
  if (attendee?.participant) {
    result = result.replace(/{participant_name}/g, `${attendee.participant.first_name} ${attendee.participant.last_name}`);
    result = result.replace(/{participant_first_name}/g, attendee.participant.first_name);
    result = result.replace(/{participant_last_name}/g, attendee.participant.last_name);
    result = result.replace(/{participant_credential}/g, abbreviateCredential(attendee.credential) || attendee.credential);
  }
  
  // Activity shortcodes
  if (activity) {
    result = result.replace(/{activity_title}/g, activity.title || '');
    result = result.replace(/{credit_hours}/g, activity.credit_hours || '');
    result = result.replace(/{credit_type}/g, activity.credit_type || '');
    result = result.replace(/{activity_method}/g, activity.method || '');
    result = result.replace(/{activity_date}/g, format(new Date(activity.begin_date), 'MMMM d, yyyy') || '');
  }
  
  return result;
};

export default function CertificateIssuanceScreen({ activityId, hospital_id, participantId, ceRecords = [] }) {
  const queryClient = useQueryClient();
  const [selectedParticipants, setSelectedParticipants] = useState([]);
  const [generating, setGenerating] = useState(false);
  const [previewCert, setPreviewCert] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedData, setEditedData] = useState({});
  const [selectedSection, setSelectedSection] = useState(null);
  const [previewMode, setPreviewMode] = useState('physician');
  const [editParticipantId, setEditParticipantId] = useState(null);
  const [selectedActivityId, setSelectedActivityId] = useState(activityId || ceRecords[0]?.class_id);
  const [usePhoto, setUsePhoto] = useState(false);
  const [photoUrl, setPhotoUrl] = useState('');
  const [photoWidth, setPhotoWidth] = useState(150);
  const [showDebug, setShowDebug] = useState(false);

  React.useEffect(() => {
    if (activityId && activityId !== selectedActivityId) {
      setSelectedActivityId(activityId);
    }
  }, [activityId]);

  const { data: activity } = useQuery({
    queryKey: ['activity', selectedActivityId],
    queryFn: async () => {
      const classes = await base44.entities.CEClass.list();
      return classes.find(c => c.id === selectedActivityId);
    },
    enabled: !!selectedActivityId
  });

  const { data: attendance = [] } = useQuery({
    queryKey: ['attendance', selectedActivityId],
    queryFn: async () => {
      const all = await base44.entities.Attendance.list();
      return all.filter(a => a.class_id === selectedActivityId && a.status === 'attended');
    },
    enabled: !!selectedActivityId
  });

  const { data: participants = [] } = useQuery({
    queryKey: ['participants'],
    queryFn: () => base44.entities.Participant.list()
  });

  const { data: config } = useQuery({
    queryKey: ['activityCertificateConfig', selectedActivityId],
    queryFn: async () => {
      const configs = await base44.entities.ActivityCertificateConfig.list();
      return configs.find(c => c.activity_id === selectedActivityId) || null;
    },
    enabled: !!selectedActivityId
  });

  const { data: issuedCerts = [] } = useQuery({
    queryKey: ['certificateIssues', selectedActivityId],
    queryFn: async () => {
      const all = await base44.entities.CertificateIssue.list();
      return all.filter(c => c.activity_id === selectedActivityId);
    },
    enabled: !!selectedActivityId
  });

  const { data: templates = [] } = useQuery({
    queryKey: ['certificateTemplates', hospital_id],
    queryFn: async () => {
      const all = await base44.entities.CertificateTemplate.list();
      return all.filter(t => t.hospital_id === hospital_id && t.status !== 'archived');
    }
  });

  const { data: statements = [] } = useQuery({
    queryKey: ['certificateStatements'],
    queryFn: () => base44.entities.CertificateStatement.list()
  });

  const { data: hospital } = useQuery({
    queryKey: ['hospital', hospital_id],
    queryFn: async () => {
      if (!hospital_id) return null;
      const hospitals = await base44.entities.Hospital.list();
      return hospitals.find(h => h.id === hospital_id) || null;
    },
    enabled: !!hospital_id
  });

  const attendeeList = useMemo(() => {
    return attendance.map(att => {
      const participant = participants.find(p => p.id === att.participant_id);
      const issuedCert = issuedCerts.find(c => c.participant_id === att.participant_id && c.status === 'issued');
      return {
        ...att,
        participant,
        issuedCert,
        credential: participant?.title || 'Unknown',
        name: participant ? `${participant.first_name} ${participant.last_name}` : 'Unknown'
      };
    });
  }, [attendance, participants, issuedCerts]);

  React.useEffect(() => {
    if (!participantId) return;
    setSelectedParticipants([participantId]);
    setEditParticipantId(participantId);
    setIsEditing(true); // Immediately open editor when coming from participant page
  }, [participantId]);

  React.useEffect(() => {
    if (!editedData.photoUrl && hospital?.logo_url) {
      setPhotoUrl(hospital.logo_url);
      setUsePhoto(editedData.usePhoto ?? true);
    }
  }, [hospital]);

  // Initialize clientName with hospital name immediately when hospital loads
  React.useEffect(() => {
    if (hospital && !editedData.clientName) {
      setEditedData(prev => ({
        ...prev,
        clientName: prev.clientName || hospital?.profile_name || hospital?.name || ''
      }));
    }
  }, [hospital?.id, hospital?.profile_name, hospital?.name]);

  React.useEffect(() => {
    if (editParticipantId) {
      const attendee = attendeeList.find(a => a.participant_id === editParticipantId);
      if (attendee) {
        const isPhysician = ['MD', 'DO', 'MBBS'].includes(attendee.credential);
        setPreviewMode(isPhysician ? 'physician' : 'other');
      }
    }
  }, [editParticipantId, attendeeList]);

  // Load defaults from config when it changes
  React.useEffect(() => {
    if (!config || templates.length === 0 || !hospital) return;
    
    const currentAttendee = attendeeList.find(a => a.participant_id === editParticipantId);
    if (currentAttendee) {
      const isPhysician = ['MD', 'DO', 'MBBS'].includes(currentAttendee.credential);
      let templateId = isPhysician ? config.physician_template_id : config.other_template_id;
        
        // Default to first available template if none selected
        if (!templateId) {
          const availableTemplates = isPhysician ? templates.filter(t => t.template_type === 'physician') : templates.filter(t => t.template_type === 'other');
          templateId = availableTemplates[0]?.id;
        }
        
      const template = templates.find(t => t.id === templateId);

      const baseLayout = template?.layout_json || {};
      
      // Prioritize config's background URL, fallback to template, then to default
      const defaultBg = 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6967f27ce8cf4aad99353f66/20244a0e1__CertificatePhysician.jpg';
      const backgroundUrl = config?.background_image_url || template?.background_image_url || baseLayout.background_image_url || defaultBg;
      
      const layoutData = {
          ...baseLayout,
          background_image_url: backgroundUrl,
          clientName: config?.clientName || baseLayout.clientName || hospital?.profile_name || hospital?.name || '',
          usePhoto: config?.usePhoto ?? false,
          photoUrl: config?.photoUrl || '',
          photoWidth: config?.photoWidth ?? 150,
          fontSize: config?.fontSize ?? baseLayout.fontSize,
          textColor: config?.textColor ?? baseLayout.textColor,
          topOffset: config?.topOffset ?? baseLayout.topOffset,
          certifiesFontSize: config?.certifiesFontSize ?? baseLayout.certifiesFontSize,
          certifiesColor: config?.certifiesColor ?? baseLayout.certifiesColor,
          onTextColor: config?.onTextColor ?? baseLayout.onTextColor,
          onTextTopOffset: config?.onTextTopOffset ?? baseLayout.onTextTopOffset,
        certifiesTopOffset: config?.certifiesTopOffset ?? baseLayout.certifiesTopOffset,
        participationFontSize: config?.participationFontSize ?? baseLayout.participationFontSize,
        participationColor: config?.participationColor ?? baseLayout.participationColor,
        participationTopOffset: config?.participationTopOffset ?? baseLayout.participationTopOffset,
        activityTitleFontSize: config?.activityTitleFontSize ?? baseLayout.activityTitleFontSize,
        activityTitleColor: config?.activityTitleColor ?? baseLayout.activityTitleColor,
        activityTitleTopOffset: config?.activityTitleTopOffset ?? baseLayout.activityTitleTopOffset,
        participantNameFontSize: config?.participantNameFontSize ?? baseLayout.participantNameFontSize,
        participantNameColor: config?.participantNameColor ?? baseLayout.participantNameColor,
        participantNameTopOffset: config?.participantNameTopOffset ?? baseLayout.participantNameTopOffset,
        onTextFontSize: config?.onTextFontSize ?? baseLayout.onTextFontSize,
        onTextColor: config?.onTextColor ?? baseLayout.onTextColor,
        onText: config?.onText ?? baseLayout.onText ?? 'on',
        onTextTopOffset: config?.onTextTopOffset ?? baseLayout.onTextTopOffset,
        completionDateFontSize: config?.completionDateFontSize ?? baseLayout.completionDateFontSize,
        completionDateColor: config?.completionDateColor ?? baseLayout.completionDateColor,
        completionDateTopOffset: config?.completionDateTopOffset ?? baseLayout.completionDateTopOffset,
        attendedHoursFontSize: config?.attendedHoursFontSize ?? baseLayout.attendedHoursFontSize,
        attendedHoursColor: config?.attendedHoursColor ?? baseLayout.attendedHoursColor,
        attendedHoursTopOffset: config?.attendedHoursTopOffset ?? baseLayout.attendedHoursTopOffset,
        courseDirectorFontSize: config?.courseDirectorFontSize ?? baseLayout.courseDirectorFontSize,
        courseDirectorColor: config?.courseDirectorColor ?? baseLayout.courseDirectorColor,
        courseDirectorTopOffset: config?.courseDirectorTopOffset ?? baseLayout.courseDirectorTopOffset,
        creditDesignation: config?.creditDesignation ?? baseLayout.creditDesignation,
        creditDesignationFontSize: config?.creditDesignationFontSize ?? baseLayout.creditDesignationFontSize,
        creditDesignationColor: config?.creditDesignationColor ?? baseLayout.creditDesignationColor,
        creditDesignationTopOffset: config?.creditDesignationTopOffset ?? baseLayout.creditDesignationTopOffset,
        accreditationStatement: config?.accreditationStatement ?? baseLayout.accreditationStatement,
        accreditationFontSize: config?.accreditationFontSize ?? baseLayout.accreditationFontSize,
        accreditationColor: config?.accreditationColor ?? baseLayout.accreditationColor,
        accreditationWidth: config?.accreditationWidth ?? baseLayout.accreditationWidth,
        accreditationBottomOffset: config?.accreditationBottomOffset ?? baseLayout.accreditationBottomOffset
      };
      setEditedData(layoutData);
    }
  }, [config, templates, editParticipantId, attendeeList, hospital]);

  const handleSelectParticipant = (participantId) => {
    setSelectedParticipants(prev => 
      prev.includes(participantId) 
        ? prev.filter(id => id !== participantId)
        : [...prev, participantId]
    );
  };

  const downloadByFileId = async (fileId, filename) => {
    if (!fileId) throw new Error("Missing file id");
    const res = await base44.functions.invoke("getFileDownloadUrl", { file_id: fileId });
    const url = res?.url || res?.data?.url || res?.result?.url || res?.data?.result?.url || res?.data?.data?.url;
    if (!url) throw new Error("No download URL returned");

    const r = await fetch(url, { credentials: "include" });
    if (!r.ok) throw new Error("Could not fetch file");

    const blob = await r.blob();
    const blobUrl = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = blobUrl;
    a.download = filename || "certificate.pdf";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(blobUrl);
  };



  const handleGenerateCertificates = async () => {
    if (selectedParticipants.length === 0) {
      toast.error('Select at least one participant');
      return;
    }
    if (!config?.accreditation_statement) {
      toast.error('Activity certificate configuration incomplete');
      return;
    }

    setGenerating(true);
    try {
      for (const participantId of selectedParticipants) {
        const attendee = attendeeList.find(a => a.participant_id === participantId);
        
        // Issue certificate
        await base44.functions.invoke('issueCertificate', {
          activity_id: selectedActivityId,
          participant_id: participantId,
          hospital_id
        });

        // Create CE Record
        if (activity) {
          await base44.entities.CERecord.create({
            participant_id: participantId,
            participant_name: attendee.name,
            class_id: selectedActivityId,
            class_title: activity.title,
            hospital: hospital?.name || activity.hospital_name || '',
            date: activity.begin_date,
            year: activity.year,
            credit_type: activity.credit_type,
            credit_hours: activity.credit_hours,
            instructor_name: activity.speaker_names || '',
            method: activity.method,
            status: 'completed'
          });
        }

        toast.success(`Certificate issued for ${attendee.name}`);
      }
      setSelectedParticipants([]);
      
      // Force refetch of certificate data
      await queryClient.refetchQueries({ queryKey: ['certificateIssues', selectedActivityId] });
      queryClient.invalidateQueries({ queryKey: ['ceRecords'] });
      queryClient.invalidateQueries({ queryKey: ['attendance', selectedActivityId] });
    } catch (error) {
      toast.error(error.message || 'Failed to issue certificates');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <>
      <Card className="p-6">
         <div className="space-y-4 mb-6">
           <div className="flex items-center justify-between">
             <h2 className="text-xl font-semibold">Certificate Issuance</h2>
             <div className="flex gap-2">
               <Button 
                 variant="outline"
                 onClick={() => {
                   setEditParticipantId(selectedParticipants[0] || attendeeList[0]?.participant_id);
                   setIsEditing(true);
                 }}
                 className="gap-2"
                 disabled={attendeeList.length === 0}
               >
                 <Edit3 className="w-4 h-4" />
                 Edit Certificate
               </Button>
               <Button 
                 variant="outline"
                 onClick={async () => {
                   const participantsToPrint = selectedParticipants.length > 0 
                     ? selectedParticipants 
                     : [attendeeList[0]?.participant_id];

                   for (const participantId of participantsToPrint) {
                     setEditParticipantId(participantId);
                     setIsEditing(true);
                     await new Promise(resolve => setTimeout(resolve, 100));
                     window.print();
                     await new Promise(resolve => setTimeout(resolve, 500));
                   }
                   setIsEditing(false);
                 }}
                 className="gap-2"
                 disabled={attendeeList.length === 0}
               >
                 <Printer className="w-4 h-4" />
                 Print {selectedParticipants.length > 0 ? `(${selectedParticipants.length})` : 'Certificate'}
               </Button>
             </div>
           </div>

           {ceRecords.length > 0 && (
             <div>
               <Label className="text-sm font-medium text-slate-700 mb-2">Select Class for Certificate</Label>
               <Select value={selectedActivityId || ''} onValueChange={setSelectedActivityId}>
                 <SelectTrigger>
                   <SelectValue placeholder="Select a class" />
                 </SelectTrigger>
                 <SelectContent>
                   {ceRecords.map((record) => (
                     <SelectItem key={record.class_id} value={record.class_id}>
                       {record.class_title} - {record.date ? new Date(record.date).toLocaleDateString() : 'No date'}
                     </SelectItem>
                   ))}
                 </SelectContent>
               </Select>
             </div>
           )}
         </div>



        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b">
              <tr>
                <th className="p-3 text-left w-8">
                  <Checkbox 
                    checked={selectedParticipants.length === attendeeList.length && attendeeList.length > 0}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setSelectedParticipants(attendeeList.map(a => a.participant_id));
                      } else {
                        setSelectedParticipants([]);
                      }
                    }}
                  />
                </th>
                <th className="p-3 text-left">Learner</th>
                <th className="p-3 text-left">Credential</th>
                <th className="p-3 text-left">Type</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {attendeeList.map(attendee => (
                <tr key={attendee.id} className="border-b hover:bg-slate-50">
                  <td className="p-3">
                    <Checkbox 
                      checked={selectedParticipants.includes(attendee.participant_id)}
                      onCheckedChange={() => handleSelectParticipant(attendee.participant_id)}
                    />
                  </td>
                  <td className="p-3 font-medium">{attendee.name}</td>
                  <td className="p-3">{attendee.credential}</td>
                  <td className="p-3">
                    <Badge variant={attendee.credential === 'MD' || attendee.credential === 'DO' ? 'default' : 'secondary'}>
                      {['MD', 'DO', 'MBBS'].includes(attendee.credential) ? 'Physician' : 'Other'}
                    </Badge>
                  </td>
                  <td className="p-3 text-right">
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => {
                        setEditParticipantId(attendee.participant_id);
                        setIsEditing(true);
                      }}
                      className="gap-2"
                    >
                      <Edit3 className="w-3 h-3" />
                      Edit Certificate
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Editing Modal */}
          {isEditing && (() => {
            const currentAttendee = attendeeList.find(a => a.participant_id === editParticipantId);
            console.log('Current attendee:', currentAttendee?.name, 'Credential:', currentAttendee?.credential, 'Title:', currentAttendee?.participant?.title);
            return (
            <div className="fixed inset-0 bg-white z-[9999] flex flex-col">
          <style>{`
            @media print {
              @page {
                size: landscape;
                margin: 0 !important;
              }

              html, body {
                width: 100%;
                height: 100%;
                margin: 0 !important;
                padding: 0 !important;
                overflow: hidden;
              }

              body * {
                visibility: hidden;
              }

              .certificate-print-area,
              .certificate-print-area * {
                visibility: visible;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
                color-adjust: exact !important;
              }

              .certificate-print-area {
                position: fixed !important;
                left: 0 !important;
                top: 0 !important;
                width: 100vw !important;
                height: 100vh !important;
                margin: 0 !important;
                padding: 0 !important;
                background: white !important;
                display: flex !important;
                align-items: center !important;
                justify-content: center !important;
              }

              .certificate-print-area > div {
                width: 100vw !important;
                height: 100vh !important;
                max-width: none !important;
                min-width: 100vw !important;
                margin: 0 !important;
                padding: 0 !important;
                border-radius: 0 !important;
                box-shadow: none !important;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
                background-size: cover !important;
                background-position: center !important;
              }

              .no-print {
                display: none !important;
              }

              .preview-only-style {
                text-decoration: none !important;
                font-weight: normal !important;
              }
            }
          `}</style>
          <div className="border-b p-4 flex items-center justify-between no-print">
            <div className="flex items-center gap-4">
              <h2 className="text-xl font-semibold">Edit Certificate</h2>
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline"
                onClick={async () => {
                  const certificateEl = document.querySelector('.certificate-print-area > div');
                  if (!certificateEl) {
                    toast.error('Certificate not found');
                    return;
                  }

                  try {
                    // Temporarily remove preview-only styling
                    const previewStyleEl = certificateEl.querySelector('.preview-only-style');
                    const originalStyle = previewStyleEl ? previewStyleEl.getAttribute('style') : null;
                    if (previewStyleEl) {
                      previewStyleEl.style.textDecoration = 'none';
                      previewStyleEl.style.fontWeight = 'normal';
                    }

                    const canvas = await html2canvas(certificateEl, {
                      scale: 2,
                      useCORS: true,
                      backgroundColor: '#ffffff'
                    });

                    // Restore preview styling
                    if (previewStyleEl && originalStyle) {
                      previewStyleEl.setAttribute('style', originalStyle);
                    }

                    const imgData = canvas.toDataURL('image/png');
                    const pdf = new jsPDF({
                      orientation: 'landscape',
                      unit: 'px',
                      format: [canvas.width, canvas.height]
                    });

                    pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);

                    const currentAttendee = attendeeList.find(a => a.participant_id === editParticipantId) || attendeeList[0];
                    const filename = `certificate_${currentAttendee?.participant?.last_name || 'Participant'}_${currentAttendee?.participant?.first_name || ''}.pdf`;
                    pdf.save(filename);
                    toast.success('Certificate downloaded');
                  } catch (error) {
                    toast.error('Failed to generate PDF');
                  }
                }}
                className="gap-2"
              >
                <Download className="w-4 h-4" />
                Download PDF
              </Button>
              <Button 
                variant="outline"
                onClick={() => window.print()}
                className="gap-2"
              >
                <Printer className="w-4 h-4" />
                Print
              </Button>
              <Button variant="outline" onClick={() => setIsEditing(false)}>Cancel</Button>
              <Button className="bg-indigo-600" onClick={async () => {
                const clampPercent = (val) => Math.max(0, Math.min(100, parseFloat(val) || 0));
                if (!config) {
                  toast.error('Activity configuration not found');
                  return;
                }

                console.log('=== SAVE BUTTON CLICKED ===');
                console.log('editedData.onTextColor:', editedData.onTextColor);
                console.log('config.onTextColor:', config.onTextColor);

                const updatedConfig = {
                   ...config,
                   clientName: editedData.clientName ?? config.clientName,
                   usePhoto: usePhoto ?? config.usePhoto,
                   photoUrl: photoUrl ?? config.photoUrl,
                   photoWidth: photoWidth ?? config.photoWidth,
                   fontSize: parseFloat(editedData.fontSize) ?? config.fontSize,
                   textColor: editedData.textColor ?? config.textColor,
                   topOffset: clampPercent(editedData.topOffset ?? config.topOffset),
                  certifiesFontSize: parseFloat(editedData.certifiesFontSize) ?? config.certifiesFontSize,
                  certifiesColor: editedData.certifiesColor ?? config.certifiesColor,
                  certifiesTopOffset: clampPercent(editedData.certifiesTopOffset ?? config.certifiesTopOffset),
                  participationFontSize: parseFloat(editedData.participationFontSize) ?? config.participationFontSize,
                  participationColor: editedData.participationColor ?? config.participationColor,
                  participationTopOffset: clampPercent(editedData.participationTopOffset ?? config.participationTopOffset),
                  activityTitleFontSize: parseFloat(editedData.activityTitleFontSize) ?? config.activityTitleFontSize,
                  activityTitleColor: editedData.activityTitleColor ?? config.activityTitleColor,
                  activityTitleTopOffset: clampPercent(editedData.activityTitleTopOffset ?? config.activityTitleTopOffset),
                  participantNameFontSize: parseFloat(editedData.participantNameFontSize) ?? config.participantNameFontSize,
                  participantNameColor: editedData.participantNameColor ?? config.participantNameColor,
                  participantNameTopOffset: clampPercent(editedData.participantNameTopOffset ?? config.participantNameTopOffset),
                  onTextFontSize: parseFloat(editedData.onTextFontSize) ?? config.onTextFontSize,
                  onTextColor: editedData.onTextColor ?? config.onTextColor,
                  onText: editedData.onText ?? config.onText,
                  onTextTopOffset: clampPercent(editedData.onTextTopOffset ?? config.onTextTopOffset),
                  onTextFontSize: parseFloat(editedData.onTextFontSize) ?? config.onTextFontSize,
                  completionDateFontSize: parseFloat(editedData.completionDateFontSize) ?? config.completionDateFontSize,
                  completionDateColor: editedData.completionDateColor ?? config.completionDateColor,
                  completionDateTopOffset: clampPercent(editedData.completionDateTopOffset ?? config.completionDateTopOffset),
                  attendedHoursFontSize: parseFloat(editedData.attendedHoursFontSize) ?? config.attendedHoursFontSize,
                  attendedHoursColor: editedData.attendedHoursColor ?? config.attendedHoursColor,
                  attendedHoursTopOffset: clampPercent(editedData.attendedHoursTopOffset ?? config.attendedHoursTopOffset),
                  courseDirectorFontSize: parseFloat(editedData.courseDirectorFontSize) ?? config.courseDirectorFontSize,
                  courseDirectorColor: editedData.courseDirectorColor ?? config.courseDirectorColor,
                  courseDirectorTopOffset: clampPercent(editedData.courseDirectorTopOffset ?? config.courseDirectorTopOffset),
                  creditDesignation: editedData.creditDesignation ?? config.creditDesignation,
                  creditDesignationFontSize: parseFloat(editedData.creditDesignationFontSize) ?? config.creditDesignationFontSize,
                  creditDesignationColor: editedData.creditDesignationColor ?? config.creditDesignationColor,
                  creditDesignationTopOffset: clampPercent(editedData.creditDesignationTopOffset ?? config.creditDesignationTopOffset),
                  accreditationStatement: editedData.accreditationStatement ?? config.accreditationStatement,
                  accreditationFontSize: parseFloat(editedData.accreditationFontSize) ?? config.accreditationFontSize,
                  accreditationColor: editedData.accreditationColor ?? config.accreditationColor,
                  accreditationWidth: clampPercent(editedData.accreditationWidth ?? config.accreditationWidth),
                  accreditationBottomOffset: clampPercent(editedData.accreditationBottomOffset ?? config.accreditationBottomOffset)
                };

                try {
                   console.log('SAVING CONFIG with onTextColor:', updatedConfig.onTextColor);
                   await base44.entities.ActivityCertificateConfig.update(config.id, updatedConfig);
                   console.log('Save successful, now reloading...');
                   const reloadedConfigs = await base44.entities.ActivityCertificateConfig.list();
                   const reloadedConfig = reloadedConfigs.find(c => c.activity_id === selectedActivityId);
                   console.log('RELOADED onTextColor:', reloadedConfig?.onTextColor);
                   toast.success('Changes saved for this activity');
                  setIsEditing(false);
                  setSelectedSection(null);
                } catch (error) {
                  console.error('Save error:', error);
                  toast.error('Failed to save changes: ' + error.message);
                }
              }}>Save Changes</Button>
            </div>
          </div>
          
          <div className="flex-1 overflow-hidden flex gap-4 p-4">
            <div className="w-80 bg-slate-50 border rounded-lg p-4 overflow-y-auto space-y-4 no-print">
              {/* Debug Toggle */}
              <button
                onClick={() => setShowDebug(!showDebug)}
                className="text-xs text-slate-500 hover:text-slate-700 mb-2"
              >
                {showDebug ? 'Hide' : 'Show'} Debug Info
              </button>
              
              {/* Section Navigation */}
              <div className="bg-white border rounded-lg p-3 space-y-1">
                <p className="text-xs font-semibold text-slate-700 mb-2">Sections</p>
                {(() => {
                  const sections = ['Client Name', 'Certifies That', 'Participant Name', 'Participation Text', 'Activity Title', 'On Text', 'Completion Date', 'Attended Hours', 'Course Director', 'Credit Designation Statement', 'Accreditation Statement'];
                  return sections.map(section => (
                    <button
                      key={section}
                      onClick={() => setSelectedSection(section)}
                      className={`w-full text-left text-xs px-2 py-1.5 rounded transition-colors ${selectedSection === section ? 'bg-blue-600 text-white font-medium' : 'text-slate-700 hover:bg-slate-200'}`}
                    >
                      {section}
                    </button>
                  ));
                })()}
                {selectedSection && (
                  <button onClick={() => setSelectedSection(null)} className="w-full text-left text-xs px-2 py-1.5 rounded text-slate-500 hover:bg-slate-200 mt-2 border-t pt-2">
                    Clear
                  </button>
                )}
              </div>
              {(!selectedSection || selectedSection === 'Client Name') && (
              <>
              <div>
              <Label className="text-xs font-medium">Client/Organization Name or Logo</Label>
              <div className="space-y-3 mt-2">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={usePhoto}
                    onChange={(e) => setUsePhoto(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300"
                    id="use-photo"
                  />
                  <Label htmlFor="use-photo" className="text-xs font-normal cursor-pointer">Use Photo/Logo</Label>
                </div>

                {usePhoto ? (
                  <div>
                    <Label className="text-xs">Photo URL</Label>
                    <Input
                      value={photoUrl}
                      onChange={(e) => setPhotoUrl(e.target.value)}
                      placeholder="Paste image URL or upload"
                      className="mt-1 text-xs"
                    />
                    <div className="mt-2">
                      <Label className="text-xs">Photo Width (px)</Label>
                      <Input
                        type="number"
                        value={photoWidth}
                        onChange={(e) => setPhotoWidth(parseInt(e.target.value))}
                        className="mt-1"
                        min="50"
                        max="300"
                      />
                    </div>
                    {photoUrl && (
                      <div className="mt-2 p-2 bg-slate-50 rounded border">
                        <img src={photoUrl} alt="Preview" className="max-h-20" onError={() => toast.error('Invalid image URL')} />
                      </div>
                    )}
                  </div>
                ) : (
                  <div>
                    <Label className="text-xs">Organization Name</Label>
                    <Input
                      value={editedData.clientName !== undefined ? editedData.clientName : (hospital?.profile_name || hospital?.name || '')}
                      onChange={(e) => setEditedData({...editedData, clientName: e.target.value})}
                      className="mt-1"
                      placeholder={hospital?.profile_name || hospital?.name || 'Hospital or organization name'}
                    />
                  </div>
                )}
              </div>
              </div>
              <div className="border-t pt-3 mt-3">
              <Label className="text-xs font-medium block mb-3">Client Name Styling</Label>
              <div>
                <Label className="text-xs">Font Size (px)</Label>
                <Input
                  type="number"
                  value={editedData.fontSize || 18}
                  onChange={(e) => setEditedData({...editedData, fontSize: parseInt(e.target.value)})}
                  className="mt-1"
                  min="8"
                  max="48"
                />
              </div>
              <div className="mt-2">
                <Label className="text-xs">Text Color</Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    type="color"
                    value={editedData.textColor || '#06b6d4'}
                    onChange={(e) => setEditedData({...editedData, textColor: e.target.value})}
                    className="mt-0 h-9 w-16 cursor-pointer"
                  />
                  <Input
                    type="text"
                    value={editedData.textColor || '#06b6d4'}
                    onChange={(e) => setEditedData({...editedData, textColor: e.target.value})}
                    className="mt-0 text-xs flex-1"
                    placeholder="#06b6d4"
                  />
                </div>
              </div>
              <div className="mt-2">
                <Label className="text-xs">Top Position (%)</Label>
                <Input
                  type="number"
                  value={editedData.topOffset || 2}
                  onChange={(e) => setEditedData({...editedData, topOffset: parseInt(e.target.value)})}
                  className="mt-1"
                  min="0"
                  max="100"
                />
              </div>
              </div>
              </>
              )}

              {(!selectedSection || selectedSection === 'Certifies That') && (
                <div className="border-t pt-3 mt-3">
                  <Label className="text-xs font-medium block mb-3">Certifies That Text</Label>
                  <div>
                    <Label className="text-xs">Font Size (px)</Label>
                    <Input
                      type="number"
                      value={editedData.certifiesFontSize || 16}
                      onChange={(e) => setEditedData({...editedData, certifiesFontSize: parseInt(e.target.value)})}
                      className="mt-1"
                      min="8"
                      max="48"
                    />
                  </div>
                  <div className="mt-2">
                    <Label className="text-xs">Text Color</Label>
                    <div className="flex gap-2 mt-1">
                      <Input
                        type="color"
                        value={editedData.certifiesColor || '#000000'}
                        onChange={(e) => setEditedData({...editedData, certifiesColor: e.target.value})}
                        className="mt-0 h-9 w-16 cursor-pointer"
                      />
                      <Input
                        type="text"
                        value={editedData.certifiesColor || '#000000'}
                        onChange={(e) => setEditedData({...editedData, certifiesColor: e.target.value})}
                        className="mt-0 text-xs flex-1"
                        placeholder="#000000"
                      />
                    </div>
                  </div>
                  <div className="mt-2">
                    <Label className="text-xs">Top Position (%)</Label>
                    <Input
                      type="number"
                      value={editedData.certifiesTopOffset || 15}
                      onChange={(e) => setEditedData({...editedData, certifiesTopOffset: parseInt(e.target.value)})}
                      className="mt-1"
                      min="0"
                      max="100"
                    />
                  </div>
                </div>
              )}

                  {(!selectedSection || selectedSection === 'Participant Name') && (
                    <div className="border-t pt-3 mt-3">
                      <Label className="text-xs font-medium block mb-3">Participant Name</Label>
                      <div>
                        <Label className="text-xs">Font Size (px)</Label>
                        <Input
                          type="number"
                          value={editedData.participantNameFontSize || 16}
                          onChange={(e) => setEditedData({...editedData, participantNameFontSize: parseInt(e.target.value)})}
                          className="mt-1"
                          min="8"
                          max="48"
                        />
                      </div>
                      <div className="mt-2">
                        <Label className="text-xs">Text Color</Label>
                        <div className="flex gap-2 mt-1">
                          <Input
                            type="color"
                            value={editedData.participantNameColor || '#000000'}
                            onChange={(e) => setEditedData({...editedData, participantNameColor: e.target.value})}
                            className="mt-0 h-9 w-16 cursor-pointer"
                          />
                          <Input
                            type="text"
                            value={editedData.participantNameColor || '#000000'}
                            onChange={(e) => setEditedData({...editedData, participantNameColor: e.target.value})}
                            className="mt-0 text-xs flex-1"
                            placeholder="#000000"
                          />
                        </div>
                      </div>
                      <div className="mt-2">
                        <Label className="text-xs">Top Position (%)</Label>
                        <Input
                          type="number"
                          value={editedData.participantNameTopOffset || 22}
                          onChange={(e) => setEditedData({...editedData, participantNameTopOffset: parseInt(e.target.value)})}
                          className="mt-1"
                          min="0"
                          max="100"
                        />
                      </div>
                    </div>
                  )}

                  {(!selectedSection || selectedSection === 'Participation Text') && (
                    <div className="border-t pt-3 mt-3">
                      <Label className="text-xs font-medium block mb-3">Participation Text</Label>
                      <div>
                        <Label className="text-xs">Font Size (px)</Label>
                        <Input
                          type="number"
                          value={editedData.participationFontSize || 14}
                          onChange={(e) => setEditedData({...editedData, participationFontSize: parseInt(e.target.value)})}
                          className="mt-1"
                          min="8"
                          max="48"
                        />
                      </div>
                      <div className="mt-2">
                        <Label className="text-xs">Text Color</Label>
                        <div className="flex gap-2 mt-1">
                          <Input
                            type="color"
                            value={editedData.participationColor || '#000000'}
                            onChange={(e) => setEditedData({...editedData, participationColor: e.target.value})}
                            className="mt-0 h-9 w-16 cursor-pointer"
                          />
                          <Input
                            type="text"
                            value={editedData.participationColor || '#000000'}
                            onChange={(e) => setEditedData({...editedData, participationColor: e.target.value})}
                            className="mt-0 text-xs flex-1"
                            placeholder="#000000"
                          />
                        </div>
                      </div>
                      <div className="mt-2">
                        <Label className="text-xs">Top Position (%)</Label>
                        <Input
                          type="number"
                          value={editedData.participationTopOffset || 28}
                          onChange={(e) => setEditedData({...editedData, participationTopOffset: parseInt(e.target.value)})}
                          className="mt-1"
                          min="0"
                          max="100"
                        />
                      </div>
                    </div>
                  )}

                  {(!selectedSection || selectedSection === 'Activity Title') && (
                    <div className="border-t pt-3 mt-3">
                      <Label className="text-xs font-medium block mb-3">Activity Title</Label>
                      <div>
                        <Label className="text-xs">Font Size (px)</Label>
                        <Input
                          type="number"
                          value={editedData.activityTitleFontSize || 16}
                          onChange={(e) => setEditedData({...editedData, activityTitleFontSize: parseInt(e.target.value)})}
                          className="mt-1"
                          min="8"
                          max="48"
                        />
                      </div>
                      <div className="mt-2">
                        <Label className="text-xs">Text Color</Label>
                        <div className="flex gap-2 mt-1">
                          <Input
                            type="color"
                            value={editedData.activityTitleColor || '#000000'}
                            onChange={(e) => setEditedData({...editedData, activityTitleColor: e.target.value})}
                            className="mt-0 h-9 w-16 cursor-pointer"
                          />
                          <Input
                            type="text"
                            value={editedData.activityTitleColor || '#000000'}
                            onChange={(e) => setEditedData({...editedData, activityTitleColor: e.target.value})}
                            className="mt-0 text-xs flex-1"
                            placeholder="#000000"
                          />
                        </div>
                      </div>
                      <div className="mt-2">
                        <Label className="text-xs">Top Position (%)</Label>
                        <Input
                          type="number"
                          value={editedData.activityTitleTopOffset || 32}
                          onChange={(e) => setEditedData({...editedData, activityTitleTopOffset: parseInt(e.target.value)})}
                          className="mt-1"
                          min="0"
                          max="100"
                        />
                      </div>
                    </div>
                  )}

                  {(!selectedSection || selectedSection === 'Completion Date') && (
                    <div className="border-t pt-3 mt-3">
                      <Label className="text-xs font-medium block mb-3">Completion Date</Label>
                      <div className="text-xs text-slate-500 mb-3">Click the date on the certificate to select it</div>
                      <div>
                        <Label className="text-xs">Font Size (px)</Label>
                        <Input
                          type="number"
                          value={editedData.completionDateFontSize || 14}
                          onChange={(e) => setEditedData({...editedData, completionDateFontSize: parseInt(e.target.value)})}
                          className="mt-1"
                          min="8"
                          max="48"
                        />
                      </div>
                      <div className="mt-2">
                        <Label className="text-xs">Text Color</Label>
                        <div className="flex gap-2 mt-1">
                          <Input
                            type="color"
                            value={editedData.completionDateColor || '#000000'}
                            onChange={(e) => setEditedData({...editedData, completionDateColor: e.target.value})}
                            className="mt-0 h-9 w-16 cursor-pointer"
                          />
                          <Input
                            type="text"
                            value={editedData.completionDateColor || '#000000'}
                            onChange={(e) => setEditedData({...editedData, completionDateColor: e.target.value})}
                            className="mt-0 text-xs flex-1"
                            placeholder="#000000"
                          />
                        </div>
                      </div>
                      <div className="mt-2">
                        <Label className="text-xs">Top Position (%)</Label>
                        <Input
                          type="number"
                          value={editedData.completionDateTopOffset || 45}
                          onChange={(e) => setEditedData({...editedData, completionDateTopOffset: parseInt(e.target.value)})}
                          className="mt-1"
                          min="0"
                          max="100"
                        />
                      </div>
                    </div>
                  )}

                  {(!selectedSection || selectedSection === 'On Text') && (
                    <div className="border-t pt-3 mt-3">
                      <Label className="text-xs font-medium block mb-3">On Text</Label>
                      <div>
                        <Label className="text-xs">Text</Label>
                        <Input
                          value={editedData.onText || 'on'}
                          onChange={(e) => setEditedData({...editedData, onText: e.target.value})}
                          className="mt-1"
                          placeholder="on"
                        />
                      </div>
                      <div className="mt-2">
                        <Label className="text-xs">Font Size (px)</Label>
                        <Input
                          type="number"
                          value={editedData.onFontSize || 16}
                          onChange={(e) => setEditedData({...editedData, onFontSize: parseInt(e.target.value)})}
                          className="mt-1"
                          min="8"
                          max="48"
                        />
                      </div>
                      <div className="mt-2">
                        <Label className="text-xs">Text Color</Label>
                        <div className="flex gap-2 mt-1">
                          <Input
                            type="color"
                            value={editedData.onTextColor || '#000000'}
                            onChange={(e) => setEditedData({...editedData, onTextColor: e.target.value})}
                            className="mt-0 h-9 w-16 cursor-pointer"
                          />
                          <Input
                            type="text"
                            value={editedData.onTextColor || '#000000'}
                            onChange={(e) => setEditedData({...editedData, onTextColor: e.target.value})}
                            className="mt-0 text-xs flex-1"
                            placeholder="#000000"
                          />
                        </div>
                      </div>
                      <div className="mt-2">
                        <Label className="text-xs">Top Position (%)</Label>
                        <Input
                          type="number"
                          value={editedData.onTopOffset || 38}
                          onChange={(e) => setEditedData({...editedData, onTopOffset: parseInt(e.target.value)})}
                          className="mt-1"
                          min="0"
                          max="100"
                        />
                      </div>
                    </div>
                  )}

                  {(!selectedSection || selectedSection === 'Course Director') && (
                    <div className="border-t pt-3 mt-3">
                      <Label className="text-xs font-medium block mb-3">Course Director</Label>
                      <div>
                        <Label className="text-xs">Font Size (px)</Label>
                        <Input
                          type="number"
                          value={editedData.courseDirectorFontSize || 12}
                          onChange={(e) => setEditedData({...editedData, courseDirectorFontSize: parseInt(e.target.value)})}
                          className="mt-1"
                          min="8"
                          max="48"
                        />
                      </div>
                      <div className="mt-2">
                        <Label className="text-xs">Text Color</Label>
                        <div className="flex gap-2 mt-1">
                          <Input
                            type="color"
                            value={editedData.courseDirectorColor || '#000000'}
                            onChange={(e) => setEditedData({...editedData, courseDirectorColor: e.target.value})}
                            className="mt-0 h-9 w-16 cursor-pointer"
                          />
                          <Input
                            type="text"
                            value={editedData.courseDirectorColor || '#000000'}
                            onChange={(e) => setEditedData({...editedData, courseDirectorColor: e.target.value})}
                            className="mt-0 text-xs flex-1"
                            placeholder="#000000"
                          />
                        </div>
                      </div>
                      <div className="mt-2">
                        <Label className="text-xs">Top Position (%)</Label>
                        <Input
                          type="number"
                          value={editedData.courseDirectorTopOffset || 60}
                          onChange={(e) => setEditedData({...editedData, courseDirectorTopOffset: parseInt(e.target.value)})}
                          className="mt-1"
                          min="0"
                          max="100"
                        />
                      </div>
                    </div>
                  )}

                  {(!selectedSection || selectedSection === 'Attended Hours') && (
                    <div className="border-t pt-3 mt-3">
                      <Label className="text-xs font-medium block mb-3">Attended Hours</Label>
                      <div>
                        <Label className="text-xs">Font Size (px)</Label>
                        <Input
                          type="number"
                          value={editedData.attendedHoursFontSize || 14}
                          onChange={(e) => setEditedData({...editedData, attendedHoursFontSize: parseInt(e.target.value)})}
                          className="mt-1"
                          min="8"
                          max="48"
                        />
                      </div>
                      <div className="mt-2">
                        <Label className="text-xs">Text Color</Label>
                        <div className="flex gap-2 mt-1">
                          <Input
                            type="color"
                            value={editedData.attendedHoursColor || '#000000'}
                            onChange={(e) => setEditedData({...editedData, attendedHoursColor: e.target.value})}
                            className="mt-0 h-9 w-16 cursor-pointer"
                          />
                          <Input
                            type="text"
                            value={editedData.attendedHoursColor || '#000000'}
                            onChange={(e) => setEditedData({...editedData, attendedHoursColor: e.target.value})}
                            className="mt-0 text-xs flex-1"
                            placeholder="#000000"
                          />
                        </div>
                      </div>
                      <div className="mt-2">
                        <Label className="text-xs">Top Position (%)</Label>
                        <Input
                          type="number"
                          value={editedData.attendedHoursTopOffset || 50}
                          onChange={(e) => setEditedData({...editedData, attendedHoursTopOffset: parseInt(e.target.value)})}
                          className="mt-1"
                          min="0"
                          max="100"
                        />
                      </div>
                    </div>
                  )}

                  {(!selectedSection || selectedSection === 'Credit Designation Statement') && (
                    <div className="border-t pt-3 mt-3">
                      <Label className="text-xs font-medium block mb-3">Credit Designation Statement</Label>
                      <Textarea
                        value={editedData.creditDesignation || ''}
                        onChange={(e) => setEditedData({...editedData, creditDesignation: e.target.value})}
                        className="mt-1 text-xs"
                        rows={2}
                        placeholder={`(This activity was designated for ${activity?.credit_hours || '1'} ${activity?.credit_type || 'CME Category 1'} Credits™)`}
                      />
                      <div className="mt-2">
                        <Label className="text-xs">Font Size (px)</Label>
                        <Input
                          type="number"
                          value={editedData.creditDesignationFontSize || 11}
                          onChange={(e) => setEditedData({...editedData, creditDesignationFontSize: parseInt(e.target.value)})}
                          className="mt-1"
                          min="6"
                          max="24"
                        />
                      </div>
                      <div className="mt-2">
                        <Label className="text-xs">Text Color</Label>
                        <div className="flex gap-2 mt-1">
                          <Input
                            type="color"
                            value={editedData.creditDesignationColor || '#000000'}
                            onChange={(e) => setEditedData({...editedData, creditDesignationColor: e.target.value})}
                            className="mt-0 h-9 w-16 cursor-pointer"
                          />
                          <Input
                            type="text"
                            value={editedData.creditDesignationColor || '#000000'}
                            onChange={(e) => setEditedData({...editedData, creditDesignationColor: e.target.value})}
                            className="mt-0 text-xs flex-1"
                            placeholder="#000000"
                          />
                        </div>
                      </div>
                      <div className="mt-2">
                        <Label className="text-xs">Top Position (%)</Label>
                        <Input
                          type="number"
                          value={editedData.creditDesignationTopOffset || 65}
                          onChange={(e) => setEditedData({...editedData, creditDesignationTopOffset: parseInt(e.target.value)})}
                          className="mt-1"
                          min="0"
                          max="100"
                        />
                      </div>
                    </div>
                  )}

                  {(!selectedSection || selectedSection === 'Accreditation Statement') && (
                    <div className="border-t pt-3 mt-3">
                      <Label className="text-xs font-medium block mb-3">Accreditation Statement</Label>
                      <p className="text-xs text-slate-500 mb-2">Appears on both physician and other professional certificates</p>
                      <div className="bg-blue-50 p-2 rounded border border-blue-200 mb-3">
                        <Label className="text-xs font-medium">Select from Library</Label>
                        <Select 
                          onValueChange={(value) => {
                            const stmt = statements.find(s => s.id === value);
                            if (stmt) {
                              setEditedData({...editedData, accreditationStatement: stmt.text});
                            }
                          }}
                        >
                          <SelectTrigger className="mt-2 bg-white">
                            <SelectValue placeholder={statements.length === 0 ? "No statements available" : "Choose a statement..."} />
                          </SelectTrigger>
                          <SelectContent>
                            {statements.map(stmt => (
                              <SelectItem key={stmt.id} value={stmt.id}>
                                {stmt.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {statements.length === 0 && (
                          <p className="text-xs text-slate-600 mt-2">Create statements in the Setup tab first</p>
                        )}
                      </div>
                      <div className="mt-3">
                        <Label className="text-xs">Custom Text</Label>
                        <Textarea
                          value={editedData.accreditationStatement || config?.accreditation_statement || ''}
                          onChange={(e) => setEditedData({...editedData, accreditationStatement: e.target.value})}
                          className="mt-1 text-xs"
                          rows={3}
                        />
                      </div>
                      <div className="mt-2">
                        <Label className="text-xs">Font Size (px)</Label>
                        <Input
                          type="number"
                          value={editedData.accreditationFontSize || 9}
                          onChange={(e) => setEditedData({...editedData, accreditationFontSize: parseInt(e.target.value)})}
                          className="mt-1"
                          min="6"
                          max="16"
                        />
                      </div>
                      <div className="mt-2">
                        <Label className="text-xs">Bottom Position (%)</Label>
                        <Input
                          type="number"
                          value={editedData.accreditationBottomOffset || 4}
                          onChange={(e) => setEditedData({...editedData, accreditationBottomOffset: parseInt(e.target.value)})}
                          className="mt-1"
                          min="0"
                          max="50"
                        />
                      </div>
                    </div>
                  )}
                  </div>

            <div className="flex-1 bg-gradient-to-br from-slate-100 to-slate-200 rounded-lg overflow-y-auto flex flex-col items-center justify-center p-8 certificate-print-area">
              {(() => {
                const currentAttendee = attendeeList.find(a => a.participant_id === editParticipantId) || attendeeList[0];
                const isPhysician = currentAttendee && ['MD', 'DO', 'MBBS'].includes(currentAttendee.credential);
                const templateId = isPhysician ? config?.physician_template_id : config?.other_template_id;
                const template = templates.find(t => t.id === templateId);
                const bgImage = editedData?.background_image_url || config?.background_image_url || template?.background_image_url;

                if (!currentAttendee) {
                  return <div className="text-slate-500">No participant selected</div>;
                }

                return (
                  <div 
                    className="relative rounded-lg shadow-2xl max-w-full h-auto"
                    style={{
                      backgroundImage: bgImage ? `url('${bgImage}')` : 'none',
                      backgroundSize: 'cover',
                      backgroundRepeat: 'no-repeat',
                      backgroundPosition: 'center',
                      backgroundColor: 'white',
                      aspectRatio: '11/8.5',
                      minWidth: '600px'
                    }}
                  >
                    {!bgImage && (
                      <div className="absolute inset-0 flex items-center justify-center text-slate-400 text-sm">
                        No background image uploaded
                      </div>
                    )}
                    
                    {/* Debug Info */}
                    {showDebug && (
                      <div className="absolute top-2 right-2 bg-yellow-100 border border-yellow-400 p-2 text-xs space-y-1 rounded no-print">
                        <p className="font-semibold">Debug:</p>
                        <p>Config BG: {config?.background_image_url ? 'YES' : 'NO'}</p>
                        <p>Template BG: {template?.background_image_url ? 'YES' : 'NO'}</p>
                        <p>Using: {bgImage ? 'YES' : 'NO'}</p>
                      </div>
                    )}

                    <div 
                      className="absolute cursor-pointer"
                      onClick={() => setSelectedSection('Client Name')}
                      style={{
                        top: `${editedData.topOffset || 2}%`,
                        left: '50%',
                        transform: 'translateX(-50%)',
                        width: '100%',
                        textAlign: 'center',
                        outline: selectedSection === 'Client Name' ? '2px solid #3b82f6' : 'none',
                        padding: '4px'
                      }}
                    >
                      {usePhoto && photoUrl ? (
                        <img 
                          src={photoUrl}
                          alt="Logo"
                          style={{
                            width: `${photoWidth}px`,
                            height: 'auto',
                            maxHeight: '80px',
                            margin: '0 auto',
                            display: 'block'
                          }}
                          onError={() => {
                            setUsePhoto(false);
                          }}
                        />
                      ) : (
                        <p 
                          style={{
                            fontSize: `${editedData.fontSize || 18}px`,
                            color: editedData.textColor || '#06b6d4',
                            fontWeight: '600',
                            margin: 0
                          }}
                        >
                          {editedData.clientName || config?.clientName || hospital?.profile_name || hospital?.name || 'Client Name or LOGO'}
                        </p>
                      )}
                    </div>

                    <div 
                      className="absolute cursor-pointer"
                      onClick={() => setSelectedSection('Certifies That')}
                      style={{
                        top: `${editedData.certifiesTopOffset || 15}%`,
                        left: '50%',
                        transform: 'translateX(-50%)',
                        width: '100%',
                        textAlign: 'center',
                        outline: selectedSection === 'Certifies That' ? '2px solid #3b82f6' : 'none',
                        padding: '4px'
                      }}
                    >
                      <p 
                        style={{
                          fontSize: `${editedData.certifiesFontSize || 16}px`,
                          color: editedData.certifiesColor || '#000000',
                          fontWeight: '400',
                          margin: 0,
                          letterSpacing: '0.5px'
                        }}
                      >
                        Certifies that:
                      </p>
                    </div>

                    {currentAttendee && (
                      <div 
                        className="absolute cursor-pointer"
                        onClick={() => setSelectedSection('Participant Name')}
                        style={{
                          top: `${editedData.participantNameTopOffset || 22}%`,
                          left: '50%',
                          transform: 'translateX(-50%)',
                          width: '100%',
                          textAlign: 'center',
                          outline: selectedSection === 'Participant Name' ? '2px solid #3b82f6' : 'none',
                          padding: '4px'
                        }}
                      >
                        <p 
                          style={{
                            fontSize: `${editedData.participantNameFontSize || 16}px`,
                            color: editedData.participantNameColor || '#000000',
                            fontWeight: '600',
                            margin: 0,
                            letterSpacing: '0.5px'
                          }}
                          >
                          {currentAttendee.participant?.first_name} {currentAttendee.participant?.last_name}{currentAttendee.credential ? `, ${abbreviateCredential(currentAttendee.credential)}` : ''}
                          </p>
                      </div>
                    )}

                    <div 
                      className="absolute cursor-pointer"
                      onClick={() => setSelectedSection('Participation Text')}
                      style={{
                        top: `${editedData.participationTopOffset || 28}%`,
                        left: '50%',
                        transform: 'translateX(-50%)',
                        width: '90%',
                        textAlign: 'center',
                        outline: selectedSection === 'Participation Text' ? '2px solid #3b82f6' : 'none',
                        padding: '4px'
                      }}
                    >
                      <p 
                        style={{
                          fontSize: `${editedData.participationFontSize || 14}px`,
                          color: editedData.participationColor || '#000000',
                          margin: 0,
                          lineHeight: 1.4
                        }}
                      >
                        has participated in the <span className="preview-only-style" style={{ textDecoration: 'underline', fontWeight: '600' }}>{activity?.method || 'Live Lecture'}</span> <span style={{ fontStyle: 'italic' }}>activity</span> titled
                      </p>
                    </div>

                    <div 
                      className="absolute cursor-pointer"
                      onClick={() => setSelectedSection('Activity Title')}
                      style={{
                        top: `${editedData.activityTitleTopOffset || 32}%`,
                        left: '50%',
                        transform: 'translateX(-50%)',
                        width: '90%',
                        textAlign: 'center',
                        outline: selectedSection === 'Activity Title' ? '2px solid #3b82f6' : 'none',
                        padding: '4px'
                      }}
                    >
                      <p 
                        style={{
                          fontSize: `${editedData.activityTitleFontSize || 16}px`,
                          color: editedData.activityTitleColor || '#000000',
                          fontWeight: '600',
                          margin: 0,
                          fontStyle: 'italic'
                        }}
                      >
                        {activity?.title || 'Activity Title Here'}
                      </p>
                    </div>

                    <div 
                      className="absolute cursor-pointer"
                      onClick={() => setSelectedSection('On Text')}
                      style={{
                        top: `${editedData.onTopOffset || editedData.onTextTopOffset || 38}%`,
                        left: '50%',
                        transform: 'translateX(-50%)',
                        fontSize: `${editedData.onFontSize || editedData.onTextFontSize || 16}px`,
                        color: editedData.onTextColor || '#000000',
                        margin: 0,
                        outline: selectedSection === 'On Text' ? '2px solid #3b82f6' : 'none',
                        padding: '4px'
                      }}
                    >
                      {editedData.onText || 'on'}
                    </div>

                    <p 
                      className="absolute cursor-pointer"
                      onClick={() => setSelectedSection('Completion Date')}
                      style={{
                        top: `${editedData.completionDateTopOffset || 45}%`,
                        left: '50%',
                        transform: 'translateX(-50%)',
                        fontSize: `${editedData.completionDateFontSize || 14}px`,
                        color: editedData.completionDateColor || '#000000',
                        margin: 0,
                        outline: selectedSection === 'Completion Date' ? '2px solid #3b82f6' : 'none',
                        padding: '4px'
                      }}
                    >
                      {format(new Date(), 'MMMM d, yyyy')}
                    </p>

                    <p 
                      className="absolute cursor-pointer"
                      onClick={() => setSelectedSection('Attended Hours')}
                      style={{
                        top: `${editedData.attendedHoursTopOffset || 50}%`,
                        left: '50%',
                        transform: 'translateX(-50%)',
                        fontSize: `${editedData.attendedHoursFontSize || 14}px`,
                        color: editedData.attendedHoursColor || '#000000',
                        margin: 0,
                        width: '90%',
                        textAlign: 'center',
                        outline: selectedSection === 'Attended Hours' ? '2px solid #3b82f6' : 'none',
                        padding: '4px'
                      }}
                    >
                      attended {activity?.credit_hours || 1} {(activity?.credit_hours || 1) === 1 ? 'hour' : 'hours'} of this accredited activity.
                    </p>

                    <div 
                      className="absolute cursor-pointer"
                      onClick={() => setSelectedSection('Course Director')}
                      style={{
                        top: `${editedData.courseDirectorTopOffset || 60}%`,
                        left: '50%',
                        transform: 'translateX(-50%)',
                        fontSize: `${editedData.courseDirectorFontSize || 12}px`,
                        color: editedData.courseDirectorColor || '#000000',
                        margin: 0,
                        width: '90%',
                        textAlign: 'center',
                        outline: selectedSection === 'Course Director' ? '2px solid #3b82f6' : 'none',
                        padding: '4px'
                      }}
                    >
                      ___________________________________<br/>Course Director
                    </div>

                    <div 
                      className="absolute cursor-pointer"
                      onClick={() => setSelectedSection('Credit Designation Statement')}
                      style={{
                        top: `${editedData.creditDesignationTopOffset || 65}%`,
                        left: '50%',
                        transform: 'translateX(-50%)',
                        fontSize: `${editedData.creditDesignationFontSize || 11}px`,
                        color: editedData.creditDesignationColor || '#000000',
                        margin: 0,
                        width: '85%',
                        textAlign: 'center',
                        lineHeight: '1.3',
                        outline: selectedSection === 'Credit Designation Statement' ? '2px solid #3b82f6' : 'none',
                        padding: '4px'
                      }}
                    >
                      <p style={{margin: 0}}>
                        (This activity was designated for {replaceShortcodes(editedData.creditDesignation || `${activity?.credit_hours || '1'} ${activity?.credit_type || 'CME Category 1'} Credits™`, currentAttendee, activity)})
                      </p>
                    </div>

                    <div 
                      className="absolute cursor-pointer"
                      onClick={() => setSelectedSection('Accreditation Statement')}
                      style={{
                        bottom: `${editedData.accreditationBottomOffset || 4}%`,
                        left: '50%',
                        transform: 'translateX(-50%)',
                        fontSize: `${editedData.accreditationFontSize || 7}px`,
                        color: editedData.accreditationColor || '#000000',
                        margin: 0,
                        width: `${editedData.accreditationWidth || 86}%`,
                        textAlign: 'center',
                        lineHeight: '1.1',
                        outline: selectedSection === 'Accreditation Statement' ? '2px solid #3b82f6' : 'none',
                        padding: '4px'
                      }}
                    >
                      <p style={{margin: 0, wordWrap: 'break-word'}}>
                        {replaceShortcodes(editedData.accreditationStatement || config?.accreditation_statement || 'This activity has been planned and implemented in accordance with the accreditation requirements...', currentAttendee, activity)}
                      </p>
                    </div>
                    </div>
                     );
                     })()}
            </div>
          </div>
          </div>
             );
           })()}

          {/* Preview Modal */}
      {previewCert && (
        <div className="fixed inset-0 z-[9999] bg-white flex flex-col">
          <style>{`
            @media print {
              @page {
                size: landscape;
                margin: 0 !important;
              }

              html, body {
                width: 100%;
                height: 100%;
                margin: 0 !important;
                padding: 0 !important;
                overflow: hidden;
              }

              body * {
                visibility: hidden;
              }

              .certificate-preview-area,
              .certificate-preview-area * {
                visibility: visible;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
                color-adjust: exact !important;
              }

              .certificate-preview-area {
                position: fixed !important;
                left: 0 !important;
                top: 0 !important;
                width: 100vw !important;
                height: 100vh !important;
                margin: 0 !important;
                padding: 0 !important;
                background: white !important;
                display: flex !important;
                align-items: center !important;
                justify-content: center !important;
              }

              .certificate-preview-area > div {
                width: 100vw !important;
                height: 100vh !important;
                max-width: none !important;
                min-width: 100vw !important;
                margin: 0 !important;
                padding: 0 !important;
                border-radius: 0 !important;
                box-shadow: none !important;
              }

              .no-print {
                display: none !important;
              }

              .preview-only-style {
                text-decoration: none !important;
                font-weight: normal !important;
              }
            }
          `}</style>
          <div className="flex items-center justify-between p-4 border-b bg-slate-50 no-print">
            <div>
              <h3 className="font-semibold text-slate-900">Issued Certificate</h3>
              <p className="text-xs text-slate-500">{activity?.title || ""}</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={async () => {
                const certificateEl = document.querySelector('.certificate-preview-area > div');
                if (!certificateEl) {
                  toast.error('Certificate not found');
                  return;
                }
                
                try {
                  // Temporarily remove preview-only styling
                  const previewStyleEl = certificateEl.querySelector('.preview-only-style');
                  const originalStyle = previewStyleEl ? previewStyleEl.getAttribute('style') : null;
                  if (previewStyleEl) {
                    previewStyleEl.style.textDecoration = 'none';
                    previewStyleEl.style.fontWeight = 'normal';
                  }
                  
                  const canvas = await html2canvas(certificateEl, {
                    scale: 2,
                    useCORS: true,
                    backgroundColor: '#ffffff'
                  });
                  
                  // Restore preview styling
                  if (previewStyleEl && originalStyle) {
                    previewStyleEl.setAttribute('style', originalStyle);
                  }
                  
                  const imgData = canvas.toDataURL('image/png');
                  const pdf = new jsPDF({
                    orientation: 'landscape',
                    unit: 'px',
                    format: [canvas.width, canvas.height]
                  });
                  
                  pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
                  
                  const attendee = attendeeList.find(a => a.participant_id === previewCert.participant_id);
                  const filename = `certificate_${attendee?.participant?.last_name || "Participant"}_${attendee?.participant?.first_name || ""}.pdf`;
                  pdf.save(filename);
                  toast.success('Certificate downloaded');
                } catch (error) {
                  toast.error('Failed to generate PDF');
                }
              }} className="gap-2">
                <Download className="w-4 h-4" />Download PDF
              </Button>
              <Button variant="outline" onClick={() => window.print()} className="gap-2">
                <Printer className="w-4 h-4" />Print
              </Button>
              <Button variant="outline" onClick={async () => {
                try {
                  const cert = previewCert;
                  if (!cert?.pdf_file_id) {
                    toast.error("No PDF file attached to this certificate");
                    return;
                  }
                  const attendee = attendeeList.find(a => a.participant_id === cert.participant_id);
                  const filename = `certificate_${attendee?.participant?.last_name || "Participant"}_${attendee?.participant?.first_name || ""}.pdf`;
                  await downloadByFileId(cert.pdf_file_id, filename);
                  toast.success("Downloading...");
                } catch (e) {
                  toast.error(e.message || "Download failed");
                }
              }} className="gap-2">
                <Download className="w-4 h-4" />Download PDF
              </Button>
              <Button variant="outline" onClick={() => setPreviewCert(null)}>Done</Button>
            </div>
          </div>

          <div className="flex-1 overflow-auto bg-gradient-to-br from-slate-100 to-slate-200 p-6 flex items-center justify-center certificate-preview-area">
            {(() => {
              if (!previewCert.payload_snapshot_json) return <div className="text-slate-500">Certificate data not available.</div>;

              const payload = previewCert.payload_snapshot_json;
              const template = templates.find(t => t.id === previewCert.template_id);
              const bgImage = template?.background_image_url;
              const layout = template?.layout_json || {};

              if (!bgImage) return <div className="text-slate-500">No background image for this certificate.</div>;

              return (
                <div className="relative rounded-lg shadow-2xl" style={{ backgroundImage: `url('${bgImage}')`, backgroundSize: 'cover', backgroundRepeat: 'no-repeat', backgroundPosition: 'center', backgroundColor: 'white', aspectRatio: '11/8.5', width: 'min(1100px, 92vw)', minWidth: '600px' }}>
                  <div className="absolute" style={{ top: `${layout.topOffset || 2}%`, left: '50%', transform: 'translateX(-50%)', width: '100%', textAlign: 'center' }}>
                    <p style={{ fontSize: `${layout.fontSize || 18}px`, color: layout.textColor || '#06b6d4', fontWeight: 600, margin: 0 }}>{layout.clientName || payload.client_name || 'Client Name'}</p>
                  </div>
                  <div className="absolute" style={{ top: `${layout.participantNameTopOffset || 22}%`, left: '50%', transform: 'translateX(-50%)', width: '100%', textAlign: 'center' }}>
                    <p style={{ fontSize: `${layout.participantNameFontSize || 16}px`, color: layout.participantNameColor || '#000', fontWeight: 600, margin: 0 }}>
                      {payload.participant_name}
                      {payload.participant_credential ? `, ${abbreviateCredential(payload.participant_credential)}` : ''}
                    </p>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}
    </>
  );
}