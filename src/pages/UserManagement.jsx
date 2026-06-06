import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { Search, Mail, Lock, Trash2, Eye, EyeOff } from "lucide-react";

export default function UserManagement() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterRole, setFilterRole] = useState("all");
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [showPassword, setShowPassword] = useState({});
  const [alertDialog, setAlertDialog] = useState({
    open: false,
    action: null,
    userId: null,
    email: null,
  });

  const { data: allUsers = [] } = useQuery({
    queryKey: ["allUsers"],
    queryFn: () => base44.entities.User.list(),
  });

  const { data: assignments = [] } = useQuery({
    queryKey: ["assignments"],
    queryFn: () => base44.entities.Assignment.list(),
  });

  const resendInviteMutation = useMutation({
    mutationFn: async (email) => {
      await base44.users.inviteUser(email, "user");
      return email;
    },
    onSuccess: (email) => {
      toast.success(`Invitation resent to ${email}`);
    },
    onError: (err) => {
      toast.error(`Failed to resend invitation: ${err.message}`);
    },
  });

  const generatePasswordResetMutation = useMutation({
    mutationFn: async (email) => {
      const response = await base44.functions.invoke("generatePasswordReset", {
        email,
      });
      return response.data;
    },
    onSuccess: (data) => {
      toast.success("Password reset link generated");
      setShowPassword({
        ...showPassword,
        [data.email]: !showPassword[data.email],
      });
    },
    onError: (err) => {
      toast.error(`Failed to generate reset link: ${err.message}`);
    },
  });

  const deactivateUserMutation = useMutation({
    mutationFn: async (userId) => {
      return base44.entities.User.update(userId, { is_active: false });
    },
    onSuccess: () => {
      toast.success("User deactivated");
      queryClient.invalidateQueries({ queryKey: ["allUsers"] });
    },
    onError: (err) => {
      toast.error("Failed to deactivate user");
    },
  });

  const activateUserMutation = useMutation({
    mutationFn: async (userId) => {
      return base44.entities.User.update(userId, { is_active: true });
    },
    onSuccess: () => {
      toast.success("User activated");
      queryClient.invalidateQueries({ queryKey: ["allUsers"] });
    },
    onError: (err) => {
      toast.error("Failed to activate user");
    },
  });

  const enrichedUsers = useMemo(() => {
    return allUsers.map((user) => {
      const userAssignments = assignments.filter((a) => a.user_email === user.email);
      const roles = [...new Set(userAssignments.map((a) => a.role))];
      return { ...user, assignedRoles: roles };
    });
  }, [allUsers, assignments]);

  const filteredUsers = useMemo(() => {
    return enrichedUsers.filter((user) => {
      const matchesSearch =
        user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.full_name.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesRole =
        filterRole === "all" || user.role === filterRole || user.assignedRoles.includes(filterRole);

      return matchesSearch && matchesRole;
    });
  }, [enrichedUsers, searchTerm, filterRole]);

  const handleSelectAll = (checked) => {
    if (checked) {
      setSelectedUsers(filteredUsers.map((u) => u.id));
    } else {
      setSelectedUsers([]);
    }
  };

  const handleSelectUser = (userId, checked) => {
    if (checked) {
      setSelectedUsers([...selectedUsers, userId]);
    } else {
      setSelectedUsers(selectedUsers.filter((id) => id !== userId));
    }
  };

  const handleResendInvite = (email) => {
    setAlertDialog({
      open: true,
      action: "resend",
      email,
    });
  };

  const handleGenerateReset = (email) => {
    setAlertDialog({
      open: true,
      action: "reset",
      email,
    });
  };

  const handleDeactivate = (userId, email) => {
    setAlertDialog({
      open: true,
      action: "deactivate",
      userId,
      email,
    });
  };

  const confirmAction = () => {
    const { action, userId, email } = alertDialog;
    if (action === "resend") {
      resendInviteMutation.mutate(email);
    } else if (action === "reset") {
      generatePasswordResetMutation.mutate(email);
    } else if (action === "deactivate") {
      deactivateUserMutation.mutate(userId);
    }
    setAlertDialog({ open: false, action: null, userId: null, email: null });
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold mb-1">User Management</h1>
        <p className="text-sm text-slate-600">
          View, manage, and resend invitations to all users
        </p>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex gap-4 items-end">
          <div className="flex-1">
            <label className="text-sm font-medium mb-2 block">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Search by email or name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <div className="w-48">
            <label className="text-sm font-medium mb-2 block">Role</label>
            <Select value={filterRole} onValueChange={setFilterRole}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="user">User</SelectItem>
                <SelectItem value="manager">Manager</SelectItem>
                <SelectItem value="coordinator">Coordinator</SelectItem>
                <SelectItem value="supreme_technician">Supreme Technician</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      {/* Users Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left">
                  <Checkbox
                    checked={selectedUsers.length === filteredUsers.length && filteredUsers.length > 0}
                    onCheckedChange={handleSelectAll}
                  />
                </th>
                <th className="px-4 py-3 text-left font-medium">Email</th>
                <th className="px-4 py-3 text-left font-medium">Name</th>
                <th className="px-4 py-3 text-left font-medium">System Role</th>
                <th className="px-4 py-3 text-left font-medium">Assigned Roles</th>
                <th className="px-4 py-3 text-left font-medium">Status</th>
                <th className="px-4 py-3 text-left font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-4 py-8 text-center text-slate-500">
                    No users found
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr key={user.id} className="border-b hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <Checkbox
                        checked={selectedUsers.includes(user.id)}
                        onCheckedChange={(checked) =>
                          handleSelectUser(user.id, checked)
                        }
                      />
                    </td>
                    <td className="px-4 py-3 font-medium">{user.email}</td>
                    <td className="px-4 py-3">{user.full_name}</td>
                    <td className="px-4 py-3">
                      <Badge variant={user.role === "admin" ? "default" : "secondary"}>
                        {user.role}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1 flex-wrap">
                        {user.assignedRoles.length > 0 ? (
                          user.assignedRoles.map((role) => (
                            <Badge key={role} variant="outline" className="text-xs">
                              {role.replace(/_/g, " ")}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-xs text-slate-500">None</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {user.is_active !== false ? (
                        <Badge className="bg-green-100 text-green-800">Active</Badge>
                      ) : (
                        <Badge className="bg-red-100 text-red-800">Inactive</Badge>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleResendInvite(user.email)}
                          disabled={resendInviteMutation.isPending}
                          title="Resend invitation email"
                        >
                          <Mail className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleGenerateReset(user.email)}
                          disabled={generatePasswordResetMutation.isPending}
                          title="Generate password reset link"
                        >
                          <Lock className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            user.is_active === false
                              ? activateUserMutation.mutate(user.id)
                              : handleDeactivate(user.id, user.email)
                          }
                          disabled={
                            deactivateUserMutation.isPending ||
                            activateUserMutation.isPending
                          }
                          className={
                            user.is_active === false
                              ? "text-green-600 hover:text-green-700"
                              : "text-red-600 hover:text-red-700"
                          }
                        >
                          {user.is_active === false ? (
                            <Eye className="w-4 h-4" />
                          ) : (
                            <EyeOff className="w-4 h-4" />
                          )}
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

      {/* Alert Dialog */}
      <AlertDialog open={alertDialog.open} onOpenChange={(open) => !open && setAlertDialog({ open: false, action: null, userId: null, email: null })}>
        <AlertDialogContent>
          <AlertDialogTitle>
            {alertDialog.action === "resend" && "Resend Invitation?"}
            {alertDialog.action === "reset" && "Generate Password Reset Link?"}
            {alertDialog.action === "deactivate" && "Deactivate User?"}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {alertDialog.action === "resend" &&
              `Send invitation email to ${alertDialog.email}?`}
            {alertDialog.action === "reset" &&
              `Generate a temporary password reset link for ${alertDialog.email}?`}
            {alertDialog.action === "deactivate" &&
              `Deactivate ${alertDialog.email}? They will lose access to the system.`}
          </AlertDialogDescription>
          <div className="flex justify-end gap-3">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmAction}>
              {alertDialog.action === "resend" && "Resend"}
              {alertDialog.action === "reset" && "Generate"}
              {alertDialog.action === "deactivate" && "Deactivate"}
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}