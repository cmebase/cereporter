import React, { useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import jsPDF from "jspdf";
import { format } from "date-fns";

import DraggableResizableDialog from "./DraggableResizableDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import ParticipantCESummary from "../participants/ParticipantCESummary";

/**
 * SelectNamesForTranscripts
 * - ONLY for Print Transcripts flow
 * - Modern CE Reporter style
 * - Select by: Name OR Field filters (Title/Specialty/Spare/Status)
 * - Footer buttons always visible: Cancel | Clear Names/Fields | Print
 */

export default function SelectNamesForTranscripts({
  open,
  onClose,
  onPrinted,
}) {
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
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  // Load all data
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

  const { data: hospital, isLoading: loadingHospital } = useQuery({
    queryKey: ["hospital"],
    queryFn: async () => {
      const context = sessionStorage.getItem("ce_context");
      if (!context) return null;
      const { hospital_id } = JSON.parse(context);
      const hospitals = await base44.entities.Hospital.list();
      return hospitals.find((h) => h.id === hospital_id) || null;
    },
    enabled: open,
  });

  // Build field options from entities
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

  // Generate PDF
  const handlePrint = () => {
    if (isPrinting) return;
    
    // Snapshot selection at click time
    const snapshotParticipants = mode === "name"
      ? activeParticipants.filter((p) => selectedIds.includes(p.id))
      : filteredParticipants;
    
    if (snapshotParticipants.length === 0) {
      toast.error("Select at least one name (or choose field filters).");
      return;
    }

    if (!fromDate || !toDate) {
      toast.error("Please select both From and To dates.");
      return;
    }

    if (!hospital) {
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

    const from = new Date(fromDate);
    const to = new Date(toDate);

    snapshotParticipants.forEach((participant) => {
      const participantRecords = ceRecords.filter(
        (r) => {
          if (r.participant_id !== participant.id) return false;
          if (!r.date) return false;
          const recordDate = new Date(r.date);
          return recordDate >= from && recordDate <= to;
        }
      );

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
      pdf.text(hospital.profile_name || hospital.name || "", 4.25, yPos, { align: 'center' });
      yPos += 0.25;

      // City/State
      pdf.setFont('times', 'italic');
      pdf.setFontSize(16);
      if (hospital.city_state) {
        pdf.text(hospital.city_state, 4.25, yPos, { align: 'center' });
        yPos += 0.25;
      }

      // CME Activity
      pdf.text("CME Activity", 4.25, yPos, { align: 'center' });
      yPos += 0.22;

      // Transcript for date range
      const fromStr = format(new Date(fromDate), 'MM-dd-yyyy');
      const toStr = format(new Date(toDate), 'MM-dd-yyyy');
      pdf.text(`Transcript: ${fromStr} - ${toStr}`, 4.25, yPos, { align: 'center' });
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

        const date = r.date ? format(new Date(r.date), 'MM-dd-yyyy') : "";

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
      toast.error(`No CE records found for selected participants in selected date range`);
      return;
    }

    const fromStr = new Date(fromDate).toISOString().split('T')[0];
    const toStr = new Date(toDate).toISOString().split('T')[0];
    pdf.save(`Transcripts_${fromStr}_to_${toStr}.pdf`);
    toast.success("PDF generated successfully!");
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
      title="Select Names for Transcripts"
      storageKey="transcripts_select_names_modal"
      defaultWidth={1100}
      defaultHeight={720}
      minWidth={900}
      minHeight={560}
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
            disabled={loadingRecords || loadingHospital || isPrinting} 
            type="button"
          >
            {isPrinting ? "Generating PDF..." : loadingRecords || loadingHospital ? "Loading data..." : "Print"}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-sm font-medium text-slate-700 mb-2">From Date</div>
            <Input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="w-full"
            />
          </div>
          <div>
            <div className="text-sm font-medium text-slate-700 mb-2">To Date</div>
            <Input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="w-full"
            />
          </div>
        </div>

        <div className="grid grid-cols-12 gap-4 items-start">
          <div className="col-span-8">
            <div className="text-sm font-medium text-slate-700 mb-2">Search</div>
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search last, first, title…"
            />
          </div>

          <div className="col-span-4">
            <Card className="p-4 border border-slate-200">
              <div className="text-sm font-semibold text-slate-900">Select by</div>

              <div className="mt-3 space-y-2">
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

                <div className="text-xs text-slate-500 mt-2">
                  {mode === "name"
                    ? "Pick specific people from the list."
                    : "Pick field values to filter the list."}
                </div>
              </div>
            </Card>
          </div>
        </div>

        <div className="grid grid-cols-12 gap-4 min-h-[420px]">
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

            <div className="overflow-auto max-h-96">
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
                          <div className="leading-tight">
                            <div>{p.last_name || ""}</div>
                            <div className="text-xs text-slate-400 font-mono">ID: {p.id}</div>
                          </div>
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

            <div className={cn("p-4 space-y-4 overflow-auto max-h-96", mode !== "field" && "opacity-50 pointer-events-none")}>
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

      <Card className="border border-slate-200 p-3 max-h-40 overflow-auto">
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

function escapeHtml(input) {
  const s = String(input ?? "");
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}