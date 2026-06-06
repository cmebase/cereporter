import React, { createContext, useContext, useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

const ImpersonationContext = createContext();

export function useImpersonation() {
  const context = useContext(ImpersonationContext);
  if (!context) {
    // Return default values if not within provider
    return {
      impersonating: null,
      originalUser: null,
      startImpersonating: async () => false,
      stopImpersonating: async () => {},
      getEffectiveUser: () => null,
      isImpersonating: false,
    };
  }
  return context;
}

export function ImpersonationProvider({ children }) {
  const [impersonating, setImpersonating] = useState(null);
  const [originalUser, setOriginalUser] = useState(null);

  useEffect(() => {
    // Load impersonation state from sessionStorage on mount
    const stored = sessionStorage.getItem("impersonation_state");
    if (stored) {
      const state = JSON.parse(stored);
      setImpersonating(state.targetUser);
      setOriginalUser(state.adminUser);
    }
  }, []);

  const startImpersonating = async (targetUser) => {
    try {
      const adminUser = await base44.auth.me();
      
      if (!adminUser) {
        toast.error("Not authenticated");
        return false;
      }

      // Verify admin has assignment (any role qualifies for impersonation)
      const assignments = await base44.entities.Assignment.list();
      const adminAssignments = assignments.filter(
        (a) => a.user_email === adminUser.email && a.is_active
      );
      
      // Allow super_admin or anyone with assignments
      const isSuperAdmin = adminAssignments.some((a) => a.role === "super_admin");
      if (!isSuperAdmin && adminAssignments.length === 0) {
        toast.error("You don't have permission to impersonate users");
        return false;
      }

      // Log impersonation start
      await base44.entities.AuditLog.create({
        user_email: adminUser.email,
        action: "create",
        entity_type: "IMPERSONATION_START",
        entity_name: `Impersonating ${targetUser.email}`,
        after_value: targetUser.email,
      });

      const state = {
        targetUser,
        adminUser,
        startedAt: new Date().toISOString(),
      };

      sessionStorage.setItem("impersonation_state", JSON.stringify(state));
      setImpersonating(targetUser);
      setOriginalUser(adminUser);
      
      console.log("Impersonation started:", targetUser.email);
      toast.success(`Now impersonating ${targetUser.email}`);
      return true;
    } catch (error) {
      console.error("Failed to start impersonation:", error);
      toast.error(`Failed: ${error.message}`);
      return false;
    }
  };

  const stopImpersonating = async () => {
    if (!originalUser || !impersonating) return;

    try {
      // Log impersonation stop
      await base44.entities.AuditLog.create({
        user_email: originalUser.email,
        action: "create",
        entity_type: "IMPERSONATION_STOP",
        entity_name: `Stopped impersonating ${impersonating.email}`,
        before_value: impersonating.email,
      });

      sessionStorage.removeItem("impersonation_state");
      setImpersonating(null);
      setOriginalUser(null);
      
      toast.success("Stopped impersonating");
      
      // Reload to reset context
      window.location.reload();
    } catch (error) {
      console.error("Failed to stop impersonation:", error);
      toast.error("Failed to stop impersonation");
    }
  };

  const getEffectiveUser = () => {
    return impersonating || null;
  };

  return (
    <ImpersonationContext.Provider
      value={{
        impersonating,
        originalUser,
        startImpersonating,
        stopImpersonating,
        getEffectiveUser,
        isImpersonating: !!impersonating,
      }}
    >
      {children}
    </ImpersonationContext.Provider>
  );
}