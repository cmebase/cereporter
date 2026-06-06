import React from "react";
import { Button } from "@/components/ui/button";
import { UserX, AlertTriangle } from "lucide-react";

export default function ImpersonationBanner({ targetUser, onStopImpersonating }) {
  return (
    <div className="fixed top-0 left-0 right-0 z-[100] bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 animate-pulse" />
          <div>
            <div className="font-semibold text-sm">
              Impersonating: {targetUser.full_name || targetUser.email}
            </div>
            <div className="text-xs opacity-90">
              You are viewing the app as this user sees it
            </div>
          </div>
        </div>
        <Button
          onClick={onStopImpersonating}
          size="sm"
          variant="secondary"
          className="bg-white/20 hover:bg-white/30 text-white border-white/30"
        >
          <UserX className="w-4 h-4 mr-2" />
          Stop Impersonating
        </Button>
      </div>
    </div>
  );
}