import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Trash2, Plus, ChevronDown, AlertCircle } from "lucide-react";

export default function AdminAssignmentsTab() {
  const queryClient = useQueryClient();
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newHospitalIds, setNewHospitalIds] = useState([]);
  const [newRole, setNewRole] = useState("coordinator");
  const [newYears, setNewYears] = useState("");
  const [showHospitalDropdown, setShowHospitalDropdown] = useState(false);

  const { data: currentUser } = useQuery({
    queryKey: ["currentUser"],
    queryFn: () => base44.auth.me().catch(() => null),
  });

  const { data: assignments = [] } = useQuery({
    queryKey: ["assignments"],
    queryFn: () => base44.entities.Assignment.list(),
  });

  const { data: hospitals = [] } = useQuery({
    queryKey: ["hospitals"],
    queryFn: () => base44.entities.Hospital.list(),
  });

  // Determine if current user is global admin
  const isGlobalAdmin = useMemo(() => {
    if (!currentUser) return false;
    const role = (currentUser?.role || "").toString().toLowerCase();
    return role === "admin" || role === "super_admin" || role === "supreme_technician";
  }, [currentUser]);

  // Get current user's managed hospitals
  const managedHospitals = useMemo(() => {
    if (isGlobalAdmin) return hospitals;
    
    const allowedIds = new Set(
      assignments
        .filter(a => a.user_email === currentUser?.email && a.is_active && a.role === "manager")
        .map(a => a.hospital_id)
    );
    
    return hospitals.filter(h => allowedIds.has(h.id));
  }, [isGlobalAdmin, currentUser?.email, hospitals, assignments]);

  // Can only create assignments if global admin
  const canCreateAssignments = isGlobalAdmin;

  const createAssignmentMutation = useMutation({
    mutationFn: async (data) => {
      return base44.entities.Assignment.create(data);
    },
    onSuccess: () => {
      toast.success("Assignment created");
      setNewUserEmail("");
      setNewHospitalIds([]);
      setNewRole("coordinator");
      setNewYears("");
      queryClient.invalidateQueries({ queryKey: ["assignments"] });
    },
    onError: (err) => {
      console.error(err);
      toast.error("Failed to create assignment");
    },
  });

  const deleteAssignmentMutation = useMutation({
    mutationFn: (id) => base44.entities.Assignment.delete(id),
    onSuccess: () => {
      toast.success("Assignment deleted");
      queryClient.invalidateQueries({ queryKey: ["assignments"] });
    },
    onError: (err) => {
      console.error(err);
      toast.error("Failed to delete assignment");
    },
  });

  const toggleHospital = (hospitalId) => {
    setNewHospitalIds((prev) =>
      prev.includes(hospitalId)
        ? prev.filter((id) => id !== hospitalId)
        : [...prev, hospitalId]
    );
  };

  const handleCreateAssignment = () => {
    if (!canCreateAssignments) {
      toast.error("You don't have permission to create assignments");
      return;
    }

    if (!newUserEmail || newHospitalIds.length === 0) {
      toast.error("Email and at least one hospital are required");
      return;
    }

    // Verify all selected hospitals are allowed for this user
    const allowedHospitalIds = new Set(managedHospitals.map(h => h.id));
    const unauthorized = newHospitalIds.filter(id => !allowedHospitalIds.has(id));
    if (unauthorized.length > 0) {
      toast.error("You can only assign hospitals you manage");
      return;
    }

    const yearsArray = newYears
      ? newYears.split(",").map((y) => parseInt(y.trim()))
      : [];

    newHospitalIds.forEach((hospitalId) => {
      const hospital = hospitals.find((h) => h.id === hospitalId);
      createAssignmentMutation.mutate({
        user_email: newUserEmail,
        hospital_id: hospitalId,
        hospital_name: hospital?.name,
        years: yearsArray,
        role: newRole,
        is_active: true,
      });
    });

    setNewHospitalIds([]);
  };

  return (
    <div className="p-4 space-y-4">
      {!canCreateAssignments && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-amber-800">
            <p className="font-medium">Limited Access</p>
            <p className="text-xs mt-1">Only Super Admins can create assignments. You can view all assignments below.</p>
          </div>
        </div>
      )}

      <div>
        <h3 className="font-semibold mb-3">Create Assignment</h3>
        <Card className="p-4 space-y-3">
          {!canCreateAssignments ? (
            <div className="p-4 text-center text-slate-500 text-sm">
              You don't have permission to create assignments. Contact a Super Admin.
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-sm">User Email</Label>
                  <Input
                    value={newUserEmail}
                    onChange={(e) => setNewUserEmail(e.target.value)}
                    placeholder="user@example.com"
                    type="email"
                  />
                </div>
                <div>
                  <Label className="text-sm">Hospitals (Select multiple)</Label>
                  <div className="relative">
                    <button
                      onClick={() => setShowHospitalDropdown(!showHospitalDropdown)}
                      className="w-full border border-input rounded-md px-3 py-2 text-sm flex items-center justify-between bg-white hover:bg-slate-50"
                    >
                      <span className="text-slate-600">
                        {newHospitalIds.length > 0
                          ? `${newHospitalIds.length} selected`
                          : "Select hospitals"}
                      </span>
                      <ChevronDown className="w-4 h-4 text-slate-500" />
                    </button>
                    {showHospitalDropdown && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-input rounded-md shadow-lg z-10">
                        <div className="p-2 space-y-2 max-h-48 overflow-y-auto">
                          {hospitals.map((h) => (
                            <div key={h.id} className="flex items-center gap-2 p-2 hover:bg-slate-50 rounded">
                              <Checkbox
                                checked={newHospitalIds.includes(h.id)}
                                onCheckedChange={() => toggleHospital(h.id)}
                              />
                              <label className="text-sm cursor-pointer flex-1">
                                {h.name}
                              </label>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                <div>
                  <Label className="text-sm">Role</Label>
                  <Select value={newRole} onValueChange={setNewRole}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="manager">Manager</SelectItem>
                      <SelectItem value="coordinator">Coordinator</SelectItem>
                      <SelectItem value="super_admin">Super Admin</SelectItem>
                      <SelectItem value="supreme_technician">Supreme Technician</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-sm">Years (comma-separated, leave empty for ALL)</Label>
                  <Input
                    value={newYears}
                    onChange={(e) => setNewYears(e.target.value)}
                    placeholder="2024, 2025"
                  />
                </div>
              </div>
              <Button onClick={handleCreateAssignment} disabled={createAssignmentMutation.isPending}>
                <Plus className="w-4 h-4 mr-2" />
                Create Assignment
              </Button>
            </>
          )}
        </Card>
      </div>

      <div>
        <h3 className="font-semibold mb-3">Assignments ({assignments.length})</h3>
        <Card className="overflow-hidden">
          <div className="max-h-64 overflow-y-auto">
            {assignments.length === 0 ? (
              <div className="p-4 text-sm text-slate-500 text-center">No assignments yet</div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b sticky top-0">
                  <tr>
                    <th className="px-4 py-2 text-left font-medium">User</th>
                    <th className="px-4 py-2 text-left font-medium">Hospital</th>
                    <th className="px-4 py-2 text-left font-medium">Role</th>
                    <th className="px-4 py-2 text-left font-medium">Years</th>
                    <th className="px-4 py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {assignments.map((a) => (
                    <tr key={a.id} className="border-b hover:bg-slate-50">
                      <td className="px-4 py-2">{a.user_email}</td>
                      <td className="px-4 py-2">{a.hospital_name}</td>
                      <td className="px-4 py-2 capitalize">{a.role}</td>
                      <td className="px-4 py-2 text-xs">
                        {a.years && a.years.length > 0 ? a.years.join(", ") : "ALL"}
                      </td>
                      <td className="px-4 py-2 text-right">
                        <button
                          onClick={() => deleteAssignmentMutation.mutate(a.id)}
                          className="text-red-600 hover:text-red-700 p-1"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}