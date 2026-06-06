import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Award, X, Edit3 } from "lucide-react";
import CertificatePreview from "../components/certificates/CertificatePreview";
import CertificateEditor from "../components/certificates/CertificateEditor";

export default function CertificateSetup() {
  const navigate = useNavigate();
  const location = useLocation();
  const [classId, setClassId] = useState(null);
  const [previewAttendee, setPreviewAttendee] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedData, setEditedData] = useState({});

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const id = params.get('classId');
    if (id) {
      setClassId(id);
    }
  }, [location.search]);

  const { data: classData } = useQuery({
    queryKey: ['ceClass', classId],
    queryFn: async () => {
      const classes = await base44.entities.CEClass.list();
      return classes.find(c => c.id === classId);
    },
    enabled: !!classId,
  });

  const { data: attendees } = useQuery({
    queryKey: ['classAttendance', classId],
    queryFn: async () => {
      const allAttendance = await base44.entities.Attendance.list();
      return allAttendance.filter(a => a.class_id === classId);
    },
    enabled: !!classId,
  });

  const { data: settings } = useQuery({
    queryKey: ['systemSettings'],
    queryFn: async () => {
      const result = await base44.entities.SystemSettings.list();
      return result[0] || null;
    },
  });

  const { data: template } = useQuery({
    queryKey: ['certificateTemplate', classData?.id],
    queryFn: async () => {
      if (!classData?.id) return null;
      const config = await base44.entities.ActivityCertificateConfig.list();
      const activity = config.find(c => c.activity_id === classData.id);
      if (!activity?.physician_template_id) return null;
      const templates = await base44.entities.CertificateTemplate.list();
      return templates.find(t => t.id === activity.physician_template_id);
    },
    enabled: !!classData?.id,
  });

  const eligibleAttendees = attendees?.filter(a => 
    a.status === 'attended' || a.status === 'passed'
  ) || [];

  useEffect(() => {
    if (eligibleAttendees.length > 0 && !previewAttendee) {
      setPreviewAttendee(eligibleAttendees[0]);
    }
  }, [eligibleAttendees, previewAttendee]);

  return (
    <div className="h-screen flex flex-col bg-slate-50 overflow-hidden">
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
            <Award className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-slate-900">Certificate Preview</h1>
            <p className="text-sm text-slate-500">{classData?.title || 'Loading...'}</p>
          </div>
        </div>
        <div className="flex gap-3">
          <Button onClick={() => setIsEditing(!isEditing)} variant="outline" className="gap-2">
            <Edit3 className="w-4 h-4" />
            {isEditing ? 'Done Editing' : 'Edit Details'}
          </Button>
          <Button onClick={() => navigate(-1)} variant="outline">
            Done
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden relative">
        {isEditing && (
          <CertificateEditor
            classData={classData}
            settings={settings}
            onClose={() => setIsEditing(false)}
            onSave={(data) => {
              setEditedData(data);
              setIsEditing(false);
            }}
          />
        )}
        <CertificatePreview
          classData={editedData.classTitle ? {
            ...classData,
            hospital_name: editedData.orgName,
            title: editedData.classTitle,
            credit_hours: editedData.creditHours,
            credit_type: editedData.creditType,
          } : classData}
          attendee={previewAttendee}
          settings={editedData.orgName ? {
            ...settings,
            organization_name: editedData.orgName,
            location: editedData.location,
          } : settings}
          template={template}
        />
      </div>
    </div>
  );
}