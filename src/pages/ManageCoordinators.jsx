import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Users, UserPlus, Edit, XCircle } from "lucide-react";
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

export default function ManageCoordinators() {
  const queryClient = useQueryClient();
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [selectedHospitalId, setSelectedHospitalId] = useState("");
  const [selectedYears, setSelectedYears] = useState([]);

  const { data: currentUser } = useQuery({
    queryKey: ["currentUser"],
    queryFn: () => base44.auth.me().catch(() => null),
  });

  const { data: myAssignments = [] } = useQuery({
    queryKey: ["userAssignments", currentUser?.email],
    queryFn: async () => {
      if (!currentUser?.email) return [];
      const all = await base44.entities.Assignment.list();
      return all.filter((a) => a.user_email === currentUser.email && a.is_active);
    },
    enabled: !!currentUser?.email,
  });

  const myHospitalIds = useMemo(() => {
    return myAssignments
      .filter((a) => a.role === "manager")
      .map((a) => a.hospital_id);
  }, [myAssignments]);

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

  const myHospitals = useMemo(() => {
    return hospitals.filter((h) => myHospitalIds.includes(h.id));
  }, [hospitals, myHospitalIds]);

  const coordinatorAssignments = useMemo(() => {
    return allAssignments.filter(
      (a) => a.role === "coordinator" && myHospitalIds.includes(a.hospital_id) && a.is_active
    );
  }, [allAssignments, myHospitalIds]);

  const inviteMutation = useMutation({
    mutationFn: async ({ email, hospitalId, years }) => {
      await base44.users.inviteUser(email, "user");
      const hospital = hospitals.find((h) => h.id === hospitalId);
      return base44.entities.Assignment.create({
        user_email: email,
        hospital_id: hospitalId,
        hospital_name: hospital?.name || "",
        years: years || [],
        role: "coordinator",
        is_active: true,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["allAssignments"] });
      toast.success("Coordinator invited");
      setInviteModalOpen(false);
      setInviteEmail("");
      setSelectedHospitalId("");
      setSelectedYears([]);
    },
    onError: () => toast.error("Failed to invite coordinator"),
  });

  const updateAssignmentMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Assignment.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["allAssignments"] });
      toast.success("Assignment updated");
      setEditModalOpen(false);
      setEditingAssignment(null);
    },
    onError: () => toast.error("Failed to update assignment"),
  });

  const deactivateMutation = useMutation({
    mutationFn: (id) => base44.entities.Assignment.update(id, { is_active: false }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["allAssignments"] });
      toast.success("Coordinator deactivated");
    },
    onError: () => toast.error("Failed to deactivate"),
  });

  const handleInvite = () => {
    if (!inviteEmail || !selectedHospitalId) {
      toast.error("Please fill all fields");
      return;
    }
    inviteMutation.mutate({
      email: inviteEmail,
      hospitalId: selectedHospitalId,
      years: selectedYears,
    });
  };

  const handleEdit = (assignment) => {
    setEditingAssignment(assignment);
    setSelectedHospitalId(assignment.hospital_id);
    setSelectedYears(assignment.years || []);
    setEditModalOpen(true);
  };

  const handleUpdateAssignment = () => {
    if (!editingAssignment) return;
    const hospital = hospitals.find((h) => h.id === selectedHospitalId);
    updateAssignmentMutation.mutate({
      id: editingAssignment.id,
      data: {
        hospital_id: selectedHospitalId,
        hospital_name: hospital?.name || "",
        years: selectedYears,
      },
    });
  };

  const handleDeactivate = (assignment) => {
    const confirm = window.prompt(
      `Type DEACTIVATE to remove access for ${assignment.user_email}`
    );
    if (confirm === "DEACTIVATE") {
      deactivateMutation.mutate(assignment.id);
    }
  };

  const availableYears = useMemo(() => {
    if (!selectedHospitalId) return [];
    return hospitalYears
      .filter((hy) => hy.hospital_id === selectedHospitalId && hy.is_active)
      .map((hy) => hy.year)
      .sort((a, b) => b - a);
  }, [selectedHospitalId, hospitalYears]);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
            <Users className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Manage Coordinators</h1>
            <p className="text-sm text-slate-500">Invite and manage coordinators for your hospitals</p>
          </div>
        </div>
        <Button onClick={() => setInviteModalOpen(true)}>
          <UserPlus className="w-4 h-4 mr-2" />
          Invite Coordinator
        </Button>
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-700">Email</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-700">Hospital</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-700">Years</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-700">Status</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-slate-700">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {coordinatorAssignments.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                    No coordinators assigned yet
                  </td>
                </tr>
              ) : (
                coordinatorAssignments.map((assignment) => (
                  <tr key={assignment.id}>
                    <td className="px-4 py-3 text-sm text-slate-900">{assignment.user_email}</td>
                    <td className="px-4 py-3 text-sm text-slate-600">{assignment.hospital_name}</td>
                    <td className="px-4 py-3 text-sm text-slate-600">
                      {assignment.years?.length > 0 ? assignment.years.join(", ") : "All Years"}
                    </td>
                    <td className="px-4 py-3">
                      <Badge className="bg-green-100 text-green-700">Active</Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          onClick={() => handleEdit(assignment)}
                          variant="ghost"
                          size="sm"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          onClick={() => handleDeactivate(assignment)}
                          variant="ghost"
                          size="sm"
                          className="text-red-600 hover:text-red-700"
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

      {/* Invite Modal */}
      <Dialog open={inviteModalOpen} onOpenChange={setInviteModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite Coordinator</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Email</Label>
              <Input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="coordinator@example.com"
              />
            </div>
            <div>
              <Label>Hospital</Label>
              <Select value={selectedHospitalId} onValueChange={setSelectedHospitalId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select hospital" />
                </SelectTrigger>
                <SelectContent>
                  {myHospitals.map((h) => (
                    <SelectItem key={h.id} value={h.id}>
                      {h.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Years (leave empty for all years)</Label>
              <Input
                value={selectedYears.join(", ")}
                onChange={(e) =>
                  setSelectedYears(
                    e.target.value
                      .split(",")
                      .map((y) => parseInt(y.trim()))
                      .filter((y) => !isNaN(y))
                  )
                }
                placeholder="2024, 2025"
              />
              <p className="text-xs text-slate-500 mt-1">
                Available years: {availableYears.join(", ")}
              </p>
              <p className="text-xs text-slate-500 mt-2">
                User will receive an invitation and can sign in with Microsoft or password.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInviteModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleInvite}>Invite</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Modal */}
      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Assignment</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Email</Label>
              <Input value={editingAssignment?.user_email || ""} disabled />
            </div>
            <div>
              <Label>Hospital</Label>
              <Select value={selectedHospitalId} onValueChange={setSelectedHospitalId}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {myHospitals.map((h) => (
                    <SelectItem key={h.id} value={h.id}>
                      {h.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Years</Label>
              <Input
                value={selectedYears.join(", ")}
                onChange={(e) =>
                  setSelectedYears(
                    e.target.value
                      .split(",")
                      .map((y) => parseInt(y.trim()))
                      .filter((y) => !isNaN(y))
                  )
                }
                placeholder="2024, 2025"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateAssignment}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}