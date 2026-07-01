import React, { useEffect, useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Copy, Flag, Plus, Save, ShieldCheck, SlidersHorizontal, Trash2 } from "lucide-react";

const PERMISSION_GROUPS = [
  {
    title: "Hospitals & Users",
    permissions: [
      { key: "hospitals.create", label: "Create hospitals" },
      { key: "hospitals.manage_users", label: "Manage users within hospitals" },
      { key: "users.manage_all", label: "Manage all users" },
      { key: "coordinators.manage", label: "Manage coordinators" },
    ],
  },
  {
    title: "Classes & Attendance",
    permissions: [
      { key: "classes.manage", label: "Create / edit CE classes" },
      { key: "participants.manage", label: "Manage participants" },
      { key: "attendance.manage", label: "Manage attendance" },
      { key: "ce_records.manage", label: "Manage CE records" },
    ],
  },
  {
    title: "Certificates & Reports",
    permissions: [
      { key: "certificates.issue", label: "Issue certificates" },
      { key: "certificate_templates.manage", label: "Manage certificate templates" },
      { key: "reports.view", label: "View reports" },
      { key: "data.export", label: "Export data" },
    ],
  },
  {
    title: "System",
    permissions: [
      { key: "system.settings", label: "Edit system / catalog settings" },
      { key: "audit_logs.view", label: "View audit log" },
      { key: "support_tickets.view", label: "View support tickets" },
      { key: "impersonation.use", label: "Impersonate users" },
    ],
  },
];

const FEATURE_GROUPS = [
  {
    title: "Modules",
    features: [
      { key: "name_management", label: "Name Management" },
      { key: "class_management", label: "Class Management" },
      { key: "records", label: "Records" },
      { key: "certificates", label: "Certificates" },
      { key: "transcripts", label: "Transcripts" },
      { key: "expiration_report", label: "Expiration Report" },
      { key: "mailing_labels", label: "Mailing Labels" },
    ],
  },
  {
    title: "Attendance — Custom Rules",
    features: [
      { key: "show_attended_button", label: 'Show "Attended" button' },
      { key: "show_absent_button", label: 'Show "Absent" button' },
      { key: "show_excused_button", label: 'Show "Excused" button' },
      { key: "allow_attendance_after_event", label: "Allow attendance after event" },
    ],
  },
  {
    title: "Certificates — Custom Rules",
    features: [
      { key: "certificate_qr_code", label: "Certificate QR code" },
      { key: "certificate_digital_signature", label: "Digital signature" },
      { key: "certificate_watermark", label: "Watermark" },
    ],
  },
];

const DEFAULT_ROLE = {
  name: "Coordinator",
  description: "Can manage classes, participants, and issue certificates within assigned hospitals.",
  permissions: ["classes.manage", "participants.manage", "ce_records.manage", "certificates.issue", "reports.view"],
};

const allFeatureKeys = FEATURE_GROUPS.flatMap((group) => group.features.map((feature) => feature.key));

function makeDefaultFlags() {
  return allFeatureKeys.reduce((acc, key) => {
    acc[key] = true;
    return acc;
  }, {});
}

