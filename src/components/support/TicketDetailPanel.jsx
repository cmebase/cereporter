import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X, Paperclip, Send, Download } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

export default function TicketDetailPanel({ ticket, onClose }) {
  const queryClient = useQueryClient();
  const [newComment, setNewComment] = useState("");
  const [commentVisibility, setCommentVisibility] = useState("user");
  const [newStatus, setNewStatus] = useState(ticket.status);

  const { data: comments = [] } = useQuery({
    queryKey: ["ticketComments", ticket.id],
    queryFn: async () => {
      const all = await base44.entities.SupportTicketComment.list("-created_date");
      return all.filter(c => c.ticket_id === ticket.id);
    },
  });

  const { data: currentUser } = useQuery({
    queryKey: ["currentUser"],
    queryFn: () => base44.auth.me(),
  });

  const addCommentMutation = useMutation({
    mutationFn: async (data) => {
      const comment = await base44.entities.SupportTicketComment.create(data);
      
      // Log audit
      await base44.entities.AuditLog.create({
        user_email: currentUser?.email || "system",
        action: "create",
        entity_type: "SUPPORT_TICKET_COMMENT",
        entity_id: ticket.id,
        entity_name: `Comment on ticket: ${ticket.subject}`,
        after_value: data.visibility === "internal" ? "Internal note added" : "Comment added"
      });

      // Send email to user if comment is user-visible
      if (data.visibility === "user") {
        try {
          await base44.integrations.Core.SendEmail({
            to: ticket.submitted_by_email,
            subject: `Support Ticket Update: ${ticket.subject}`,
            body: `
Your support ticket has been updated.

Ticket ID: ${ticket.id}
Subject: ${ticket.subject}
Status: ${newStatus}

New comment from support team:
${data.comment}

Reply to this email or check the ticket in CE Reporter.
            `.trim()
          });
        } catch (e) {
          console.error("Failed to send email:", e);
        }
      }

      return comment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ticketComments", ticket.id] });
      setNewComment("");
      toast.success("Comment added");
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async (status) => {
      await base44.entities.SupportTicket.update(ticket.id, { status });
      
      // Log audit
      await base44.entities.AuditLog.create({
        user_email: currentUser?.email || "system",
        action: "update",
        entity_type: "SUPPORT_TICKET_STATUS",
        entity_id: ticket.id,
        entity_name: ticket.subject,
        field_changed: "status",
        before_value: ticket.status,
        after_value: status
      });

      // Send email to user
      try {
        await base44.integrations.Core.SendEmail({
          to: ticket.submitted_by_email,
          subject: `Support Ticket Status Changed: ${ticket.subject}`,
          body: `
Your support ticket status has been updated.

Ticket ID: ${ticket.id}
Subject: ${ticket.subject}
New Status: ${status}

${status === "resolved" ? "Your issue has been resolved. If you need further assistance, please reply to reopen." : ""}
${status === "closed" ? "This ticket has been closed. If you need further assistance, please submit a new ticket." : ""}
          `.trim()
        });
      } catch (e) {
        console.error("Failed to send email:", e);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["supportTickets"] });
      toast.success("Status updated");
    },
  });

  const handleAddComment = () => {
    if (!newComment.trim()) {
      toast.error("Comment cannot be empty");
      return;
    }

    addCommentMutation.mutate({
      ticket_id: ticket.id,
      comment: newComment,
      created_by_email: currentUser?.email,
      created_by_name: currentUser?.full_name || currentUser?.email,
      visibility: commentVisibility,
    });
  };

  const handleStatusChange = (status) => {
    setNewStatus(status);
    updateStatusMutation.mutate(status);
  };

  const statusConfig = {
    new: { label: "New", color: "bg-blue-100 text-blue-700" },
    open: { label: "Open", color: "bg-indigo-100 text-indigo-700" },
    waiting_on_user: { label: "Waiting", color: "bg-amber-100 text-amber-700" },
    resolved: { label: "Resolved", color: "bg-green-100 text-green-700" },
    closed: { label: "Closed", color: "bg-slate-100 text-slate-700" },
  };

  const priorityConfig = {
    low: { label: "Low", color: "bg-slate-100 text-slate-600" },
    medium: { label: "Medium", color: "bg-blue-100 text-blue-700" },
    high: { label: "High", color: "bg-orange-100 text-orange-700" },
    urgent: { label: "Urgent", color: "bg-red-100 text-red-700" },
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      
      <div className="relative bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col mx-4">
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <span className="font-mono text-xs text-slate-500">#{ticket.id.substring(0, 8)}</span>
              <Badge className={priorityConfig[ticket.priority]?.color}>
                {priorityConfig[ticket.priority]?.label}
              </Badge>
              <Badge className={statusConfig[ticket.status]?.color}>
                {statusConfig[ticket.status]?.label}
              </Badge>
            </div>
            <h2 className="text-xl font-semibold text-slate-900">{ticket.subject}</h2>
            <div className="flex items-center gap-4 mt-2 text-sm text-slate-600">
              <span>By {ticket.submitted_by_name}</span>
              <span>•</span>
              <span>{format(new Date(ticket.created_date), "MMM d, yyyy 'at' h:mm a")}</span>
              {ticket.hospital_name && (
                <>
                  <span>•</span>
                  <span>{ticket.hospital_name} {ticket.year && `(${ticket.year})`}</span>
                </>
              )}
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Description */}
          <div>
            <h3 className="text-sm font-medium text-slate-900 mb-2">Description</h3>
            <div className="bg-slate-50 rounded-lg p-4 text-sm text-slate-700 whitespace-pre-wrap">
              {ticket.description}
            </div>
            {ticket.page_module && (
              <div className="mt-2 text-xs text-slate-500">
                Submitted from: <span className="font-medium">{ticket.page_module}</span>
              </div>
            )}
          </div>

          {/* Attachments */}
          {ticket.attachments && ticket.attachments.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-slate-900 mb-2">Attachments</h3>
              <div className="space-y-2">
                {ticket.attachments.map((url, idx) => (
                  <a
                    key={idx}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-indigo-600 hover:text-indigo-700"
                  >
                    <Paperclip className="w-4 h-4" />
                    <span>Attachment {idx + 1}</span>
                    <Download className="w-3 h-3" />
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Comments */}
          <div>
            <h3 className="text-sm font-medium text-slate-900 mb-3">Activity & Comments</h3>
            <div className="space-y-3">
              {comments.map((comment) => (
                <div
                  key={comment.id}
                  className={`border rounded-lg p-4 ${
                    comment.visibility === "internal"
                      ? "bg-amber-50 border-amber-200"
                      : "bg-white"
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm text-slate-900">
                        {comment.created_by_name}
                      </span>
                      {comment.visibility === "internal" && (
                        <Badge className="bg-amber-100 text-amber-700 text-xs">
                          Internal
                        </Badge>
                      )}
                    </div>
                    <span className="text-xs text-slate-500">
                      {format(new Date(comment.created_date), "MMM d 'at' h:mm a")}
                    </span>
                  </div>
                  <div className="text-sm text-slate-700 whitespace-pre-wrap">
                    {comment.comment}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Add Comment */}
          <div className="border-t pt-6">
            <h3 className="text-sm font-medium text-slate-900 mb-3">Add Comment</h3>
            <div className="space-y-3">
              <Textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Write a comment or update..."
                rows={4}
              />
              <div className="flex items-center gap-3">
                <Select value={commentVisibility} onValueChange={setCommentVisibility}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">Visible to User</SelectItem>
                    <SelectItem value="internal">Internal Note</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  onClick={handleAddComment}
                  disabled={addCommentMutation.isPending}
                >
                  <Send className="w-4 h-4 mr-2" />
                  Add Comment
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="border-t p-6 bg-slate-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-slate-700">Change Status:</span>
              <Select value={newStatus} onValueChange={handleStatusChange}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="new">New</SelectItem>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="waiting_on_user">Waiting on User</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={onClose} variant="outline">
              Close
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}