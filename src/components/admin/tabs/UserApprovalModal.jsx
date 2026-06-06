import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CheckCircle, XCircle } from "lucide-react";
import { toast } from "sonner";

export default function UserApprovalModal({ open, onOpenChange, user, onApprovalComplete }) {
  const queryClient = useQueryClient();
  const [role, setRole] = useState("");
  const [selectedHospitalIds, setSelectedHospitalIds] = useState([]);
  const [selectedYears, setSelectedYears] = useState([]);
  const [managerId, setManagerId] = useState("");
  const [notes, setNotes] = useState("");
  const [action, setAction] = useState(null); // "approve" or "reject"

  const { data: hospitals = [] } = useQuery({
    queryKey: ["hospitals"],
    queryFn: () => base44.entities.Hospital.list(),
  });

  const { data: managers = [] } = useQuery({
    queryKey: ["managers"],
    queryFn: async () => {
      const assignments = await base44.entities.Assignment.list();
      const managerEmails = [...new Set(
        assignments
          .filter((a) => a.role === "manager" && a.is_active)
          .map((a) => a.user_email)
      )];
      const users = await base44.entities.User.list();
      return users.filter((u) => managerEmails.includes(u.email) && u.status === "ACTIVE");
    },
  });

  const { data: hospitalYears = [] } = useQuery({
    queryKey: ["hospitalYears"],
    queryFn: () => base44.entities.HospitalYear.list(),
  });

  const { data: currentUser } = useQuery({
    queryKey: ["currentUser"],
    queryFn: () => base44.auth.me(),
  });

  const approveMutation = useMutation({
    mutationFn: async () => {
      console.log("MUTATION STARTED", { role, selectedHospitalIds, selectedYears, managerId });
      
      if (!role) {
        console.error("Validation failed: No role selected");
        throw new Error("Please select a role");
      }
      if (role !== "super_admin" && selectedHospitalIds.length === 0) {
        console.error("Validation failed: No hospitals selected");
        throw new Error("Please select at least one hospital");
      }
      if (role === "coordinator" && !managerId) {
        console.error("Validation failed: No manager selected");
        throw new Error("Please select a manager");
      }

      console.log("Calling backend function to approve user...");
      
      const response = await base44.functions.invoke('approveUser', {
        userId: user.id,
        role: role,
        hospitalIds: role === 'super_admin' ? [] : selectedHospitalIds,
        years: selectedYears.length > 0 ? selectedYears : null,
        managerId: role === 'coordinator' ? managerId : null,
        notes: notes,
      });

      console.log("Backend response:", response.data);

      if (!response.data.success) {
        throw new Error(response.data.error || 'Failed to approve user');
      }

      // Refetch user list to update UI
      console.log("Invalidating queries and refreshing UI...");
      await queryClient.invalidateQueries({ queryKey: ["allUsers"] });
      await queryClient.invalidateQueries({ queryKey: ["assignments"] });

      console.log("✅ Approval complete");
      toast.success(`User ${user.email} approved as ${role}`);
      onApprovalComplete();
    },
    onError: (error) => {
      console.error("❌ Approval failed:", error);
      toast.error(error.message || "Failed to approve user");
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async () => {
      await base44.asServiceRole.entities.User.update(user.id, {
        status: "REJECTED",
        rejected_by: currentUser.email,
        rejected_at: new Date().toISOString(),
        approval_notes: notes,
      });

      toast.success(`User ${user.email} rejected`);
      onApprovalComplete();
    },
    onError: (error) => {
      toast.error("Failed to reject user");
    },
  });

  const handleApprove = () => {
    console.log("APPROVE: Moving to approval form");
    setAction("approve");
  };

  const handleReject = () => {
    setAction("reject");
  };

  const confirmApprove = () => {
    console.log("CONFIRM APPROVE clicked", { role, selectedHospitalIds, selectedYears, managerId });
    approveMutation.mutate();
  };

  const confirmReject = () => {
    rejectMutation.mutate();
  };

  const availableYears = selectedHospitalIds.length > 0
    ? hospitalYears
        .filter((hy) =>
          selectedHospitalIds.includes(hy.hospital_id) && hy.is_active
        )
        .map((hy) => hy.year)
        .filter((year, idx, self) => self.indexOf(year) === idx)
        .sort((a, b) => b - a)
    : [];

  if (action === "reject") {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <XCircle className="w-5 h-5" />
              Reject User
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-900">
                <strong>{user.email}</strong> will not be able to access the app.
              </p>
            </div>
            <div>
              <Label>Rejection Notes (Optional)</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Reason for rejection..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setAction(null);
                setNotes("");
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={confirmReject}
              disabled={rejectMutation.isPending}
              className="bg-red-600 hover:bg-red-700"
            >
              Confirm Rejection
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  if (action === "approve") {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-green-600">
              <CheckCircle className="w-5 h-5" />
              Approve User
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-3 bg-slate-50 rounded">
              <p className="text-sm text-slate-700">
                <strong>Email:</strong> {user.email}
              </p>
            </div>

            <div>
              <Label>Role *</Label>
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="super_admin">Super Admin</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                  <SelectItem value="coordinator">Coordinator</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {role && role !== "super_admin" && (
              <>
                <div>
                  <Label>Hospitals *</Label>
                  <div className="space-y-2 max-h-40 overflow-y-auto border rounded p-3">
                    {hospitals.map((h) => (
                      <label key={h.id} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedHospitalIds.includes(h.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedHospitalIds([...selectedHospitalIds, h.id]);
                            } else {
                              setSelectedHospitalIds(
                                selectedHospitalIds.filter((id) => id !== h.id)
                              );
                            }
                          }}
                          className="w-4 h-4"
                        />
                        <span className="text-sm">{h.name}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {availableYears.length > 0 && (
                  <div>
                    <Label>Years (leave empty for all years)</Label>
                    <div className="space-y-2 max-h-40 overflow-y-auto border rounded p-3">
                      {availableYears.map((year) => (
                        <label key={year} className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={selectedYears.includes(year)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedYears([...selectedYears, year]);
                              } else {
                                setSelectedYears(
                                  selectedYears.filter((y) => y !== year)
                                );
                              }
                            }}
                            className="w-4 h-4"
                          />
                          <span className="text-sm">{year}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

            {role === "coordinator" && (
              <div>
                <Label>Manager *</Label>
                <Select value={managerId} onValueChange={setManagerId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select manager" />
                  </SelectTrigger>
                  <SelectContent>
                    {managers.map((m) => (
                      <SelectItem key={m.email} value={m.email}>
                        {m.full_name || m.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div>
              <Label>Approval Notes (Optional)</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Additional notes..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setAction(null);
                setRole("");
                setSelectedHospitalIds([]);
                setSelectedYears([]);
                setManagerId("");
                setNotes("");
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={confirmApprove}
              disabled={approveMutation.isPending}
              className="bg-green-600 hover:bg-green-700"
            >
              Approve User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Review Signup</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
            <p className="text-sm text-orange-900">
              <strong>{user.email}</strong> signed up on{" "}
              {new Date(user.created_date).toLocaleDateString()}
            </p>
          </div>
          {user.first_name && (
            <div>
              <p className="text-sm text-slate-600">
                <strong>Name:</strong> {user.first_name} {user.last_name}
              </p>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant="outline"
            onClick={handleReject}
            className="text-red-600 hover:text-red-700"
          >
            <XCircle className="w-4 h-4 mr-2" />
            Reject
          </Button>
          <Button onClick={handleApprove} className="bg-green-600 hover:bg-green-700">
            <CheckCircle className="w-4 h-4 mr-2" />
            Approve
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}