export default function AdminRolesRulesTab() {
  const queryClient = useQueryClient();
  const [activeInnerTab, setActiveInnerTab] = useState("roles");
  const [selectedRoleId, setSelectedRoleId] = useState("default-coordinator");
  const [roleDraft, setRoleDraft] = useState(DEFAULT_ROLE);
  const [selectedHospitalId, setSelectedHospitalId] = useState("global");
  const [featureDraft, setFeatureDraft] = useState(makeDefaultFlags());

  const { data: customRoles = [] } = useQuery({
    queryKey: ["customRoles"],
    queryFn: async () => {
      const entity = base44.entities.CustomRole;
      if (!entity?.list) return [];
      return entity.list().catch(() => []);
    },
  });

  const { data: hospitals = [] } = useQuery({
    queryKey: ["hospitals"],
    queryFn: () => base44.entities.Hospital.list(),
  });

  const roleOptions = useMemo(() => {
    const options = customRoles.map((role) => ({
      ...role,
      label: role.name,
      value: role.id,
    }));

    if (!options.some((role) => role.name === DEFAULT_ROLE.name)) {
      options.unshift({ ...DEFAULT_ROLE, id: "default-coordinator", label: DEFAULT_ROLE.name, value: "default-coordinator" });
    }

    return options;
  }, [customRoles]);

  const selectedHospital = useMemo(() => {
    return hospitals.find((hospital) => hospital.id === selectedHospitalId);
  }, [hospitals, selectedHospitalId]);

  useEffect(() => {
    const selectedRole = roleOptions.find((role) => role.value === selectedRoleId) || roleOptions[0];
    if (!selectedRole) return;

    setRoleDraft({
      id: selectedRole.id,
      name: selectedRole.name || "",
      description: selectedRole.description || "",
      permissions: selectedRole.permissions || [],
    });
  }, [selectedRoleId, roleOptions]);

  useEffect(() => {
    if (selectedHospitalId === "global") {
      setFeatureDraft(makeDefaultFlags());
      return;
    }

    setFeatureDraft({ ...makeDefaultFlags(), ...(selectedHospital?.feature_flags || {}) });
  }, [selectedHospitalId, selectedHospital]);

  const saveRoleMutation = useMutation({
    mutationFn: async () => {
      const entity = base44.entities.CustomRole;
      if (!entity?.create) throw new Error("Custom role entity is not available in this environment.");

      const payload = {
        name: roleDraft.name,
        description: roleDraft.description,
        permissions: roleDraft.permissions,
      };

      if (roleDraft.id && roleDraft.id !== "default-coordinator" && entity.update) {
        return entity.update(roleDraft.id, payload);
      }

      return entity.create(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customRoles"] });
      toast.success("Role saved");
    },
    onError: (error) => toast.error(error.message || "Failed to save role"),
  });

  const saveFlagsMutation = useMutation({
    mutationFn: async () => {
      if (selectedHospitalId === "global") {
        toast.success("Global defaults are shown here for planning. Select a hospital to save overrides.");
        return null;
      }

      return base44.entities.Hospital.update(selectedHospitalId, {
        ...selectedHospital,
        feature_flags: featureDraft,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hospitals"] });
      toast.success("Rules saved");
    },
    onError: () => toast.error("Failed to save rules"),
  });

  const togglePermission = (permissionKey, checked) => {
    setRoleDraft((prev) => {
      const permissions = checked
        ? [...new Set([...(prev.permissions || []), permissionKey])]
        : (prev.permissions || []).filter((permission) => permission !== permissionKey);

      return { ...prev, permissions };
    });
  };

  const toggleFeature = (featureKey, checked) => {
    setFeatureDraft((prev) => ({ ...prev, [featureKey]: checked }));
  };

  const createNewRole = () => {
    setSelectedRoleId("new-role");
    setRoleDraft({
      name: "New Custom Role",
      description: "Describe what this role can do.",
      permissions: [],
    });
  };

  const duplicateRole = () => {
    setSelectedRoleId("new-role");
    setRoleDraft((prev) => ({
      ...prev,
      id: undefined,
      name: `${prev.name || "Role"} Copy`,
    }));
  };

  const totalPermissions = PERMISSION_GROUPS.reduce((count, group) => count + group.permissions.length, 0);
  const enabledPermissionCount = roleDraft.permissions?.length || 0;
  const enabledFeatureCount = Object.values(featureDraft).filter(Boolean).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-900">Roles & Rules Management</h2>
              <p className="text-sm text-slate-600">
                Manage custom roles, permissions, hospital rules, and feature access in one place.
              </p>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={createNewRole}>
            <Plus className="w-4 h-4 mr-2" />
            New Role
          </Button>
          <Button onClick={() => activeInnerTab === "roles" ? saveRoleMutation.mutate() : saveFlagsMutation.mutate()}>
            <Save className="w-4 h-4 mr-2" />
            Save Changes
          </Button>
        </div>
      </div>

      <Tabs value={activeInnerTab} onValueChange={setActiveInnerTab} className="space-y-4">
        <TabsList className="bg-white border shadow-sm">
          <TabsTrigger value="roles" className="gap-2">
            <ShieldCheck className="w-4 h-4" />
            Custom Roles
          </TabsTrigger>
          <TabsTrigger value="rules" className="gap-2">
            <SlidersHorizontal className="w-4 h-4" />
            Custom Rules & Feature Flags
          </TabsTrigger>
        </TabsList>

        <TabsContent value="roles" className="space-y-4">
          <Card className="p-5">
            <div className="grid gap-4 lg:grid-cols-[280px_1fr_auto] lg:items-end">
              <div>
                <Label>Select Role</Label>
                <Select value={selectedRoleId} onValueChange={setSelectedRoleId}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {roleOptions.map((role) => (
                      <SelectItem key={role.value} value={role.value}>{role.label}</SelectItem>
                    ))}
                    {selectedRoleId === "new-role" && <SelectItem value="new-role">New Custom Role</SelectItem>}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <Label>Role Name</Label>
                  <Input className="mt-1" value={roleDraft.name} onChange={(event) => setRoleDraft((prev) => ({ ...prev, name: event.target.value }))} />
                </div>
                <div>
                  <Label>Description</Label>
                  <Input className="mt-1" value={roleDraft.description} onChange={(event) => setRoleDraft((prev) => ({ ...prev, description: event.target.value }))} />
                </div>
              </div>
              <Button variant="outline" onClick={duplicateRole}>
                <Copy className="w-4 h-4 mr-2" />
                Duplicate
              </Button>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-slate-600">
              <Badge className="bg-blue-50 text-blue-700">Custom</Badge>
              <span>{enabledPermissionCount} of {totalPermissions} permissions enabled</span>
              <div className="h-2 w-40 rounded-full bg-slate-100 overflow-hidden">
                <div className="h-full bg-blue-600" style={{ width: `${Math.min(100, (enabledPermissionCount / totalPermissions) * 100)}%` }} />
              </div>
            </div>
          </Card>

          <div className="grid gap-4 lg:grid-cols-2">
            {PERMISSION_GROUPS.map((group) => (
              <Card key={group.title} className="p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-slate-900">{group.title}</h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      const groupKeys = group.permissions.map((permission) => permission.key);
                      setRoleDraft((prev) => ({ ...prev, permissions: [...new Set([...(prev.permissions || []), ...groupKeys])] }));
                    }}
                  >
                    Select All
                  </Button>
                </div>
                <div className="space-y-3">
                  {group.permissions.map((permission) => (
                    <label key={permission.key} className="flex items-center gap-3 rounded-lg border p-3 cursor-pointer hover:bg-slate-50">
                      <Checkbox
                        checked={roleDraft.permissions?.includes(permission.key)}
                        onCheckedChange={(checked) => togglePermission(permission.key, Boolean(checked))}
                      />
                      <span className="text-sm font-medium text-slate-800">{permission.label}</span>
                    </label>
                  ))}
                </div>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="rules" className="space-y-4">
          <Card className="p-5">
            <div className="grid gap-4 md:grid-cols-[320px_1fr] md:items-center">
              <div>
                <Label>Rules Scope</Label>
                <Select value={selectedHospitalId} onValueChange={setSelectedHospitalId}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="global">Global Defaults</SelectItem>
                    {hospitals.map((hospital) => (
                      <SelectItem key={hospital.id} value={hospital.id}>{hospital.profile_name || hospital.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="rounded-lg bg-slate-50 border p-4 text-sm text-slate-600">
                {selectedHospitalId === "global"
                  ? "Global defaults are displayed together with custom rules. Select a hospital to save hospital-specific overrides."
                  : `Editing overrides for ${selectedHospital?.profile_name || selectedHospital?.name || "selected hospital"}.`}
                <div className="mt-2 flex items-center gap-2">
                  <Flag className="w-4 h-4 text-blue-600" />
                  <span>{enabledFeatureCount} rules currently enabled</span>
                </div>
              </div>
            </div>
          </Card>

          <div className="grid gap-4 lg:grid-cols-3">
            {FEATURE_GROUPS.map((group) => (
              <Card key={group.title} className="p-5">
                <h3 className="font-semibold text-slate-900 mb-4">{group.title}</h3>
                <div className="space-y-3">
                  {group.features.map((feature) => (
                    <div key={feature.key} className="flex items-center justify-between gap-4 border-b last:border-b-0 pb-3 last:pb-0">
                      <Label htmlFor={`feature-${feature.key}`} className="text-sm cursor-pointer">{feature.label}</Label>
                      <Checkbox
                        id={`feature-${feature.key}`}
                        checked={!!featureDraft[feature.key]}
                        onCheckedChange={(checked) => toggleFeature(feature.key, Boolean(checked))}
                      />
                    </div>
                  ))}
                </div>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      <Card className="p-4 bg-blue-50 border-blue-100 text-sm text-blue-900">
        <strong>Combined view:</strong> Custom Roles control what a user can do. Custom Rules and Feature Flags control what features are available for a hospital. This screen keeps both together so admins do not have to jump between separate buttons.
      </Card>
    </div>
  );
}
