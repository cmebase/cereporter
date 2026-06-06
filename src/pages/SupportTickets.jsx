import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Search, Eye } from "lucide-react";
import TicketDetailPanel from "../components/support/TicketDetailPanel";
import { format } from "date-fns";

export default function SupportTickets() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [selectedTicket, setSelectedTicket] = useState(null);

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

  const isSupremeT = assignments.some((a) => a.role === "supreme_technician");

  React.useEffect(() => {
    if (assignments.length > 0 && !isSupremeT) {
      navigate("/");
    }
  }, [assignments, isSupremeT, navigate]);

  const { data: tickets = [] } = useQuery({
    queryKey: ["supportTickets"],
    queryFn: () => base44.entities.SupportTicket.list("-created_date"),
  });

  const { data: hospitals = [] } = useQuery({
    queryKey: ["hospitals"],
    queryFn: () => base44.entities.Hospital.list(),
  });

  const filteredTickets = useMemo(() => {
    let filtered = tickets;

    if (statusFilter !== "all") {
      filtered = filtered.filter(t => t.status === statusFilter);
    }

    if (priorityFilter !== "all") {
      filtered = filtered.filter(t => t.priority === priorityFilter);
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(t =>
        t.subject?.toLowerCase().includes(q) ||
        t.description?.toLowerCase().includes(q) ||
        t.submitted_by_email?.toLowerCase().includes(q) ||
        t.id?.toLowerCase().includes(q)
      );
    }

    return filtered;
  }, [tickets, statusFilter, priorityFilter, searchQuery]);

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
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Support Tickets</h1>
        <p className="text-sm text-slate-600 mt-1">
          Manage support requests from all users
        </p>
      </div>

      {/* Filters */}
      <div className="bg-white border rounded-lg p-4">
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Search tickets..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="new">New</SelectItem>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="waiting_on_user">Waiting</SelectItem>
              <SelectItem value="resolved">Resolved</SelectItem>
              <SelectItem value="closed">Closed</SelectItem>
            </SelectContent>
          </Select>

          <Select value={priorityFilter} onValueChange={setPriorityFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Priority</SelectItem>
              <SelectItem value="urgent">Urgent</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="low">Low</SelectItem>
            </SelectContent>
          </Select>

          {(statusFilter !== "all" || priorityFilter !== "all" || searchQuery) && (
            <Button
              variant="outline"
              onClick={() => {
                setStatusFilter("all");
                setPriorityFilter("all");
                setSearchQuery("");
              }}
            >
              Clear Filters
            </Button>
          )}
        </div>
      </div>

      {/* Tickets Table */}
      <div className="bg-white border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b">
            <tr>
              <th className="text-left p-3 font-medium">Ticket ID</th>
              <th className="text-left p-3 font-medium">Subject</th>
              <th className="text-left p-3 font-medium">Priority</th>
              <th className="text-left p-3 font-medium">Status</th>
              <th className="text-left p-3 font-medium">Submitted By</th>
              <th className="text-left p-3 font-medium">Hospital/Year</th>
              <th className="text-left p-3 font-medium">Created</th>
              <th className="text-right p-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredTickets.map((ticket) => (
              <tr key={ticket.id} className="border-b hover:bg-slate-50 transition">
                <td className="p-3">
                  <span className="font-mono text-xs text-slate-600">
                    {ticket.id.substring(0, 8)}
                  </span>
                </td>
                <td className="p-3">
                  <div className="font-medium text-slate-900 max-w-[300px] truncate">
                    {ticket.subject}
                  </div>
                  <div className="text-xs text-slate-500 capitalize">
                    {ticket.category?.replace(/_/g, " ")}
                  </div>
                </td>
                <td className="p-3">
                  <Badge className={priorityConfig[ticket.priority]?.color || ""}>
                    {priorityConfig[ticket.priority]?.label || ticket.priority}
                  </Badge>
                </td>
                <td className="p-3">
                  <Badge className={statusConfig[ticket.status]?.color || ""}>
                    {statusConfig[ticket.status]?.label || ticket.status}
                  </Badge>
                </td>
                <td className="p-3">
                  <div className="text-slate-900">{ticket.submitted_by_name}</div>
                  <div className="text-xs text-slate-500">{ticket.submitted_by_email}</div>
                </td>
                <td className="p-3">
                  <div className="text-slate-700 text-xs">
                    {ticket.hospital_name || "N/A"}
                    {ticket.year && <span className="text-slate-400"> • {ticket.year}</span>}
                  </div>
                  {ticket.page_module && (
                    <div className="text-xs text-slate-400">{ticket.page_module}</div>
                  )}
                </td>
                <td className="p-3">
                  <div className="text-slate-600 text-xs">
                    {format(new Date(ticket.created_date), "MMM d, yyyy")}
                  </div>
                  <div className="text-slate-400 text-xs">
                    {format(new Date(ticket.created_date), "h:mm a")}
                  </div>
                </td>
                <td className="p-3 text-right">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setSelectedTicket(ticket)}
                  >
                    <Eye className="w-3 h-3 mr-1" />
                    View
                  </Button>
                </td>
              </tr>
            ))}
            {filteredTickets.length === 0 && (
              <tr>
                <td colSpan={8} className="p-8 text-center text-slate-500">
                  No tickets found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-5 gap-4">
        {Object.entries(statusConfig).map(([status, config]) => {
          const count = tickets.filter(t => t.status === status).length;
          return (
            <div key={status} className="bg-white border rounded-lg p-4">
              <div className="text-2xl font-semibold text-slate-900">{count}</div>
              <div className="text-sm text-slate-600">{config.label}</div>
            </div>
          );
        })}
      </div>

      {/* Ticket Detail Panel */}
      {selectedTicket && (
        <TicketDetailPanel
          ticket={selectedTicket}
          onClose={() => setSelectedTicket(null)}
        />
      )}
    </div>
  );
}