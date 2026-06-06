import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { User, Mail, Shield } from "lucide-react";

export default function UserProfile() {
  const { data: currentUser } = useQuery({
    queryKey: ["currentUser"],
    queryFn: () => base44.auth.me().catch(() => null),
  });

  const { data: assignments = [] } = useQuery({
    queryKey: ["userAssignments", currentUser?.email],
    queryFn: async () => {
      if (!currentUser?.email) return [];
      const all = await base44.entities.Assignment.list();
      return all.filter((a) => a.user_email === currentUser.email && a.is_active);
    },
    enabled: !!currentUser?.email,
  });

  const userRole = React.useMemo(() => {
    if (!assignments.length) return "No assignments";
    if (assignments.some((a) => a.role === "super_admin")) return "Super Admin";
    if (assignments.some((a) => a.role === "manager")) return "Manager";
    return "Coordinator";
  }, [assignments]);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
          <User className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">My Profile</h1>
          <p className="text-sm text-slate-500">View your account information</p>
        </div>
      </div>

      <Card className="p-6">
        <div className="space-y-4">
          <div>
            <div className="flex items-center gap-2 text-sm font-medium text-slate-500 mb-1">
              <User className="w-4 h-4" />
              Full Name
            </div>
            <div className="text-slate-900">{currentUser?.full_name || "Not set"}</div>
          </div>

          <div>
            <div className="flex items-center gap-2 text-sm font-medium text-slate-500 mb-1">
              <Mail className="w-4 h-4" />
              Email
            </div>
            <div className="text-slate-900">{currentUser?.email}</div>
          </div>

          <div>
            <div className="flex items-center gap-2 text-sm font-medium text-slate-500 mb-1">
              <Shield className="w-4 h-4" />
              Role
            </div>
            <Badge className={
              userRole === "Super Admin" ? "bg-purple-100 text-purple-700" :
              userRole === "Manager" ? "bg-blue-100 text-blue-700" :
              "bg-green-100 text-green-700"
            }>
              {userRole}
            </Badge>
          </div>
        </div>
      </Card>
    </div>
  );
}