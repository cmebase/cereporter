import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "../utils";
import StatusEditWindow from "../components/management/editors/StatusEditWindow";
import TitleEditWindow from "../components/management/editors/TitleEditWindow";
import SpecialtyEditWindow from "../components/management/editors/SpecialtyEditWindow";
import SpareEditWindow from "../components/management/editors/SpareEditWindow";
import SelectNamesForTranscripts from "../components/management/SelectNamesForTranscripts";
import HospitalTranscriptModal from "../components/management/HospitalTranscriptModal";
import FieldSettingsModal from "../components/management/FieldSettingsModal";
import ParticipantCESummary from "../components/participants/ParticipantCESummary";
import CertificateIssuanceScreen from "../components/certificates/CertificateIssuanceScreen";

export default function NameManagement() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const lastNameRef = useRef(null);

  const [context, setContext] = useState(null);
  const [selectedId, setSelectedId] = useState(null);

  // Check for participantId in URL params (from Class Management)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const pid = params.get('participantId');
    if (pid) {
      setSelectedId(pid);
    }
  }, []);
  const [form, setForm] = useState({});
  const [dirty, setDirty] = useState(false);
  const [statusEditorOpen, setStatusEditorOpen] = useState(false);
  const [statusToEdit, setStatusToEdit] = useState(null);
  const [titleEditorOpen, setTitleEditorOpen] = useState(false);
  const [titleToEdit, setTitleToEdit] = useState(null);
  const [specialtyEditorOpen, setSpecialtyEditorOpen] = useState(false);
  const [specialtyToEdit, setSpecialtyToEdit] = useState(null);
  const [spareEditorOpen, setSpareEditorOpen] = useState(false);
  const [spareToEdit, setSpareToEdit] = useState(null);
  const [selectNamesOpen, setSelectNamesOpen] = useState(false);
  const [hospitalTranscriptOpen, setHospitalTranscriptOpen] = useState(false);
  const [statusFieldSettingsOpen, setStatusFieldSettingsOpen] = useState(false);
  const [titleFieldSettingsOpen, setTitleFieldSettingsOpen] = useState(false);
  const [specialtyFieldSettingsOpen, setSpecialtyFieldSettingsOpen] = useState(false);
  const [ceSummaryOpen, setCESummaryOpen] = useState(false);
  const [ceSummaryParticipantId, setCESummaryParticipantId] = useState(null);
  const [certificatePrintOpen, setCertificatePrintOpen] = useState(false);
  const [certificateActivityId, setCertificateActivityId] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showDeactivated, setShowDeactivated] = useState(false);

  // --- Load context (hospital/year)
  useEffect(() => {
    const stored = sessionStorage.getItem("ce_context");
    if (stored) setContext(JSON.parse(stored));
  }, []);

  // --- Load hospital (for labels + profile)
  const { data: hospital } = useQuery({
    queryKey: ["hospital", context?.hospital_id],
    queryFn: async () => {
      if (!context?.hospital_id) return null;
      const list = await base44.entities.Hospital.list();
      return list.find((h) => h.id === context.hospital_id) || null;
    },
    enabled: !!context?.hospital_id,
  });

  // Label overrides (stored per hospital)
  const labels = useMemo(() => {
    const nm = hospital?.name_management || {};
    return {
      nameId: nm.name_id_label || "Name Id",
      title: nm.title_label || "Title",
      specialty: nm.specialty_label || "Specialty",
      spare: nm.spare_label || "Spare",
      status: nm.status_label || "Status",
    };
  }, [hospital]);

  // --- Lookup lists (optional)
  const { data: titles } = useQuery({
    queryKey: ["titles"],
    queryFn: async () => {
      try {
        return await base44.entities.Title.list();
      } catch {
        return [];
      }
    },
  });

  const { data: specialties } = useQuery({
    queryKey: ["specialties"],
    queryFn: async () => {
      try {
        return await base44.entities.Specialty.list();
      } catch {
        return [];
      }
    },
  });

  const { data: statuses } = useQuery({
    queryKey: ["statuses"],
    queryFn: async () => {
      try {
        return await base44.entities.Status.list();
      } catch {
        return [];
      }
    },
  });

  const { data: spareFields } = useQuery({
    queryKey: ["spareFields"],
    queryFn: async () => {
      try {
        return await base44.entities.SpareField.list();
      } catch {
        return [];
      }
    },
  });

  // --- Contacts list (Participants) - Hospital-scoped only (not year-scoped)
  const { data: participants = [], isLoading } = useQuery({
    queryKey: ["participants", context?.hospital_id],
    queryFn: async () => {
      const list = await base44.entities.Participant.list();
      if (!context?.hospital_id) return list;
      return list.filter((p) => 
        String(p.hospital_id || "") === String(context.hospital_id)
      );
    },
    enabled: true,
  });

  const sortedParticipants = useMemo(() => {
    let copy = [...participants];
    
    // Filter by active status
    if (!showDeactivated) {
      copy = copy.filter(p => p.is_active !== false);
    }
    
    // Filter by search query
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      copy = copy.filter(p => 
        (p.first_name || "").toLowerCase().includes(q) ||
        (p.last_name || "").toLowerCase().includes(q) ||
        (p.email || "").toLowerCase().includes(q) ||
        (p.name_id || "").toLowerCase().includes(q) ||
        (p.id || "").toLowerCase().includes(q)
      );
    }
    
    // Sort
    copy.sort((a, b) => {
      const al = (a.last_name || "").toUpperCase();
      const bl = (b.last_name || "").toUpperCase();
      if (al !== bl) return al.localeCompare(bl);
      return (a.first_name || "").toUpperCase().localeCompare((b.first_name || "").toUpperCase());
    });
    return copy;
  }, [participants, searchQuery, showDeactivated]);

  const resetNew = useCallback(() => {
    setSelectedId(null);
    setForm({
      hospital_id: context?.hospital_id || null,
      name_id: "",
      last_name: "",
      first_name: "",
      title: "",
      specialty: "",
      spare: "",
      status: "",
      address1: "",
      address2: "",
      phone: "",
      ext: "",
      fax: "",
      email: "",
      is_active: true,
    });
    setDirty(false);
    setTimeout(() => lastNameRef.current?.focus(), 50);
  }, [context?.hospital_id]);

  // Initialize form on first load
  useEffect(() => {
    if (Object.keys(form).length === 0 && !selectedId) resetNew();
  }, []);

  // Load participant from URL on initial mount only
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const pid = params.get('participantId');
    if (!pid) return;
    
    // First check if we have cached participant data from creation
    const cachedData = sessionStorage.getItem('new_participant_data');
    if (cachedData) {
      try {
        const newParticipant = JSON.parse(cachedData);
        if (newParticipant.id === pid) {
          setSelectedId(pid);
          setForm({
            ...newParticipant,
            first_name: newParticipant.first_name || "",
            last_name: newParticipant.last_name || "",
            title: newParticipant.title || "",
            specialty: newParticipant.specialty || "",
            email: newParticipant.email || "",
            name_id: newParticipant.name_id || "",
            address1: newParticipant.address1 || "",
            address2: newParticipant.address2 || "",
            phone: newParticipant.phone || "",
            ext: newParticipant.ext || "",
            fax: newParticipant.fax || "",
            spare: newParticipant.spare || "",
            status: newParticipant.status || "",
          });
          setDirty(false);
          sessionStorage.removeItem('new_participant_data');
          window.history.replaceState({}, '', createPageUrl('NameManagement'));
          return;
        }
      } catch (e) {
        console.error('Failed to parse cached participant', e);
      }
      sessionStorage.removeItem('new_participant_data');
    }
    
    // Otherwise load from participants list when available
    if (participants.length > 0) {
      const found = participants.find(p => p.id === pid);
      if (found) {
        setSelectedId(pid);
        setForm({
          ...found,
          first_name: found.first_name || "",
          last_name: found.last_name || "",
          title: found.title || "",
          specialty: found.specialty || "",
          email: found.email || "",
          name_id: found.name_id || "",
          address1: found.address1 || "",
          address2: found.address2 || "",
          phone: found.phone || "",
          ext: found.ext || "",
          fax: found.fax || "",
          spare: found.spare || "",
          status: found.status || "",
        });
        setDirty(false);
        window.history.replaceState({}, '', createPageUrl('NameManagement'));
      }
    }
  }, [participants]);

  const setVal = (k, v) => {
    setForm((prev) => ({ ...prev, [k]: v }));
    setDirty(true);
  };

  const saveMutation = useMutation({
    mutationFn: async (payload) => {
      if (selectedId) return base44.entities.Participant.update(selectedId, payload);
      return base44.entities.Participant.create(payload);
    },
    onSuccess: async (saved) => {
      const user = await base44.auth.me().catch(() => null);
      // Create audit log entry
      await base44.entities.AuditLog.create({
        user_email: user?.email || "unknown",
        hospital_id: context?.hospital_id,
        hospital_name: context?.hospital_name,
        year: context?.year,
        action: selectedId ? "update" : "create",
        entity_type: "Participant",
        entity_id: saved.id,
        entity_name: `${saved.first_name} ${saved.last_name}`,
      });
      
      await queryClient.invalidateQueries({ queryKey: ["participants", context?.hospital_id] });
      toast.success("Saved");
      setDirty(false);
      setSelectedId(saved.id);
      setForm(saved);
    },
    onError: (e) => {
      console.error(e);
      toast.error("Save failed");
    },
  });

  const deactivateMutation = useMutation({
    mutationFn: async (id) => {
      const participant = participants.find(p => p.id === id);
      return base44.entities.Participant.update(id, { ...participant, is_active: false });
    },
    onSuccess: async () => {
      const user = await base44.auth.me().catch(() => null);
      // Create audit log entry
      await base44.entities.AuditLog.create({
        user_email: user?.email || "unknown",
        hospital_id: context?.hospital_id,
        hospital_name: context?.hospital_name,
        year: context?.year,
        action: "update",
        entity_type: "Participant",
        entity_id: selectedId,
        entity_name: `${form.first_name} ${form.last_name}`,
        field_changed: "is_active",
        before_value: "true",
        after_value: "false",
      });
      
      await queryClient.invalidateQueries({ queryKey: ["participants", context?.hospital_id] });
      toast.success("Participant deactivated");
      resetNew();
    },
    onError: (e) => {
      console.error(e);
      toast.error("Deactivate failed");
    },
  });







  const handleSave = () => {
    if (!form.last_name || !form.first_name) {
      toast.error("First Name and Last Name are required");
      return;
    }
    saveMutation.mutate({
      ...form,
      hospital_id: context?.hospital_id || form.hospital_id || null,
      is_active: form.is_active !== false,
    });
  };

  const handleSelect = (p) => {
    if (dirty) {
      const ok = window.confirm("You have unsaved changes. Save now?");
      if (ok) handleSave();
    }
    setSelectedId(p.id);
    setForm({
      ...p,
      first_name: p.first_name || "",
      last_name: p.last_name || "",
      title: p.title || "",
      specialty: p.specialty || "",
      email: p.email || "",
      name_id: p.name_id || "",
      address1: p.address1 || "",
      address2: p.address2 || "",
      phone: p.phone || "",
      ext: p.ext || "",
      fax: p.fax || "",
      spare: p.spare || "",
      status: p.status || "",
    });
    setDirty(false);
  };

  const handleDeactivate = () => {
    if (!selectedId) return;
    const ok = window.confirm("Deactivate this participant? They will lose access to selection but historical data remains.");
    if (!ok) return;
    deactivateMutation.mutate(selectedId);
  };

  const handleStatusEdit = () => {
    const selectedStatus = statuses?.find((s) => s.name === form.status);
    setStatusToEdit(selectedStatus || null);
    setStatusEditorOpen(true);
  };

  const handleTitleEdit = () => {
    const selectedTitle = titles?.find((t) => t.name === form.title);
    setTitleToEdit(selectedTitle || null);
    setTitleEditorOpen(true);
  };

  const handleSpecialtyEdit = () => {
    const selectedSpecialty = specialties?.find((s) => s.name === form.specialty);
    setSpecialtyToEdit(selectedSpecialty || null);
    setSpecialtyEditorOpen(true);
  };

  const handleSpareEdit = () => {
    const selectedSpare = spareFields?.find((s) => s.label === form.spare);
    setSpareToEdit(selectedSpare || null);
    setSpareEditorOpen(true);
  };



  const handleStatusFieldSettingsSave = async (settings) => {
    if (!hospital) return;
    await base44.entities.Hospital.update(hospital.id, {
      ...hospital,
      status_field_settings: settings,
    });
    await queryClient.invalidateQueries({ queryKey: ["hospital", context?.hospital_id] });
    setStatusFieldSettingsOpen(false);
    toast.success("Field settings saved");
  };

  const handleTitleFieldSettingsSave = async (settings) => {
    if (!hospital) return;
    await base44.entities.Hospital.update(hospital.id, {
      ...hospital,
      title_field_settings: settings,
    });
    await queryClient.invalidateQueries({ queryKey: ["hospital", context?.hospital_id] });
    setTitleFieldSettingsOpen(false);
    toast.success("Field settings saved");
  };

  const handleSpecialtyFieldSettingsSave = async (settings) => {
    if (!hospital) return;
    await base44.entities.Hospital.update(hospital.id, {
      ...hospital,
      specialty_field_settings: settings,
    });
    await queryClient.invalidateQueries({ queryKey: ["hospital", context?.hospital_id] });
    setSpecialtyFieldSettingsOpen(false);
    toast.success("Field settings saved");
  };

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        const el = document.activeElement;
        if (el?.tagName === "TEXTAREA") return;
        e.preventDefault();
        handleSave();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 gap-2">
      <div className="bg-white border border-slate-200 rounded-lg px-4 py-3 flex items-center justify-between">
        <div>
          <div className="text-xs text-slate-500 mt-0.5">
            Names are shared across all years for this hospital
          </div>
          {selectedId && (
            <div className="text-xs text-slate-400 font-mono mt-0.5">
              Participant ID: {selectedId}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-2 flex-1 min-h-0">
         <Card className="p-4 border border-slate-200 overflow-auto flex flex-col">
           <div className="flex gap-2 pb-4 border-b border-slate-200 flex-shrink-0">
            <Button onClick={handleSave} disabled={saveMutation.isPending} className="bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white">Save</Button>
            <Button variant="outline" onClick={resetNew} disabled={saveMutation.isPending}>New Name</Button>
            <Button variant="outline" onClick={handleDeactivate} disabled={!selectedId || deactivateMutation.isPending}>Deactivate Name</Button>
           </div>
           <div className="overflow-auto flex-1">
           <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 items-end">
            <div>
              <Label>{labels.nameId}</Label>
              <Input value={form.name_id || ""} onChange={(e) => setVal("name_id", e.target.value)} />
            </div>
            <div className="flex justify-end">
              <Button variant="outline" onClick={() => toast.message("Certifications (not wired yet)")}>
                Certifications
              </Button>
            </div>
            <div className="flex items-center justify-end gap-2">
              <Label className="text-sm">Active</Label>
              <input
                type="checkbox"
                checked={!!form.is_active}
                onChange={(e) => setVal("is_active", e.target.checked)}
                className="h-4 w-4 rounded border-slate-300"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 mt-2 items-end">
            <div>
              <Label>Last Name</Label>
              <Input ref={lastNameRef} value={form.last_name || ""} onChange={(e) => setVal("last_name", e.target.value)} />
            </div>
            <div>
              <Label>First Name</Label>
              <Input value={form.first_name || ""} onChange={(e) => setVal("first_name", e.target.value)} />
            </div>
            <div>
              <Label>{labels.title}</Label>
              {titles?.length ? (
                <Select value={form.title || ""} onValueChange={(v) => setVal("title", v)}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    {titles.map((t) => <SelectItem key={t.id} value={t.name} disabled={t.is_active === false}>{t.name} {t.is_active === false ? "(Inactive)" : ""}</SelectItem>)}
                  </SelectContent>
                </Select>
              ) : (
                <Input value={form.title || ""} onChange={(e) => setVal("title", e.target.value)} />
              )}
            </div>
            <div className="flex justify-end">
              <Button variant="outline" onClick={handleTitleEdit}>Edit</Button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 mt-2 items-end">
            <div>
              <Label>{labels.specialty}</Label>
              {specialties?.length ? (
                <Select value={form.specialty || ""} onValueChange={(v) => setVal("specialty", v)}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    {specialties.map((s) => <SelectItem key={s.id} value={s.name} disabled={s.is_active === false}>{s.name} {s.is_active === false ? "(Inactive)" : ""}</SelectItem>)}
                  </SelectContent>
                </Select>
              ) : (
                <Input value={form.specialty || ""} onChange={(e) => setVal("specialty", e.target.value)} />
              )}
            </div>
            <Button variant="outline" onClick={handleSpecialtyEdit}>Edit</Button>
            <div>
              <Label>{labels.spare}</Label>
              <Input value={form.spare || ""} onChange={(e) => setVal("spare", e.target.value)} />
            </div>
            <Button variant="outline" onClick={handleSpareEdit}>Edit</Button>
            </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2 items-end">
            <div>
              <Label>{labels.status}</Label>
              {statuses?.length ? (
                <Select value={form.status || ""} onValueChange={(v) => setVal("status", v)}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    {statuses.map((s) => <SelectItem key={s.id} value={s.name} disabled={s.is_active === false}>{s.name} {s.is_active === false ? "(Inactive)" : ""}</SelectItem>)}
                  </SelectContent>
                </Select>
              ) : (
                <Input value={form.status || ""} onChange={(e) => setVal("status", e.target.value)} />
              )}
            </div>
            <Button variant="outline" onClick={() => { setStatusToEdit(statuses?.find(s => s.name === form.status) || null); setStatusEditorOpen(true); }}>Edit</Button>
            </div>

            </div>
            </Card>

        <Card className="p-4 border border-slate-200 overflow-auto">
          <div className="space-y-3">
            <div>
              <Label>Address</Label>
              <Input value={form.address1 || ""} onChange={(e) => setVal("address1", e.target.value)} onBlur={handleSave} />
              <div className="mt-2">
                <Input value={form.address2 || ""} onChange={(e) => setVal("address2", e.target.value)} onBlur={handleSave} />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div>
                <Label>Phone</Label>
                <Input value={form.phone || ""} onChange={(e) => setVal("phone", e.target.value)} onBlur={handleSave} />
              </div>
              <div>
                <Label>Ext</Label>
                <Input value={form.ext || ""} onChange={(e) => setVal("ext", e.target.value)} onBlur={handleSave} />
              </div>
              <div>
                <Label>Fax</Label>
                <Input value={form.fax || ""} onChange={(e) => setVal("fax", e.target.value)} onBlur={handleSave} />
              </div>
            </div>
            <div>
              <Label>Email</Label>
              <Input value={form.email || ""} onChange={(e) => setVal("email", e.target.value)} onBlur={handleSave} />
            </div>
            <div className="pt-2 border-t border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-2">
              <Button variant="outline" onClick={() => toast.message("Print Mailing Labels (not wired)")}>Print Mailing Labels</Button>
              <Button 
                variant="outline" 
                onClick={() => setCertificatePrintOpen(true)}
                disabled={!selectedId}
              >
                Print Certificate
              </Button>
              <Button variant="outline" onClick={() => setSelectNamesOpen(true)}>Print Transcripts</Button>
              <Button variant="outline" onClick={() => setHospitalTranscriptOpen(true)}>Print Hospital Transcript</Button>
              <Button variant="outline" onClick={() => toast.message("Expiration Report (not wired)")}>Print Expiration Report</Button>
              <Button variant="outline" onClick={() => toast.message("List Classes (not wired)")}>List Classes</Button>
            </div>
            </div>
            </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-2 min-h-0">
        <Card className="border border-slate-200 flex flex-col min-h-0 overflow-hidden">
          <div className="px-3 py-2 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
            <span className="font-semibold text-sm">Name List ({sortedParticipants.length})</span>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={showDeactivated}
                onChange={(e) => setShowDeactivated(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300"
              />
              <Label className="text-xs font-normal cursor-pointer" onClick={() => setShowDeactivated(!showDeactivated)}>
                Show deactivated
              </Label>
            </div>
          </div>
          <div className="px-3 py-2 border-b border-slate-100">
            <Input
              placeholder="Search by name, email, ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 text-sm"
            />
          </div>
          <div className="p-2 min-h-0 overflow-y-auto flex-1">
            {sortedParticipants.length === 0 ? (
              <div className="text-center py-8 text-slate-500 text-sm">
                No names found
              </div>
            ) : (
              sortedParticipants.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handleSelect(p)}
                  onDoubleClick={() => {
                    setCESummaryParticipantId(p.id);
                    setCESummaryOpen(true);
                  }}
                  className={`w-full text-left px-3 py-2 rounded text-sm ${
                    selectedId === p.id ? "bg-indigo-100 border border-indigo-300" : "hover:bg-slate-50"
                  }`}
                >
                  <div className="flex justify-between">
                    <div className="flex-1">
                      <div className="font-medium">
                        {(p.last_name || "").toUpperCase()}, {p.first_name || ""}
                      </div>
                      <div className="text-xs text-slate-400 font-mono mt-0.5">
                        ID: {p.id}
                      </div>
                      {p.is_active === false && (
                        <div className="text-xs text-red-500 mt-0.5">Deactivated</div>
                      )}
                    </div>
                    <span className="text-slate-500">{p.title || ""}</span>
                  </div>
                </button>
              ))
            )}
          </div>
        </Card>

        <Card className="border border-slate-200 p-3 self-start">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <Button variant="outline" onClick={resetNew}>New Name</Button>
            <Button variant="outline" onClick={handleDeactivate} disabled={!selectedId}>Deactivate Name</Button>
            <Button variant="outline" onClick={() => toast.message("List Classes (not wired)")}>List Classes</Button>
            <Button variant="outline" onClick={() => toast.message("Print Mailing Labels (not wired)")}>Print Mailing Labels</Button>
            <Button variant="outline" onClick={() => setSelectNamesOpen(true)}>Print Transcripts</Button>
            <Button variant="outline" onClick={() => setHospitalTranscriptOpen(true)}>Print Hospital Transcript</Button>
            <Button variant="outline" onClick={() => toast.message("Expiration Report (not wired)")}>Print Expiration Report</Button>
          </div>
        </Card>
      </div>

      <StatusEditWindow
        open={statusEditorOpen}
        initialStatus={statusToEdit}
        onClose={() => setStatusEditorOpen(false)}
      />

      <TitleEditWindow
        open={titleEditorOpen}
        initialTitle={titleToEdit}
        onClose={() => setTitleEditorOpen(false)}
      />

      <SpecialtyEditWindow
        open={specialtyEditorOpen}
        initialSpecialty={specialtyToEdit}
        onClose={() => setSpecialtyEditorOpen(false)}
      />

      <SpareEditWindow
        open={spareEditorOpen}
        initialSpare={spareToEdit}
        onClose={() => setSpareEditorOpen(false)}
      />

      <SelectNamesForTranscripts
        open={selectNamesOpen}
        onClose={() => setSelectNamesOpen(false)}
        participants={sortedParticipants}
        titles={titles || []}
        specialties={specialties || []}
        spareFields={spareFields || []}
        statuses={statuses || []}
        onPrint={(selected) => {
          toast.success(`Selected ${selected.length} names for transcript`);
          setSelectNamesOpen(false);
        }}
      />

      <HospitalTranscriptModal
        open={hospitalTranscriptOpen}
        onClose={() => setHospitalTranscriptOpen(false)}
      />

      <FieldSettingsModal
        open={statusFieldSettingsOpen}
        entityType="status"
        onClose={() => setStatusFieldSettingsOpen(false)}
        onSave={handleStatusFieldSettingsSave}
        currentSettings={hospital?.status_field_settings}
        allData={statuses || []}
      />

      <FieldSettingsModal
        open={titleFieldSettingsOpen}
        entityType="title"
        onClose={() => setTitleFieldSettingsOpen(false)}
        onSave={handleTitleFieldSettingsSave}
        currentSettings={hospital?.title_field_settings}
        allData={titles || []}
      />

      <FieldSettingsModal
        open={specialtyFieldSettingsOpen}
        entityType="specialty"
        onClose={() => setSpecialtyFieldSettingsOpen(false)}
        onSave={handleSpecialtyFieldSettingsSave}
        currentSettings={hospital?.specialty_field_settings}
        allData={specialties || []}
      />

      <ParticipantCESummary
        open={ceSummaryOpen}
        participantId={ceSummaryParticipantId}
        onClose={() => setCESummaryOpen(false)}
      />

      {certificatePrintOpen && selectedId && (
        <div className="fixed inset-0 bg-white z-[9999] flex flex-col">
          <button
            onClick={() => setCertificatePrintOpen(false)}
            className="absolute top-4 right-4 z-[10000] text-slate-500 hover:text-slate-700"
          >
            <span className="text-lg">×</span>
          </button>
          <div className="flex-1 overflow-auto">
            <CertificateIssuanceScreen
              activityId={certificateActivityId}
              hospital_id={context?.hospital_id}
              participantId={selectedId}
            />
          </div>
        </div>
      )}
      </div>
      );
      }