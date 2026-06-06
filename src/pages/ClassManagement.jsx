import React, { useState, useEffect, useRef, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { BookOpen, Save, CalendarIcon, Plus, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format, parseISO, isBefore } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useNavigate, useLocation } from "react-router-dom";
import { createPageUrl } from "../utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import ClassListReport from "../components/classes/ClassListReport";
import AvailableNamesPanel from "../components/classes/AvailableNamesPanel";
import StatusButtons from "../components/classes/StatusButtons";
import AttendeesPanel from "../components/classes/AttendeesPanel";
import QuickAddParticipantModal from "../components/classes/QuickAddParticipantModal";
import CERecordEditModal from "../components/classes/CERecordEditModal";
import ClassManagementLayout from "../components/layout/ClassManagementLayout";
import CreditLinesEditor from "../components/classes/CreditLinesEditor";
import SpeakerSelector from "../components/classes/SpeakerSelector";
import ActivityCertificateSetup from "../components/certificates/ActivityCertificateSetup";
import CertificateIssuanceScreen from "../components/certificates/CertificateIssuanceScreen";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Award, X } from "lucide-react";

export default function ClassManagement() {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();

  const classNameRef = useRef(null);

  const [context, setContext] = useState(null);
  const [selectedClassId, setSelectedClassId] = useState(null);
  const [classData, setClassData] = useState({});
  const [isDirty, setIsDirty] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportType, setReportType] = useState(null);
  const [beginDateOpen, setBeginDateOpen] = useState(false);
  const [endDateOpen, setEndDateOpen] = useState(false);
  const [selectedParticipantIds, setSelectedParticipantIds] = useState([]);
  const [showAttendanceBox, setShowAttendanceBox] = useState(false);
  const [quickAddModalOpen, setQuickAddModalOpen] = useState(false);
  const [ceRecordEditModalOpen, setCERecordEditModalOpen] = useState(false);
  const [pendingCERecord, setPendingCERecord] = useState(null);
  const [selectedAttendeeId, setSelectedAttendeeId] = useState(null);
  const [classSearchTerm, setClassSearchTerm] = useState("");
  const [expandedClassIds, setExpandedClassIds] = useState([]);
  const [certTabOpen, setCertTabOpen] = useState(false);

  useEffect(() => {
    const stored = sessionStorage.getItem("ce_context");
    if (stored) setContext(JSON.parse(stored));
  }, []);

  const resetToFreshEntry = useCallback(() => {
    setSelectedClassId(null);
    setClassData({
      is_active: true,
      hospital_id: context?.hospital_id ?? "",
      hospital_name: context?.hospital_name ?? "",
      year: context?.year ?? "",
      title: "",
      begin_date: "",
      end_date: "",
      credit_hours: "",
      credit_type: "",
      credits: [],
      speaker_ids: [],
      speaker_names: "",
      method: "",
      joint_sponsor: "",
    });
    setIsDirty(false);
    setShowAttendanceBox(false);
    setSelectedParticipantIds([]);

    setTimeout(() => {
      classNameRef.current?.focus();
    }, 50);
  }, [context?.hospital_id, context?.hospital_name, context?.year]);

  useEffect(() => {
    if (!context) return;
    if (!classData || Object.keys(classData).length === 0) {
      resetToFreshEntry();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [context]);

  const { data: allClasses } = useQuery({
    queryKey: ["ceClasses", context?.hospital_id, context?.year],
    queryFn: async () => {
      if (!context) return [];
      const all = await base44.entities.CEClass.list();
      const hid = String(context.hospital_id);
      const yr = String(context.year);
      return all.filter(
        (c) => String(c.hospital_id) === hid && String(c.year) === yr
      );
    },
    enabled: !!context,
  });

  const { data: allClassesForHospital } = useQuery({
    queryKey: ["ceClasses", context?.hospital_id],
    queryFn: async () => {
      if (!context?.hospital_id) return [];
      const all = await base44.entities.CEClass.list();
      return all.filter((c) => String(c.hospital_id) === String(context.hospital_id));
    },
    enabled: !!context?.hospital_id,
  });

  const availableYears = React.useMemo(() => {
    if (!allClassesForHospital) return [];
    const years = [...new Set(allClassesForHospital.map(c => c.year))].sort((a, b) => b - a);
    return years;
  }, [allClassesForHospital]);

  const { data: instructors } = useQuery({
    queryKey: ["instructors"],
    queryFn: () => base44.entities.Instructor.list(),
  });

  const { data: credits } = useQuery({
    queryKey: ["credits"],
    queryFn: () => base44.entities.Credit.list(),
  });

  const { data: methods } = useQuery({
    queryKey: ["methods"],
    queryFn: () => base44.entities.Method.list(),
  });

  const { data: sponsors } = useQuery({
    queryKey: ["jointSponsors"],
    queryFn: () => base44.entities.JointSponsor.list(),
  });

  const { data: settings } = useQuery({
    queryKey: ["systemSettings"],
    queryFn: async () => {
      const result = await base44.entities.SystemSettings.list();
      return result[0] || null;
    },
  });

  const { data: participants } = useQuery({
    queryKey: ["participants"],
    queryFn: () => base44.entities.Participant.list(),
  });

  const { data: currentUser } = useQuery({
    queryKey: ["currentUser"],
    queryFn: () => base44.auth.me().catch(() => null),
  });

  const { data: assignments = [] } = useQuery({
    queryKey: ["userAssignments", currentUser?.email],
    queryFn: async () => {
      if (!currentUser?.email) return [];
      const all = await base44.entities.Assignment.list();
      return all.filter((a) => a.user_email === currentUser.email && a.is_active);
    },
    enabled: !!currentUser?.email,
  });

  const isSuperAdmin = React.useMemo(() => {
    return assignments.some((a) => a.role === "super_admin");
  }, [assignments]);

  const { data: classAttendance } = useQuery({
    queryKey: ["classAttendance", selectedClassId],
    queryFn: () => base44.entities.Attendance.list(),
    enabled: !!selectedClassId,
  });

  const yearClasses = React.useMemo(() => {
    const sorted = (allClasses || []).sort((a, b) => {
      if (!a.begin_date) return 1;
      if (!b.begin_date) return -1;
      return new Date(b.begin_date) - new Date(a.begin_date);
    });
    
    if (!classSearchTerm.trim()) return sorted;
    
    const term = classSearchTerm.toLowerCase();
    return sorted.filter(cls => 
      cls.title?.toLowerCase().includes(term) ||
      cls.speaker_names?.toLowerCase().includes(term) ||
      cls.credit_type?.toLowerCase().includes(term)
    );
  }, [allClasses, classSearchTerm]);

  const handleFieldChange = (key, value) => {
    setClassData((prev) => ({ ...prev, [key]: value }));
    setIsDirty(true);
  };

  const saveClassMutation = useMutation({
    mutationFn: async (data) => {
      if (selectedClassId) return base44.entities.CEClass.update(selectedClassId, data);
      return base44.entities.CEClass.create(data);
    },
    onSuccess: async (result) => {
      const key = ["ceClasses", context?.hospital_id, context?.year];

      queryClient.setQueryData(key, (prev = []) => {
        const idx = prev.findIndex((x) => x.id === result.id);
        if (idx >= 0) {
          const copy = [...prev];
          copy[idx] = result;
          return copy;
        }
        return [result, ...prev];
      });

      await queryClient.invalidateQueries({ queryKey: key });
      toast.success("Class saved");
      setIsDirty(false);
      resetToFreshEntry();
    },
    onError: (err) => {
      console.error(err);
      toast.error("Save failed");
    },
  });

  const handleSave = useCallback(() => {
    if (!context) return toast.error("Missing hospital/year context");
    if (!classData.title || !classData.begin_date || !classData.end_date) {
      return toast.error("Please fill required fields");
    }
    
    // Filter out empty credit lines
    const validCredits = (classData.credits || []).filter(
      (c) => c.credit_type_id && c.amount > 0
    );
    
    const dataToSave = {
      ...classData,
      credits: validCredits,
      credit_hours: classData.credit_hours || null,
      hospital_id: context.hospital_id,
      hospital_name: context.hospital_name,
      year: context.year,
      is_active: classData.is_active !== false,
    };
    saveClassMutation.mutate(dataToSave);
  }, [classData, context, saveClassMutation]);

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.CEClass.delete(id),
    onSuccess: async () => {
      const key = ["ceClasses", context?.hospital_id, context?.year];
      await queryClient.invalidateQueries({ queryKey: key });
      toast.success("Class deleted");
      resetToFreshEntry();
    },
    onError: (err) => {
      console.error(err);
      toast.error("Delete failed");
    },
  });

  const handleClassSelect = (cls) => {
    if (isDirty) {
      if (window.confirm("You have unsaved changes. Save now?")) handleSave();
      else setIsDirty(false);
    }
    setSelectedClassId(cls.id);
    setClassData(cls);
    setIsDirty(false);
    setShowAttendanceBox(false);
    setSelectedParticipantIds([]);
  };

  const handleNewClass = () => {
    if (isDirty) {
      if (window.confirm("You have unsaved changes. Save now?")) {
        handleSave();
        return;
      }
    }
    resetToFreshEntry();
  };

  const handleDelete = () => {
    if (!selectedClassId) return;
    deleteMutation.mutate(selectedClassId);
    setDeleteDialogOpen(false);
  };

  const handleDone = () => {
    if (isDirty) {
      if (window.confirm("You have unsaved changes. Save now?")) handleSave();
    }
    navigate(createPageUrl("Dashboard"));
  };

  const handleYearChange = (newYear) => {
    if (isDirty) {
      if (window.confirm("You have unsaved changes. Save now?")) {
        handleSave();
      }
    }
    const updatedContext = { ...context, year: parseInt(newYear) };
    sessionStorage.setItem("ce_context", JSON.stringify(updatedContext));
    setContext(updatedContext);
    resetToFreshEntry();
  };

  const handleCreateNewYear = () => {
    const currentYear = new Date().getFullYear();
    const yearInput = prompt(`Enter new year (current: ${currentYear}):`, currentYear);
    if (!yearInput) return;
    
    const newYear = parseInt(yearInput);
    if (isNaN(newYear) || newYear < 1900 || newYear > 2100) {
      toast.error("Invalid year");
      return;
    }
    
    handleYearChange(newYear);
  };

  const handleBeginDateSelect = (date) => {
    if (date) {
      const formattedDate = format(date, "yyyy-MM-dd");
      handleFieldChange("begin_date", formattedDate);
      if (!classData.end_date || isBefore(parseISO(classData.end_date), date)) {
        handleFieldChange("end_date", formattedDate);
      }
    }
    setBeginDateOpen(false);
  };

  const handleEndDateSelect = (date) => {
    if (date) handleFieldChange("end_date", format(date, "yyyy-MM-dd"));
    setEndDateOpen(false);
  };

  const handleSpeakersChange = (speakerIds) => {
    const speakerNames = speakerIds
      .map((id) => {
        const speaker = instructors?.find((i) => i.id === id);
        if (!speaker) return null;
        return `${speaker.first_name} ${speaker.last_name}${speaker.credentials ? ', ' + speaker.credentials : ''}`;
      })
      .filter(Boolean)
      .join("; ");
    
    handleFieldChange("speaker_ids", speakerIds);
    handleFieldChange("speaker_names", speakerNames);
  };

  const handleCreditChange = (creditName) => {
    const credit = credits?.find((c) => c.name === creditName);
    handleFieldChange("credit_type", creditName);
    if (credit?.hours) handleFieldChange("credit_hours", credit.hours);
  };

  const handlePrintReport = (type) => {
    setReportType(type);
    setReportOpen(true);
  };

  const handleAttendance = () => {
    if (!selectedClassId) return toast.error("Please select or create a class first");
    setShowAttendanceBox(true);
    setSelectedParticipantIds([]);
  };

  const currentAttendees =
    classAttendance?.filter((ca) => ca.class_id === selectedClassId) || [];
  const assignedParticipantIds = currentAttendees.map((ca) => ca.participant_id);
  const availableParticipants =
    participants?.filter(
      (p) => p.is_active !== false && !assignedParticipantIds.includes(p.id)
    ) || [];

  const handleToggleSelectParticipant = (participantId) => {
    setSelectedParticipantIds((prev) =>
      prev.includes(participantId) ? prev.filter((id) => id !== participantId) : [...prev, participantId]
    );
  };

  const addAttendanceMutation = useMutation({
    mutationFn: async (data) => {
      const attendanceRecords = await base44.entities.Attendance.bulkCreate(data);
      
      // Auto-create CE records for attended/passed statuses
      const ceRecordsToCreate = [];
      for (const att of attendanceRecords) {
        if (att.status === "attended" || att.status === "passed") {
          const ceRecordData = {
            participant_id: att.participant_id,
            participant_name: att.participant_name,
            class_id: att.class_id,
            class_title: att.class_title,
            hospital: context?.hospital_name || "",
            date: classData.begin_date,
            year: context?.year,
            credit_type: att.credit_type,
            credit_hours: att.credit_hours,
            instructor_name: classData.speaker_names,
            method: classData.method,
            status: "completed",
          };
          
          // Check if CE record already exists
          const existing = await base44.entities.CERecord.list();
          const found = existing.find(
            (r) => 
              r.participant_id === att.participant_id && 
              r.class_id === att.class_id &&
              r.date === classData.begin_date &&
              r.hospital === (context?.hospital_name || "") &&
              r.year === context?.year
          );
          
          if (!found) {
            ceRecordsToCreate.push(ceRecordData);
          }
        }
      }
      
      if (ceRecordsToCreate.length > 0) {
        await base44.entities.CERecord.bulkCreate(ceRecordsToCreate);
      }
      
      return attendanceRecords;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["classAttendance", selectedClassId] });
      await queryClient.invalidateQueries({ queryKey: ["ceRecords"] });
      setSelectedParticipantIds([]);
      toast.success("Attendees added");
    },
    onError: (err) => {
      console.error(err);
      toast.error("Failed to add attendees");
    },
  });

  const updateAttendanceMutation = useMutation({
    mutationFn: async ({ id, data, attendanceRecord }) => {
      await base44.entities.Attendance.update(id, data);
      
      // Create or update CERecord when status is attended/passed
      if (data.status === "attended" || data.status === "passed") {
        const ceRecordData = {
          participant_id: attendanceRecord.participant_id,
          participant_name: attendanceRecord.participant_name,
          class_id: attendanceRecord.class_id,
          class_title: attendanceRecord.class_title,
          hospital: context?.hospital_name || "",
          date: classData.begin_date,
          year: context?.year,
          credit_type: attendanceRecord.credit_type,
          credit_hours: attendanceRecord.credit_hours,
          instructor_name: classData.speaker_names,
          method: classData.method,
          status: "completed",
        };
        
        // Check if CE record already exists for this participant + class + date + hospital + year
        const existing = await base44.entities.CERecord.list();
        const found = existing.find(
          (r) => 
            r.participant_id === attendanceRecord.participant_id && 
            r.class_id === attendanceRecord.class_id &&
            r.date === classData.begin_date &&
            r.hospital === (context?.hospital_name || "") &&
            r.year === context?.year
        );
        
        let ceRecord;
        if (found) {
          ceRecord = await base44.entities.CERecord.update(found.id, ceRecordData);
          ceRecord.id = found.id;
        } else {
          ceRecord = await base44.entities.CERecord.create(ceRecordData);
        }
        
        return { id, data, ceRecord, isNew: !found };
      }
      
      // Handle status change from attended/passed to failed/removed
      if (data.status === "failed" || data.status === "pre-registered") {
        const existing = await base44.entities.CERecord.list();
        const found = existing.find(
          (r) => r.participant_id === attendanceRecord.participant_id && r.class_id === attendanceRecord.class_id
        );
        
        if (found) {
          // Prompt user to update or void
          return { id, data, existingCERecord: found };
        }
      }
      
      return { id, data };
    },
    onSuccess: async (result) => {
      await queryClient.invalidateQueries({ queryKey: ["classAttendance", selectedClassId] });
      await queryClient.invalidateQueries({ queryKey: ["ceRecords"] });
      
      // If a CE record was created or updated for attended/passed, show edit modal
      if (result.ceRecord) {
        setPendingCERecord(result.ceRecord);
        setCERecordEditModalOpen(true);
      } 
      // If status changed to failed/removed and CE record exists, prompt
      else if (result.existingCERecord) {
        const action = window.confirm(
          `A CE Record exists for this participant.\n\n` +
          `Click OK to void the CE record.\n` +
          `Click Cancel to keep the CE record.`
        );
        
        if (action) {
          await base44.entities.CERecord.update(result.existingCERecord.id, {
            ...result.existingCERecord,
            status: "cancelled"
          });
          await queryClient.invalidateQueries({ queryKey: ["ceRecords"] });
          toast.success("CE Record voided");
        }
      } else {
        toast.success("Status updated");
      }
    },
    onError: (err) => {
      console.error(err);
      toast.error("Failed to update status");
    },
  });

  const deleteAttendanceMutation = useMutation({
    mutationFn: async (id) => base44.entities.Attendance.delete(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["classAttendance", selectedClassId] });
      toast.success("Attendee removed");
    },
    onError: (err) => {
      console.error(err);
      toast.error("Failed to remove attendee");
    },
  });

  const handleAssignStatus = (status) => {
    if (!selectedClassId || selectedParticipantIds.length === 0) return;

    const newAttendanceRecords = selectedParticipantIds.map((participantId) => {
      const participant = participants?.find((p) => p.id === participantId);
      return {
        class_id: selectedClassId,
        class_title: classData.title,
        participant_id: participantId,
        participant_name: participant
          ? `${participant.first_name} ${participant.last_name}`
          : "Unknown",
        status,
        credit_hours: classData.credit_hours,
        credit_type: classData.credit_type,
      };
    });

    addAttendanceMutation.mutate(newAttendanceRecords);
  };

  const handleStatusChange = (newStatus) => {
    if (!selectedAttendeeId) return;
    
    const attendanceRecord = currentAttendees.find((a) => a.id === selectedAttendeeId);
    if (!attendanceRecord) return;
    
    updateAttendanceMutation.mutate({ 
      id: selectedAttendeeId, 
      data: { status: newStatus },
      attendanceRecord 
    });
    
    setSelectedAttendeeId(null);
  };

  const handleRemoveAttendee = (attendanceId) => {
    deleteAttendanceMutation.mutate(attendanceId);
  };

  const createParticipantMutation = useMutation({
    mutationFn: async (data) => base44.entities.Participant.create({
      ...data,
      hospital_id: context?.hospital_id,
      year: context?.year,
      is_active: true
    }),
    onSuccess: async (newParticipant) => {
      await queryClient.invalidateQueries({ queryKey: ["participants"] });
      
      // Ask user what they want to do next
      const goToEdit = window.confirm(
        `Participant "${newParticipant.first_name} ${newParticipant.last_name}" created!\n\n` +
        `Click OK to go to Name Management and finish editing details.\n` +
        `Click Cancel to stay here and add more participants.`
      );
      
      if (goToEdit) {
        // Store participant data for immediate access in Name Management
        sessionStorage.setItem('new_participant_data', JSON.stringify(newParticipant));
        navigate(createPageUrl(`NameManagement?participantId=${newParticipant.id}`));
      } else {
        toast.success("Participant created. You can add more.");
      }
    },
    onError: (err) => {
      console.error(err);
      toast.error("Failed to create participant");
    },
  });

  const handleCreateAndEdit = (data) => {
    setQuickAddModalOpen(false);
    createParticipantMutation.mutate(data);
  };

  const handleAddExistingToClass = async (participant) => {
    setQuickAddModalOpen(false);
    if (!selectedClassId) return;
    
    // Update participant's hospital_id if not set
    if (!participant.hospital_id && context?.hospital_id) {
      await base44.entities.Participant.update(participant.id, {
        ...participant,
        hospital_id: context.hospital_id
      });
      await queryClient.invalidateQueries({ queryKey: ["participants"] });
    }

    const newAttendanceRecord = {
      class_id: selectedClassId,
      class_title: classData.title,
      participant_id: participant.id,
      participant_name: `${participant.first_name} ${participant.last_name}`,
      status: "pre-registered",
      credit_hours: classData.credit_hours,
      credit_type: classData.credit_type,
    };

    addAttendanceMutation.mutate([newAttendanceRecord]);
  };

  const getDateValue = (dateString) => {
    if (!dateString) return undefined;
    try {
      return parseISO(dateString);
    } catch {
      return undefined;
    }
  };

  return (
    <div className="h-[calc(100vh-140px)] flex flex-col overflow-hidden">
      {/* Action Buttons */}
      {isDirty && (
        <div className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-end flex-shrink-0">
          <Button onClick={handleSave} variant="outline" size="sm" type="button">
            <Save className="w-4 h-4 mr-2" />
            Save
          </Button>
        </div>
      )}

      {/* FORM */}
      <form
        className="px-6 py-4 bg-white border-b border-slate-200 flex-shrink-0 class-form-section"
        onSubmit={(e) => {
          e.preventDefault();
          if (beginDateOpen || endDateOpen) return;
          handleSave();
        }}
        onKeyDownCapture={(e) => {
          if (e.key !== "Enter" || e.shiftKey) return;

          const el = e.target;
          if (el?.tagName === "TEXTAREA") return;

          const selectOpen = document.querySelector('[data-state="open"][role="listbox"]');
          if (selectOpen) return;

          if (beginDateOpen || endDateOpen) return;

          e.preventDefault();
          handleSave();
        }}
      >
        <div className="space-y-4">
          <div>
            <Label className="text-sm font-medium mb-1.5 block">
              Class Name <span className="text-red-500">*</span>
            </Label>
            <Input
              ref={classNameRef}
              value={classData.title || ""}
              onChange={(e) => handleFieldChange("title", e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleSave();
                }
              }}
              placeholder="Enter class name"
              className="w-full"
            />
          </div>

          <div className="grid grid-cols-4 gap-4">
            <div>
              <Label className="text-sm font-medium mb-1.5 block">Year</Label>
              <Input value={context?.year || ""} disabled className="bg-slate-50" />
            </div>

            <div>
              <Label className="text-sm font-medium mb-1.5 block">
                Begin Date <span className="text-red-500">*</span>
              </Label>
              <Popover open={beginDateOpen} onOpenChange={setBeginDateOpen}>
                <PopoverTrigger asChild>
                  <Button type="button" variant="outline" className="w-full justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {classData.begin_date ? format(parseISO(classData.begin_date), "MM/dd/yyyy") : "Select"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={getDateValue(classData.begin_date)}
                    onSelect={handleBeginDateSelect}
                    defaultMonth={getDateValue(classData.begin_date) || new Date(context?.year || new Date().getFullYear(), 0, 1)}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div>
              <Label className="text-sm font-medium mb-1.5 block">
                End Date <span className="text-red-500">*</span>
              </Label>
              <Popover open={endDateOpen} onOpenChange={setEndDateOpen}>
                <PopoverTrigger asChild>
                  <Button type="button" variant="outline" className="w-full justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {classData.end_date ? format(parseISO(classData.end_date), "MM/dd/yyyy") : "Select"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={getDateValue(classData.end_date)}
                    onSelect={handleEndDateSelect}
                    defaultMonth={getDateValue(classData.end_date) || getDateValue(classData.begin_date) || new Date(context?.year || new Date().getFullYear(), 0, 1)}
                    disabled={(date) => classData.begin_date && isBefore(date, parseISO(classData.begin_date))}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div>
              <Label className="text-sm font-medium mb-1.5 block">Units</Label>
              <Input
                type="number"
                step="0.5"
                min="0"
                value={classData.credit_hours || ""}
                onChange={(e) => handleFieldChange("credit_hours", parseFloat(e.target.value) || "")}
                placeholder="1.0"
              />
            </div>
          </div>



            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Speakers */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <Label className="text-xs font-medium">Speakers</Label>
                  <button
                    type="button"
                    className="flex items-center gap-1 text-xs text-slate-600 hover:text-slate-900"
                    onClick={() => navigate(createPageUrl("InstructorManagement"))}
                  >
                    <Pencil className="w-3 h-3" />
                    Edit
                  </button>
                </div>
                <SpeakerSelector
                  selectedSpeakerIds={classData.speaker_ids || []}
                  onChange={handleSpeakersChange}
                />
              </div>

              {/* Method */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <Label className="text-xs font-medium">Method</Label>
                  <button
                    type="button"
                    className="flex items-center gap-1 text-xs text-slate-600 hover:text-slate-900"
                    onClick={() => navigate(createPageUrl("MethodManagement"))}
                  >
                    <Pencil className="w-3 h-3" />
                    Edit
                  </button>
                </div>
                <Select value={classData.method || ""} onValueChange={(val) => handleFieldChange("method", val)}>
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    {methods?.filter((m) => m.is_active !== false).map((method) => (
                      <SelectItem key={method.id} value={method.name}>
                        {method.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Joint Sponsor */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <Label className="text-xs font-medium">Joint Sponsor</Label>
                  <button
                    type="button"
                    className="flex items-center gap-1 text-xs text-slate-600 hover:text-slate-900"
                    onClick={() => navigate(createPageUrl("JointSponsorManagement"))}
                  >
                    <Pencil className="w-3 h-3" />
                    Edit
                  </button>
                </div>
                <Select value={classData.joint_sponsor || ""} onValueChange={(val) => handleFieldChange("joint_sponsor", val)}>
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder="None" />
                  </SelectTrigger>
                  <SelectContent>
                    {sponsors?.filter((s) => s.is_active !== false).map((sponsor) => (
                      <SelectItem key={sponsor.id} value={sponsor.name}>
                        {sponsor.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Credit Lines */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <Label className="text-xs font-medium">Credit</Label>
                <button
                  type="button"
                  className="flex items-center gap-1 text-xs text-slate-600 hover:text-slate-900"
                  onClick={() => navigate(createPageUrl("CreditManagement"))}
                >
                  <Pencil className="w-3 h-3" />
                  Edit
                </button>
              </div>
              <CreditLinesEditor
                credits={classData.credits || []}
                onChange={(newCredits) => handleFieldChange("credits", newCredits)}
              />
            </div>

            <button type="submit" className="hidden" aria-hidden="true" />
          </div>
        </form>

      {/* WORKSPACE */}
      <div className="flex-1 bg-slate-50 overflow-y-auto">
        {!showAttendanceBox && (
          <ClassManagementLayout
            left={{
              header: (
                <div>
                  <h3 className="font-semibold text-sm mb-3">Class List ({yearClasses.length})</h3>
                  <Input
                    value={classSearchTerm}
                    onChange={(e) => setClassSearchTerm(e.target.value)}
                    placeholder="Search by title, speaker, credit..."
                    className="h-9"
                  />
                </div>
              ),
              body: (
                <div className="space-y-2" data-class-list tabIndex={0}>
                  {yearClasses.length === 0 ? (
                    <div className="text-center py-8 text-slate-500 text-sm">
                      No classes for {context?.year}
                    </div>
                  ) : (
                    yearClasses.map((cls) => {
                      const classCredits = (cls.credits || [])
                        .map((c) => {
                          const creditType = credits?.find(ct => ct.id === c.credit_type_id);
                          return creditType ? { name: creditType.name, amount: c.amount } : null;
                        })
                        .filter(Boolean);

                      const classSpeakers = (cls.speaker_ids || [])
                        .map((id) => {
                          const speaker = instructors?.find(i => i.id === id);
                          if (!speaker) return null;
                          return {
                            name: `${speaker.first_name} ${speaker.last_name}${speaker.credentials ? ', ' + speaker.credentials : ''}`,
                            hospital: speaker.hospital
                          };
                        })
                        .filter(Boolean);

                      const isExpanded = expandedClassIds.includes(cls.id);
                      const shouldShowCreditsToggle = classCredits.length > 3;
                      const shouldShowSpeakersToggle = classSpeakers.length > 3;
                      const displayCredits = shouldShowCreditsToggle && !isExpanded ? classCredits.slice(0, 3) : classCredits;
                      const displaySpeakers = shouldShowSpeakersToggle && !isExpanded ? classSpeakers.slice(0, 3) : classSpeakers;

                      return (
                        <div key={cls.id} className={cn(
                          "flex items-start gap-2 px-3 py-1.5 rounded-lg text-xs transition-colors",
                          selectedClassId === cls.id
                            ? "bg-indigo-100 border border-indigo-300 font-medium"
                            : "hover:bg-slate-50 border border-transparent"
                        )}>
                          <button
                            onClick={() => handleClassSelect(cls)}
                            onDoubleClick={handleAttendance}
                            type="button"
                            className="flex-1 text-left"
                          >
                            <div className="text-xs leading-tight text-slate-900 font-semibold">{cls.title}</div>
                            <div className="text-xs text-slate-500 leading-tight mt-1">
                              {cls.begin_date && format(new Date(cls.begin_date), "MM/dd/yyyy")} •{" "}
                              {cls.credit_hours || 0} units
                            </div>
                            {displaySpeakers.length > 0 && (
                              <div className="text-xs text-slate-600 mt-1 space-y-0.5">
                                {displaySpeakers.map((s, idx) => (
                                  <div key={idx} className="flex items-center gap-2">
                                    <span>{s.name}</span>
                                    {s.hospital && (
                                      <span className="text-slate-400 text-[0.7rem]">
                                        {s.hospital}
                                      </span>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                            {displayCredits.length > 0 && (
                              <div className="text-xs text-slate-600 mt-1">
                                {displayCredits.map((c, i) => `${c.name} ${c.amount.toFixed(2)}`).join(" • ")}
                              </div>
                            )}
                          </button>
                          {(shouldShowCreditsToggle || shouldShowSpeakersToggle) && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setExpandedClassIds(prev => 
                                  isExpanded ? prev.filter(id => id !== cls.id) : [...prev, cls.id]
                                );
                              }}
                              className="text-xs text-indigo-600 hover:text-indigo-800 whitespace-nowrap flex-shrink-0"
                            >
                              {isExpanded ? "Hide" : "View all"}
                            </button>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              ),
            }}
            right={
              <div className="space-y-2">
                <Button onClick={handleNewClass} variant="outline" className="w-full justify-start" type="button">
                  <Plus className="w-4 h-4 mr-2" />
                  New Class
                </Button>
                <Button onClick={() => setDeleteDialogOpen(true)} disabled={!selectedClassId} variant="outline" className="w-full justify-start" type="button">
                  Delete Class
                </Button>
                <Button onClick={handleAttendance} variant="outline" className="w-full justify-start" type="button">
                  Class Attendance
                </Button>

                <div className="border-t border-slate-200 my-4" />

                <div>
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">Certificates</p>
                  <div className="space-y-2">
                    <Button onClick={() => setCertTabOpen(true)} disabled={!selectedClassId} variant="outline" className="w-full justify-start" type="button">
                      <Award className="w-4 h-4 mr-2" />
                      Manage Certificates
                    </Button>
                  </div>
                </div>

                <div className="border-t border-slate-200 my-4" />

                <div>
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">Print</p>
                  <div className="space-y-2">
                    <Button onClick={() => navigate(createPageUrl(`CertificateSetup?classId=${selectedClassId}`))} disabled={!selectedClassId} variant="outline" className="w-full justify-start" type="button">
                      Print Certificates (Legacy)
                    </Button>
                    <Button onClick={() => handlePrintReport("signin")} variant="outline" className="w-full justify-start" type="button">
                      Print Sign-in Sheet
                    </Button>
                    <Button onClick={() => handlePrintReport("nametags")} variant="outline" className="w-full justify-start" type="button">
                      Print Name Tags
                    </Button>
                    <Button onClick={() => handlePrintReport("classlist")} variant="outline" className="w-full justify-start" type="button">
                      Print Class List
                    </Button>
                  </div>
                </div>
              </div>
            }
          />
        )}

        {certTabOpen && (
          <div className="fixed inset-0 bg-black/50 z-[9998] flex items-center justify-center p-4">
            <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between p-6 border-b sticky top-0 bg-white">
                <h2 className="text-xl font-semibold">Certificate Management</h2>
                <button onClick={() => setCertTabOpen(false)} className="text-slate-500 hover:text-slate-900">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-6">
                {selectedClassId && (
                  <Tabs defaultValue="setup" className="w-full">
                    <TabsList className="grid w-full max-w-md grid-cols-2">
                      <TabsTrigger value="setup">Setup</TabsTrigger>
                      <TabsTrigger value="issue">Issue</TabsTrigger>
                    </TabsList>

                    <TabsContent value="setup" className="mt-6">
                      <ActivityCertificateSetup 
                        activityId={selectedClassId}
                        hospital_id={context?.hospital_id}
                      />
                    </TabsContent>

                    <TabsContent value="issue" className="mt-6">
                      <CertificateIssuanceScreen 
                        activityId={selectedClassId}
                        hospital_id={context?.hospital_id}
                      />
                    </TabsContent>
                  </Tabs>
                )}
              </div>
            </Card>
          </div>
        )}

        {showAttendanceBox && selectedClassId && (
          <div className="w-full max-w-[1400px] mx-auto px-4 md:px-6 py-6">
            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b bg-slate-50 flex items-center justify-between">
                <h3 className="font-semibold text-sm">Attendance Management</h3>
                <Button
                  onClick={() => setShowAttendanceBox(false)}
                  variant="ghost"
                  size="sm"
                  type="button"
                >
                  Close
                </Button>
              </div>
              <div className="p-4 min-h-[400px] overflow-y-auto max-h-[70vh]">
                <div className="flex gap-4 flex-wrap lg:flex-nowrap">
                  <div className="flex-1 min-w-0">
                    <AvailableNamesPanel
                      participants={availableParticipants}
                      selectedIds={selectedParticipantIds}
                      onToggleSelect={handleToggleSelectParticipant}
                      onAddNew={() => setQuickAddModalOpen(true)}
                      onEdit={(participant) => navigate(createPageUrl(`NameManagement?participantId=${participant.id}`))}
                    />
                  </div>

                  <div className="flex items-start justify-center lg:sticky lg:top-0">
                    <StatusButtons
                      selectedCount={selectedParticipantIds.length}
                      onAssignStatus={selectedParticipantIds.length > 0 ? handleAssignStatus : handleStatusChange}
                      disabled={!selectedClassId || (selectedParticipantIds.length === 0 && !selectedAttendeeId)}
                      mode={selectedParticipantIds.length > 0 ? "add" : "edit"}
                    />
                  </div>

                  <div className="flex-1 min-w-0">
                    <AttendeesPanel
                      attendees={currentAttendees}
                      onStatusChange={handleStatusChange}
                      onRemove={handleRemoveAttendee}
                      participants={participants}
                      selectedAttendeeId={selectedAttendeeId}
                      onSelectAttendee={setSelectedAttendeeId}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Class</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this class? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Print Modal */}
      <ClassListReport
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        classes={selectedClassId && allClasses ? allClasses.filter((c) => c.id === selectedClassId) : yearClasses}
        settings={settings}
      />

      {/* Quick Add Participant Modal */}
      <QuickAddParticipantModal
        open={quickAddModalOpen}
        onClose={() => setQuickAddModalOpen(false)}
        onCreateAndEdit={handleCreateAndEdit}
        onAddExisting={handleAddExistingToClass}
        existingParticipants={participants || []}
      />

      {/* CE Record Edit Modal */}
      <CERecordEditModal
        open={ceRecordEditModalOpen}
        onClose={() => {
          setCERecordEditModalOpen(false);
          setPendingCERecord(null);
        }}
        record={pendingCERecord}
        participantName={pendingCERecord?.participant_name}
        className={pendingCERecord?.class_title}
        onSave={async (updatedRecord) => {
          try {
            await base44.entities.CERecord.update(pendingCERecord.id, updatedRecord);
            await queryClient.invalidateQueries({ queryKey: ["ceRecords"] });
            toast.success("CE Record saved");
            setCERecordEditModalOpen(false);
            setPendingCERecord(null);
          } catch (err) {
            console.error(err);
            toast.error("Failed to save CE Record");
          }
        }}
        onCancel={async () => {
          if (pendingCERecord?.id) {
            const confirmDelete = window.confirm(
              "Are you sure you want to discard this CE Record?"
            );
            if (confirmDelete) {
              try {
                await base44.entities.CERecord.delete(pendingCERecord.id);
                await queryClient.invalidateQueries({ queryKey: ["ceRecords"] });
                toast.success("CE Record discarded");
              } catch (err) {
                console.error(err);
                toast.error("Failed to discard CE Record");
              }
            }
          }
          setCERecordEditModalOpen(false);
          setPendingCERecord(null);
        }}
      />
    </div>
  );
}