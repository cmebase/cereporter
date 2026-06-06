import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "./utils";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import UserProfileMenu from "../components/user/UserProfileMenu";
import { useImpersonation } from "../components/admin/ImpersonationContext";
import ImpersonationBanner from "../components/admin/ImpersonationBanner";
import SupportButton from "../components/support/SupportButton";
import {
  ChevronDown,
  Scissors,
  Copy,
  ClipboardPaste,
  Trash2,
  CheckSquare,
  Search,
  Replace,
  ArrowRight,
  Link2,
  SpellCheck,
  FilePlus,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  CopyPlus,
  Save,
  RotateCcw,
  CheckCircle,
  Filter,
  FilterX,
  RefreshCw,
  Building2,
  MapPin,
  Building,
  ArrowLeft,
  AlertCircle,
  Users,
} from "lucide-react";

export default function Layout({ children, currentPageName }) {
        const navigate = useNavigate();
        const [context, setContext] = React.useState(null);
        const showClassTools = currentPageName === "ClassManagement";
        const showNameTools = currentPageName === "NameManagement";
        const { isImpersonating, impersonating, stopImpersonating, getEffectiveUser } = useImpersonation();

  // Get current user and their assignments
  const { data: currentUser } = useQuery({
    queryKey: ["currentUser"],
    queryFn: () => base44.auth.me().catch(() => null),
  });

  // Use impersonated user if impersonating
  const effectiveUser = isImpersonating ? impersonating : currentUser;

  const { data: assignments = [] } = useQuery({
    queryKey: ["userAssignments", effectiveUser?.email],
    queryFn: async () => {
      if (!effectiveUser?.email) return [];
      const all = await base44.entities.Assignment.list();
      return all.filter((a) => a.user_email === effectiveUser.email && a.is_active);
    },
    enabled: !!effectiveUser?.email,
  });

  React.useEffect(() => {
    const stored = sessionStorage.getItem('ce_context');
    if (stored) {
      setContext(JSON.parse(stored));
    }

    // Listen for context changes
    const handleContextChange = () => {
      const updated = sessionStorage.getItem('ce_context');
      if (updated) {
        setContext(JSON.parse(updated));
      }
    };

    window.addEventListener('ce_context_change', handleContextChange);
    return () => window.removeEventListener('ce_context_change', handleContextChange);
  }, []);

  // Check access - redirect if user doesn't have assignment for current hospital
  React.useEffect(() => {
    if (effectiveUser && context?.hospital_id && assignments.length > 0) {
      const hasAccess = assignments.some((a) => a.hospital_id === context.hospital_id);
      if (!hasAccess) {
        // Reset context - user doesn't have access to this hospital
        sessionStorage.removeItem('ce_context');
        setContext(null);
        navigate('/');
      }
    }
  }, [effectiveUser, context?.hospital_id, assignments, navigate]);
  
  const { data: hospital } = useQuery({
    queryKey: ['hospital', context?.hospital_id],
    queryFn: async () => {
      if (!context?.hospital_id) return null;
      const hospitals = await base44.entities.Hospital.list();
      return hospitals.find((h) => h.id === context.hospital_id) || null;
    },
    enabled: !!context?.hospital_id,
  });



  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 flex flex-col">
      {/* Impersonation Banner */}
      {isImpersonating && (
        <ImpersonationBanner 
          targetUser={impersonating} 
          onStopImpersonating={stopImpersonating} 
        />
      )}
      
      {/* Header */}
      <header className={`fixed left-0 right-0 z-50 bg-white/80 backdrop-blur-xl border-b border-slate-200/60 ${isImpersonating ? 'top-[52px]' : 'top-0'}`}>
        <div className="max-w-7xl mx-auto">
          {/* Top Bar with Logo and Organization Info */}
          <div className="flex items-center justify-between px-6 py-4">
            <div className="flex items-center gap-4">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => navigate(-1)}
                className="text-slate-600 hover:text-slate-900"
              >
                <ArrowLeft className="w-4 h-4" />
              </Button>
              <Link to={createPageUrl("Dashboard")} className="flex items-center gap-3 group">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/20 group-hover:shadow-indigo-500/40 transition-shadow">
                    <span className="text-white font-bold text-lg">CE</span>
                  </div>
                  <div>
                    <h1 className="text-xl font-semibold text-slate-900 tracking-tight">CE Reporter</h1>
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      {hospital && (
                        <>
                          <span className="flex items-center gap-1 font-medium text-indigo-600">
                            <Building2 className="w-3 h-3" />
                            {hospital.profile_name || hospital.name}
                          </span>
                          {hospital.city_state && (
                            <>
                              <span className="text-slate-300">•</span>
                              <span className="flex items-center gap-1">
                                <MapPin className="w-3 h-3" />
                                {hospital.city_state}
                              </span>
                            </>
                          )}
                        </>
                      )}
                      {context?.year && (
                        <>
                          <span className="text-slate-300">•</span>
                          <span className="font-medium text-indigo-600">{context.year}</span>
                        </>
                      )}
                    </div>
                  </div>
                  </Link>
              </div>

              {showClassTools && (
                <div className="flex items-center gap-3">
                  <span className="text-lg font-bold text-slate-900">Class Management</span>

                  <select
                    value={context?.year || new Date().getFullYear()}
                    onChange={(e) => {
                      const newContext = { ...context, year: parseInt(e.target.value) };
                      sessionStorage.setItem('ce_context', JSON.stringify(newContext));
                      setContext(newContext);
                      window.dispatchEvent(new Event('ce_context_change'));
                    }}
                    className="px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - 5 + i).map((year) => (
                      <option key={year} value={year}>{year}</option>
                    ))}
                  </select>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={async () => {
                      const year = prompt('Enter new year:');
                      if (year && !isNaN(year)) {
                        const newContext = { ...context, year: parseInt(year) };
                        sessionStorage.setItem('ce_context', JSON.stringify(newContext));
                        setContext(newContext);
                        window.dispatchEvent(new Event('ce_context_change'));
                      }
                    }}
                  >
                    + New Year
                  </Button>

                  <Button
                    onClick={() => navigate(createPageUrl("Dashboard"))}
                    className="ml-2"
                  >
                    Done
                  </Button>
                </div>
              )}

              {showNameTools && (
                <div className="flex items-center gap-3">
                  <span className="text-lg font-bold text-slate-900">Name Management</span>

                  <Button
                    onClick={() => navigate(createPageUrl("Dashboard"))}
                    className="ml-2"
                  >
                    Done
                  </Button>
                </div>
              )}

              <div className="flex items-center gap-2">
                <UserProfileMenu />
                {currentUser?.role === 'admin' && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate(createPageUrl("UserManagement"))}
                    className="text-slate-600 hover:text-slate-900"
                    title="Manage users"
                  >
                    <Users className="w-4 h-4" />
                  </Button>
                )}
              </div>
              </div>

                {/* Menu Bar */}
          <div className="flex items-center gap-1 px-6 pb-3">
            {/* Edit Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="text-slate-600 hover:text-slate-900 hover:bg-slate-100 font-medium">
                  Edit
                  <ChevronDown className="w-3 h-3 ml-1" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56">
                <DropdownMenuItem className="flex items-center gap-2">
                  <Scissors className="w-4 h-4" />
                  Cut
                  <span className="ml-auto text-xs text-slate-400">Ctrl+X</span>
                </DropdownMenuItem>
                <DropdownMenuItem className="flex items-center gap-2">
                  <Copy className="w-4 h-4" />
                  Copy
                  <span className="ml-auto text-xs text-slate-400">Ctrl+C</span>
                </DropdownMenuItem>
                <DropdownMenuItem className="flex items-center gap-2">
                  <ClipboardPaste className="w-4 h-4" />
                  Paste
                  <span className="ml-auto text-xs text-slate-400">Ctrl+V</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="flex items-center gap-2 text-red-600">
                  <Trash2 className="w-4 h-4" />
                  Delete Record
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="flex items-center gap-2">
                  <CheckSquare className="w-4 h-4" />
                  Select All
                  <span className="ml-auto text-xs text-slate-400">Ctrl+A</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="flex items-center gap-2">
                  <Search className="w-4 h-4" />
                  Find
                  <span className="ml-auto text-xs text-slate-400">Ctrl+F</span>
                </DropdownMenuItem>
                <DropdownMenuItem className="flex items-center gap-2">
                  <Replace className="w-4 h-4" />
                  Replace
                  <span className="ml-auto text-xs text-slate-400">Ctrl+H</span>
                </DropdownMenuItem>
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger className="flex items-center gap-2">
                    <ArrowRight className="w-4 h-4" />
                    Go To
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent>
                    <DropdownMenuItem>Go to Record Number</DropdownMenuItem>
                    <DropdownMenuItem>Go to Next Record</DropdownMenuItem>
                    <DropdownMenuItem>Go to Previous Record</DropdownMenuItem>
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Field Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="text-slate-600 hover:text-slate-900 hover:bg-slate-100 font-medium">
                  Field
                  <ChevronDown className="w-3 h-3 ml-1" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-48">
                <DropdownMenuItem className="flex items-center gap-2">
                  <SpellCheck className="w-4 h-4" />
                  Spelling
                  <span className="ml-auto text-xs text-slate-400">F7</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="flex items-center gap-2">
                  Clear Field
                </DropdownMenuItem>
                <DropdownMenuItem className="flex items-center gap-2">
                  Reset to Default
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Records Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="text-slate-600 hover:text-slate-900 hover:bg-slate-100 font-medium">
                  Records
                  <ChevronDown className="w-3 h-3 ml-1" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56">
                <DropdownMenuItem className="flex items-center gap-2">
                  <FilePlus className="w-4 h-4" />
                  New Record
                  <span className="ml-auto text-xs text-slate-400">Ctrl+N</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="flex items-center gap-2">
                  <ChevronsLeft className="w-4 h-4" />
                  First Record
                </DropdownMenuItem>
                <DropdownMenuItem className="flex items-center gap-2">
                  <ChevronLeft className="w-4 h-4" />
                  Previous Record
                </DropdownMenuItem>
                <DropdownMenuItem className="flex items-center gap-2">
                  <ChevronRight className="w-4 h-4" />
                  Next Record
                </DropdownMenuItem>
                <DropdownMenuItem className="flex items-center gap-2">
                  <ChevronsRight className="w-4 h-4" />
                  Last Record
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="flex items-center gap-2">
                  <CopyPlus className="w-4 h-4" />
                  Duplicate Record
                </DropdownMenuItem>
                <DropdownMenuItem className="flex items-center gap-2">
                  <Save className="w-4 h-4" />
                  Save Record
                  <span className="ml-auto text-xs text-slate-400">Shift+Enter</span>
                </DropdownMenuItem>
                <DropdownMenuItem className="flex items-center gap-2">
                  <RotateCcw className="w-4 h-4" />
                  Revert Changes
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" />
                  Validate Record
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="flex items-center gap-2">
                  <Filter className="w-4 h-4" />
                  Apply Filter / Sort
                </DropdownMenuItem>
                <DropdownMenuItem className="flex items-center gap-2">
                  <FilterX className="w-4 h-4" />
                  Remove Filter / Sort
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="flex items-center gap-2">
                  <RefreshCw className="w-4 h-4" />
                  Refresh
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className={`w-full flex-1 ${isImpersonating ? 'pt-[180px]' : 'pt-32'}`}>
        <div className="w-full px-4 md:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto w-full">
            {children}
          </div>
        </div>
      </main>

      {/* Support Button */}
      <SupportButton />
    </div>
  );
}