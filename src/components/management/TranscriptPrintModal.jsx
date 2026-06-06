import React, { useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import jsPDF from "jspdf";
import { format, parseISO } from "date-fns";

import DraggableResizableDialog from "./DraggableResizableDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import ParticipantCESummary from "../participants/ParticipantCESummary";

/**
 * TranscriptPrintModal
 * Enhanced transcript printing with Hospital + Date Range selection
 * 
 * Features:
 * - Hospital selection (dropdown)
 * - Date range (start & end date)
 * - Quick date picks (YTD, Last 12 months, Custom)
 * - Participant selection (by name or by field filters)
 * - Permissions: Only assigned hospitals
 */

export default function TranscriptPrintModal({
  open,
  onClose,
  onPrinted,
}) {
  const [selectedHospitalId, setSelectedHospitalId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [startDateOpen, setStartDateOpen] = useState(false);
  const [endDateOpen, setEndDateOpen] = useState(false);
  
  const [mode, setMode] = useState("name");
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState([]);
  const [fieldSelected, setFieldSelected] = useState({
    title: new Set(),
    specialty: new Set(),
    spare: new Set(),
    status: new Set(),
  });
  const [isPrinting, setIsPrinting] = useState(false);
  const [ceSummaryOpen, setCESummaryOpen] = useState(false);
  const [ceSummaryParticipantId, setCESummaryParticipantId] = useState(null);

  // Get current user and assignments
  const { data: currentUser } = useQuery({
    queryKey: ["currentUser"],
    queryFn: () => base44.auth.me().catch(() => null),
    enabled: open,
  });

  const { data: assignments = [] } = useQuery({
    queryKey: ["userAssignments", currentUser?.email],
    queryFn: async () => {
      if (!currentUser?.email) return [];
      const all = await base44.entities.Assignment.list();
      return all.filter((a) => a.user_email === currentUser.email && a.is_active);
    },
    enabled: !!currentUser?.email && open,
  });

  const isSuperAdmin = useMemo(() => {
    return assignments.some((a) => a.role === "super_admin");
  }, [assignments]);

  // Load all hospitals
  const { data: allHospitals = [] } = useQuery({
    queryKey: ["hospitals"],
    queryFn: () => base44.entities.Hospital.list(),
    enabled: open,
  });

  // Filter hospitals based on assignments
  const availableHospitals = useMemo(() => {
    if (isSuperAdmin) return allHospitals.filter((h) => h.is_active !== false);
    
    const assignedHospitalIds = new Set(assignments.map((a) => a.hospital_id));
    return allHospitals.filter((h) => h.is_active !== false && assignedHospitalIds.has(h.id));
  }, [allHospitals, assignments, isSuperAdmin]);

  // Set default hospital from context or first available
  React.useEffect(() => {
    if (!open || selectedHospitalId) return;
    
    const stored = sessionStorage.getItem("ce_context");
    if (stored) {
      const { hospital_id } = JSON.parse(stored);
      if (availableHospitals.some((h) => h.id === hospital_id)) {
        setSelectedHospitalId(hospital_id);
        return;
      }
    }
    
    if (availableHospitals.length > 0) {
      setSelectedHospitalId(availableHospitals[0].id);
    }
  }, [open, availableHospitals, selectedHospitalId]);

  // Load data
  const { data: participants = [] } = useQuery({
    queryKey: ["participants"],
    queryFn: () => base44.entities.Participant.list(),
    enabled: open,
  });

  const { data: titles = [] } = useQuery({
    queryKey: ["titles"],
    queryFn: () => base44.entities.Title.list(),
    enabled: open,
  });

  const { data: specialties = [] } = useQuery({
    queryKey: ["specialties"],
    queryFn: () => base44.entities.Specialty.list(),
    enabled: open,
  });

  const { data: statuses = [] } = useQuery({
    queryKey: ["statuses"],
    queryFn: () => base44.entities.Status.list(),
    enabled: open,
  });

  const { data: ceRecords = [], isLoading: loadingRecords } = useQuery({
    queryKey: ["ceRecords"],
    queryFn: () => base44.entities.CERecord.list(),
    enabled: open,
  });

  const selectedHospital = useMemo(() => {
    return allHospitals.find((h) => h.id === selectedHospitalId) || null;
  }, [allHospitals, selectedHospitalId]);

  // Build field options
  const fieldOptions = useMemo(() => {
    const spareFromParticipants = new Set();
    for (const p of participants) {
      if (p.spare_field_1) spareFromParticipants.add(String(p.spare_field_1));
      if (p.spare_field_2) spareFromParticipants.add(String(p.spare_field_2));
      if (p.spare) spareFromParticipants.add(String(p.spare));
    }

    return {
      titles: titles.filter((x) => x.is_active !== false).map((x) => x.name).sort(),
      specialties: specialties.filter((x) => x.is_active !== false).map((x) => x.name).sort(),
      spares: Array.from(spareFromParticipants).sort(),
      statuses: statuses.filter((x) => x.is_active !== false).map((x) => x.name).sort(),
    };
  }, [titles, specialties, statuses, participants]);

  const activeParticipants = useMemo(() => {
    return participants.filter((p) => p?.is_active !== false);
  }, [participants]);

  const filteredParticipants = useMemo(() => {
    const q = search.trim().toLowerCase();
    const base = activeParticipants.filter((p) => {
      if (!q) return true;
      const hay = `${p.last_name || ""} ${p.first_name || ""} ${p.title || ""}`.toLowerCase();
      return hay.includes(q);
    });

    if (mode === "name") return base;

    const pick = (value, set) => {
      if (!set || set.size === 0) return true;
      return set.has(String(value || ""));
    };

    return base.filter((p) => {
      return (
        pick(p.title, fieldSelected.title) &&
        pick(p.specialty, fieldSelected.specialty) &&
        pick(p.spare_field_1 || p.spare, fieldSelected.spare) &&
        pick(p.status, fieldSelected.status)
      );
    });
  }, [activeParticipants, search, mode, fieldSelected]);

  const filteredSelectedCount = useMemo(() => {
    if (mode === "name") {
      return selectedIds.filter((id) => filteredParticipants.some((p) => p.id === id)).length;
    }
    return filteredParticipants.length;
  }, [mode, selectedIds, filteredParticipants]);

  const clearNames = () => setSelectedIds([]);
  const clearFields = () =>
    setFieldSelected({
      title: new Set(),
      specialty: new Set(),
      spare: new Set(),
      status: new Set(),
    });

  const toggleField = (key, value) => {
    setFieldSelected((prev) => {
      const next = { ...prev };
      const set = new Set(next[key]);
      const v = String(value);
      if (set.has(v)) set.delete(v);
      else set.add(v);
      next[key] = set;
      return next;
    });
  };

  const selectedToPrint = useMemo(() => {
    if (mode === "name") {
      const set = new Set(selectedIds);
      return activeParticipants.filter((p) => set.has(p.id));
    }
    return filteredParticipants;
  }, [mode, selectedIds, activeParticipants, filteredParticipants]);

  // Quick date pickers
  const handleQuickDate = (type) => {
    const now = new Date();
    const year = now.getFullYear();
    
    if (type === "ytd") {
      setStartDate(format(new Date(year, 0, 1), "yyyy-MM-dd"));
      setEndDate(format(now, "yyyy-MM-dd"));
    } else if (type === "last12") {
      const twelveMonthsAgo = new Date(now);
      twelveMonthsAgo.setMonth(now.getMonth() - 12);
      setStartDate(format(twelveMonthsAgo, "yyyy-MM-dd"));
      setEndDate(format(now, "yyyy-MM-dd"));
    }
  };

  // Generate and print transcripts
  const handlePrint = () => {
    if (isPrinting) return;
    
    // Validation
    if (!selectedHospitalId) {
      toast.error("Please select a hospital");
      return;
    }
    
    if (!startDate || !endDate) {
      toast.error("Please select start and end dates");
      return;
    }
    
    if (new Date(startDate) > new Date(endDate)) {
      toast.error("Start date must be before or equal to end date");
      return;
    }
    
    // Snapshot selection at click time
    const snapshotParticipants = mode === "name"
      ? activeParticipants.filter((p) => selectedIds.includes(p.id))
      : filteredParticipants;
    
    if (snapshotParticipants.length === 0) {
      toast.error("Select at least one name (or choose field filters).");
      return;
    }

    if (!selectedHospital) {
      toast.error("Hospital data not loaded");
      return;
    }

    if (!ceRecords || ceRecords.length === 0) {
      toast.error("No CE records loaded");
      return;
    }

    setIsPrinting(true);

    try {
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'in',
        format: 'letter'
      });

      let isFirstPage = true;
      const start = new Date(startDate);
      const end = new Date(endDate);

      snapshotParticipants.forEach((participant) => {
        // Filter records by hospital and date range
        const participantRecords = ceRecords.filter((r) => {
          if (r.participant_id !== participant.id) return false;
          if (r.hospital !== selectedHospital.name && r.hospital !== selectedHospital.profile_name) return false;
          
          const recordDate = new Date(r.date);
          return recordDate >= start && recordDate <= end;
        });

        if (participantRecords.length === 0) {
          console.warn(`No CE records for participant ${participant.first_name} ${participant.last_name} (ID: ${participant.id}) in date range`);
          return;
        }

        if (!isFirstPage) {
          pdf.addPage();
        }
        isFirstPage = false;

        // Calculate totals
        const totalClasses = participantRecords.length;
        const totalUnits = participantRecords.reduce((sum, r) => sum + (parseFloat(r.credit_hours) || 0), 0);

        // Group credits by type
        const creditsByType = {};
        participantRecords.forEach((r) => {
          const type = r.credit_type || "Unknown";
          const hours = parseFloat(r.credit_hours) || 0;
          creditsByType[type] = (creditsByType[type] || 0) + hours;
        });

        // Sort records by date
        const sortedRecords = [...participantRecords].sort((a, b) => {
          const dateA = new Date(a.date || 0);
          const dateB = new Date(b.date || 0);
          return dateA - dateB;
        });

        let yPos = 1.2;

        // Header - Hospital Name
        pdf.setFont('times', 'bolditalic');
        pdf.setFontSize(20);
        pdf.text(selectedHospital.profile_name || selectedHospital.name || "", 4.25, yPos, { align: 'center' });
        yPos += 0.25;

        // City/State
        pdf.setFont('times', 'italic');
        pdf.setFontSize(16);
        if (selectedHospital.city_state) {
          pdf.text(selectedHospital.city_state, 4.25, yPos, { align: 'center' });
          yPos += 0.25;
        }

        // CME Activity
        pdf.text("CME Activity", 4.25, yPos, { align: 'center' });
        yPos += 0.22;

        // Transcript period
        const startDateStr = format(start, "MM/dd/yyyy");
        const endDateStr = format(end, "MM/dd/yyyy");
        pdf.text(`Transcript period: ${startDateStr} – ${endDateStr}`, 4.25, yPos, { align: 'center' });
        yPos += 0.7;

        // Participant Name with Title
        const title = participant.title ? `${participant.title} ` : "";
        const fullName = `${participant.first_name || ""} ${participant.last_name || ""}`.trim();
        const nameWithTitle = `${fullName.toUpperCase()}${title ? ', ' + title : ''}`;

        pdf.setFont('times', 'bold');
        pdf.setFontSize(12);
        pdf.text(nameWithTitle, 0.75, yPos);

        // Summary box (right side) - start at same Y as name
        const summaryX = 5.5;
        let summaryY = yPos;
        pdf.setFont('times', 'normal');
        pdf.text(`Number of Classes: ${totalClasses}`, summaryX, summaryY);
        summaryY += 0.2;

        // Participant Address
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

        // Continue summary
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

        // Date generated
        const dateGenerated = format(new Date(), "MM/dd/yyyy");
        pdf.setFontSize(9);
        pdf.text(`Date Generated: ${dateGenerated}`, summaryX, summaryY);
        summaryY += 0.2;

        // Add spacing before table
        yPos = Math.max(yPos, summaryY) + 0.3;

        // Table header
        pdf.setFont('times', 'italic');
        pdf.setFontSize(11);
        pdf.text("Class Name", 0.75, yPos);
        pdf.text("Date", 3.2, yPos);
        pdf.text("Units", 4.5, yPos);
        pdf.text("Credit", 5.2, yPos);
        pdf.text("Instructor", 6.2, yPos);
        yPos += 0.05;
        pdf.setLineWidth(0.01);
        pdf.line(0.75, yPos, 7.75, yPos);
        yPos += 0.25;

        // Table rows
        pdf.setFont('times', 'normal');
        pdf.setFontSize(10);
        sortedRecords.forEach((r) => {
          if (yPos > 10.0) {
            pdf.addPage();
            yPos = 1.0;
          }

          const date = r.date ? new Date(r.date).toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' }) : "";

          // Wrap class title if needed
          const titleLines = pdf.splitTextToSize(r.class_title || "", 2.3);
          pdf.text(titleLines, 0.75, yPos);

          pdf.text(date, 3.2, yPos);
          pdf.text(String(parseFloat(r.credit_hours) || 0), 4.5, yPos);

          // Format credit type (split by comma if multiple)
          const creditLines = pdf.splitTextToSize(r.credit_type || "", 0.9);
          pdf.text(creditLines, 5.2, yPos);

          const instructorLines = pdf.splitTextToSize(r.instructor_name || "", 1.4);
          pdf.text(instructorLines, 6.2, yPos);

          const maxLines = Math.max(titleLines.length, creditLines.length, instructorLines.length);
          yPos += maxLines * 0.15 + 0.1;
        });
      });

      if (isFirstPage) {
        toast.error(`No CE records found for selected participants in date range`);
        return;
      }

      // Open PDF in new window for preview and printing
      const pdfBlob = pdf.output('blob');
      const pdfUrl = URL.createObjectURL(pdfBlob);
      const previewWindow = window.open(pdfUrl, '_blank');
      
      if (!previewWindow) {
        toast.error("Please allow popups to preview PDF");
        return;
      }
      
      toast.success("PDF preview opened - use browser print button to print");
      onPrinted?.();
    } catch (e) {
      console.error("PDF generation error:", e);
      toast.error(e.message || "PDF generation failed");
    } finally {
      setIsPrinting(false);
    }
  };

  return (
    <DraggableResizableDialog
      open={open}
      onClose={onClose}
      title="Print Transcripts by Hospital + Date Range"
      storageKey="transcripts_print_modal"
      defaultWidth={1200}
      defaultHeight={820}
      minWidth={1000}
      minHeight={650}
      footerLeft={
        <div className="text-sm text-slate-600">
          Print will include: <span className="font-semibold">{selectedToPrint.length}</span> selected name(s).
        </div>
      }
      footerRight={
        <>
          <Button variant="outline" onClick={onClose} type="button">
            Cancel
          </Button>

          <Button
            variant="outline"
            onClick={() => {
              if (mode === "name") clearNames();
              else clearFields();
            }}
            type="button"
          >
            {mode === "name" ? "Clear Names" : "Clear Fields"}
          </Button>

          <Button 
            onClick={handlePrint} 
            disabled={loadingRecords || isPrinting} 
            type="button"
          >
            {isPrinting ? "Generating PDF..." : loadingRecords ? "Loading data..." : "Print"}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {/* Section 1: Hospital Selection */}
        <Card className="p-4 border border-slate-200">
          <div className="text-sm font-semibold text-slate-900 mb-3">1. Select Hospital (Client)</div>
          <Select value={selectedHospitalId} onValueChange={setSelectedHospitalId}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select hospital" />
            </SelectTrigger>
            <SelectContent>
              {availableHospitals.map((h) => (
                <SelectItem key={h.id} value={h.id}>
                  {h.profile_name || h.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Card>

        {/* Section 2: Date Range */}
        <Card className="p-4 border border-slate-200">
          <div className="text-sm font-semibold text-slate-900 mb-3">2. Date Range <span className="text-red-500">*</span></div>
          
          <div className="grid grid-cols-3 gap-4 mb-3">
            <Button variant="outline" size="sm" onClick={() => handleQuickDate("ytd")} type="button">
              YTD
            </Button>
            <Button variant="outline" size="sm" onClick={() => handleQuickDate("last12")} type="button">
              Last 12 Months
            </Button>
            <Button variant="outline" size="sm" disabled type="button">
              Custom
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-sm mb-1.5 block">Start Date <span className="text-red-500">*</span></Label>
              <Popover open={startDateOpen} onOpenChange={setStartDateOpen}>
                <PopoverTrigger asChild>
                  <Button type="button" variant="outline" className="w-full justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startDate ? format(parseISO(startDate), "MM/dd/yyyy") : "Select"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={startDate ? parseISO(startDate) : undefined}
                    onSelect={(date) => {
                      if (date) {
                        setStartDate(format(date, "yyyy-MM-dd"));
                      }
                      setStartDateOpen(false);
                    }}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div>
              <Label className="text-sm mb-1.5 block">End Date <span className="text-red-500">*</span></Label>
              <Popover open={endDateOpen} onOpenChange={setEndDateOpen}>
                <PopoverTrigger asChild>
                  <Button type="button" variant="outline" className="w-full justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {endDate ? format(parseISO(endDate), "MM/dd/yyyy") : "Select"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={endDate ? parseISO(endDate) : undefined}
                    onSelect={(date) => {
                      if (date) {
                        setEndDate(format(date, "yyyy-MM-dd"));
                      }
                      setEndDateOpen(false);
                    }}
                    disabled={(date) => startDate && date < parseISO(startDate)}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </Card>

        {/* Section 3: Participant Selection */}
        <Card className="p-4 border border-slate-200">
          <div className="text-sm font-semibold text-slate-900 mb-3">3. Select Participants</div>
          
          <div className="grid grid-cols-12 gap-4 items-start mb-4">
            <div className="col-span-8">
              <Label className="text-sm mb-1.5 block">Search</Label>
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search last, first, title…"
              />
            </div>

            <div className="col-span-4">
              <Card className="p-3 border border-slate-200">
                <div className="text-sm font-semibold text-slate-900 mb-2">Select by</div>

                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm text-slate-700">
                    <input
                      type="radio"
                      name="mode"
                      checked={mode === "name"}
                      onChange={() => setMode("name")}
                    />
                    Name
                  </label>

                  <label className="flex items-center gap-2 text-sm text-slate-700">
                    <input
                      type="radio"
                      name="mode"
                      checked={mode === "field"}
                      onChange={() => setMode("field")}
                    />
                    Field (Title / Specialty / Spare / Status)
                  </label>
                </div>
              </Card>
            </div>
          </div>

          <div className="grid grid-cols-12 gap-4" style={{ height: '280px' }}>
            {/* Names table */}
            <Card className="col-span-8 border border-slate-200 overflow-hidden">
              <div className="px-4 py-3 border-b bg-slate-50 flex items-center justify-between">
                <div className="font-semibold text-sm text-slate-900">
                  Names ({filteredParticipants.length})
                </div>
                <div className="text-xs text-slate-600">
                  Selected: <span className="font-semibold">{filteredSelectedCount}</span>
                </div>
              </div>

              <div className="overflow-auto" style={{ height: '220px' }}>
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-white border-b">
                    <tr className="text-left text-slate-600">
                      <th className="px-4 py-2 w-10"></th>
                      <th className="px-4 py-2">Last</th>
                      <th className="px-4 py-2">First</th>
                      <th className="px-4 py-2">Title</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredParticipants.map((p) => {
                      const checked =
                        mode === "field" ? true : selectedIds.includes(p.id);

                      return (
                        <tr
                          key={p.id}
                          className={cn("border-b last:border-b-0", mode === "name" && "hover:bg-slate-50 cursor-pointer")}
                          onDoubleClick={() => {
                            setCESummaryParticipantId(p.id);
                            setCESummaryOpen(true);
                          }}
                        >
                          <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                            {mode === "name" ? (
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => {
                                  setSelectedIds((prev) => {
                                    const newIds = prev.includes(p.id)
                                      ? prev.filter((x) => x !== p.id)
                                      : [...prev, p.id];
                                    return newIds;
                                  });
                                }}
                              />
                            ) : (
                              <span className="text-xs text-slate-400">•</span>
                            )}
                          </td>
                          <td 
                            className="px-4 py-3 cursor-pointer"
                            onClick={() => {
                              if (mode !== "name") return;
                              setSelectedIds((prev) => {
                                const newIds = prev.includes(p.id)
                                  ? prev.filter((x) => x !== p.id)
                                  : [...prev, p.id];
                                return newIds;
                              });
                            }}
                          >
                            {p.last_name || ""}
                          </td>
                          <td 
                            className="px-4 py-3 cursor-pointer"
                            onClick={() => {
                              if (mode !== "name") return;
                              setSelectedIds((prev) => {
                                const newIds = prev.includes(p.id)
                                  ? prev.filter((x) => x !== p.id)
                                  : [...prev, p.id];
                                return newIds;
                              });
                            }}
                          >{p.first_name || ""}</td>
                          <td 
                            className="px-4 py-3 cursor-pointer"
                            onClick={() => {
                              if (mode !== "name") return;
                              setSelectedIds((prev) => {
                                const newIds = prev.includes(p.id)
                                  ? prev.filter((x) => x !== p.id)
                                  : [...prev, p.id];
                                return newIds;
                              });
                            }}
                          >{p.title || ""}</td>
                        </tr>
                      );
                    })}
                    {filteredParticipants.length === 0 && (
                      <tr>
                        <td colSpan={4} className="px-4 py-10 text-center text-slate-500">
                          No matches.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Card>

            {/* Field filters */}
            <Card className="col-span-4 border border-slate-200 overflow-hidden">
              <div className="px-4 py-3 border-b bg-slate-50 flex items-center justify-between">
                <div className="font-semibold text-sm text-slate-900">Fields</div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearFields}
                  disabled={mode !== "field"}
                >
                  Clear All
                </Button>
              </div>

              <div className={cn("p-4 space-y-4 overflow-auto", mode !== "field" && "opacity-50 pointer-events-none")} style={{ height: '220px' }}>
                <FieldGroup
                  title="Title"
                  items={fieldOptions.titles}
                  selected={fieldSelected.title}
                  onToggle={(v) => toggleField("title", v)}
                />

                <FieldGroup
                  title="Specialty"
                  items={fieldOptions.specialties}
                  selected={fieldSelected.specialty}
                  onToggle={(v) => toggleField("specialty", v)}
                />

                <FieldGroup
                  title="Spare"
                  items={fieldOptions.spares}
                  selected={fieldSelected.spare}
                  onToggle={(v) => toggleField("spare", v)}
                />

                <FieldGroup
                  title="Status"
                  items={fieldOptions.statuses}
                  selected={fieldSelected.status}
                  onToggle={(v) => toggleField("status", v)}
                />
              </div>
            </Card>
          </div>
        </Card>
      </div>

      <ParticipantCESummary
        open={ceSummaryOpen}
        participantId={ceSummaryParticipantId}
        onClose={() => setCESummaryOpen(false)}
      />
    </DraggableResizableDialog>
  );
}

function FieldGroup({ title, items = [], selected, onToggle }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div className="text-sm font-medium text-slate-700">{title}</div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            const values = Array.from(selected || []);
            values.forEach((v) => onToggle(v));
          }}
        >
          Clear
        </Button>
      </div>

      <Card className="border border-slate-200 p-3 max-h-32 overflow-auto">
        {items.length === 0 ? (
          <div className="text-sm text-slate-500">No items.</div>
        ) : (
          <div className="space-y-2">
            {items.map((v) => (
              <label key={v} className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={selected?.has(String(v))}
                  onChange={() => onToggle(v)}
                />
                <span>{v}</span>
              </label>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}