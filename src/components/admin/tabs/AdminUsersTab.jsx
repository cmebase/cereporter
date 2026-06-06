import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Users, Eye, Search, UserPlus, UserCog, AlertCircle, CheckCircle, XCircle } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import UserDetailPanel from "../UserDetailPanel";
import UserApprovalModal from "./UserApprovalModal.jsx";
import { useImpersonation } from "../ImpersonationContext";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";

export default function AdminUsersTab() {
  const queryClient = useQueryClient();
  const { startImpersonating } = useImpersonation();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUser, setSelectedUser] = useState(null);
  const [statusFilter, setStatusFilter] = useState("ACTIVE");
  const [hospitalFilter, setHospitalFilter] = useState("ALL");
  const [yearFilter, setYearFilter] = useState("ALL");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [impersonateModalOpen, setImpersonateModalOpen] = useState(false);
  const [userToImpersonate, setUserToImpersonate] = useState(null);
  const [approvalModalOpen, setApprovalModalOpen] = useState(false);
  const [userToApprove, setUserToApprove] = useState(null);

  const { data: allUsers = [], error: usersError, refetch: refetchUsers } = useQuery({
    queryKey: ["allUsers"],
    queryFn: async () => {
      // Fetch from Base44 auth system (includes pending signups)
      const users = await base44.entities.User.list();
      console.log("allUsers count:", users.length, users.slice(0, 3));
      return users;
    },
    refetchInterval: 3000, // Refetch every 3 seconds to catch new signups
  });

  // Log any errors
  React.useEffect(() => {
    if (usersError) {
      console.error("allUsers query failed:", usersError);
    }
  }, [usersError]);

  // Refetch on mount
  React.useEffect(() => {
    refetchUsers();
  }, [refetchUsers]);

  const { data: assignments = [] } = useQuery({
    queryKey: ["assignments"],
    queryFn: () => base44.entities.Assignment.list(),
  });

  const { data: hospitals = [] } = useQuery({
    queryKey: ["hospitals"],
    queryFn: () => base44.entities.Hospital.list(),
  });

  const { data: auditLogs = [] } = useQuery({
    queryKey: ["auditLogs"],
    queryFn: () => base44.entities.AuditLog.list(),
  });

  const { data: currentUser } = useQuery({
    queryKey: ["currentUser"],
    queryFn: () => base44.auth.me().catch(() => null),
  });

  // Check if current user is super admin or supreme technician
  const { data: currentUserAssignments = [] } = useQuery({
    queryKey: ["currentUserAssignments", currentUser?.email],
    queryFn: async () => {
      if (!currentUser?.email) return [];
      const all = await base44.entities.Assignment.list();
      return all.filter((a) => a.user_email === currentUser.email && a.is_active);
    },
    enabled: !!currentUser?.email,
  });

  const canApproveUsers = currentUserAssignments.some(
    (a) => a.role === "super_admin" || a.role === "supreme_technician"
  );

  // Helper to normalize status for case-insensitive comparison
  const normalizeStatus = (s) =>
    (s ?? "ACTIVE").toString().trim().toUpperCase();

  // Build user data with assignments
  const userData = useMemo(() => {
    return allUsers.map((user) => {
      const userAssignments = assignments.filter(
        (a) => a.user_email === user.email && a.is_active
      );

      const uniqueHospitals = [...new Set(userAssignments.map((a) => a.hospital_id))];
      const hospitalNames = uniqueHospitals.length > 0
        ? uniqueHospitals
            .map((hId) => hospitals.find((h) => h.id === hId)?.name || "Unknown")
            .join(", ")
        : "Unassigned";

      const allYears = new Set();
      userAssignments.forEach((a) => {
        if (a.years && a.years.length > 0) {
          a.years.forEach((y) => allYears.add(y));
        }
      });
      
      let yearRange;
      if (uniqueHospitals.length === 0) {
        yearRange = "Unassigned";
      } else if (allYears.size === 0) {
        yearRange = "All Years";
      } else {
        yearRange = `${Math.min(...allYears)}–${Math.max(...allYears)}`;
      }

      const roles = [...new Set(userAssignments.map((a) => a.role))];
      
      // Prioritize global_role over assignment roles
      const globalRoleValue = (user.global_role || "").toString().trim().toLowerCase();
      let primaryRole;
      
      if (globalRoleValue) {
        primaryRole = globalRoleValue === "super_admin" ? "Super Admin"
          : globalRoleValue === "supreme_technician" ? "Supreme Technician"
          : globalRoleValue === "manager" ? "Manager"
          : globalRoleValue === "coordinator" ? "Coordinator"
          : "Coordinator";
      } else {
        primaryRole = roles.length > 0
          ? (roles.includes("super_admin") 
              ? "Super Admin" 
              : roles.includes("manager") 
              ? "Manager" 
              : roles.includes("supreme_technician")
              ? "Supreme Technician"
              : "Coordinator")
          : "Unassigned";
      }

      // Get last activity from audit logs
      const userLogs = auditLogs.filter((log) => log.user_email === user.email);
      const lastActivity = userLogs.length > 0 
        ? new Date(userLogs[0].created_date)
        : null;

      return {
        ...user,
        assignmentCount: userAssignments.length,
        hospitalNames,
        yearRange,
        primaryRole,
        lastActivity,
        uniqueHospitalIds: uniqueHospitals,
        allYears: Array.from(allYears),
        assignmentRoles: roles,
      };
    });
  }, [allUsers, assignments, hospitals, auditLogs]);

  const filteredUsers = useMemo(() => {
    let filtered = userData;

    // Filter by status
    filtered = filtered.filter((u) => {
      const userStatus = normalizeStatus(u.status);
      const filter = normalizeStatus(statusFilter);
      return filter === "ALL" ? true : userStatus === filter;
    });

    // Filter by hospital
    if (hospitalFilter !== "ALL") {
      filtered = filtered.filter((u) => u.uniqueHospitalIds.includes(hospitalFilter));
    }

    // Filter by year
    if (yearFilter !== "ALL") {
      filtered = filtered.filter((u) => u.allYears.includes(parseInt(yearFilter)));
    }

    // Filter by role
    if (roleFilter !== "ALL") {
      const roleMap = {
        "super_admin": "Super Admin",
        "manager": "Manager",
        "supreme_technician": "Supreme Technician",
        "coordinator": "Coordinator",
      };
      filtered = filtered.filter((u) => u.primaryRole === roleMap[roleFilter]);
    }

    // Filter by search
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter((u) => 
        u.email?.toLowerCase().includes(q) || 
        u.full_name?.toLowerCase().includes(q) ||
        u.hospitalNames?.toLowerCase().includes(q)
      );
    }

    return filtered;
  }, [userData, searchQuery, statusFilter, hospitalFilter, yearFilter, roleFilter]);

  const formatLastActivity = (date) => {
    if (!date) return "Never";
    const now = new Date();
    const diff = now - date;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);
    
    if (hours < 1) return "Just now";
    if (hours < 24) return `${hours} hrs ago`;
    if (days === 1) return "Yesterday";
    if (days < 7) return `${days} days ago`;
    return date.toLocaleDateString();
  };

  const inviteMutation = useMutation({
    mutationFn: (email) => base44.users.inviteUser(email, "user"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["allUsers"] });
      toast.success("User invited and ready for assignment");
      setStatusFilter("ACTIVE"); // Switch to Active tab to show the new user
      setInviteModalOpen(false);
      setInviteEmail("");
    },
    onError: (error) => {
      console.error("Invite error:", error);
      toast.error(`Failed: ${error?.message || "Unable to send invitation"}`);
    },
  });

  const handleInvite = async () => {
    if (!inviteEmail) {
      toast.error("Please enter an email");
      return;
    }
    try {
      console.log("Attempting to invite:", inviteEmail);
      inviteMutation.mutate(inviteEmail);
    } catch (error) {
      console.error("Invite error:", error);
      toast.error(`Error: ${error?.message}`);
    }
  };

  const handleApproveClick = (user) => {
    setUserToApprove(user);
    setApprovalModalOpen(true);
  };

  const handleImpersonate = (user) => {
    setUserToImpersonate(user);
    setImpersonateModalOpen(true);
  };

  const confirmImpersonate = async () => {
    try {
      console.log("Starting impersonation for:", userToImpersonate?.email);
      const success = await startImpersonating(userToImpersonate);
      console.log("Impersonation result:", success);
      
      if (success) {
        setImpersonateModalOpen(false);
        setUserToImpersonate(null);
        // Reload to rehydrate app with impersonated user context
        setTimeout(() => {
          console.log("Reloading page...");
          window.location.reload();
        }, 300);
      }
    } catch (error) {
      console.error("Impersonation error:", error);
      toast.error(`Error: ${error.message}`);
    }
  };

  // Don't allow non-approvers to see this tab
  if (!canApproveUsers) {
    return (
      <div className="p-6">
        <div className="text-center text-slate-500 py-12">
          You don't have permission to manage users.
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Users className="w-5 h-5" />
          Users ({filteredUsers.length})
        </h3>
        {canApproveUsers && (
          <Button onClick={() => setInviteModalOpen(true)}>
            <UserPlus className="w-4 h-4 mr-2" />
            Invite User
          </Button>
        )}
      </div>

      {/* Status Tabs */}
      <div className="flex gap-2 border-b overflow-x-auto pb-2">
        <button
          onClick={() => setStatusFilter("PENDING_APPROVAL")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition whitespace-nowrap ${
            statusFilter === "PENDING_APPROVAL"
              ? "border-orange-500 text-orange-600"
              : "border-transparent text-slate-600 hover:text-slate-900"
          }`}
        >
          Pending Approval
        </button>
        <button
          onClick={() => setStatusFilter("ACTIVE")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition whitespace-nowrap ${
            statusFilter === "ACTIVE"
              ? "border-indigo-600 text-indigo-600"
              : "border-transparent text-slate-600 hover:text-slate-900"
          }`}
        >
          Active Users
        </button>
        <button
          onClick={() => setStatusFilter("DEACTIVATED")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition whitespace-nowrap ${
            statusFilter === "DEACTIVATED"
              ? "border-indigo-600 text-indigo-600"
              : "border-transparent text-slate-600 hover:text-slate-900"
          }`}
        >
          Deactivated Users
        </button>
        <button
          onClick={() => setStatusFilter("REJECTED")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition whitespace-nowrap ${
            statusFilter === "REJECTED"
              ? "border-red-600 text-red-600"
              : "border-transparent text-slate-600 hover:text-slate-900"
          }`}
        >
          Rejected
        </button>
        <button
          onClick={() => setStatusFilter("ALL")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition whitespace-nowrap ${
            statusFilter === "ALL"
              ? "border-indigo-600 text-indigo-600"
              : "border-transparent text-slate-600 hover:text-slate-900"
          }`}
        >
          All
        </button>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div>
          <Label className="text-xs mb-1 block">Hospital</Label>
          <Select value={hospitalFilter} onValueChange={setHospitalFilter}>
            <SelectTrigger className="h-8 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Hospitals</SelectItem>
              {hospitals.map((h) => (
                <SelectItem key={h.id} value={h.id}>{h.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="text-xs mb-1 block">Year</Label>
          <Select value={yearFilter} onValueChange={setYearFilter}>
            <SelectTrigger className="h-8 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Years</SelectItem>
              {(() => {
                const years = new Set();
                userData.forEach((u) => u.allYears?.forEach((y) => years.add(y)));
                return Array.from(years).sort((a, b) => b - a).map((y) => (
                  <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                ));
              })()}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="text-xs mb-1 block">Role</Label>
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="h-8 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Roles</SelectItem>
              <SelectItem value="super_admin">Super Admin</SelectItem>
              <SelectItem value="manager">Manager</SelectItem>
              <SelectItem value="supreme_technician">Supreme Technician</SelectItem>
              <SelectItem value="coordinator">Coordinator</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="text-xs mb-1 block">Search</Label>
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400" />
            <Input
              placeholder="Email or name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-7 h-8 text-sm"
            />
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="border rounded-lg overflow-x-auto">
        <table className="w-full text-sm min-w-max">
          <thead className="bg-slate-50 border-b">
            <tr>
              <th className="text-left p-3 font-medium">User</th>
              <th className="text-left p-3 font-medium">Role</th>
              <th className="text-left p-3 font-medium">Hospitals</th>
              <th className="text-left p-3 font-medium">Years</th>
              <th className="text-left p-3 font-medium">Last Activity</th>
              <th className="text-right p-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map((user) => (
              <tr key={user.id} className="border-b hover:bg-slate-50 transition">
                <td className="p-3">
                  <div>
                    <div>{user.full_name || user.email}</div>
                    {user.full_name && (
                      <div className="text-xs text-slate-500">{user.email}</div>
                    )}
                  </div>
                </td>
                <td className="p-3">
                  <div className="flex items-center gap-2">
                    {normalizeStatus(user.status) === "PENDING_APPROVAL" ? (
                      <span className="px-2 py-1 rounded text-xs font-medium bg-orange-100 text-orange-700 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        Pending
                      </span>
                    ) : normalizeStatus(user.status) === "REJECTED" ? (
                      <span className="px-2 py-1 rounded text-xs font-medium bg-red-100 text-red-700 flex items-center gap-1">
                        <XCircle className="w-3 h-3" />
                        Rejected
                      </span>
                    ) : user.primaryRole ? (
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        user.primaryRole === "Super Admin" 
                          ? "bg-purple-100 text-purple-700"
                          : user.primaryRole === "Manager"
                          ? "bg-blue-100 text-blue-700"
                          : "bg-slate-100 text-slate-700"
                      }`}>
                        {user.primaryRole}
                      </span>
                    ) : (
                      <span className="text-xs text-slate-400">—</span>
                    )}
                  </div>
                </td>
                <td className="p-3">
                  <div className="text-xs text-slate-600 max-w-[200px] truncate">
                    {user.hospitalNames || <span className="text-red-500 font-medium">No Access</span>}
                  </div>
                </td>
                <td className="p-3">
                  <div className="text-xs text-slate-600">
                    {user.yearRange || <span className="text-slate-400">—</span>}
                  </div>
                </td>
                <td className="p-3">
                  <div className="text-xs text-slate-500">
                    {formatLastActivity(user.lastActivity)}
                  </div>
                </td>
                <td className="p-3 text-right">
                  <div className="flex items-center gap-1 justify-end">
                    {normalizeStatus(user.status) === "PENDING_APPROVAL" ? (
                      <Button
                        size="sm"
                        className="bg-orange-600 hover:bg-orange-700 text-white"
                        onClick={() => handleApproveClick(user)}
                      >
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Review
                      </Button>
                    ) : (
                      <>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setSelectedUser(user)}
                        >
                          <Eye className="w-3 h-3 mr-1" />
                          View
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleImpersonate(user)}
                          disabled={normalizeStatus(user.status) === "DEACTIVATED"}
                          className="text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                        >
                          <UserCog className="w-3 h-3 mr-1" />
                          Impersonate
                        </Button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {filteredUsers.length === 0 && (
              <tr>
                <td colSpan={6} className="p-8 text-center text-slate-500">
                  No users found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* User Detail Panel */}
      {selectedUser && (
        <UserDetailPanel
          user={selectedUser}
          onClose={() => setSelectedUser(null)}
        />
      )}

      {/* Invite User Modal */}
      <Dialog open={inviteModalOpen} onOpenChange={setInviteModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Invite User</DialogTitle>
          </DialogHeader>
          <div className="bg-white rounded-lg p-6 border">
            <iframe
              src="https://ce-reporter.com/login?mode=signup&embed=true&from_url=https%3A%2F%2Fce-reporter.com%2F"
              className="w-full h-[500px] border-0"
              title="Create Account"
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* User Approval Modal */}
      {userToApprove && (
        <UserApprovalModal
          open={approvalModalOpen}
          onOpenChange={setApprovalModalOpen}
          user={userToApprove}
          onApprovalComplete={() => {
            queryClient.invalidateQueries({ queryKey: ["allUsers"] });
            queryClient.invalidateQueries({ queryKey: ["assignments"] });
            setApprovalModalOpen(false);
            setUserToApprove(null);
          }}
        />
      )}

      {/* Impersonate Confirmation Modal */}
      <Dialog open={impersonateModalOpen} onOpenChange={setImpersonateModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserCog className="w-5 h-5 text-amber-600" />
              Impersonate User
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <div className="flex items-start gap-3">
                <div className="text-amber-600 mt-1">
                  <UserCog className="w-5 h-5" />
                </div>
                <div className="flex-1 text-sm">
                  <p className="font-medium text-amber-900 mb-2">
                    You are about to impersonate:
                  </p>
                  <p className="text-amber-800 font-semibold">
                    {userToImpersonate?.full_name || userToImpersonate?.email}
                  </p>
                  <p className="text-xs text-amber-700 mt-1">
                    {userToImpersonate?.email}
                  </p>
                </div>
              </div>
            </div>
            <div className="space-y-2 text-sm text-slate-600">
              <p>You will see the app exactly as they do, including:</p>
              <ul className="list-disc list-inside space-y-1 pl-2">
                <li>Their role and permissions</li>
                <li>Their hospital and year access</li>
                <li>Their current context and data view</li>
              </ul>
              <p className="text-xs text-slate-500 pt-2">
                A persistent banner will show you are impersonating. All actions will be logged.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setImpersonateModalOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={confirmImpersonate}
              className="bg-amber-600 hover:bg-amber-700"
            >
              Start Impersonation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}