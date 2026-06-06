import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { History, Search, Filter } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function AdminAuditLogTab() {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterHospital, setFilterHospital] = useState("all");
  const [filterAction, setFilterAction] = useState("all");
  const [filterUser, setFilterUser] = useState("all");
  const [includeDeactivated, setIncludeDeactivated] = useState(true);

  const { data: auditLogs = [] } = useQuery({
    queryKey: ["auditLogs"],
    queryFn: () => base44.entities.AuditLog.list(),
  });

  const { data: hospitals = [] } = useQuery({
    queryKey: ["hospitals"],
    queryFn: () => base44.entities.Hospital.list(),
  });

  const { data: allUsers = [] } = useQuery({
    queryKey: ["allUsers"],
    queryFn: () => base44.entities.User.list(),
  });

  const sortedLogs = useMemo(() => {
    return [...auditLogs].sort((a, b) => 
      new Date(b.created_date) - new Date(a.created_date)
    );
  }, [auditLogs]);

  const filteredLogs = useMemo(() => {
    let filtered = sortedLogs;

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter((log) =>
        log.user_email?.toLowerCase().includes(q) ||
        log.entity_name?.toLowerCase().includes(q) ||
        log.entity_type?.toLowerCase().includes(q)
      );
    }

    if (filterHospital !== "all") {
      filtered = filtered.filter((log) => log.hospital_id === filterHospital);
    }

    if (filterAction !== "all") {
      filtered = filtered.filter((log) => log.action === filterAction);
    }

    if (filterUser !== "all") {
      filtered = filtered.filter((log) => log.user_email === filterUser);
    }

    if (!includeDeactivated) {
      const activeEmails = allUsers
        .filter((u) => u.status !== "DEACTIVATED")
        .map((u) => u.email);
      filtered = filtered.filter((log) => activeEmails.includes(log.user_email));
    }

    return filtered.slice(0, 100);
  }, [sortedLogs, searchQuery, filterHospital, filterAction, filterUser, includeDeactivated, allUsers]);

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <History className="w-5 h-5" />
          Audit Log
        </h3>
        <p className="text-sm text-slate-500">
          Showing last 100 entries
        </p>
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Search by user, entity, or type..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={filterUser} onValueChange={setFilterUser}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="All Users" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Users</SelectItem>
            {allUsers.map((u) => (
              <SelectItem key={u.id} value={u.email}>
                {u.full_name || u.email}
                {u.status === "DEACTIVATED" && " (Deactivated)"}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterHospital} onValueChange={setFilterHospital}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="All Hospitals" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Hospitals</SelectItem>
            {hospitals.map((h) => (
              <SelectItem key={h.id} value={h.id}>
                {h.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterAction} onValueChange={setFilterAction}>
          <SelectTrigger className="w-32">
            <SelectValue placeholder="All Actions" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Actions</SelectItem>
            <SelectItem value="create">Create</SelectItem>
            <SelectItem value="update">Update</SelectItem>
            <SelectItem value="delete">Delete</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Include Deactivated Toggle */}
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={includeDeactivated}
          onChange={(e) => setIncludeDeactivated(e.target.checked)}
          className="h-4 w-4 rounded border-slate-300"
        />
        <Label className="font-normal cursor-pointer" onClick={() => setIncludeDeactivated(!includeDeactivated)}>
          Include Deactivated Users
        </Label>
      </div>

      {/* Logs */}
      <div className="space-y-2 max-h-[500px] overflow-y-auto">
        {filteredLogs.map((log, idx) => (
          <div key={idx} className="border rounded-lg p-4 text-sm hover:bg-slate-50 transition">
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                  log.action === "create" 
                    ? "bg-green-100 text-green-700"
                    : log.action === "update"
                    ? "bg-blue-100 text-blue-700"
                    : "bg-red-100 text-red-700"
                }`}>
                  {log.action.toUpperCase()}
                </span>
                <span className="font-medium">{log.entity_type}</span>
              </div>
              <div className="text-xs text-slate-500">
                {formatDate(log.created_date)}
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-slate-600">
              <div>
                <span className="font-medium">User:</span> {log.user_email}
              </div>
              <div>
                <span className="font-medium">Hospital:</span> {log.hospital_name}
              </div>
              {log.year && (
                <div>
                  <span className="font-medium">Year:</span> {log.year}
                </div>
              )}
              {log.entity_name && (
                <div>
                  <span className="font-medium">Entity:</span> {log.entity_name}
                </div>
              )}
            </div>

            {log.field_changed && (
              <div className="mt-2 pt-2 border-t text-xs">
                <span className="font-medium">Changed:</span> {log.field_changed}
                <div className="mt-1 pl-2">
                  <span className="text-red-600">{log.before_value || "(empty)"}</span>
                  {" → "}
                  <span className="text-green-600">{log.after_value}</span>
                </div>
              </div>
            )}
          </div>
        ))}
        {filteredLogs.length === 0 && (
          <div className="text-center py-12 text-slate-400">
            No audit logs found
          </div>
        )}
      </div>
    </div>
  );
}