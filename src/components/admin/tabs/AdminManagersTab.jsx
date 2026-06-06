import React, { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Input } from "@/components/ui/input";
import { Search, Users, UserCog, ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AdminManagersTab() {
  const [expandedManagers, setExpandedManagers] = useState(new Set());
  const [searchQuery, setSearchQuery] = useState("");

  const { data: allUsers = [] } = useQuery({
    queryKey: ["allUsers"],
    queryFn: () => base44.entities.User.list(),
  });

  const { data: assignments = [] } = useQuery({
    queryKey: ["assignments"],
    queryFn: () => base44.entities.Assignment.list(),
  });

  const { data: hospitals = [] } = useQuery({
    queryKey: ["hospitals"],
    queryFn: () => base44.entities.Hospital.list(),
  });

  // Get managers and their coordinators
  const managersData = useMemo(() => {
    // Find all manager assignments
    const managerAssignments = assignments.filter(
      (a) => a.role === "manager" && a.is_active
    );
    const managerEmails = [...new Set(managerAssignments.map((a) => a.user_email))];

    return managerEmails.map((email) => {
      const manager = allUsers.find((u) => u.email === email);
      if (!manager) return null;

      // Find coordinators managed by this manager
      const coordinators = allUsers.filter(
        (u) => u.manager_id === email && u.status === "ACTIVE"
      );

      // Get manager's hospitals
      const managerHospitals = managerAssignments
        .filter((a) => a.user_email === email)
        .map((a) => {
          const hospital = hospitals.find((h) => h.id === a.hospital_id);
          return hospital?.name || "Unknown";
        });

      return {
        manager,
        coordinators,
        hospitals: [...new Set(managerHospitals)],
      };
    }).filter(Boolean);
  }, [allUsers, assignments, hospitals]);

  const filteredManagers = useMemo(() => {
    if (!searchQuery) return managersData;
    const q = searchQuery.toLowerCase();
    return managersData.filter(
      (m) =>
        m.manager.email?.toLowerCase().includes(q) ||
        m.manager.full_name?.toLowerCase().includes(q) ||
        m.coordinators.some(
          (c) =>
            c.email?.toLowerCase().includes(q) ||
            c.full_name?.toLowerCase().includes(q)
        )
    );
  }, [managersData, searchQuery]);

  const toggleManager = (email) => {
    const newExpanded = new Set(expandedManagers);
    if (newExpanded.has(email)) {
      newExpanded.delete(email);
    } else {
      newExpanded.add(email);
    }
    setExpandedManagers(newExpanded);
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <UserCog className="w-5 h-5" />
          Managers ({filteredManagers.length})
        </h3>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input
          placeholder="Search managers or coordinators..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Managers List */}
      <div className="space-y-2">
        {filteredManagers.map((data) => {
          const isExpanded = expandedManagers.has(data.manager.email);
          return (
            <div
              key={data.manager.email}
              className="border rounded-lg bg-white overflow-hidden"
            >
              {/* Manager Row */}
              <button
                onClick={() => toggleManager(data.manager.email)}
                className="w-full flex items-center gap-3 p-4 hover:bg-slate-50 transition text-left"
              >
                <div className="text-slate-400">
                  {isExpanded ? (
                    <ChevronDown className="w-4 h-4" />
                  ) : (
                    <ChevronRight className="w-4 h-4" />
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">
                      {data.manager.full_name || data.manager.email}
                    </span>
                    <span className="px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-700">
                      Manager
                    </span>
                  </div>
                  {data.manager.full_name && (
                    <div className="text-xs text-slate-500">{data.manager.email}</div>
                  )}
                  <div className="text-xs text-slate-500 mt-1">
                    {data.hospitals.join(", ")}
                  </div>
                </div>
                <div className="text-sm text-slate-500">
                  <span className="flex items-center gap-1">
                    <Users className="w-4 h-4" />
                    {data.coordinators.length} coordinator
                    {data.coordinators.length !== 1 ? "s" : ""}
                  </span>
                </div>
              </button>

              {/* Coordinators List */}
              {isExpanded && data.coordinators.length > 0 && (
                <div className="border-t bg-slate-50">
                  {data.coordinators.map((coordinator) => {
                    const coordAssignments = assignments.filter(
                      (a) =>
                        a.user_email === coordinator.email &&
                        a.role === "coordinator" &&
                        a.is_active
                    );
                    const coordHospitals = coordAssignments.map((a) => {
                      const hospital = hospitals.find((h) => h.id === a.hospital_id);
                      return hospital?.name || "Unknown";
                    });

                    return (
                      <div
                        key={coordinator.email}
                        className="px-4 py-3 border-b last:border-b-0 flex items-center gap-3"
                      >
                        <div className="w-8" />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">
                              {coordinator.full_name || coordinator.email}
                            </span>
                            <span className="px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-700">
                              Coordinator
                            </span>
                          </div>
                          {coordinator.full_name && (
                            <div className="text-xs text-slate-500">
                              {coordinator.email}
                            </div>
                          )}
                          <div className="text-xs text-slate-500 mt-1">
                            {coordHospitals.join(", ")}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {isExpanded && data.coordinators.length === 0 && (
                <div className="px-4 py-3 border-t bg-slate-50 text-sm text-slate-500 text-center">
                  No coordinators assigned to this manager
                </div>
              )}
            </div>
          );
        })}

        {filteredManagers.length === 0 && (
          <div className="text-center py-12 text-slate-500">
            No managers found
          </div>
        )}
      </div>
    </div>
  );
}