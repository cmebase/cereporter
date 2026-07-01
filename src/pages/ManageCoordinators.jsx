import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Users, UserPlus, Edit, XCircle, Search, Building2, ShieldCheck, CopyPlus } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const COORDINATOR_PERMISSIONS = [
  { key: "classes.manage", label: "Manage Classes" },
  { key: "participants.manage", label: "Manage Participants" },
  { key: "ce_records.manage", label: "Manage CE Records" },
  { key: "certificates.issue", label: "Issue Certificates" },
  { key: "reports.view", label: "View Reports" },
  { key: "data.export", label: "Export Data" },
  { key: "coordinators.manage", label: "Manage Other Coordinators" },
  { key: "certificate_templates.manage", label: "Manage Certificate Templates" },
];

const DEFAULT_COORDINATOR_PERMISSIONS = [
  "classes.manage",
  "participants.manage",
  "ce_records.manage",
  "certificates.issue",
  "reports.view",
];

function normalizeEmail(email) {
  return (email || "").trim().toLowerCase();
}

function arraysEqual(a = [], b = []) {
  if (a.length !== b.length) return false;
  return [...a].sort().join(",") === [...b].sort().join(",");
}

export default function ManageCoordinators() {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingEmail, setEditingEmail] = useState("");
  const [selectedHospitalIds, setSelectedHospitalIds] = useState([]);
  const [yearsByHospital, setYearsByHospital] = useState({});
  const [selectedPermissions, setSelectedPermissions] = useState(DEFAULT_COORDINATOR_PERMISSIONS);
  const [searchTerm, setSearchTerm] = useState("");
  const [hospitalFilter, setHospitalFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("active");
  const [bulkEmailText, setBulkEmailText] = useState("");

  const { data: currentUser } = useQuery({
    queryKey: ["currentUser"],
    queryFn: () => base44.auth.me().catch(() => null),
  });

  const isSystemAdmin = currentUser?.role === "admin" || currentUser?.role === "super_admin" || currentUser?.role === "supreme_technician";

  const { data: hospitals = [] } = useQuery({
    queryKey: ["hospitals"],
    queryFn: () => base44.entities.Hospital.list(),
  });

  const { data: hospitalYears = [] } = useQuery({
    queryKey: ["hospitalYears"],
    queryFn: () => base44.entities.HospitalYear.list(),
  });

  const { data: allAssignments = [] } = useQuery({
    queryKey: ["allAssignments"],
    queryFn: () => base44.entities.Assignment.list(),
  });

  const { data: customRoles = [] } = useQuery({
    queryKey: ["customRoles"],
    queryFn: async () => {
      const entity = base44.entities.CustomRole;
      if (!entity?.list) return [];
      return entity.list().catch(() => []);
    },
  });

  const { data: customRoleAssignments = [] } = useQuery({
    queryKey: ["userCustomRoleAssignments"],
    queryFn: async () => {
      const entity = base44.entities.UserCustomRoleAssignment;
      if (!entity?.list) return [];
      return entity.list().catch(() => []);
    },
  });

  const currentUserAssignments = useMemo(() => {
    if (!currentUser?.email) return [];
    return allAssignments.filter((assignment) => assignment.user_email === currentUser.email && assignment.is_active);
  }, [allAssignments, currentUser?.email]);

  const manageableHospitalIds = useMemo(() => {
    if (isSystemAdmin) return hospitals.map((hospital) => hospital.id);

    return currentUserAssignments
      .filter((assignment) => ["manager", "admin"].includes(assignment.role))
      .map((assignment) => assignment.hospital_id);
  }, [currentUserAssignments, hospitals, isSystemAdmin]);

  const manageableHospitals = useMemo(() => {
    return hospitals.filter((hospital) => manageableHospitalIds.includes(hospital.id));
  }, [hospitals, manageableHospitalIds]);

  const hospitalNameById = useMemo(() => {
    return hospitals.reduce((acc, hospital) => {
      acc[hospital.id] = hospital.profile_name || hospital.name;
      return acc;
    }, {});
  }, [hospitals]);

  const coordinatorAssignments = useMemo(() => {
    return allAssignments.filter(
      (assignment) => assignment.role === "coordinator" && manageableHospitalIds.includes(assignment.hospital_id)
    );
  }, [allAssignments, manageableHospitalIds]);

  const groupedCoordinators = useMemo(() => {
    const map = new Map();

    coordinatorAssignments.forEach((assignment) => {
      const email = normalizeEmail(assignment.user_email);
      if (!map.has(email)) {
        map.set(email, {
          email,
          assignments: [],
          activeCount: 0,
          inactiveCount: 0,
        });
      }

      const group = map.get(email);
      group.assignments.push(assignment);
      if (assignment.is_active === false) group.inactiveCount += 1;
      else group.activeCount += 1;
    });

    return Array.from(map.values()).sort((a, b) => a.email.localeCompare(b.email));
  }, [coordinatorAssignments]);

  const filteredCoordinators = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();

    return groupedCoordinators.filter((coordinator) => {
      const matchesSearch =
        !term ||
        coordinator.email.includes(term) ||
        coordinator.assignments.some((assignment) => (hospitalNameById[assignment.hospital_id] || "").toLowerCase().includes(term));

      const matchesHospital =
        hospitalFilter === "all" || coordinator.assignments.some((assignment) => assignment.hospital_id === hospitalFilter);

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && coordinator.activeCount > 0) ||
        (statusFilter === "inactive" && coordinator.activeCount === 0 && coordinator.inactiveCount > 0);

      return matchesSearch && matchesHospital && matchesStatus;
    });
  }, [groupedCoordinators, searchTerm, hospitalFilter, statusFilter, hospitalNameById]);

  const existingCoordinatorRole = useMemo(() => {
    return customRoles.find((role) => role.name === "Coordinator Permissions" || role.name === "Coordinator Custom Permissions");
  }, [customRoles]);

  const resetModal = () => {
    setEditingEmail("");
    setSelectedHospitalIds([]);
    setYearsByHospital({});
    setSelectedPermissions(DEFAULT_COORDINATOR_PERMISSIONS);
    setBulkEmailText("");
  };

  const openCreateModal = () => {
    resetModal();
    setModalOpen(true);
  };

  const openEditModal = (coordinator) => {
    const activeAssignments = coordinator.assignments.filter((assignment) => assignment.is_active !== false);
    const nextYearsByHospital = {};

    activeAssignments.forEach((assignment) => {
      nextYearsByHospital[assignment.hospital_id] = assignment.years || [];
    });

    const roleAssignment = customRoleAssignments.find((assignment) => assignment.user_email === coordinator.email || assignment.user_id === activeAssignments[0]?.user_id);
    const role = customRoles.find((customRole) => customRole.id === roleAssignment?.custom_role_id);

    setEditingEmail(coordinator.email);
    setSelectedHospitalIds(activeAssignments.map((assignment) => assignment.hospital_id));
    setYearsByHospital(nextYearsByHospital);
    setSelectedPermissions(role?.permissions?.length ? role.permissions : DEFAULT_COORDINATOR_PERMISSIONS);
    setBulkEmailText(coordinator.email);
    setModalOpen(true);
  };

  const getAvailableYears = (hospitalId) => {
    return hospitalYears
      .filter((year) => year.hospital_id === hospitalId && year.is_active !== false)
      .map((year) => year.year)
      .sort((a, b) => b - a);
  };

  const toggleHospital = (hospitalId, checked) => {
    setSelectedHospitalIds((prev) => {
      if (checked) return [...new Set([...prev, hospitalId])];
      return prev.filter((id) => id !== hospitalId);
    });
  };

  const toggleYear = (hospitalId, year, checked) => {
    setYearsByHospital((prev) => {
      const current = prev[hospitalId] || [];
      const next = checked ? [...new Set([...current, year])] : current.filter((item) => item !== year);
      return { ...prev, [hospitalId]: next.sort((a, b) => b - a) };
    });
  };

  const togglePermission = (permission, checked) => {
    setSelectedPermissions((prev) => {
      if (checked) return [...new Set([...prev, permission])];
      return prev.filter((item) => item !== permission);
    });
  };

  const logAudit = async (action, metadata = {}) => {
    try {
      const entity = base44.entities.AuditLog;
      if (!entity?.create) return;
      await entity.create({
        action,
        entity_type: "coordinator_assignment",
        entity_label: metadata.email || editingEmail,
        metadata,
      });
    } catch (error) {
      console.warn("Audit log skipped", error);
    }
  };

  const savePermissionsForEmail = async (email) => {
    const customRoleEntity = base44.entities.CustomRole;
    const assignmentEntity = base44.entities.UserCustomRoleAssignment;

    if (!customRoleEntity?.create || !assignmentEntity?.create) return;

    let role = existingCoordinatorRole;
    if (!role) {
      role = await customRoleEntity.create({
        name: "Coordinator Permissions",
        description: "Default configurable permissions for coordinator users",
        permissions: selectedPermissions,
      });
    } else if (!arraysEqual(role.permissions || [], selectedPermissions) && customRoleEntity.update) {
      role = await customRoleEntity.update(role.id, { permissions: selectedPermissions });
    }

    const existingAssignment = customRoleAssignments.find((assignment) => assignment.user_email === email && assignment.custom_role_id === role.id);
    if (!existingAssignment) {
      await assignmentEntity.create({
        user_email: email,
        custom_role_id: role.id,
        hospital_id: null,
      });
    }
  };

  const saveCoordinatorMutation = useMutation({
    mutationFn: async () => {
      const emails = bulkEmailText
        .split(/[\n,;]/)
        .map(normalizeEmail)
        .filter(Boolean);

      if (emails.length === 0) throw new Error("Enter at least one coordinator email.");
      if (selectedHospitalIds.length === 0) throw new Error("Select at least one hospital.");

      const results = [];

      for (const email of emails) {
        if (!editingEmail) {
          await base44.users.inviteUser(email, "user").catch(() => null);
        }

        for (const hospitalId of selectedHospitalIds) {
          const existing = allAssignments.find(
            (assignment) =>
              normalizeEmail(assignment.user_email) === email &&
              assignment.hospital_id === hospitalId &&
              assignment.role === "coordinator"
          );

          const hospital = hospitals.find((item) => item.id === hospitalId);
          const payload = {
            user_email: email,
            hospital_id: hospitalId,
            hospital_name: hospital?.profile_name || hospital?.name || "",
            years: yearsByHospital[hospitalId] || [],
            role: "coordinator",
            is_active: true,
          };

          if (existing) {
            results.push(await base44.entities.Assignment.update(existing.id, payload));
          } else {
            results.push(await base44.entities.Assignment.create(payload));
          }
        }

        const nowInactive = allAssignments.filter(
          (assignment) =>
            normalizeEmail(assignment.user_email) === email &&
            assignment.role === "coordinator" &&
            manageableHospitalIds.includes(assignment.hospital_id) &&
            !selectedHospitalIds.includes(assignment.hospital_id) &&
            assignment.is_active !== false
        );

        for (const assignment of nowInactive) {
          await base44.entities.Assignment.update(assignment.id, { is_active: false });
        }

        await savePermissionsForEmail(email);
        await logAudit(editingEmail ? "coordinator.assignment.update" : "coordinator.assignment.create", {
          email,
          hospital_ids: selectedHospitalIds,
          years_by_hospital: yearsByHospital,
          permissions: selectedPermissions,
        });
      }

      return results;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["allAssignments"] });
      queryClient.invalidateQueries({ queryKey: ["customRoles"] });
      queryClient.invalidateQueries({ queryKey: ["userCustomRoleAssignments"] });
      toast.success(editingEmail ? "Coordinator updated" : "Coordinator assignment saved");
      setModalOpen(false);
      resetModal();
    },
    onError: (error) => toast.error(error.message || "Failed to save coordinator"),
  });

  const deactivateCoordinatorMutation = useMutation({
    mutationFn: async (coordinator) => {
      const activeAssignments = coordinator.assignments.filter((assignment) => assignment.is_active !== false);
      for (const assignment of activeAssignments) {
        await base44.entities.Assignment.update(assignment.id, { is_active: false });
      }
      await logAudit("coordinator.assignment.deactivate", {
        email: coordinator.email,
        assignment_ids: activeAssignments.map((assignment) => assignment.id),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["allAssignments"] });
      toast.success("Coordinator deactivated");
    },
    onError: () => toast.error("Failed to deactivate coordinator"),
  });

  const handleDeactivate = (coordinator) => {
    const confirm = window.prompt(`Type DEACTIVATE to remove all active hospital access for ${coordinator.email}`);
    if (confirm === "DEACTIVATE") deactivateCoordinatorMutation.mutate(coordinator);
  };

  const saveButtonLabel = editingEmail ? "Save Coordinator" : bulkEmailText.includes("\n") || bulkEmailText.includes(",") ? "Bulk Assign" : "Invite Coordinator";

  return (
    <div className="max-w-7xl mx-auto space-y-6 p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
            <Users className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Coordinator Management</h1>
            <p className="text-sm text-slate-500">Assign coordinators to hospitals, years, and role permissions.</p>
          </div>
        </div>
        <Button onClick={openCreateModal}>
          <UserPlus className="w-4 h-4 mr-2" />
          Add / Bulk Assign
        </Button>
      </div>

      <Card className="p-4">
        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <Label>Search</Label>
            <div className="relative mt-1">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
              <Input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search email or hospital..."
                className="pl-10"
              />
            </div>
          </div>
          <div>
            <Label>Hospital</Label>
            <Select value={hospitalFilter} onValueChange={setHospitalFilter}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Hospitals</SelectItem>
                {manageableHospitals.map((hospital) => (
                  <SelectItem key={hospital.id} value={hospital.id}>
                    {hospital.profile_name || hospital.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Status</Label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive Only</SelectItem>
                <SelectItem value="all">All</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="p-4">
          <div className="text-sm text-slate-500">Managed Hospitals</div>
          <div className="text-2xl font-semibold text-slate-900">{manageableHospitals.length}</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-slate-500">Coordinators</div>
          <div className="text-2xl font-semibold text-slate-900">{groupedCoordinators.length}</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-slate-500">Active Assignments</div>
          <div className="text-2xl font-semibold text-slate-900">
            {coordinatorAssignments.filter((assignment) => assignment.is_active !== false).length}
          </div>
        </Card>
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-700">Coordinator</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-700">Hospitals</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-700">Years</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-700">Status</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-slate-700">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredCoordinators.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-slate-500">
                    No coordinators match your filters.
                  </td>
                </tr>
              ) : (
                filteredCoordinators.map((coordinator) => (
                  <tr key={coordinator.email} className="hover:bg-slate-50 align-top">
                    <td className="px-4 py-4">
                      <div className="font-medium text-slate-900">{coordinator.email}</div>
                      <div className="text-xs text-slate-500">{coordinator.assignments.length} assignment record(s)</div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex flex-wrap gap-2">
                        {coordinator.assignments.map((assignment) => (
                          <Badge key={assignment.id} variant="outline" className={assignment.is_active === false ? "opacity-60" : ""}>
                            <Building2 className="w-3 h-3 mr-1" />
                            {hospitalNameById[assignment.hospital_id] || assignment.hospital_name || "Unknown Hospital"}
                          </Badge>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-4 text-sm text-slate-600">
                      <div className="space-y-1">
                        {coordinator.assignments.map((assignment) => (
                          <div key={`${assignment.id}-years`}>
                            <span className="font-medium">{hospitalNameById[assignment.hospital_id] || "Hospital"}:</span>{" "}
                            {assignment.years?.length > 0 ? assignment.years.join(", ") : "All years"}
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      {coordinator.activeCount > 0 ? (
                        <Badge className="bg-green-100 text-green-700">Active</Badge>
                      ) : (
                        <Badge className="bg-red-100 text-red-700">Inactive</Badge>
                      )}
                    </td>
                    <td className="px-4 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <Button onClick={() => openEditModal(coordinator)} variant="outline" size="sm">
                          <Edit className="w-4 h-4 mr-1" />
                          Edit
                        </Button>
                        <Button
                          onClick={() => handleDeactivate(coordinator)}
                          variant="outline"
                          size="sm"
                          className="text-red-600 hover:text-red-700"
                          disabled={coordinator.activeCount === 0 || deactivateCoordinatorMutation.isPending}
                        >
                          <XCircle className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Dialog open={modalOpen} onOpenChange={(open) => { setModalOpen(open); if (!open) resetModal(); }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingEmail ? "Edit Coordinator Access" : "Add or Bulk Assign Coordinators"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            <Card className="p-4 space-y-3">
              <div className="flex items-center gap-2 font-medium text-slate-900">
                <UserPlus className="w-4 h-4" />
                Coordinator Email(s)
              </div>
              <div>
                <Label>{editingEmail ? "Email" : "Email addresses"}</Label>
                <textarea
                  value={bulkEmailText}
                  onChange={(event) => setBulkEmailText(event.target.value)}
                  disabled={!!editingEmail}
                  placeholder="coordinator@example.com\nsecond@example.com"
                  className="mt-1 min-h-[92px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                />
                {!editingEmail && (
                  <p className="text-xs text-slate-500 mt-1">Use one email per line, or separate emails with commas for bulk assignment.</p>
                )}
              </div>
            </Card>

            <Card className="p-4 space-y-4">
              <div className="flex items-center gap-2 font-medium text-slate-900">
                <CopyPlus className="w-4 h-4" />
                Hospital Assignment
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                {manageableHospitals.map((hospital) => {
                  const checked = selectedHospitalIds.includes(hospital.id);
                  const years = getAvailableYears(hospital.id);
                  const selectedYearsForHospital = yearsByHospital[hospital.id] || [];

                  return (
                    <div key={hospital.id} className="rounded-lg border p-3 space-y-3">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <Checkbox checked={checked} onCheckedChange={(value) => toggleHospital(hospital.id, Boolean(value))} />
                        <span className="font-medium text-slate-900">{hospital.profile_name || hospital.name}</span>
                      </label>

                      {checked && (
                        <div className="pl-6 space-y-2">
                          <div className="text-xs font-medium text-slate-500">Years</div>
                          {years.length === 0 ? (
                            <p className="text-xs text-slate-500">No active years found. Leaving blank grants all years.</p>
                          ) : (
                            <div className="flex flex-wrap gap-2">
                              {years.map((year) => (
                                <label key={year} className="flex items-center gap-1 text-sm rounded-md border px-2 py-1 cursor-pointer">
                                  <Checkbox
                                    checked={selectedYearsForHospital.includes(year)}
                                    onCheckedChange={(value) => toggleYear(hospital.id, year, Boolean(value))}
                                  />
                                  {year}
                                </label>
                              ))}
                            </div>
                          )}
                          <p className="text-xs text-slate-500">No checked years means all years for this hospital.</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </Card>

            <Card className="p-4 space-y-4">
              <div className="flex items-center gap-2 font-medium text-slate-900">
                <ShieldCheck className="w-4 h-4" />
                Coordinator Permissions
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                {COORDINATOR_PERMISSIONS.map((permission) => (
                  <label key={permission.key} className="flex items-center gap-2 rounded-lg border p-3 cursor-pointer">
                    <Checkbox
                      checked={selectedPermissions.includes(permission.key)}
                      onCheckedChange={(value) => togglePermission(permission.key, Boolean(value))}
                    />
                    <span className="text-sm font-medium text-slate-800">{permission.label}</span>
                  </label>
                ))}
              </div>
              <p className="text-xs text-slate-500">
                These permissions use the existing custom role structure when available. Hospital access is still controlled by coordinator assignments.
              </p>
            </Card>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => saveCoordinatorMutation.mutate()} disabled={saveCoordinatorMutation.isPending}>
              {saveCoordinatorMutation.isPending ? "Saving..." : saveButtonLabel}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
