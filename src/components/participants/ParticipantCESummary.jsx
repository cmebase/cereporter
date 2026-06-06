import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import DraggableResizableDialog from "../management/DraggableResizableDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Pencil, Trash2, Plus, Printer, FileText, X } from "lucide-react";
import { parseISO, format } from "date-fns";
import jsPDF from "jspdf";
import PDFViewer from "../common/PDFViewer";
import CertificateIssuanceScreen from "../certificates/CertificateIssuanceScreen";

function DatePickerField({ value, onChange, placeholder = "Pick a date" }) {
  const selectedDate = React.useMemo(() => {
    if (!value) return undefined;
    try {
      return parseISO(value);
    } catch {
      return undefined;
    }
  }, [value]);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className="h-10 w-full justify-start text-left font-normal border-slate-300 hover:bg-slate-50"
        >
          📅 {value ? format(parseISO(value), "MM/dd/yyyy") : placeholder}
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-auto p-0" align="start" side="bottom">
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={(d) => {
            if (!d) return;
            onChange(format(d, "yyyy-MM-dd"));
          }}
          disabled={(date) => date > new Date()}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
}

export default function ParticipantCESummary({ open, participantId, onClose }) {
  const queryClient = useQueryClient();
  const [editingRecordId, setEditingRecordId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [participantForm, setParticipantForm] = useState({});
  const [certificateSetupOpen, setCertificateSetupOpen] = useState(false);
  const [transcriptRangeOpen, setTranscriptRangeOpen] = useState(false);
  const [transcriptStart, setTranscriptStart] = useState("");
  const [transcriptEnd, setTranscriptEnd] = useState("");
  const [transcriptPreviewOpen, setTranscriptPreviewOpen] = useState(false);
  const [previewRecords, setPreviewRecords] = useState([]);
  const [previewDates, setPreviewDates] = useState({ start: "", end: "" });
  const [previewPdfData, setPreviewPdfData] = useState(null);
  const [certificatePrintOpen, setCertificatePrintOpen] = useState(false);
  const [certificateRecordPrintOpen, setCertificateRecordPrintOpen] = useState(false);
  const [selectedCertificateRecord, setSelectedCertificateRecord] = useState(null);

  const context = useMemo(() => {
    const stored = sessionStorage.getItem("ce_context");
    return stored ? JSON.parse(stored) : null;
  }, []);

  // Fetch participant
  const { data: participant } = useQuery({
    queryKey: ["participant", participantId],
    queryFn: async () => {
      const list = await base44.entities.Participant.list();
      const found = list.find((p) => p.id === participantId);
      return found || null;
    },
    enabled: !!participantId && open,
  });

  // Fetch CE records for this participant and year
  const { data: ceRecords = [] } = useQuery({
    queryKey: ["ceRecords", participantId, context?.year],
    queryFn: async () => {
      const list = await base44.entities.CERecord.list();
      return list.filter(
        (r) => r.participant_id === participantId && r.year === context?.year
      );
    },
    enabled: !!participantId && !!context?.year && open,
  });

  // Fetch credits for dropdown
  const { data: credits = [] } = useQuery({
    queryKey: ["credits"],
    queryFn: async () => {
      try {
        return await base44.entities.Credit.list();
      } catch {
        return [];
      }
    },
  });

  // Fetch titles for dropdown
  const { data: titles = [] } = useQuery({
    queryKey: ["titles"],
    queryFn: async () => {
      try {
        return await base44.entities.Title.list();
      } catch {
        return [];
      }
    },
  });

  // Fetch specialties for dropdown
  const { data: specialties = [] } = useQuery({
    queryKey: ["specialties"],
    queryFn: async () => {
      try {
        return await base44.entities.Specialty.list();
      } catch {
        return [];
      }
    },
  });

  // Fetch statuses for dropdown
  const { data: statuses = [] } = useQuery({
    queryKey: ["statuses"],
    queryFn: async () => {
      try {
        return await base44.entities.Status.list();
      } catch {
        return [];
      }
    },
  });

  // Fetch hospital for transcript
  const { data: hospital } = useQuery({
    queryKey: ["hospital", context?.hospital_id],
    queryFn: async () => {
      if (!context?.hospital_id) return null;
      const list = await base44.entities.Hospital.list();
      return list.find((h) => h.id === context.hospital_id) || null;
    },
    enabled: !!context?.hospital_id && open,
  });

  // Initialize participant form when data loads
  React.useEffect(() => {
    if (participant) {
      setParticipantForm(participant);
    }
  }, [participant]);

  // Set default date range when modal opens
  React.useEffect(() => {
    if (!open) return;
    if (context?.year && !transcriptStart && !transcriptEnd) {
      setTranscriptStart(`${context.year}-01-01`);
      setTranscriptEnd(`${context.year}-12-31`);
    }
  }, [open, context?.year, transcriptStart, transcriptEnd]);

  // Calculate summary
  const summary = useMemo(() => {
    const totalClasses = ceRecords.length;
    const totalUnits = ceRecords.reduce((sum, r) => sum + (r.credit_hours || 0), 0);
    const creditBreakdown = {};
    ceRecords.forEach((r) => {
      const type = r.credit_type || "Unknown";
      creditBreakdown[type] = (creditBreakdown[type] || 0) + (r.credit_hours || 0);
    });
    return { totalClasses, totalUnits, creditBreakdown };
  }, [ceRecords]);

  // Update participant
  const updateParticipantMutation = useMutation({
    mutationFn: async (data) => base44.entities.Participant.update(participantId, data),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["participant", participantId] });
      await queryClient.invalidateQueries({ queryKey: ["participants"] });
      toast.success("Participant updated");
    },
    onError: () => toast.error("Failed to update participant"),
  });

  // Update CE record
  const updateCERecordMutation = useMutation({
    mutationFn: async ({ id, data }) => base44.entities.CERecord.update(id, data),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["ceRecords", participantId, context?.year] });
      setEditingRecordId(null);
      toast.success("CE record updated");
    },
    onError: () => toast.error("Failed to update record"),
  });

  // Delete CE record
  const deleteCERecordMutation = useMutation({
    mutationFn: async (id) => base44.entities.CERecord.delete(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["ceRecords", participantId, context?.year] });
      toast.success("CE record deleted");
    },
    onError: () => toast.error("Failed to delete record"),
  });

  // Create CE record
  const createCERecordMutation = useMutation({
    mutationFn: async (data) => base44.entities.CERecord.create(data),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["ceRecords", participantId, context?.year] });
      toast.success("CE record created");
    },
    onError: () => toast.error("Failed to create record"),
  });

  const handleParticipantSave = () => {
    updateParticipantMutation.mutate(participantForm);
  };

  const handleEditRecord = (record) => {
    setEditingRecordId(record.id);
    setEditForm(record);
  };

  const handleSaveRecord = () => {
    updateCERecordMutation.mutate({ id: editingRecordId, data: editForm });
  };

  const handleDeleteRecord = (id) => {
    if (window.confirm("Delete this CE record?")) {
      deleteCERecordMutation.mutate(id);
    }
  };

  const handleAddRecord = () => {
    const newRecord = {
      participant_id: participantId,
      participant_name: `${participant?.last_name || ""} ${participant?.first_name || ""}`,
      class_id: "",
      class_title: "",
      hospital: context?.hospital_name || "",
      date: format(new Date(), "yyyy-MM-dd"),
      year: context?.year,
      credit_type: "",
      credit_hours: 0,
      instructor_name: "",
      method: "",
      status: "completed",
      notes: "",
    };
    createCERecordMutation.mutate(newRecord);
  };

  const fetchCERecordsByDateRange = async (startDate, endDate) => {
    const list = await base44.entities.CERecord.list();
    const classes = await base44.entities.CEClass.list();
    const start = parseISO(startDate);
    const end = parseISO(endDate);
    end.setHours(23, 59, 59, 999);

    const filtered = list.filter((r) => {
      if (r.participant_id !== participantId) return false;
      if (!r.date) return false;

      if (context?.hospital_id) {
        // prefer explicit hospital_id if present, otherwise fall back to hospital name compare
        if (r.hospital_id && r.hospital_id !== context.hospital_id) return false;
        if (!r.hospital_id && r.hospital && context?.hospital_name && r.hospital !== context.hospital_name) return false;
      }

      const d = new Date(r.date);
      return d >= start && d <= end;
    });

    // Merge class data into records, ensuring all fields are populated
    return filtered.map((record) => {
      const classData = classes.find((c) => c.id === record.class_id);
      if (classData) {
        return {
          ...record,
          // Use class data as fallback for missing fields
          credit_hours: record.credit_hours !== undefined && record.credit_hours !== null ? record.credit_hours : (classData.credit_hours || 0),
          credit_type: record.credit_type || classData.credit_type || "",
          instructor_name: record.instructor_name || classData.speaker_names || "",
          class_title: record.class_title || classData.title || "",
        };
      }
      return {
        ...record,
        credit_hours: record.credit_hours || 0,
        credit_type: record.credit_type || "",
        instructor_name: record.instructor_name || "",
        class_title: record.class_title || "",
      };
    });
  };

  const generateTranscriptPdf = (recordsToPrint, startDate, endDate, returnBlob = false) => {
    if (!participant || recordsToPrint.length === 0) {
      if (!returnBlob) toast.error("No CE records in that date range");
      return null;
    }
    if (!hospital) {
      if (!returnBlob) toast.error("Hospital information not available");
      return null;
    }

    try {
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'in',
        format: 'letter'
      });

      const sortedRecords = [...recordsToPrint].sort((a, b) => {
        const dateA = new Date(a.date || 0);
        const dateB = new Date(b.date || 0);
        return dateA - dateB;
      });

      const totalClasses = recordsToPrint.length;
      const totalUnits = recordsToPrint.reduce((sum, r) => sum + (parseFloat(r.credit_hours) || 0), 0);

      const creditsByType = {};
      recordsToPrint.forEach((r) => {
        const type = r.credit_type || "Unknown";
        const hours = parseFloat(r.credit_hours) || 0;
        creditsByType[type] = (creditsByType[type] || 0) + hours;
      });

      let yPos = 1.2;

      pdf.setFont('times', 'bolditalic');
      pdf.setFontSize(20);
      pdf.text(hospital.profile_name || hospital.name || "", 4.25, yPos, { align: 'center' });
      yPos += 0.3;

      pdf.setFontSize(12);
      if (hospital.city_state) {
        pdf.text(hospital.city_state, 4.25, yPos, { align: 'center' });
        yPos += 0.25;
      }

      const formattedStart = format(new Date(startDate), 'MM/dd/yyyy');
      const formattedEnd = format(new Date(endDate), 'MM/dd/yyyy');
      pdf.setFontSize(14);
      pdf.text(
        `Transcript (${formattedStart} to ${formattedEnd})`,
        4.25,
        yPos,
        { align: 'center' }
      );
      yPos += 0.6;

      // Get title abbreviation
      const titleObj = titles.find(t => t.name === participant.title);
      const titleAbbr = titleObj?.abbreviation ? ` ${titleObj.abbreviation}` : "";
      const fullName = `${participant.first_name || ""} ${participant.last_name || ""}`.trim();
      const nameWithTitle = `${fullName.toUpperCase()}${titleAbbr}`;

      pdf.setFont('times', 'normal');
      pdf.setFontSize(12);
      pdf.text(nameWithTitle, 0.75, yPos);

      const summaryX = 5.5;
      let summaryY = yPos;
      pdf.setFont('times', 'normal');
      pdf.text(`Number of Classes: ${totalClasses}`, summaryX, summaryY);
      summaryY += 0.2;

      yPos += 0.2;
      const addressParts = [];
      if (participant.address1) addressParts.push(participant.address1.toUpperCase());
      if (participant.address2) addressParts.push(participant.address2.toUpperCase());

      if (addressParts.length > 0) {
        pdf.setFont('times', 'normal');
        pdf.text(addressParts[0], 0.75, yPos);
        yPos += 0.2;
        if (addressParts.length > 1) {
          pdf.text(addressParts[1], 0.75, yPos);
          yPos += 0.2;
        }
      }

      pdf.text(`Total Units: ${totalUnits}`, summaryX, summaryY);
      summaryY += 0.2;
      pdf.text("Credit:", summaryX, summaryY);
      summaryY += 0.2;

      Object.entries(creditsByType)
        .sort(([a], [b]) => a.localeCompare(b))
        .forEach(([type, hours]) => {
          const creditLine = `${type} - ${hours}`;
          pdf.text(creditLine, summaryX + 0.3, summaryY);
          summaryY += 0.2;
        });

      yPos = Math.max(yPos, summaryY) + 0.3;

      pdf.setTextColor(0, 0, 0);
      pdf.setFont('times', 'italic');
      pdf.setFontSize(11);
      pdf.text("Class Name", 0.75, yPos);
      pdf.text("Date", 3.2, yPos);
      pdf.text("Units", 4.5, yPos);
      pdf.text("Credit", 5.2, yPos);
      pdf.text("Instructor", 6.2, yPos);
      
      // Draw thin underlines under header text only
      const underlineY = yPos + 0.03;
      pdf.setDrawColor(120);
      pdf.setLineWidth(0.002);
      
      pdf.setFont('times', 'italic');
      pdf.setFontSize(11);
      const headers = ["Class Name", "Date", "Units", "Credit", "Instructor"];
      const positions = [0.75, 3.2, 4.5, 5.2, 6.2];
      positions.forEach((x, i) => {
        const w = pdf.getTextWidth(headers[i]);
        pdf.line(x, underlineY, x + w, underlineY);
      });
      
      yPos += 0.23;

      pdf.setTextColor(0, 0, 0);
      pdf.setFont('times', 'normal');
      pdf.setFontSize(10);
      sortedRecords.forEach((r) => {
        if (yPos > 10.0) {
          pdf.addPage();
          yPos = 1.0;
        }

        const date = r.date ? format(new Date(r.date), 'MM/dd/yyyy') : "";

        const titleLines = pdf.splitTextToSize(r.class_title || "", 2.3);
        pdf.text(titleLines, 0.75, yPos);

        pdf.text(date, 3.2, yPos);
        pdf.text(String(parseFloat(r.credit_hours) || 0), 4.5, yPos);

        const creditLines = pdf.splitTextToSize(r.credit_type || "", 0.9);
        pdf.text(creditLines, 5.2, yPos);

        const instructorLines = pdf.splitTextToSize(r.instructor_name || "", 1.4);
        pdf.text(instructorLines, 6.2, yPos);

        const maxLines = Math.max(titleLines.length, creditLines.length, instructorLines.length);
        yPos += maxLines * 0.15 + 0.1;
      });

      if (returnBlob) {
        return pdf.output('blob');
      } else {
        const safeStart = startDate || "start";
        const safeEnd = endDate || "end";
        pdf.save(`Transcript_${participant.last_name}_${safeStart}_to_${safeEnd}.pdf`);
        toast.success("Transcript generated");
        return null;
      }
    } catch (e) {
      console.error("PDF generation error:", e);
      if (!returnBlob) toast.error("Failed to generate transcript");
      return null;
    }
  };

  const handlePrintCertificates = () => {
    if (ceRecords.length === 0) {
      toast.error("No CE records available for certificate printing");
      return;
    }
    setCertificateSetupOpen(true);
  };

  if (!participant) return null;

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 bg-white z-[9999] flex flex-col">
        {/* Header */}
        <div className="border-b bg-slate-50 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold">Class List for {context?.year || "N/A"}</h2>
          <div className="flex gap-2">
             <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setCertificatePrintOpen(true)}
                disabled={ceRecords.length === 0}
              >
                <Printer className="w-4 h-4 mr-2" />
                Print Certificate
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setTranscriptRangeOpen(true)}
                disabled={ceRecords.length === 0}
              >
                <FileText className="w-4 h-4 mr-2" />
                Print Transcript
              </Button>
              <Button variant="outline" size="sm" onClick={onClose}>
               Done
             </Button>
           </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto">
        <div className="space-y-4 overflow-x-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-4">
            {/* Left: Participant Info */}
            <Card className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Participant Information</h3>
              <div className="flex items-center gap-2">
                <Label className="text-sm">Active</Label>
                <input
                  type="checkbox"
                  checked={!!participantForm.is_active}
                  onChange={(e) =>
                    setParticipantForm((prev) => ({ ...prev, is_active: e.target.checked }))
                  }
                  className="h-4 w-4 rounded border-slate-300"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>Name ID</Label>
                <Input
                  value={participantForm.name_id || ""}
                  onChange={(e) =>
                    setParticipantForm((prev) => ({ ...prev, name_id: e.target.value }))
                  }
                />
              </div>
              <div>
                <Label>Last Name</Label>
                <Input
                  value={participantForm.last_name || ""}
                  onChange={(e) =>
                    setParticipantForm((prev) => ({ ...prev, last_name: e.target.value }))
                  }
                />
              </div>
              <div>
                <Label>First Name</Label>
                <Input
                  value={participantForm.first_name || ""}
                  onChange={(e) =>
                    setParticipantForm((prev) => ({ ...prev, first_name: e.target.value }))
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>Title</Label>
                {titles.length > 0 ? (
                  <Select
                    value={participantForm.title || ""}
                    onValueChange={(v) =>
                      setParticipantForm((prev) => ({ ...prev, title: v }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      {titles.map((t) => (
                        <SelectItem key={t.id} value={t.name}>
                          {t.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    value={participantForm.title || ""}
                    onChange={(e) =>
                      setParticipantForm((prev) => ({ ...prev, title: e.target.value }))
                    }
                  />
                )}
              </div>
              <div>
                <Label>Specialty</Label>
                {specialties.length > 0 ? (
                  <Select
                    value={participantForm.specialty || ""}
                    onValueChange={(v) =>
                      setParticipantForm((prev) => ({ ...prev, specialty: v }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      {specialties.map((s) => (
                        <SelectItem key={s.id} value={s.name}>
                          {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    value={participantForm.specialty || ""}
                    onChange={(e) =>
                      setParticipantForm((prev) => ({ ...prev, specialty: e.target.value }))
                    }
                  />
                )}
              </div>
              <div>
                <Label>Status</Label>
                {statuses.length > 0 ? (
                  <Select
                    value={participantForm.status || ""}
                    onValueChange={(v) =>
                      setParticipantForm((prev) => ({ ...prev, status: v }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      {statuses.map((s) => (
                        <SelectItem key={s.id} value={s.name}>
                          {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    value={participantForm.status || ""}
                    onChange={(e) =>
                      setParticipantForm((prev) => ({ ...prev, status: e.target.value }))
                    }
                  />
                )}
              </div>
            </div>

            <div className="pt-2 border-t">
              <Button onClick={handleParticipantSave} disabled={updateParticipantMutation.isPending}>
                Save Changes
              </Button>
            </div>
          </Card>

          {/* Right: Summary */}
          <Card className="p-4 space-y-3">
            <h3 className="font-semibold">CE Summary</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Number of Classes:</span>
                <span className="font-semibold">{summary.totalClasses}</span>
              </div>
              <div className="flex justify-between">
                <span>Total Units:</span>
                <span className="font-semibold">{summary.totalUnits.toFixed(1)}</span>
              </div>
              <div className="pt-2 border-t">
                <div className="font-medium mb-1">Credit Breakdown:</div>
                {Object.keys(summary.creditBreakdown).length > 0 ? (
                  Object.entries(summary.creditBreakdown).map(([type, units]) => (
                    <div key={type} className="flex justify-between text-xs">
                      <span>{type}</span>
                      <span className="font-medium">{units.toFixed(1)}</span>
                    </div>
                  ))
                ) : (
                  <div className="text-xs text-slate-400">No credits yet</div>
                )}
              </div>
            </div>
          </Card>
        </div>

        {/* CE Records Grid */}
        <Card className="mt-4 p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold">CE Records</h3>
            <Button size="sm" onClick={handleAddRecord}>
              <Plus className="w-4 h-4 mr-2" />
              Add CE Record
            </Button>
          </div>

          {ceRecords.length === 0 ? (
            <div className="text-center py-8 text-slate-400">
              No CE records for {context?.year}
            </div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b">
                  <tr>
                    <th className="text-left p-2">Class</th>
                    <th className="text-left p-2">Date</th>
                    <th className="text-left p-2">Units</th>
                    <th className="text-left p-2">Credit Type</th>
                    <th className="text-left p-2">Status</th>
                    <th className="text-right p-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {ceRecords.map((record) => (
                    <tr key={record.id} className="border-b hover:bg-slate-50">
                      {editingRecordId === record.id ? (
                        <>
                          <td className="p-2">
                            <Input
                              value={editForm.class_title || ""}
                              onChange={(e) =>
                                setEditForm((prev) => ({ ...prev, class_title: e.target.value }))
                              }
                              className="h-8"
                            />
                          </td>
                          <td className="p-2">
                            <DatePickerField
                              value={editForm.date || ""}
                              onChange={(iso) => setEditForm((prev) => ({ ...prev, date: iso }))}
                            />
                          </td>
                          <td className="p-2">
                            <Input
                              type="number"
                              step="0.1"
                              value={editForm.credit_hours || 0}
                              onChange={(e) =>
                                setEditForm((prev) => ({
                                  ...prev,
                                  credit_hours: parseFloat(e.target.value),
                                }))
                              }
                              className="h-8 w-20"
                            />
                          </td>
                          <td className="p-2">
                            <Select
                              value={editForm.credit_type || ""}
                              onValueChange={(v) =>
                                setEditForm((prev) => ({ ...prev, credit_type: v }))
                              }
                            >
                              <SelectTrigger className="h-8">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {credits.map((c) => (
                                  <SelectItem key={c.id} value={c.name}>
                                    {c.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </td>
                          <td className="p-2">
                            <Select
                              value={editForm.status || "completed"}
                              onValueChange={(v) =>
                                setEditForm((prev) => ({ ...prev, status: v }))
                              }
                            >
                              <SelectTrigger className="h-8">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="completed">Completed</SelectItem>
                                <SelectItem value="pending">Pending</SelectItem>
                                <SelectItem value="cancelled">Cancelled</SelectItem>
                              </SelectContent>
                            </Select>
                          </td>
                          <td className="p-2 text-right">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={handleSaveRecord}
                              disabled={updateCERecordMutation.isPending}
                            >
                              Save
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setEditingRecordId(null)}
                              className="ml-1"
                            >
                              Cancel
                            </Button>
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="p-2">{record.class_title}</td>
                          <td className="p-2">{record.date ? format(new Date(record.date), 'MM/dd/yyyy') : ''}</td>
                          <td className="p-2">{record.credit_hours}</td>
                          <td className="p-2">{record.credit_type}</td>
                          <td className="p-2">
                            <span
                              className={`inline-block px-2 py-0.5 rounded text-xs ${
                                record.status === "completed"
                                  ? "bg-green-100 text-green-700"
                                  : record.status === "pending"
                                  ? "bg-yellow-100 text-yellow-700"
                                  : "bg-red-100 text-red-700"
                              }`}
                            >
                              {record.status}
                            </span>
                          </td>
                          <td className="p-2 text-right">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setSelectedCertificateRecord(record);
                                setCertificateRecordPrintOpen(true);
                              }}
                              title="Print certificate for this class"
                            >
                              <Printer className="w-3 h-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleEditRecord(record)}
                            >
                              <Pencil className="w-3 h-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDeleteRecord(record.id)}
                              className="text-red-600"
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            )}
          </Card>
          </div>
          </div>
          </div>

          {certificateSetupOpen && (
        <div className="fixed inset-0 bg-white z-[9999] flex flex-col">
          <button
            onClick={() => setCertificateSetupOpen(false)}
            className="absolute top-4 right-4 z-[10000] text-slate-500 hover:text-slate-700"
          >
            <X className="w-6 h-6" />
          </button>
          <div className="flex-1 overflow-auto">
            {ceRecords.length > 0 ? (
              <CertificateIssuanceScreen
                activityId={ceRecords[0]?.class_id}
                hospital_id={context?.hospital_id}
                participantId={participantId}
              />
            ) : (
              <div className="flex items-center justify-center h-full text-slate-500">
                <p>No CE records found for this participant</p>
              </div>
            )}
          </div>
        </div>
      )}

      {transcriptRangeOpen && (
        <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-200/60 overflow-hidden animate-in fade-in zoom-in-95 duration-200 relative z-[10000]">
            {/* Header */}
            <div className="relative bg-gradient-to-br from-indigo-50 to-purple-50 px-6 py-5 border-b border-slate-200/60">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg">
                  <FileText className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-slate-900 text-lg">Transcript Date Range</h3>
                  <p className="text-xs text-slate-600 mt-0.5">Select the period for transcript generation</p>
                </div>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => setTranscriptRangeOpen(false)}
                  className="text-slate-400 hover:text-slate-600 hover:bg-white/50 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 space-y-5">
              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                    Start Date
                  </Label>
                  <Input 
                    type="date" 
                    value={transcriptStart} 
                    onChange={(e) => setTranscriptStart(e.target.value)}
                    className="h-10 border-slate-300"
                  />
                </div>
                <div>
                  <Label className="text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                    End Date
                  </Label>
                  <Input 
                    type="date" 
                    value={transcriptEnd} 
                    onChange={(e) => setTranscriptEnd(e.target.value)}
                    className="h-10 border-slate-300"
                  />
                </div>
              </div>

              {transcriptStart && transcriptEnd && (
                <div className="bg-indigo-50 border border-indigo-200/60 rounded-xl p-3">
                  <p className="text-xs text-indigo-900 font-medium">
                    Date Range: {format(parseISO(transcriptStart), 'MMM d, yyyy')} → {format(parseISO(transcriptEnd), 'MMM d, yyyy')}
                  </p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="bg-slate-50 px-6 py-4 border-t border-slate-200/60 flex justify-end gap-3">
              <Button 
                variant="outline" 
                onClick={() => setTranscriptRangeOpen(false)}
                className="shadow-sm"
              >
                Cancel
              </Button>
              <Button
                onClick={async () => {
                  if (!hospital) {
                    toast.error("Hospital info not loaded yet. Try again.");
                    return;
                  }
                  if (!transcriptStart || !transcriptEnd) {
                    toast.error("Select a start and end date");
                    return;
                  }
                  if (new Date(transcriptStart) > new Date(transcriptEnd)) {
                    toast.error("Start date must be before end date");
                    return;
                  }

                  const records = await fetchCERecordsByDateRange(transcriptStart, transcriptEnd);
                  
                  if (records.length === 0) {
                    toast.error("No CE records found for this date range");
                    return;
                  }

                  // Generate PDF for preview
                   const pdf = new jsPDF({
                     orientation: 'portrait',
                     unit: 'in',
                     format: 'letter'
                   });

                   // Build PDF (reuse generateTranscriptPdf logic but capture arraybuffer)
                   const sortedRecords = [...records].sort((a, b) => {
                     const dateA = new Date(a.date || 0);
                     const dateB = new Date(b.date || 0);
                     return dateA - dateB;
                   });

                   const totalClasses = records.length;
                   const totalUnits = records.reduce((sum, r) => sum + (parseFloat(r.credit_hours) || 0), 0);

                   const creditsByType = {};
                   records.forEach((r) => {
                     const type = r.credit_type || "Unknown";
                     const hours = parseFloat(r.credit_hours) || 0;
                     creditsByType[type] = (creditsByType[type] || 0) + hours;
                   });

                   let yPos = 1.2;

                   pdf.setFont('times', 'bolditalic');
                   pdf.setFontSize(20);
                   pdf.text(hospital?.profile_name || hospital?.name || "", 4.25, yPos, { align: 'center' });
                   yPos += 0.3;

                   pdf.setFontSize(12);
                   if (hospital?.city_state) {
                     pdf.text(hospital.city_state, 4.25, yPos, { align: 'center' });
                     yPos += 0.25;
                   }

                   const formattedStart = format(new Date(transcriptStart), 'MM/dd/yyyy');
                   const formattedEnd = format(new Date(transcriptEnd), 'MM/dd/yyyy');
                   pdf.setFontSize(14);
                   pdf.text(
                     `Transcript (${formattedStart} to ${formattedEnd})`,
                     4.25,
                     yPos,
                     { align: 'center' }
                   );
                   yPos += 0.6;

                   // Get title abbreviation
                   const titleObj = titles.find(t => t.name === participant.title);
                   const titleAbbr = titleObj?.abbreviation ? ` ${titleObj.abbreviation}` : "";
                   const fullName = `${participant.first_name || ""} ${participant.last_name || ""}`.trim();
                   const nameWithTitle = `${fullName.toUpperCase()}${titleAbbr}`;

                   pdf.setFont('times', 'normal');
                   pdf.setFontSize(12);
                   pdf.text(nameWithTitle, 0.75, yPos);

                   const summaryX = 5.5;
                   let summaryY = yPos;
                   pdf.setFont('times', 'normal');
                   pdf.text(`Number of Classes: ${totalClasses}`, summaryX, summaryY);
                   summaryY += 0.2;

                   yPos += 0.2;
                   const addressParts = [];
                   if (participant.address1) addressParts.push(participant.address1.toUpperCase());
                   if (participant.address2) addressParts.push(participant.address2.toUpperCase());

                   if (addressParts.length > 0) {
                     pdf.text(addressParts[0], 0.75, yPos);
                     yPos += 0.2;
                     if (addressParts.length > 1) {
                       pdf.text(addressParts[1], 0.75, yPos);
                       yPos += 0.2;
                     }
                   }

                   pdf.text(`Total Units: ${totalUnits}`, summaryX, summaryY);
                   summaryY += 0.2;
                   pdf.text("Credit:", summaryX, summaryY);
                   summaryY += 0.2;

                   Object.entries(creditsByType)
                     .sort(([a], [b]) => a.localeCompare(b))
                     .forEach(([type, hours]) => {
                       const creditLine = `${type} - ${hours}`;
                       pdf.text(creditLine, summaryX + 0.3, summaryY);
                       summaryY += 0.2;
                     });

                   yPos = Math.max(yPos, summaryY) + 0.3;

                   pdf.setTextColor(0, 0, 0);
                   pdf.setFont('times', 'italic');
                   pdf.setFontSize(11);
                   pdf.text("Class Name", 0.75, yPos);
                   pdf.text("Date", 3.2, yPos);
                   pdf.text("Units", 4.5, yPos);
                   pdf.text("Credit", 5.2, yPos);
                   pdf.text("Instructor", 6.2, yPos);

                   // Draw thin underlines under header text only
                   const underlineY = yPos + 0.03;
                   pdf.setDrawColor(120);
                   pdf.setLineWidth(0.002);

                   pdf.setFont('times', 'italic');
                   pdf.setFontSize(11);
                   const headers = ["Class Name", "Date", "Units", "Credit", "Instructor"];
                   const positions = [0.75, 3.2, 4.5, 5.2, 6.2];
                   positions.forEach((x, i) => {
                     const w = pdf.getTextWidth(headers[i]);
                     pdf.line(x, underlineY, x + w, underlineY);
                   });

                   yPos += 0.23;

                   pdf.setTextColor(0, 0, 0);
                   pdf.setFont('times', 'normal');
                   pdf.setFontSize(10);
                   sortedRecords.forEach((r) => {
                     if (yPos > 10.0) {
                       pdf.addPage();
                       yPos = 1.0;
                     }

                     const date = r.date ? format(new Date(r.date), 'MM/dd/yyyy') : "";

                     const titleLines = pdf.splitTextToSize(r.class_title || "", 2.3);
                     pdf.text(titleLines, 0.75, yPos);

                     pdf.text(date, 3.2, yPos);
                     pdf.text(String(parseFloat(r.credit_hours) || 0), 4.5, yPos);

                     const creditLines = pdf.splitTextToSize(r.credit_type || "", 0.9);
                     pdf.text(creditLines, 5.2, yPos);

                     const instructorLines = pdf.splitTextToSize(r.instructor_name || "", 1.4);
                     pdf.text(instructorLines, 6.2, yPos);

                     const maxLines = Math.max(titleLines.length, creditLines.length, instructorLines.length);
                     yPos += maxLines * 0.15 + 0.1;
                   });

                   const pdfBytes = new Uint8Array(pdf.output("arraybuffer"));
                   setPreviewPdfData(pdfBytes);
                   setPreviewRecords(records);
                   setPreviewDates({ start: transcriptStart, end: transcriptEnd });
                   setTranscriptRangeOpen(false);
                   setTranscriptPreviewOpen(true);
                }}
                className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-lg shadow-indigo-500/30"
              >
                <FileText className="w-4 h-4 mr-2" />
                Preview Transcript
              </Button>
            </div>
          </div>
        </div>
      )}

      {transcriptPreviewOpen && previewPdfData && (
        <PDFViewer
          pdfData={previewPdfData}
          fileName={`Transcript_${format(parseISO(previewDates.start), 'MM/dd/yyyy')}_to_${format(parseISO(previewDates.end), 'MM/dd/yyyy')}.pdf`}
          onClose={() => {
            setTranscriptPreviewOpen(false);
            setPreviewPdfData(null);
          }}
        />
      )}

      {certificatePrintOpen && (
        <div className="fixed inset-0 bg-white z-[9999] flex flex-col">
          <button
            onClick={() => setCertificatePrintOpen(false)}
            className="absolute top-4 right-4 z-[10000] text-slate-500 hover:text-slate-700"
          >
            <X className="w-6 h-6" />
          </button>
          <div className="flex-1 overflow-auto">
            {ceRecords.length > 0 ? (
              <CertificateIssuanceScreen
                ceRecords={ceRecords}
                hospital_id={context?.hospital_id}
                participantId={participantId}
              />
            ) : (
              <div className="flex items-center justify-center h-full text-slate-500">
                <p>No CE records found for this participant</p>
              </div>
            )}
          </div>
        </div>
      )}

      {certificateRecordPrintOpen && selectedCertificateRecord && (
        <div className="fixed inset-0 bg-white z-[9999] flex flex-col">
          <div className="border-b p-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold">Edit Certificate - {selectedCertificateRecord.class_title}</h2>
            <Button 
              variant="outline"
              onClick={() => {
                setCertificateRecordPrintOpen(false);
                setSelectedCertificateRecord(null);
              }}
            >
              Done
            </Button>
          </div>
          <div className="flex-1 overflow-auto">
            <CertificateIssuanceScreen
              activityId={selectedCertificateRecord.class_id}
              hospital_id={context?.hospital_id}
              participantId={participantId}
              ceRecords={[selectedCertificateRecord]}
            />
          </div>
        </div>
      )}
      </>
      );
      }