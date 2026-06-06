import React from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { User, Building2, Settings, LogOut, Shield, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function UserProfileMenu() {
  const navigate = useNavigate();

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
    if (!assignments.length) return null;
    if (assignments.some((a) => a.role === "supreme_technician")) return "supreme_technician";
    if (assignments.some((a) => a.role === "super_admin")) return "super_admin";
    if (assignments.some((a) => a.role === "manager")) return "manager";
    return "coordinator";
  }, [assignments]);

  const getInitials = () => {
    if (!currentUser) return "??";
    if (currentUser.full_name) {
      const parts = currentUser.full_name.trim().split(" ");
      if (parts.length >= 2) {
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
      }
      return parts[0].substring(0, 2).toUpperCase();
    }
    if (currentUser.email) {
      return currentUser.email.substring(0, 2).toUpperCase();
    }
    return "??";
  };

  const getRoleBadge = () => {
    if (userRole === "supreme_technician") return { label: "Supreme Technician", color: "bg-orange-100 text-orange-700" };
    if (userRole === "super_admin") return { label: "Super Admin", color: "bg-purple-100 text-purple-700" };
    if (userRole === "manager") return { label: "Manager", color: "bg-blue-100 text-blue-700" };
    if (userRole === "coordinator") return { label: "Coordinator", color: "bg-green-100 text-green-700" };
    return null;
  };

  const handleLogout = () => {
    base44.auth.logout();
  };

  const roleBadge = getRoleBadge();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-2 hover:opacity-80 transition-opacity">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white font-semibold text-sm shadow-lg">
            {getInitials()}
          </div>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        {/* User Info */}
        <div className="px-2 py-3 border-b">
          <div className="font-medium text-slate-900">{currentUser?.full_name || currentUser?.email}</div>
          <div className="text-xs text-slate-500 mt-0.5">{currentUser?.email}</div>
          {roleBadge && (
            <Badge className={`${roleBadge.color} mt-2 text-xs`}>
              {roleBadge.label}
            </Badge>
          )}
        </div>

        {/* All Users */}
        <DropdownMenuItem onClick={() => navigate(createPageUrl("UserProfile"))}>
          <User className="w-4 h-4 mr-2" />
          Profile
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => navigate(createPageUrl("MyAccess"))}>
          <Building2 className="w-4 h-4 mr-2" />
          My Access
        </DropdownMenuItem>

        {/* Manager Only */}
        {userRole === "manager" && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-xs text-slate-500 uppercase">Management</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => navigate(createPageUrl("ManageCoordinators"))}>
              <Users className="w-4 h-4 mr-2" />
              Manage Coordinators
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate(createPageUrl("MyHospitals"))}>
              <Building2 className="w-4 h-4 mr-2" />
              My Hospitals
            </DropdownMenuItem>
          </>
        )}

        {/* Super Admin or Supreme Technician */}
        {(userRole === "super_admin" || userRole === "supreme_technician") && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-xs text-slate-500 uppercase">Admin</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => navigate(createPageUrl("AdminSettings"))}>
              <Shield className="w-4 h-4 mr-2" />
              Admin Settings
            </DropdownMenuItem>
          </>
        )}

        {/* Supreme Technician Only - Support Tickets */}
        {userRole === "supreme_technician" && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-xs text-slate-500 uppercase">Support</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => navigate(createPageUrl("SupportTickets"))}>
              <Settings className="w-4 h-4 mr-2" />
              Support Tickets
            </DropdownMenuItem>
          </>
        )}

        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleLogout} className="text-red-600">
          <LogOut className="w-4 h-4 mr-2" />
          Sign Out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}