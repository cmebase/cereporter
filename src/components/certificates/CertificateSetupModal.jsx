import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Printer, CheckCircle } from "lucide-react";
import EditableText from "./EditableText";

export default function CertificateSetupModal({ open, onClose, ceRecords = [], participants = [], activityId = null }) {
  const queryClient = useQueryClient();
  const [editableFields, setEditableFields] = useState({
    orgName: "",
    location: "",
    classTitle: "",
    site: "",
    creditStatement: "",
    signatureLabel: "Authorized Signature",
  });
  const [printNameIdAsLicense, setPrintNameIdAsLicense] = useState(false);
  const [selectedRecordId, setSelectedRecordId] = useState(ceRecords[0]?.id || null);

  const context = useMemo(() => {
    const stored = sessionStorage.getItem("ce_context");
    return stored ? JSON.parse(stored) : null;
  }, []);

  // Get current user
  const { data: currentUser } = useQuery({
    queryKey: ["currentUser"],
    queryFn: () => base44.auth.me(),
    enabled: open,
  });

  const { data: hospital } = useQuery({
    queryKey: ["hospital", context?.hospital_id],
    queryFn: async () => {
      if (!context?.hospital_id) return null;
      const list = await base44.entities.Hospital.list();
      return list.find((h) => h.id === context.hospital_id) || null;
    },
    enabled: !!context?.hospital_id && open,
  });

  // Fetch certificate config and templates
  const { data: config } = useQuery({
    queryKey: ['activityCertificateConfig', activityId],
    queryFn: async () => {
      if (!activityId) return null;
      const configs = await base44.entities.ActivityCertificateConfig.list();
      return configs.find(c => c.activity_id === activityId);
    },
    enabled: !!activityId && open,
  });

  const { data: templates = [] } = useQuery({
    queryKey: ['certificateTemplates', context?.hospital_id],
    queryFn: async () => {
      if (!context?.hospital_id) return [];
      const all = await base44.entities.CertificateTemplate.list();
      return all.filter(t => t.hospital_id === context.hospital_id && t.status !== 'archived');
    },
    enabled: !!context?.hospital_id && open,
  });

  // Initialize fields when modal opens
  useEffect(() => {
    if (open && ceRecords.length > 0 && hospital) {
      const firstRecord = ceRecords[0];
      const creditHours = firstRecord.credit_hours || 1;
      const creditType = firstRecord.credit_type || "AMA PRA";
      const hospitalName = hospital.profile_name || hospital.name || "";
      const cityState = hospital.city_state || "";
      const siteText = cityState ? `${hospitalName}, ${cityState}` : hospitalName;
      
      // Load from template if available
      const firstParticipant = participants[0];
      const isPhysician = firstParticipant && ['MD', 'DO', 'MBBS'].includes(firstParticipant.title);
      const templateId = isPhysician ? config?.physician_template_id : config?.other_template_id;
      const template = templates.find(t => t.id === templateId);
      const layoutData = template?.layout_json || {};
      
      setEditableFields({
        orgName: layoutData.clientName || hospitalName,
        location: layoutData.location || cityState,
        classTitle: layoutData.classTitle || firstRecord.class_title || "",
        site: layoutData.location && hospitalName ? `${hospitalName}, ${layoutData.location}` : siteText,
        creditStatement: layoutData.creditDesignation || `${creditHours} hour(s) of credit approved by ${creditType}`,
        signatureLabel: "Authorized Signature",
      });
    }
  }, [open, ceRecords, hospital, config, templates, participants]);

  // Issue certificate mutation
  const issueMutation = useMutation({
    mutationFn: async () => {
      const recordToIssue = ceRecords.find(r => r.id === selectedRecordId);
      const participant = participants.find(p => p.id === recordToIssue?.participant_id);
      
      if (!recordToIssue || !participant) {
        throw new Error("Certificate or participant data missing");
      }

      if (!config) {
        throw new Error("Certificate configuration not found. Set up certificates in the Setup tab first.");
      }

      // Determine certificate type and template
      const isPhysician = ['MD', 'DO', 'MBBS'].includes(participant.title);
      const templateId = isPhysician ? config.physician_template_id : config.other_template_id;
      
      if (!templateId) {
        throw new Error(`No ${isPhysician ? 'physician' : 'other professional'} template selected in certificate setup.`);
      }

      const template = templates.find(t => t.id === templateId);
      if (!template) {
        throw new Error("Selected template not found");
      }

      // Create hash from template + version + payload
      const payloadSnapshot = {
        participant_name: recordToIssue.participant_name,
        class_title: editableFields.classTitle,
        organization: editableFields.orgName,
        date: recordToIssue.date,
        credit_hours: recordToIssue.credit_hours,
        site: editableFields.site,
        accreditation_statement: config.accreditation_statement,
      };

      const hashInput = JSON.stringify({ template_id: templateId, version: template.version, payload: payloadSnapshot });
      const hashBuffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(hashInput));
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

      // Create the CertificateIssue record
      const issue = {
        activity_id: recordToIssue.class_id,
        participant_id: recordToIssue.participant_id,
        hospital_id: context.hospital_id,
        template_id: templateId,
        template_version: template.version,
        template_type: isPhysician ? 'physician' : 'other',
        issued_at: new Date().toISOString(),
        issued_by_user_id: currentUser?.id,
        payload_snapshot_json: payloadSnapshot,
        pdf_file_id: `cert_${recordToIssue.id}_${Date.now()}`,
        hash: hashHex,
        status: "issued"
      };

      await base44.entities.CertificateIssue.create(issue);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['certificateIssues', activityId] });
      toast.success("Certificate issued");
      onClose();
    },
    onError: (err) => toast.error(err.message || "Failed to issue certificate")
  });

  const handlePrint = () => {
    const recordToPrint = ceRecords.find(r => r.id === selectedRecordId);
    if (!recordToPrint) {
      toast.error("No certificate selected");
      return;
    }

    try {
      const escapeHtml = (v) =>
        String(v ?? "")
          .replaceAll("&", "&amp;")
          .replaceAll("<", "&lt;")
          .replaceAll(">", "&gt;")
          .replaceAll('"', "&quot;")
          .replaceAll("'", "&#039;");

      const css = `
        @page { size: letter landscape; margin: 0; }
        html, body { margin: 0; padding: 0; background: #fff; color: #000; font-family: "Times New Roman", Times, serif; }
        body { overflow: hidden; }
        .page { width: 11in; height: 8.5in; box-sizing: border-box; padding: 0.55in 0.7in; display: flex; flex-direction: column; justify-content: space-between; page-break-after: always; page-break-inside: avoid; break-after: page; break-inside: avoid; overflow: hidden; }
        .header { text-align: center; margin-top: 0.05in; }
        .org { font-size: 42px; font-weight: 500; letter-spacing: 0.3px; }
        .loc { font-size: 26px; margin-top: 6px; }
        .title { margin-top: 0.35in; text-align: center; font-size: 40px; letter-spacing: 0.6px; text-transform: uppercase; line-height: 1.15; }
        .date { text-align: center; margin-top: 0.18in; font-size: 26px; }
        .credit { text-align: center; margin-top: 0.32in; font-size: 20px; line-height: 1.35; }
        .award { text-align: center; }
        .award-label { font-size: 20px; margin-bottom: 10px; }
        .award-name { font-size: 48px; font-style: italic; font-weight: 600; letter-spacing: 0.8px; }
        .signature { text-align: center; margin-bottom: 0.08in; }
        .sig-line { width: 4.8in; margin: 0 auto; border-top: 2px solid #000; padding-top: 8px; font-size: 16px; font-style: italic; }
        @media print { * { -webkit-print-color-adjust: exact; print-color-adjust: exact; } a[href]:after { content: "" !important; } }
      `;

      const participant = participants.find((p) => p.id === recordToPrint.participant_id);
      if (!participant) {
        toast.error("Participant not found");
        return;
      }

      const dateText = recordToPrint.date
        ? new Date(recordToPrint.date).toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
          })
        : "";

      let awardedToText;
      if (printNameIdAsLicense && participant.name_id) {
        awardedToText = `License # ${participant.name_id}`;
      } else {
        const fullName = `${participant.first_name || ""} ${participant.last_name || ""}`.trim().toUpperCase();
        const title = participant.title ? `, ${participant.title}` : "";
        awardedToText = `${fullName}${title}`;
      }

      const htmlPages = `
        <div class="page">
          <div>
            <div class="header">
              <div class="org">${escapeHtml(editableFields.orgName)}</div>
              ${editableFields.location ? `<div class="loc">${escapeHtml(editableFields.location)}</div>` : ""}
            </div>

            <div class="title">${escapeHtml(editableFields.classTitle)}</div>
            <div class="date">${escapeHtml(dateText)}</div>

            <div class="credit">
              ${editableFields.site ? `<div style="font-style: italic;">Site: ${escapeHtml(editableFields.site)}</div>` : ""}
              ${editableFields.creditStatement ? `<div style="font-style: italic;">${escapeHtml(editableFields.creditStatement)}</div>` : ""}
            </div>
          </div>

          <div class="award">
            <div class="award-label">Awarded to:</div>
            <div class="award-name">${escapeHtml(awardedToText)}</div>
          </div>

          <div class="signature">
            <div class="sig-line">${escapeHtml(editableFields.signatureLabel)}</div>
          </div>
        </div>
      `;

      const html = `
        <!doctype html>
        <html>
          <head>
            <meta charset="utf-8" />
            <title>Certificate</title>
            <style>${css}</style>
          </head>
          <body>
            ${htmlPages}
          </body>
        </html>
      `;

      const win = window.open("about:blank", "_blank", "width=1200,height=900");
      if (!win) {
        toast.error("Pop-up blocked. Allow pop-ups to print.");
        return;
      }

      win.document.open();
      win.document.write(html);
      win.document.close();

      win.onload = () => {
        setTimeout(() => {
          win.focus();
          win.print();
        }, 250);
      };

      toast.success("Printing certificate");
    } catch (e) {
      console.error("Certificate generation error:", e);
      toast.error("Failed to generate certificate");
    }
  };

  if (!open || ceRecords.length === 0) return null;

  const selectedRecord = ceRecords.find(r => r.id === selectedRecordId) || ceRecords[0];
  const selectedParticipant = participants.find((p) => p.id === selectedRecord.participant_id);
  const dateText = selectedRecord.date
    ? new Date(selectedRecord.date).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "";

  let previewAwardedTo;
  if (printNameIdAsLicense && selectedParticipant?.name_id) {
    previewAwardedTo = `License # ${selectedParticipant.name_id}`;
  } else if (selectedParticipant) {
    const fullName = `${selectedParticipant.first_name || ""} ${selectedParticipant.last_name || ""}`.trim().toUpperCase();
    const title = selectedParticipant.title ? `, ${selectedParticipant.title}` : "";
    previewAwardedTo = `${fullName}${title}`;
  } else {
    previewAwardedTo = "PARTICIPANT NAME";
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-full max-h-full w-screen h-screen p-0 gap-0">
        {/* Sticky Header */}
        <div className="sticky top-0 z-50 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
           <div>
             <h2 className="text-xl font-semibold">Certificate Setup</h2>
             <p className="text-xs text-slate-500 mt-1">Class: {ceRecords.find(r => r.id === selectedRecordId)?.class_title}</p>
           </div>
           <div className="flex items-center gap-4">
             <div className="flex items-center gap-2">
               <input
                 type="checkbox"
                 id="print-name-id-header"
                 checked={printNameIdAsLicense}
                 onChange={(e) => setPrintNameIdAsLicense(e.target.checked)}
                 className="h-4 w-4 rounded border-slate-300"
               />
               <Label htmlFor="print-name-id-header" className="text-sm cursor-pointer">
                 Print Name ID as License #
               </Label>
             </div>
             <Button variant="outline" onClick={onClose}>
               Cancel
             </Button>
             <Button onClick={handlePrint} className="gap-2">
               <Printer className="w-4 h-4" />
               Print
             </Button>
             <Button 
               onClick={() => issueMutation.mutate()}
               disabled={!selectedRecordId || issueMutation.isPending}
               className="gap-2 bg-green-600 hover:bg-green-700"
             >
               <CheckCircle className="w-4 h-4" />
               Issue
             </Button>
           </div>
        </div>

        {/* Classes Selection */}
        <div className="bg-slate-50 border-b border-slate-200 px-6 py-4 max-h-32 overflow-y-auto">
          <div className="text-sm font-medium text-slate-700 mb-3">Select class to view certificate:</div>
          <div className="flex flex-wrap gap-2">
            {ceRecords.map((record) => {
              const isSelected = selectedRecordId === record.id;
              return (
                <button
                  key={record.id}
                  onClick={() => setSelectedRecordId(record.id)}
                  className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                    isSelected 
                      ? "bg-indigo-600 text-white" 
                      : "bg-white border border-slate-300 text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  {record.class_title}
                </button>
              );
            })}
          </div>
        </div>

        {/* Certificate Preview */}
         <div className="flex-1 overflow-auto bg-slate-200 p-8">
          <div className="text-center text-sm text-slate-600 mb-4">
            Blue text may be edited (click to edit)
          </div>
          <div
            className="bg-white shadow-2xl mx-auto font-serif"
            style={{
              width: "11in",
              height: "8.5in",
              padding: "0.55in 0.7in",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
            }}
          >
            <div>
              <div style={{ textAlign: "center", marginTop: "0.05in" }}>
                <div style={{ fontSize: "42px", fontWeight: 500, letterSpacing: "0.3px" }}>
                  <EditableText
                    value={editableFields.orgName}
                    onChange={(v) => setEditableFields((prev) => ({ ...prev, orgName: v }))}
                    style={{ fontSize: "42px", fontWeight: 500, letterSpacing: "0.3px" }}
                  />
                </div>
                {editableFields.location && (
                  <div style={{ fontSize: "26px", marginTop: "6px" }}>
                    <EditableText
                      value={editableFields.location}
                      onChange={(v) => setEditableFields((prev) => ({ ...prev, location: v }))}
                      style={{ fontSize: "26px" }}
                    />
                  </div>
                )}
              </div>

              <div style={{ marginTop: "0.35in", textAlign: "center", fontSize: "40px", letterSpacing: "0.6px", textTransform: "uppercase", lineHeight: 1.15 }}>
                <EditableText
                  value={editableFields.classTitle}
                  onChange={(v) => setEditableFields((prev) => ({ ...prev, classTitle: v }))}
                  multiline
                  style={{ fontSize: "40px", letterSpacing: "0.6px", textTransform: "uppercase", lineHeight: 1.15, textAlign: "center", display: "inline-block", minWidth: "8in" }}
                />
              </div>

              <div style={{ textAlign: "center", marginTop: "0.18in", fontSize: "26px" }}>
                {dateText}
              </div>

              <div style={{ textAlign: "center", marginTop: "0.32in", fontSize: "20px", lineHeight: 1.35 }}>
                {editableFields.site && (
                  <div style={{ fontStyle: "italic" }}>
                    Site:{" "}
                    <EditableText
                      value={editableFields.site}
                      onChange={(v) => setEditableFields((prev) => ({ ...prev, site: v }))}
                      style={{ fontSize: "20px", fontStyle: "italic" }}
                    />
                  </div>
                )}
                {editableFields.creditStatement && (
                  <div style={{ marginTop: "4px", fontStyle: "italic" }}>
                    <EditableText
                      value={editableFields.creditStatement}
                      onChange={(v) => setEditableFields((prev) => ({ ...prev, creditStatement: v }))}
                      style={{ fontSize: "20px", lineHeight: 1.35, display: "inline-block", minWidth: "6in", fontStyle: "italic" }}
                    />
                  </div>
                )}
              </div>
            </div>

            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "20px", marginBottom: "10px" }}>
                Awarded to:
              </div>
              <div style={{ fontSize: "48px", fontStyle: "italic", fontWeight: 600, letterSpacing: "0.8px" }}>
                {previewAwardedTo}
              </div>
            </div>

            <div style={{ textAlign: "center", marginBottom: "0.08in" }}>
              <div style={{ width: "4.8in", margin: "0 auto", borderTop: "2px solid #000", paddingTop: "8px", fontSize: "16px", fontStyle: "italic" }}>
                <EditableText
                  value={editableFields.signatureLabel}
                  onChange={(v) => setEditableFields((prev) => ({ ...prev, signatureLabel: v }))}
                  style={{ fontSize: "16px", fontStyle: "italic" }}
                />
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}