import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import AdminUsersTab from "./tabs/AdminUsersTab";
import AdminAssignmentsTab from "./tabs/AdminAssignmentsTab";
import AdminFeatureFlagsTab from "./tabs/AdminFeatureFlagsTab";
import AdminHospitalsTab from "./tabs/AdminHospitalsTab";
import AdminAuditLogTab from "./tabs/AdminAuditLogTab";


export default function AdminPanel({ open, onClose }) {
  const [activeTab, setActiveTab] = useState("hospitals");

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-sm" 
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col mx-4 z-[10000]">
        {/* Header - Fixed */}
        <div className="shrink-0 flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold">Admin Settings</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content - Scrollable */}
        <div className="flex-1 overflow-y-auto flex">
          {/* Sidebar */}
          <div className="w-40 border-r bg-slate-50 p-2 flex flex-col gap-2 shrink-0 overflow-y-auto">
            <button
              onClick={() => setActiveTab("hospitals")}
              className={`px-3 py-2 rounded text-sm text-left transition ${
                activeTab === "hospitals"
                  ? "bg-indigo-100 text-indigo-900 font-medium"
                  : "hover:bg-slate-100"
              }`}
            >
              Hospitals
            </button>
            <button
              onClick={() => setActiveTab("users")}
              className={`px-3 py-2 rounded text-sm text-left transition ${
                activeTab === "users"
                  ? "bg-indigo-100 text-indigo-900 font-medium"
                  : "hover:bg-slate-100"
              }`}
            >
              Users
            </button>
            <button
              onClick={() => setActiveTab("assignments")}
              className={`px-3 py-2 rounded text-sm text-left transition ${
                activeTab === "assignments"
                  ? "bg-indigo-100 text-indigo-900 font-medium"
                  : "hover:bg-slate-100"
              }`}
            >
              Assignments
            </button>
            <button
              onClick={() => setActiveTab("features")}
              className={`px-3 py-2 rounded text-sm text-left transition ${
                activeTab === "features"
                  ? "bg-indigo-100 text-indigo-900 font-medium"
                  : "hover:bg-slate-100"
              }`}
            >
              Feature Flags
            </button>
            <button
              onClick={() => setActiveTab("audit")}
              className={`px-3 py-2 rounded text-sm text-left transition ${
                activeTab === "audit"
                  ? "bg-indigo-100 text-indigo-900 font-medium"
                  : "hover:bg-slate-100"
              }`}
            >
              Audit Log
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto">
            {activeTab === "hospitals" && <AdminHospitalsTab />}
            {activeTab === "users" && <AdminUsersTab />}
            {activeTab === "assignments" && <AdminAssignmentsTab />}
            {activeTab === "features" && <AdminFeatureFlagsTab />}
            {activeTab === "audit" && <AdminAuditLogTab />}
          </div>
        </div>

        {/* Footer - Fixed */}
        <div className="shrink-0 flex justify-end gap-2 p-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}