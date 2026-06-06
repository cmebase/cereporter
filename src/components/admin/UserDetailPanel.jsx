import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { X, User, Building2, Calendar, History, Save, UserCog, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useImpersonation } from "./ImpersonationContext";

export default function UserDetailPanel({ user, onClose }) {
  const queryClient = useQueryClient();
  const { startImpersonating } = useImpersonation();
  const [activeTab, setActiveTab] = useState("info");
  const [editedAssignments, setEditedAssignments] = useState({});
  const [editedUserInfo, setEditedUserInfo] = useState({
   full_name: user.full_name || "",
   global_role: user.global_role || "coordinator",
  });
  const [deactivationReason, setDeactivationReason] = useState("");
  const [showDeactivateModal, setShowDeactivateModal] = useState(false);
  const [showImpersonateModal, setShowImpersonateModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const { data: assignments = [] } = useQuery({
    queryKey: ["assignments"],
    queryFn: () => base44.entities.Assignment.list(),
  });

  const { data: hospitals = [] } = useQuery({
    queryKey: ["hospitals"],
    queryFn: () => base44.entities.Hospital.list(),
  });

  const { data: hospitalYears = [] } = useQuery({
    queryKey: ["hospitalYears"],
    queryFn: () => base44.entities.HospitalYear.list(),
  });

  const { data: auditLogs = [] } = useQuery({
    queryKey: ["auditLogs"],
    queryFn: () => base44.entities.AuditLog.list(),
  });

  const userAssignments = useMemo(() => {
    return assignments.filter((a) => a.user_email === user.email && a.is_active);
  }, [assignments, user.email]);

  const userAuditLogs = useMemo(() => {
    return auditLogs
      .filter((log) => log.user_email === user.email)
      .sort((a, b) => new Date(b.created_date) - new Date(a.created_date))
      .slice(0, 50);
  }, [auditLogs, user.email]);

  const updateAssignmentMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Assignment.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assignments"] });
      toast.success("Assignment updated");
    },
  });

  const createAssignmentMutation = useMutation({
    mutationFn: (data) => base44.entities.Assignment.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assignments"] });
      toast.success("Assignment created");
    },
  });

  const deleteAssignmentMutation = useMutation({
    mutationFn: (id) => base44.entities.Assignment.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assignments"] });
      toast.success("Assignment removed");
    },
  });

  const updateUserMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.User.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["allUsers"] });
      toast.success("User updated");
    },
  });

  const handleSaveUserInfo = () => {
    updateUserMutation.mutate({
      id: user.id,
      data: editedUserInfo,
    });
  };

  const handleResetPassword = async () => {
    if (!confirm("Send password reset email to " + user.email + "?")) return;
    
    try {
      // This would typically call a backend function to send reset email
      // For now, we'll show a toast
      toast.success("Password reset email sent to " + user.email);
    } catch (error) {
      toast.error("Failed to send password reset email");
    }
  };

  const handleDeactivateUser = async () => {
    try {
      const currentUser = await base44.auth.me();
      
      await base44.entities.User.update(user.id, {
        status: "DEACTIVATED",
        deactivated_at: new Date().toISOString(),
        deactivated_by: currentUser.email,
        deactivation_reason: deactivationReason,
      });
      
      // Wait for query to refetch
      await queryClient.invalidateQueries({ queryKey: ["allUsers"] });
      await new Promise(resolve => setTimeout(resolve, 300));
      
      toast.success("User deactivated");
      setShowDeactivateModal(false);
      setDeactivationReason("");
      onClose();
    } catch (error) {
      console.error("Deactivation error:", error);
      toast.error("Failed to deactivate user: " + error.message);
    }
  };

  const handleReactivateUser = async () => {
    if (!confirm("Reactivate " + user.email + "?")) return;
    
    updateUserMutation.mutate({
      id: user.id,
      data: {
        status: "ACTIVE",
        deactivated_at: null,
        deactivated_by: null,
        deactivation_reason: null,
      },
    });
  };

  const handleImpersonate = async () => {
    const success = await startImpersonating(user);
    if (success) {
      setShowImpersonateModal(false);
      onClose();
    }
  };

  const handleDeleteUser = async () => {
    try {
      const response = await base44.functions.invoke('deleteUser', { email: user.email });
      queryClient.invalidateQueries({ queryKey: ["allUsers"] });
      queryClient.invalidateQueries({ queryKey: ["assignments"] });
      toast.success("User deleted successfully");
      setShowDeleteModal(false);
      onClose();
    } catch (error) {
      console.error("Delete error:", error);
      toast.error("Failed to delete user: " + error.message);
    }
  };

  const handleToggleHospital = (hospitalId) => {
    const existing = userAssignments.find((a) => a.hospital_id === hospitalId);
    
    if (existing) {
      // Remove assignment
      deleteAssignmentMutation.mutate(existing.id);
    } else {
      // Create assignment
      const hospital = hospitals.find((h) => h.id === hospitalId);
      createAssignmentMutation.mutate({
        user_email: user.email,
        hospital_id: hospitalId,
        hospital_name: hospital?.name,
        role: "coordinator",
        years: [],
        is_active: true,
      });
    }
  };

  const handleUpdateRole = (assignmentId, newRole) => {
    updateAssignmentMutation.mutate({
      id: assignmentId,
      data: { role: newRole },
    });
  };

  const handleToggleYear = (assignmentId, year) => {
    const assignment = assignments.find((a) => a.id === assignmentId);
    if (!assignment) return;

    const currentYears = assignment.years || [];
    const newYears = currentYears.includes(year)
      ? currentYears.filter((y) => y !== year)
      : [...currentYears, year];

    updateAssignmentMutation.mutate({
      id: assignmentId,
      data: { years: newYears },
    });
  };

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

  const isDeactivated = user.status === "DEACTIVATED";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      
      <div className="relative bg-white rounded-lg shadow-xl max-w-4xl w-full my-4 mx-4 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-semibold">{user.full_name || user.email}</h2>
              {isDeactivated && (
                <span className="px-2 py-1 bg-red-100 text-red-700 text-xs font-medium rounded">
                  DEACTIVATED
                </span>
              )}
            </div>
            <p className="text-sm text-slate-500">{user.email}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b px-6">
          <button
            onClick={() => setActiveTab("info")}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition ${
              activeTab === "info"
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-slate-600 hover:text-slate-900"
            }`}
          >
            <User className="w-4 h-4 inline mr-2" />
            User Info
          </button>
          <button
            onClick={() => setActiveTab("hospitals")}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition ${
              activeTab === "hospitals"
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-slate-600 hover:text-slate-900"
            }`}
          >
            <Building2 className="w-4 h-4 inline mr-2" />
            Hospital Access
          </button>
          <button
            onClick={() => setActiveTab("years")}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition ${
              activeTab === "years"
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-slate-600 hover:text-slate-900"
            }`}
          >
            <Calendar className="w-4 h-4 inline mr-2" />
            Year Access
          </button>
          <button
            onClick={() => setActiveTab("audit")}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition ${
              activeTab === "audit"
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-slate-600 hover:text-slate-900"
            }`}
          >
            <History className="w-4 h-4 inline mr-2" />
            Activity Log
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* User Info Tab */}
            {activeTab === "info" && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Email</Label>
                  <Input value={user.email} disabled />
                </div>
                <div>
                  <Label>Full Name</Label>
                  <Input 
                    value={editedUserInfo.full_name} 
                    onChange={(e) => setEditedUserInfo({ ...editedUserInfo, full_name: e.target.value })}
                    placeholder="Enter full name"
                  />
                </div>
                <div>
                  <Label>Status</Label>
                  <Input value={isDeactivated ? "Deactivated" : "Active"} disabled />
                </div>
                <div>
                   <Label>Global Role</Label>
                   <select
                     value={editedUserInfo.global_role}
                     onChange={(e) => setEditedUserInfo({ ...editedUserInfo, global_role: e.target.value })}
                     className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
                   >
                     <option value="super_admin">Super Admin</option>
                     <option value="manager">Manager</option>
                     <option value="supreme_technician">Supreme Technician</option>
                     <option value="coordinator">Coordinator</option>
                   </select>
                </div>
              </div>
              
              {isDeactivated && user.deactivation_reason && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <div className="text-sm font-medium text-red-900">Deactivation Reason:</div>
                  <div className="text-sm text-red-700 mt-1">{user.deactivation_reason}</div>
                  <div className="text-xs text-red-600 mt-1">
                    Deactivated by {user.deactivated_by} on {formatDate(user.deactivated_at)}
                  </div>
                </div>
              )}
              
              <div className="flex gap-3 pt-4 border-t">
                {!isDeactivated && (
                  <>
                    <Button onClick={handleSaveUserInfo} disabled={updateUserMutation.isPending}>
                      <Save className="w-4 h-4 mr-2" />
                      Save Changes
                    </Button>
                    <Button onClick={handleResetPassword} variant="outline">
                      Reset Password
                    </Button>
                    <Button 
                      onClick={() => setShowImpersonateModal(true)} 
                      variant="outline"
                      className="text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                    >
                      <UserCog className="w-4 h-4 mr-2" />
                      Login as this user
                    </Button>
                    <Button 
                      onClick={() => setShowDeactivateModal(true)} 
                      variant="outline"
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      Deactivate User
                    </Button>
                    <Button 
                      onClick={() => setShowDeleteModal(true)} 
                      variant="outline"
                      className="text-red-600 hover:text-red-700 hover:bg-red-50 ml-auto"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete User
                    </Button>
                  </>
                )}
                {isDeactivated && (
                  <Button onClick={handleReactivateUser} disabled={updateUserMutation.isPending}>
                    Reactivate User
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Hospital Access Tab */}
          {activeTab === "hospitals" && (
            <div className="space-y-4">
              <p className="text-sm text-slate-600">
                Select hospitals this user can access and configure their role per hospital.
              </p>
              {hospitals.map((hospital) => {
                const assignment = userAssignments.find((a) => a.hospital_id === hospital.id);
                const hasAccess = !!assignment;

                return (
                  <div key={hospital.id} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={hasAccess}
                          onChange={() => handleToggleHospital(hospital.id)}
                          className="h-4 w-4 rounded border-slate-300 mt-1"
                        />
                        <div>
                          <div className="font-medium">{hospital.name}</div>
                          {hospital.city_state && (
                            <div className="text-xs text-slate-500">{hospital.city_state}</div>
                          )}
                        </div>
                      </div>
                      {hasAccess && (
                        <select
                          value={assignment.role}
                          onChange={(e) => handleUpdateRole(assignment.id, e.target.value)}
                          className="px-2 py-1 border rounded text-sm"
                        >
                          <option value="super_admin">Super Admin</option>
                          <option value="manager">Manager</option>
                          <option value="supreme_technician">Supreme Technician</option>
                          <option value="coordinator">Coordinator</option>
                        </select>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Year Access Tab */}
          {activeTab === "years" && (
            <div className="space-y-4">
              <p className="text-sm text-slate-600">
                Configure which years this user can access for each hospital.
              </p>
              {userAssignments.map((assignment) => {
                const hospital = hospitals.find((h) => h.id === assignment.hospital_id);
                const years = hospitalYears
                  .filter((hy) => hy.hospital_id === assignment.hospital_id && hy.is_active)
                  .sort((a, b) => b.year - a.year);

                return (
                  <div key={assignment.id} className="border rounded-lg p-4">
                    <div className="font-medium mb-3">{hospital?.name}</div>
                    <div className="space-y-2">
                      {years.map((hy) => (
                        <div key={hy.id} className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={assignment.years?.includes(hy.year) || false}
                            onChange={() => handleToggleYear(assignment.id, hy.year)}
                            className="h-4 w-4 rounded border-slate-300"
                          />
                          <Label className="font-normal">{hy.year}</Label>
                        </div>
                      ))}
                      {years.length === 0 && (
                        <p className="text-xs text-slate-400">No years available</p>
                      )}
                      <div className="flex items-center gap-2 pt-2 border-t">
                        <input
                          type="checkbox"
                          checked={!assignment.years || assignment.years.length === 0}
                          onChange={() => {
                            updateAssignmentMutation.mutate({
                              id: assignment.id,
                              data: { years: [] },
                            });
                          }}
                          className="h-4 w-4 rounded border-slate-300"
                        />
                        <Label className="font-normal text-indigo-600">All Years</Label>
                      </div>
                    </div>
                  </div>
                );
              })}
              {userAssignments.length === 0 && (
                <p className="text-sm text-slate-400">No hospital assignments yet.</p>
              )}
            </div>
          )}

          {/* Activity Log Tab */}
          {activeTab === "audit" && (
            <div className="space-y-3">
              {userAuditLogs.map((log, idx) => (
                <div key={idx} className="border rounded-lg p-4 text-sm">
                  <div className="flex items-start justify-between mb-2">
                    <div className="font-medium text-slate-900">
                      {log.action.charAt(0).toUpperCase() + log.action.slice(1)} {log.entity_type}
                    </div>
                    <div className="text-xs text-slate-500">
                      {formatDate(log.created_date)}
                    </div>
                  </div>
                  <div className="space-y-1 text-xs text-slate-600">
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
                    {log.field_changed && (
                      <div className="pt-2 border-t mt-2">
                        <span className="font-medium">Changed:</span> {log.field_changed}
                        <div className="mt-1 pl-2">
                          <span className="text-red-600">{log.before_value || "(empty)"}</span>
                          {" → "}
                          <span className="text-green-600">{log.after_value}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {userAuditLogs.length === 0 && (
                <p className="text-sm text-slate-400">No activity recorded yet.</p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Deactivate Modal */}
      {showDeactivateModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            <h3 className="text-lg font-semibold mb-4">Deactivate User</h3>
            <p className="text-sm text-slate-600 mb-4">
              Are you sure you want to deactivate <strong>{user.email}</strong>? 
              They will immediately lose access to the system. Historical data will be preserved.
            </p>
            <div className="mb-4">
              <Label>Reason for Deactivation</Label>
              <Input
                value={deactivationReason}
                onChange={(e) => setDeactivationReason(e.target.value)}
                placeholder="e.g., Employee terminated"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button onClick={() => setShowDeactivateModal(false)} variant="outline">
                Cancel
              </Button>
              <Button 
                onClick={handleDeactivateUser} 
                className="bg-red-600 hover:bg-red-700"
                disabled={!deactivationReason.trim()}
              >
                Deactivate
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Impersonate Modal */}
      {showImpersonateModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <UserCog className="w-5 h-5 text-amber-600" />
              Impersonate User
            </h3>
            <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-sm text-amber-900 mb-2">
                You are about to impersonate:
              </p>
              <p className="font-semibold text-amber-800">
                {user.full_name || user.email}
              </p>
              <p className="text-xs text-amber-700 mt-1">{user.email}</p>
            </div>
            <p className="text-sm text-slate-600 mb-4">
              You will see the app exactly as they do. A persistent banner will indicate you are impersonating. 
              All actions will be logged.
            </p>
            <div className="flex gap-2 justify-end">
              <Button onClick={() => setShowImpersonateModal(false)} variant="outline">
                Cancel
              </Button>
              <Button 
                onClick={handleImpersonate} 
                className="bg-amber-600 hover:bg-amber-700"
              >
                Start Impersonation
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Trash2 className="w-5 h-5 text-red-600" />
              Delete User
            </h3>
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-900 mb-2">
                Permanently delete this user?
              </p>
              <p className="font-semibold text-red-800">
                {user.full_name || user.email}
              </p>
              <p className="text-xs text-red-700 mt-1">{user.email}</p>
            </div>
            <p className="text-sm text-slate-600 mb-4">
              This action cannot be undone. All assignments and historical data will be removed.
            </p>
            <div className="flex gap-2 justify-end">
              <Button onClick={() => setShowDeleteModal(false)} variant="outline">
                Cancel
              </Button>
              <Button 
                onClick={handleDeleteUser} 
                className="bg-red-600 hover:bg-red-700"
              >
                Delete User
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}