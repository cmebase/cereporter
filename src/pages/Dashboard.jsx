import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "../utils";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { BookOpen, Users, Settings, AlertCircle } from "lucide-react";
import DashboardCard from "../components/dashboard/DashboardCard";
import RecordsCard from "../components/dashboard/RecordsCard";
import FooterActions from "../components/dashboard/FooterActions";
import AdminPanel from "../components/admin/AdminPanel";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useImpersonation } from "../components/admin/ImpersonationContext";

export default function Dashboard() {
  const navigate = useNavigate();
  const [context, setContext] = useState(null);
  const [adminPanelOpen, setAdminPanelOpen] = useState(false);
  const { isImpersonating, impersonating } = useImpersonation();

  // Get current user
  const { data: currentUser } = useQuery({
    queryKey: ["currentUser"],
    queryFn: () => base44.auth.me(),
  });

  // Use impersonated user if impersonating
  const effectiveUser = isImpersonating ? impersonating : currentUser;

  // Get user assignments
  const { data: assignments = [] } = useQuery({
    queryKey: ["userAssignments", effectiveUser?.email],
    queryFn: async () => {
      if (!effectiveUser?.email) return [];
      const all = await base44.entities.Assignment.list();
      return all.filter((a) => a.user_email === effectiveUser.email && a.is_active);
    },
    enabled: !!effectiveUser?.email,
  });

  // Get hospitals
  const { data: hospitals = [] } = useQuery({
    queryKey: ["hospitals"],
    queryFn: () => base44.entities.Hospital.list(),
  });

  // Get hospital years
  const { data: hospitalYears = [] } = useQuery({
    queryKey: ["hospitalYears"],
    queryFn: () => base44.entities.HospitalYear.list(),
  });

  // Determine if user is global admin (Super Admin or Supreme Technician)
  const isGlobalAdmin = useMemo(() => {
    if (!effectiveUser) return false;
    const globalRole = (effectiveUser?.role || "").toString().toLowerCase();
    return globalRole === "admin" || globalRole === "super_admin" || globalRole === "supreme_technician";
  }, [effectiveUser]);

  // Get available hospitals for this user
  const availableHospitals = useMemo(() => {
    if (!effectiveUser) return [];
    
    // Global admins see all hospitals
    if (isGlobalAdmin) return hospitals;
    
    // Other users see only hospitals they're assigned to
    if (assignments.length === 0) return [];
    const userHospitals = new Set(assignments.map((a) => a.hospital_id));
    return hospitals.filter((h) => userHospitals.has(h.id));
  }, [effectiveUser, isGlobalAdmin, assignments, hospitals]);

  // Get available years for selected hospital
  const availableYears = useMemo(() => {
    if (!context?.hospital_id) return [];
    return hospitalYears
      .filter((hy) => hy.hospital_id === context.hospital_id && hy.is_active)
      .map((hy) => hy.year)
      .sort((a, b) => b - a);
  }, [context?.hospital_id, hospitalYears]);

  // Get user role for this hospital
  const userRole = useMemo(() => {
    if (!context?.hospital_id) return null;
    return assignments.find((a) => a.hospital_id === context.hospital_id)?.role;
  }, [context?.hospital_id, assignments]);

  const isSuperAdmin = useMemo(() => {
    return isGlobalAdmin || assignments.some((a) => a.role === "super_admin") || assignments.length === 0;
  }, [isGlobalAdmin, assignments]);

  // Load context on mount
  useEffect(() => {
    const stored = sessionStorage.getItem("ce_context");
    if (stored) {
      const storedContext = JSON.parse(stored);
      setContext(storedContext);
    } else if (!context && availableHospitals.length > 0) {
      // Auto-set first hospital (only once)
      const firstHospital = availableHospitals[0];
      const firstHospitalYears = hospitalYears
        .filter((hy) => hy.hospital_id === firstHospital.id && hy.is_active)
        .sort((a, b) => b.year - a.year);
      
      if (firstHospitalYears.length > 0) {
        const newContext = {
          hospital_id: firstHospital.id,
          year: firstHospitalYears[0].year,
        };
        setContext(newContext);
        sessionStorage.setItem("ce_context", JSON.stringify(newContext));
      }
    }
  }, []);

  const handleHospitalChange = (hospitalId) => {
    // Get first available year for this hospital
    const years = hospitalYears
      .filter((hy) => hy.hospital_id === hospitalId && hy.is_active)
      .sort((a, b) => b.year - a.year);
    
    const newContext = { 
      hospital_id: hospitalId,
      year: years.length > 0 ? years[0].year : null
    };
    setContext(newContext);
    sessionStorage.setItem("ce_context", JSON.stringify(newContext));
    window.dispatchEvent(new Event('ce_context_change'));
  };

  const handleYearChange = (year) => {
    const newContext = { ...context, year: parseInt(year) };
    setContext(newContext);
    sessionStorage.setItem("ce_context", JSON.stringify(newContext));
    window.dispatchEvent(new Event('ce_context_change'));
  };

  const classManagementActions = [
    { 
      label: "Classes", 
      onClick: () => {
        if (context) {
          navigate(createPageUrl("ClassManagement"));
        }
      },
      disabled: !context
    },
    { label: "Credit", onClick: () => navigate(createPageUrl("CreditManagement")) },
    { label: "Instructor", onClick: () => navigate(createPageUrl("InstructorManagement")) },
    { label: "Method", onClick: () => navigate(createPageUrl("MethodManagement")) },
    { label: "Joint Sponsor", onClick: () => navigate(createPageUrl("JointSponsorManagement")) },
  ];

  const nameManagementActions = [
    { label: "Name Management", onClick: () => navigate(createPageUrl("NameManagement")) },
    { label: "Titles", onClick: () => navigate(createPageUrl("TitleManagement")) },
    { label: "Specialties", onClick: () => navigate(createPageUrl("SpecialtyManagement")) },
    { label: "Status", onClick: () => navigate(createPageUrl("StatusManagement")) },
    { label: "Spare Field", onClick: () => navigate(createPageUrl("SpareFieldManagement")) },
  ];

  // No assignments - show no access screen
  if (effectiveUser && assignments.length === 0) {
    // Check if user is first user (allow admin access for setup)
    const isFirstUser = !hospitals.length || hospitals.length === 0;
    
    if (isFirstUser) {
      return (
        <>
          <div className="flex items-center justify-center min-h-[60vh]">
            <Card className="p-8 max-w-md border-indigo-200 bg-indigo-50">
              <div className="flex gap-3 mb-6">
                <AlertCircle className="w-5 h-5 text-indigo-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-indigo-900">System Setup Required</h3>
                  <p className="text-sm text-indigo-800 mt-1">
                   Welcome! Click Admin below to set up organizations, users, and assignments.
                  </p>
                </div>
              </div>
              <Button
                onClick={() => setAdminPanelOpen(true)}
                className="w-full"
              >
                <Settings className="w-4 h-4 mr-2" />
                Admin Setup
              </Button>
            </Card>
          </div>
          <AdminPanel open={adminPanelOpen} onClose={() => setAdminPanelOpen(false)} />
        </>
      );
    }

    // Show no access screen for users without assignments
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="p-8 max-w-md border-slate-200">
          <div className="flex gap-3 mb-6">
            <AlertCircle className="w-5 h-5 text-slate-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-slate-900">No Access Assigned</h3>
              <p className="text-sm text-slate-600 mt-1">
                You don't have access to any organizations or years yet. Your administrator needs to assign you to an organization and year scope.
              </p>
              <p className="text-xs text-slate-500 mt-3">
                Logged in as: {effectiveUser.email}
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Access is controlled by your Super Admin. Contact them to request assignment.
              </p>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Active Context Bar */}
      {availableHospitals.length > 0 && context?.hospital_id && context?.year && (
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div>
                <label className="text-sm font-medium block mb-2 text-slate-700">Organization</label>
                <select 
                  value={context?.hospital_id || ""} 
                  onChange={(e) => handleHospitalChange(e.target.value)}
                  className="px-3 py-2 border border-slate-300 rounded-md bg-white text-sm min-w-[200px]"
                >
                  <option value="">Select organization</option>
                  {availableHospitals.map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium block mb-2 text-slate-700">Year</label>
                <select 
                  value={String(context?.year || "")} 
                  onChange={(e) => handleYearChange(e.target.value)}
                  className="px-3 py-2 border border-slate-300 rounded-md bg-white text-sm min-w-[120px]"
                  disabled={!context?.hospital_id}
                >
                  <option value="">Select year</option>
                  {availableYears.map((y) => (
                    <option key={y} value={String(y)}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>
              <div className="text-sm text-slate-600 pt-6">
                All modules scoped to this organization and year
              </div>
            </div>
            <div className="flex gap-2 pt-6">
              {isSuperAdmin && (
                <Button
                  onClick={() => setAdminPanelOpen(true)}
                  variant="outline"
                  size="sm"
                >
                  <Settings className="w-4 h-4 mr-2" />
                  Admin
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
      
      {/* No Context Set - Show Setup */}
      {availableHospitals.length > 0 && (!context?.hospital_id || !context?.year) && (
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <div>
              <label className="text-sm font-medium block mb-2 text-slate-700">Organization</label>
              <select 
                value={context?.hospital_id || ""} 
                onChange={(e) => handleHospitalChange(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-md bg-white text-sm"
              >
                <option value="">Select organization</option>
                {availableHospitals.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium block mb-2 text-slate-700">Year</label>
              <select 
                value={String(context?.year || "")} 
                onChange={(e) => handleYearChange(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-md bg-white text-sm"
                disabled={!context?.hospital_id}
              >
                <option value="">Select year</option>
                {availableYears.map((y) => (
                  <option key={y} value={String(y)}>
                    {y}
                  </option>
                ))}
              </select>
              {context?.hospital_id && availableYears.length === 0 && (
                <p className="text-xs text-slate-500 mt-1">No years created. Use Admin to add years.</p>
              )}
            </div>
            {isSuperAdmin && (
              <div className="flex justify-end">
                <Button
                  onClick={() => setAdminPanelOpen(true)}
                  variant="outline"
                  size="sm"
                >
                  <Settings className="w-4 h-4 mr-2" />
                  Admin
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Welcome Section */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center mb-12"
      >
        <h1 className="text-3xl font-light text-slate-900 tracking-tight">
          Welcome to <span className="font-semibold">CE Reporter</span>
        </h1>
        <p className="text-slate-500 mt-2">
          Manage your continuing education data with ease
        </p>
      </motion.div>

      {/* Main Cards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <DashboardCard
          title="Class Management"
          description="Manage CE class metadata and configuration"
          icon={BookOpen}
          actions={classManagementActions}
          gradient="bg-gradient-to-br from-indigo-500 to-violet-600"
          delay={0.1}
        />
        <DashboardCard
          title="Name Management"
          description="Manage participant and staff classification data"
          icon={Users}
          actions={nameManagementActions}
          gradient="bg-gradient-to-br from-amber-500 to-orange-600"
          delay={0.2}
        />
      </div>



      {/* Footer Actions */}
      <div className="pt-8 border-t border-slate-200">
        <FooterActions />
      </div>

      {/* Admin Panel Modal */}
      <AdminPanel open={adminPanelOpen} onClose={() => setAdminPanelOpen(false)} />
    </div>
  );
}