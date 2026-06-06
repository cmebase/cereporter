import React, { useMemo, useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

import DraggableResizableDialog from "./DraggableResizableDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Printer } from "lucide-react";

/**
 * TranscriptSelectDialog
 * Modern version of legacy "Select Names for Transcripts"
 *
 * - Select by: Name (pick individuals) OR Field (filter by Title/Specialty/Spare/Status)
 * - Search box
 * - Clear Names / Clear Fields / Clear All Fields
 * - Print action calls onPrint(payload) with selected participant ids (and optional filters)
 *
 * REQUIREMENTS:
 * - Participant entity must have: first_name, last_name, title, specialty, spare_1, status, is_active
 * - Title/Specialty/Status entities used for checklists:
 *    - Title entity: name (or title), is_active
 *    - Specialty entity: name, is_active
 *    - Status entity: name, is_active
 * - Spare values: if you store as a separate list entity, wire it in; otherwise it is derived from participants.
 *
 * USAGE:
 * const [open, setOpen] = useState(false);
 * <TranscriptSelectDialog
 *   open={open}
 *   onClose={() => setOpen(false)}
 *   onPrint={async ({ selectedParticipantIds }) => {
 *     // open a print window / create PDF
 *   }}
 * />
 */

export default function TranscriptSelectDialog({
  open,
  onClose,
  onPrint,
}) {
  const [mode, setMode] = useState("name");
  const [search, setSearch] = useState("");

  const [selectedIds, setSelectedIds] = useState([]);

  const [fieldFilters, setFieldFilters] = useState({
    title: new Set(),
    specialty: new Set(),
    spare: new Set(),
    status: new Set(),
  });

  const { data: participantsRaw, isLoading: loadingParticipants } = useQuery({
    queryKey: ["participants"],
    queryFn: () => base44.entities.Participant.list(),
    enabled: open,
  });

  const participants = useMemo(() => {
    const list = Array.isArray(participantsRaw) ? participantsRaw : [];
    return list
      .filter((p) => p?.is_active !== false)
      .sort((a, b) => {
        const al = String(a?.last_name || "").toUpperCase();
        const bl = String(b?.last_name || "").toUpperCase();
        if (al !== bl) return al.localeCompare(bl);
        const af = String(a?.first_name || "").toUpperCase();
        const bf = String(b?.first_name || "").toUpperCase();
        return af.localeCompare(bf);
      });
  }, [participantsRaw]);

  const { data: titlesRaw } = useQuery({
    queryKey: ["titles"],
    queryFn: async () => {
      return base44.entities.Title?.list ? base44.entities.Title.list() : [];
    },
    enabled: open,
  });

  const { data: specialtiesRaw } = useQuery({
    queryKey: ["specialties"],
    queryFn: async () => {
      return base44.entities.Specialty?.list ? base44.entities.Specialty.list() : [];
    },
    enabled: open,
  });

  const { data: statusesRaw } = useQuery({
    queryKey: ["statuses"],
    queryFn: async () => {
      return base44.entities.Status?.list ? base44.entities.Status.list() : [];
    },
    enabled: open,
  });

  const titleOptions = useMemo(() => {
    const list = Array.isArray(titlesRaw) ? titlesRaw : [];
    return list
      .filter((x) => x?.is_active !== false)
      .map((x) => x?.name || x?.title || "")
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b));
  }, [titlesRaw]);

  const specialtyOptions = useMemo(() => {
    const list = Array.isArray(specialtiesRaw) ? specialtiesRaw : [];
    return list
      .filter((x) => x?.is_active !== false)
      .map((x) => x?.name || "")
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b));
  }, [specialtiesRaw]);

  const statusOptions = useMemo(() => {
    const list = Array.isArray(statusesRaw) ? statusesRaw : [];
    return list
      .filter((x) => x?.is_active !== false)
      .map((x) => x?.name || "")
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b));
  }, [statusesRaw]);

  const spareOptions = useMemo(() => {
    const values = new Set();
    for (const p of participants) {
      const v = p?.spare_1 || p?.spare || "";
      if (v) values.add(String(v));
    }
    return Array.from(values).sort((a, b) => a.localeCompare(b));
  }, [participants]);

  const filteredParticipants = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return participants;

    return participants.filter((p) => {
      const last = String(p?.last_name || "").toLowerCase();
      const first = String(p?.first_name || "").toLowerCase();
      const title = String(p?.title || "").toLowerCase();
      return last.includes(q) || first.includes(q) || title.includes(q);
    });
  }, [participants, search]);

  const fieldFilteredIds = useMemo(() => {
    const t = fieldFilters.title;
    const s = fieldFilters.specialty;
    const sp = fieldFilters.spare;
    const st = fieldFilters.status;

    const hasAny = t.size > 0 || s.size > 0 || sp.size > 0 || st.size > 0;

    const ids = [];
    for (const p of participants) {
      if (!hasAny) continue;

      const pTitle = String(p?.title || "");
      const pSpec = String(p?.specialty || "");
      const pSpare = String(p?.spare_1 || p?.spare || "");
      const pStatus = String(p?.status || "");

      if (t.size > 0 && !t.has(pTitle)) continue;
      if (s.size > 0 && !s.has(pSpec)) continue;
      if (sp.size > 0 && !sp.has(pSpare)) continue;
      if (st.size > 0 && !st.has(pStatus)) continue;

      ids.push(p.id);
    }
    return ids;
  }, [participants, fieldFilters]);

  const selectedCount = mode === "name" ? selectedIds.length : fieldFilteredIds.length;

  const toggleName = (id) => {
    setSelectedIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      return [...prev, id];
    });
  };

  const toggleFilter = (key, value) => {
    setFieldFilters((prev) => {
      const next = { ...prev };
      const set = new Set(next[key]);
      if (set.has(value)) set.delete(value);
      else set.add(value);
      next[key] = set;
      return next;
    });
  };

  const clearNames = () => setSelectedIds([]);
  const clearFields = () =>
    setFieldFilters({
      title: new Set(),
      specialty: new Set(),
      spare: new Set(),
      status: new Set(),
    });

  const clearAllFields = clearFields;

  const handlePrint = async () => {
    const ids = mode === "name" ? selectedIds : fieldFilteredIds;

    if (!ids || ids.length === 0) {
      toast.error("Select at least one name (or choose field filters).");
      return;
    }

    try {
      await onPrint?.({
        selectedParticipantIds: ids,
        mode,
        filters: {
          title: Array.from(fieldFilters.title),
          specialty: Array.from(fieldFilters.specialty),
          spare: Array.from(fieldFilters.spare),
          status: Array.from(fieldFilters.status),
        },
      });
    } catch (e) {
      console.error(e);
      toast.error("Print failed.");
    }
  };

  useEffect(() => {
    if (!open) {
      setSearch("");
      setSelectedIds([]);
      clearFields();
    }
  }, [open]);

  return (
    <DraggableResizableDialog
      open={open}
      onClose={onClose}
      title="Select Names for Transcripts"
      storageKey="transcripts_select_names"
      defaultWidth={1100}
      defaultHeight={720}
      minWidth={900}
      minHeight={560}
      footerLeft={
        <div className="text-sm text-slate-600">
          Print will include: <span className="font-semibold">{selectedCount}</span>{" "}
          selected name(s).
        </div>
      }
      footerRight={
        <>
          <Button variant="outline" onClick={clearNames} disabled={mode !== "name" || selectedIds.length === 0}>
            Clear Names
          </Button>
          <Button variant="outline" onClick={clearAllFields} disabled={mode !== "field"}>
            Clear All Fields
          </Button>
          <Button onClick={handlePrint} className="bg-indigo-600 hover:bg-indigo-700">
            <Printer className="w-4 h-4 mr-2" />
            Print
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {/* Top row: Search + Select By */}
        <div className="grid grid-cols-12 gap-4">
          <div className="col-span-8">
            <Label className="text-sm text-slate-700">Search</Label>
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search last, first, title..."
              className="mt-1"
            />
          </div>

          <div className="col-span-4">
            <Card className="p-4 border border-slate-200">
              <div className="text-sm font-semibold text-slate-900 mb-2">Select by</div>
              <RadioGroup value={mode} onValueChange={setMode} className="space-y-2">
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="name" id="mode_name" />
                  <Label htmlFor="mode_name" className="text-sm text-slate-700">
                    Name
                  </Label>
                </div>

                <div className="flex items-center gap-2">
                  <RadioGroupItem value="field" id="mode_field" />
                  <Label htmlFor="mode_field" className="text-sm text-slate-700">
                    Field (Title / Specialty / Spare / Status)
                  </Label>
                </div>
              </RadioGroup>

              <div className="text-xs text-slate-500 mt-2">
                {mode === "name"
                  ? "Pick specific people from the list."
                  : "Pick groups using field filters."}
              </div>

              {mode === "field" && (
                <div className="mt-3">
                  <Button variant="outline" size="sm" onClick={clearFields}>
                    Clear Fields
                  </Button>
                </div>
              )}
            </Card>
          </div>
        </div>

        <Separator />

        {/* Main row: Names + Fields */}
        <div className="grid grid-cols-12 gap-4 min-h-[420px]">
          {/* Names list */}
          <Card className="col-span-8 border border-slate-200 overflow-hidden flex flex-col min-h-0">
            <div className="px-4 py-3 border-b bg-slate-50 flex items-center justify-between">
              <div className="font-semibold text-sm text-slate-900">
                Names ({filteredParticipants.length})
              </div>
              <div className="text-xs text-slate-600">
                Selected: <span className="font-semibold">{selectedIds.length}</span>
              </div>
            </div>

            <div className="flex-1 min-h-0">
              <ScrollArea className="h-full">
                <div className="divide-y">
                  {/* header row */}
                  <div className="grid grid-cols-12 gap-2 px-4 py-2 text-xs font-semibold text-slate-600 bg-white">
                    <div className="col-span-4">Last</div>
                    <div className="col-span-4">First</div>
                    <div className="col-span-4">Title</div>
                  </div>

                  {loadingParticipants ? (
                    <div className="p-6 text-sm text-slate-500">Loading…</div>
                  ) : filteredParticipants.length === 0 ? (
                    <div className="p-6 text-sm text-slate-500">No names found.</div>
                  ) : (
                    filteredParticipants.map((p) => {
                      const checked = selectedIds.includes(p.id);
                      return (
                        <button
                          key={p.id}
                          type="button"
                          className={`w-full text-left px-4 py-3 grid grid-cols-12 gap-2 hover:bg-slate-50 transition ${
                            checked ? "bg-indigo-50" : "bg-white"
                          }`}
                          onClick={() => {
                            if (mode !== "name") return;
                            toggleName(p.id);
                          }}
                          disabled={mode !== "name"}
                          style={{ opacity: mode === "name" ? 1 : 0.6 }}
                        >
                          <div className="col-span-4 flex items-center gap-3">
                            <Checkbox
                              checked={checked}
                              onCheckedChange={() => toggleName(p.id)}
                              disabled={mode !== "name"}
                            />
                            <span className="font-medium text-slate-900">
                              {String(p.last_name || "").toUpperCase()}
                            </span>
                          </div>
                          <div className="col-span-4 text-slate-900">
                            {String(p.first_name || "").toUpperCase()}
                          </div>
                          <div className="col-span-4 text-slate-700">
                            {String(p.title || "").toUpperCase() || "-"}
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              </ScrollArea>
            </div>
          </Card>

          {/* Fields panel */}
          <Card className="col-span-4 border border-slate-200 overflow-hidden flex flex-col min-h-0">
            <div className="px-4 py-3 border-b bg-slate-50 flex items-center justify-between">
              <div className="font-semibold text-sm text-slate-900">Fields</div>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFields}
                disabled={mode !== "field"}
              >
                Clear
              </Button>
            </div>

            <div className="flex-1 min-h-0">
              <ScrollArea className="h-full">
                <div className="p-4 space-y-5">
                  <FieldSection
                    title="Title"
                    disabled={mode !== "field"}
                    options={titleOptions}
                    selectedSet={fieldFilters.title}
                    onToggle={(v) => toggleFilter("title", v)}
                  />
                  <FieldSection
                    title="Specialty"
                    disabled={mode !== "field"}
                    options={specialtyOptions}
                    selectedSet={fieldFilters.specialty}
                    onToggle={(v) => toggleFilter("specialty", v)}
                  />
                  <FieldSection
                    title="Spare"
                    disabled={mode !== "field"}
                    options={spareOptions}
                    selectedSet={fieldFilters.spare}
                    onToggle={(v) => toggleFilter("spare", v)}
                  />
                  <FieldSection
                    title="Status"
                    disabled={mode !== "field"}
                    options={statusOptions}
                    selectedSet={fieldFilters.status}
                    onToggle={(v) => toggleFilter("status", v)}
                  />
                </div>
              </ScrollArea>
            </div>
          </Card>
        </div>
      </div>
    </DraggableResizableDialog>
  );
}

function FieldSection({ title, options, selectedSet, onToggle, disabled }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div className="text-sm font-semibold text-slate-900">{title}</div>
        <button
          type="button"
          className="text-xs text-slate-500 hover:text-slate-700"
          onClick={() => {
            if (disabled) return;
            for (const v of Array.from(selectedSet)) onToggle(v);
          }}
          disabled={disabled || selectedSet.size === 0}
        >
          Clear
        </button>
      </div>

      {options.length === 0 ? (
        <div className="text-sm text-slate-500 border rounded-md p-3 bg-white">
          No items.
        </div>
      ) : (
        <div className="border rounded-md p-3 bg-white space-y-2">
          {options.map((opt) => {
            const checked = selectedSet.has(opt);
            return (
              <label
                key={opt}
                className={`flex items-center gap-2 text-sm ${
                  disabled ? "opacity-60" : ""
                }`}
              >
                <Checkbox
                  checked={checked}
                  onCheckedChange={() => onToggle(opt)}
                  disabled={disabled}
                />
                <span className="text-slate-700">{opt}</span>
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
}