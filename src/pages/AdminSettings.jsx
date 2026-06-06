import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, Building2, Calendar, Settings, UserCog, Printer, Download } from "lucide-react";
import AdminUsersTab from "../components/admin/tabs/AdminUsersTab";
import AdminManagersTab from "../components/admin/tabs/AdminManagersTab";
import AdminHospitalsTab from "../components/admin/tabs/AdminHospitalsTab";
import AdminYearsTab from "../components/admin/tabs/AdminYearsTab";
import AdminAssignmentsTab from "../components/admin/tabs/AdminAssignmentsTab";
import AdminAuditLogTab from "../components/admin/tabs/AdminAuditLogTab";
import AdminFeatureFlagsTab from "../components/admin/tabs/AdminFeatureFlagsTab";
import QuickUserInviter from "../components/admin/QuickUserInviter";

export default function AdminSettings() {
  const [activeTab, setActiveTab] = useState("users");

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

  // Check if user is super_admin or supreme_technician
  const isSuperAdmin = assignments.some((a) => a.role === "super_admin" || a.role === "supreme_technician");

  if (!isSuperAdmin) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="p-8 max-w-md border-red-200 bg-red-50">
          <h3 className="font-semibold text-red-900">Access Denied</h3>
          <p className="text-sm text-red-800 mt-2">
            You don't have permission to access Admin Settings. Only super admins can access this area.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 via-indigo-500/10 to-violet-500/10 rounded-2xl blur-2xl" />
        <Card className="relative border-purple-200/50 bg-white/80 backdrop-blur-sm shadow-xl">
          <div className="p-8">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-2xl blur-xl opacity-40" />
                <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shadow-lg">
                  <Settings className="w-8 h-8 text-white" />
                </div>
              </div>
              <div className="flex-1">
                <h1 className="text-3xl font-bold text-slate-900 mb-1">Admin Settings</h1>
                <p className="text-slate-600">System administration and configuration</p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.print()}
                  className="gap-2"
                >
                  <Printer className="w-4 h-4" />
                  Print
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const content = document.querySelector('[role="tabpanel"]')?.innerText || '';
                    const blob = new Blob([content], { type: 'text/plain' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `admin-${activeTab}-${new Date().toISOString().split('T')[0]}.txt`;
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                  className="gap-2"
                >
                  <Download className="w-4 h-4" />
                  Download
                </Button>
              </div>
            </div>
          </div>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="relative mb-6 overflow-x-auto">
          <div className="absolute inset-0 bg-gradient-to-r from-slate-100 to-slate-50 rounded-xl blur-lg opacity-50" />
          <TabsList className="relative inline-grid grid-cols-2 md:grid-cols-7 min-w-full bg-white/90 backdrop-blur-sm border border-slate-200/60 shadow-lg rounded-xl p-1.5 h-auto">
            <TabsTrigger 
              value="users" 
              className="flex flex-col sm:flex-row items-center justify-center gap-2 px-4 py-3 data-[state=active]:bg-gradient-to-br data-[state=active]:from-purple-500 data-[state=active]:to-indigo-600 data-[state=active]:text-white data-[state=active]:shadow-lg rounded-lg transition-all duration-200"
            >
              <Users className="w-4 h-4" />
              <span className="text-xs sm:text-sm font-medium">Users</span>
            </TabsTrigger>
            <TabsTrigger 
              value="managers" 
              className="flex flex-col sm:flex-row items-center justify-center gap-2 px-4 py-3 data-[state=active]:bg-gradient-to-br data-[state=active]:from-purple-500 data-[state=active]:to-indigo-600 data-[state=active]:text-white data-[state=active]:shadow-lg rounded-lg transition-all duration-200"
            >
              <UserCog className="w-4 h-4" />
              <span className="text-xs sm:text-sm font-medium">Managers</span>
            </TabsTrigger>
            <TabsTrigger 
              value="hospitals" 
              className="flex flex-col sm:flex-row items-center justify-center gap-2 px-4 py-3 data-[state=active]:bg-gradient-to-br data-[state=active]:from-purple-500 data-[state=active]:to-indigo-600 data-[state=active]:text-white data-[state=active]:shadow-lg rounded-lg transition-all duration-200"
            >
              <Building2 className="w-4 h-4" />
              <span className="text-xs sm:text-sm font-medium">Organizations</span>
            </TabsTrigger>
            <TabsTrigger 
              value="years" 
              className="flex flex-col sm:flex-row items-center justify-center gap-2 px-4 py-3 data-[state=active]:bg-gradient-to-br data-[state=active]:from-purple-500 data-[state=active]:to-indigo-600 data-[state=active]:text-white data-[state=active]:shadow-lg rounded-lg transition-all duration-200"
            >
              <Calendar className="w-4 h-4" />
              <span className="text-xs sm:text-sm font-medium">Years</span>
            </TabsTrigger>
            <TabsTrigger 
              value="assignments" 
              className="flex items-center justify-center px-4 py-3 data-[state=active]:bg-gradient-to-br data-[state=active]:from-purple-500 data-[state=active]:to-indigo-600 data-[state=active]:text-white data-[state=active]:shadow-lg rounded-lg transition-all duration-200"
            >
              <span className="text-xs sm:text-sm font-medium">Assignments</span>
            </TabsTrigger>
            <TabsTrigger 
              value="audit" 
              className="flex items-center justify-center px-4 py-3 data-[state=active]:bg-gradient-to-br data-[state=active]:from-purple-500 data-[state=active]:to-indigo-600 data-[state=active]:text-white data-[state=active]:shadow-lg rounded-lg transition-all duration-200"
            >
              <span className="text-xs sm:text-sm font-medium">Audit Log</span>
            </TabsTrigger>
            <TabsTrigger 
              value="flags" 
              className="flex items-center justify-center px-4 py-3 data-[state=active]:bg-gradient-to-br data-[state=active]:from-purple-500 data-[state=active]:to-indigo-600 data-[state=active]:text-white data-[state=active]:shadow-lg rounded-lg transition-all duration-200"
            >
              <span className="text-xs sm:text-sm font-medium">Features</span>
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="users" className="space-y-4">
          <QuickUserInviter />
          <AdminUsersTab />
        </TabsContent>

        <TabsContent value="managers" className="space-y-4">
          <AdminManagersTab />
        </TabsContent>

        <TabsContent value="hospitals" className="space-y-4">
          <AdminHospitalsTab />
        </TabsContent>

        <TabsContent value="years" className="space-y-4">
          <AdminYearsTab />
        </TabsContent>

        <TabsContent value="assignments" className="space-y-4">
          <AdminAssignmentsTab />
        </TabsContent>

        <TabsContent value="audit" className="space-y-4">
          <AdminAuditLogTab />
        </TabsContent>

        <TabsContent value="flags" className="space-y-4">
          <AdminFeatureFlagsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}