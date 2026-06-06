import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Upload, X, Link as LinkIcon, CheckCircle, AlertCircle } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";

export default function SupportTicketModal({ open, onClose }) {
  const queryClient = useQueryClient();
  const [view, setView] = useState("form"); // "form" | "status"
  const [formData, setFormData] = useState({
    subject: "",
    description: "",
    priority: "medium",
    category: "other",
  });
  const [attachments, setAttachments] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [recordingLink, setRecordingLink] = useState("");
  const [userTickets, setUserTickets] = useState([]);

  // Reset form when opened
  useEffect(() => {
    if (open) {
      setFormData({
        subject: "",
        description: "",
        priority: "medium",
        category: "other",
      });
      setAttachments([]);
      setRecordingLink("");
      setView("form");
      // Fetch user's tickets
      const fetchTickets = async () => {
        try {
          const tickets = await base44.entities.SupportTicket.list();
          const currentUser = await base44.auth.me();
          setUserTickets(tickets.filter((t) => t.submitted_by_email === currentUser.email));
        } catch (error) {
          console.error("Failed to fetch tickets:", error);
        }
      };
      fetchTickets();
    }
  }, [open]);

  const createTicketMutation = useMutation({
    mutationFn: async (data) => {
      // Create ticket
      const ticket = await base44.entities.SupportTicket.create(data);
      
      // Send email notification
      try {
        await base44.integrations.Core.SendEmail({
          to: "armands@simpletechhelper.com",
          subject: `[CE Reporter] New Support Ticket: ${data.subject}`,
          body: `
New support ticket submitted:

Ticket ID: ${ticket.id}
Subject: ${data.subject}
Priority: ${data.priority}
Category: ${data.category}
Status: New

Submitted by: ${data.submitted_by_name} (${data.submitted_by_email})
Hospital: ${data.hospital_name || "N/A"}
Year: ${data.year || "N/A"}
Page: ${data.page_module || "Unknown"}

Description:
${data.description}

${data.attachments && data.attachments.length > 0 ? `Attachments: ${data.attachments.length} file(s)` : ""}

View ticket in CE Reporter admin panel.
          `.trim()
        });

        // Send copy to submitting user
        await base44.integrations.Core.SendEmail({
          to: data.submitted_by_email,
          subject: `Support Ticket Submitted: ${data.subject}`,
          body: `
Thank you for submitting a support ticket.

Ticket ID: ${ticket.id}
Subject: ${data.subject}
Priority: ${data.priority}
Status: New

Our team will review your ticket and respond as soon as possible.

Description:
${data.description}

You will receive email updates when your ticket status changes.
          `.trim()
        });
      } catch (emailError) {
        console.error("Failed to send email notification:", emailError);
      }

      return ticket;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["supportTickets"] });
      toast.success("Support ticket submitted successfully");
      onClose();
    },
    onError: (error) => {
      toast.error("Failed to submit ticket: " + error.message);
    },
  });

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    setUploading(true);
    try {
      const uploadedUrls = [];
      for (const file of files) {
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        uploadedUrls.push({ name: file.name, url: file_url });
      }
      setAttachments([...attachments, ...uploadedUrls]);
      toast.success(`${files.length} file(s) uploaded`);
    } catch (error) {
      toast.error("Failed to upload files");
    } finally {
      setUploading(false);
    }
  };

  const removeAttachment = (index) => {
    setAttachments(attachments.filter((_, i) => i !== index));
  };

  const handleMarkResolved = async (ticket) => {
    try {
      await base44.entities.SupportTicket.update(ticket.id, {
        status: "resolved",
      });
      setUserTickets(userTickets.map((t) => t.id === ticket.id ? { ...t, status: "resolved" } : t));
      queryClient.invalidateQueries({ queryKey: ["supportTickets"] });
      toast.success("Ticket marked as resolved");
    } catch (error) {
      toast.error("Failed to update ticket: " + error.message);
    }
  };



  const handleSubmit = async () => {
    if (!formData.subject.trim() || !formData.description.trim()) {
      toast.error("Subject and description are required");
      return;
    }

    try {
      const currentUser = await base44.auth.me();
      const context = JSON.parse(sessionStorage.getItem("ce_context") || "{}");
      const currentPage = window.location.pathname.replace("/", "") || "Dashboard";

      // Get hospital name if context exists
      let hospitalName = null;
      if (context.hospital_id) {
        try {
          const hospitals = await base44.entities.Hospital.list();
          const hospital = hospitals.find(h => h.id === context.hospital_id);
          hospitalName = hospital?.name;
        } catch (e) {
          console.error("Failed to get hospital name:", e);
        }
      }

      const ticketData = {
        ...formData,
        submitted_by_email: currentUser.email,
        submitted_by_name: currentUser.full_name || currentUser.email,
        hospital_id: context.hospital_id || null,
        hospital_name: hospitalName,
        year: context.year || null,
        page_module: currentPage,
        attachments: [...attachments.map(a => a.url), ...(recordingLink ? [recordingLink] : [])],
        status: "new",
      };

      createTicketMutation.mutate(ticketData);
    } catch (error) {
      toast.error("Failed to submit ticket");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{view === "form" ? "Submit Support Ticket" : "My Tickets"}</DialogTitle>
          <DialogDescription className="sr-only">
            {view === "form" ? "Submit a support request including issue details, priority, and attachments." : "View your support ticket status"}
          </DialogDescription>
        </DialogHeader>

        {/* Form View */}
        {view === "form" && (
        <div className="space-y-4 flex-1 overflow-y-auto">
          <div>
            <Label>Subject *</Label>
            <Input
              value={formData.subject}
              onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
              placeholder="Brief description of your issue"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Priority</Label>
              <Select value={formData.priority} onValueChange={(v) => setFormData({ ...formData, priority: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Category</Label>
              <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bug">Bug</SelectItem>
                  <SelectItem value="feature_request">Feature Request</SelectItem>
                  <SelectItem value="question">Question</SelectItem>
                  <SelectItem value="data_issue">Data Issue</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>Description *</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Provide detailed information about your issue..."
              rows={6}
            />
          </div>

          <div>
            <Label>Attachments (optional)</Label>
            <div className="mt-2 space-y-3">
              {/* File Upload */}
              <label className="cursor-pointer block">
                <div className="border-2 border-dashed border-slate-300 rounded-lg p-4 text-center hover:border-indigo-400 transition">
                  <Upload className="w-6 h-6 mx-auto mb-2 text-slate-400" />
                  <p className="text-sm text-slate-600">
                    Click to upload screenshots or files
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    {uploading ? "Uploading..." : "PNG, JPG, PDF (max 10MB each)"}
                  </p>
                </div>
                <input
                  type="file"
                  multiple
                  accept="image/*,.pdf"
                  onChange={handleFileUpload}
                  className="hidden"
                  disabled={uploading}
                />
              </label>

              {/* Recording Link */}
              <div className="border border-slate-300 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <LinkIcon className="w-5 h-5 text-slate-600" />
                  <span className="text-sm font-medium text-slate-700">Screen Recording Link (optional)</span>
                </div>
                <Input
                  type="url"
                  value={recordingLink}
                  onChange={(e) => setRecordingLink(e.target.value)}
                  placeholder="https://example.com/recording"
                />
                <p className="text-xs text-slate-500 mt-2">
                  Paste a link to your screen recording if you have one
                </p>
              </div>

              {/* Attached Files List */}
              {attachments.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-slate-700">Attached files:</p>
                  {attachments.map((att, idx) => (
                    <div key={idx} className="flex items-center justify-between bg-slate-50 p-2 rounded">
                      <span className="text-sm text-slate-700 truncate">{att.name}</span>
                      <button onClick={() => removeAttachment(idx)} className="text-slate-400 hover:text-red-600">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3 text-xs text-slate-600">
            <p className="font-medium text-indigo-900 mb-1">Your context will be automatically included:</p>
            <ul className="list-disc list-inside space-y-0.5 text-slate-700">
              <li>Current page/module</li>
              <li>Hospital and year context (if set)</li>
              <li>Your user information</li>
            </ul>
          </div>

          <div className="flex gap-3 pt-4 sticky bottom-0 bg-white pb-2 border-t mt-4 -mx-6 px-6">
            <Button onClick={onClose} variant="outline" className="flex-1">
              Cancel
            </Button>
            <Button 
              onClick={() => setView("status")}
              className="bg-yellow-500 hover:bg-yellow-600 text-slate-900 font-medium flex-1"
            >
              My Tickets
            </Button>
            <Button 
              onClick={handleSubmit} 
              className="flex-1 bg-indigo-600 hover:bg-indigo-700"
              disabled={createTicketMutation.isPending || uploading}
            >
              {createTicketMutation.isPending ? "Submitting..." : "Submit Ticket"}
            </Button>
          </div>
          </div>
          )}

          {/* Status View */}
          {view === "status" && (
          <div className="flex-1 flex flex-col items-center justify-center text-center">
          {userTickets.length === 0 ? (
            <>
              <CheckCircle className="w-12 h-12 text-green-600 mb-4" />
              <h2 className="text-lg font-semibold text-slate-900">No support tickets</h2>
              <p className="text-slate-600 mt-2">You're all caught up!</p>
            </>
          ) : (
            <>
              <h2 className="text-lg font-semibold text-slate-900 mb-4">Your Support Tickets</h2>
              <div className="w-full max-h-96 overflow-y-auto space-y-2 mb-4">
                {userTickets.map((ticket) => (
                  <button
                    key={ticket.id}
                    onClick={() => ticket.status !== "closed" && ticket.status !== "resolved" && handleMarkResolved(ticket)}
                    className={`w-full text-sm border-l-4 pl-3 py-2 text-left transition ${
                      ticket.status === "resolved" || ticket.status === "closed"
                        ? "border-slate-300 bg-slate-50 cursor-default"
                        : "border-yellow-400 bg-white hover:bg-yellow-50 cursor-pointer"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      {ticket.status === "resolved" || ticket.status === "closed" ? (
                        <CheckCircle className="w-4 h-4 text-green-600" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-orange-500" />
                      )}
                      <span className="font-medium text-slate-900">{ticket.subject}</span>
                    </div>
                    <div className="text-xs text-slate-600">
                      Status: <span className="font-medium">{ticket.status}</span>
                      {ticket.status !== "closed" && ticket.status !== "resolved" && (
                        <span className="ml-2 text-yellow-600 font-medium">(Click to mark resolved)</span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </>
          )}

          <Button
            onClick={() => setView("form")}
            className="bg-red-600 hover:bg-red-700 text-white mt-6"
          >
            Back
          </Button>
          </div>
          )}
          </DialogContent>
    </Dialog>
  );
}