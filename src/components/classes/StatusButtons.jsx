import React from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CheckCircle, Award, XCircle, UserPlus, ArrowRight } from "lucide-react";

export default function StatusButtons({ 
  selectedCount, 
  onAssignStatus,
  disabled,
  mode = "add"
}) {
  const buttons = [
    { 
      status: 'attended', 
      label: 'Attended', 
      color: 'bg-slate-200 hover:bg-slate-300 text-slate-900 border border-slate-300' 
    },
    { 
      status: 'passed', 
      label: 'Passed', 
      color: 'bg-slate-200 hover:bg-slate-300 text-slate-900 border border-slate-300' 
    },
    { 
      status: 'failed', 
      label: 'Failed', 
      color: 'bg-slate-200 hover:bg-slate-300 text-slate-900 border border-slate-300' 
    },
    { 
      status: 'pre-registered', 
      label: 'Pre-Reg', 
      color: 'bg-slate-200 hover:bg-slate-300 text-slate-900 border border-slate-300' 
    },
  ];

  return (
    <div className="flex flex-col gap-2 py-4">
      {mode === "add" && selectedCount > 0 && (
        <div className="text-xs text-slate-600 mb-2 text-center">
          {selectedCount} selected
        </div>
      )}
      {buttons.map(({ status, label, color }) => (
        <Button
          key={status}
          onClick={() => onAssignStatus(status)}
          disabled={disabled}
          className={`w-32 justify-center ${color}`}
          size="sm"
          variant="outline"
        >
          {label}
        </Button>
      ))}
    </div>
  );
}