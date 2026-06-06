import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { RotateCcw } from "lucide-react";

export default function AttendanceCreditOverridePanel({ attendanceId, classId }) {
  const queryClient = useQueryClient();
  const [overrides, setOverrides] = useState([]);

  const { data: classCredits = [] } = useQuery({
    queryKey: ["classCredits", classId],
    queryFn: async () => {
      if (!classId) return [];
      const all = await base44.entities.ClassCredit.list();
      return all.filter((cc) => cc.class_id === classId).sort((a, b) => a.credit_type_name.localeCompare(b.credit_type_name));
    },
    enabled: !!classId,
  });

  const { data: creditOverrides = [] } = useQuery({
    queryKey: ["attendanceCreditOverrides", attendanceId],
    queryFn: async () => {
      if (!attendanceId) return [];
      const all = await base44.entities.AttendanceCreditOverride.list();
      return all.filter((aco) => aco.attendance_id === attendanceId);
    },
    enabled: !!attendanceId,
    onSuccess: (data) => setOverrides(data),
  });

  const updateOverrideMutation = useMutation({
    mutationFn: async ({ overrideId, data }) => {
      if (overrideId) {
        return await base44.entities.AttendanceCreditOverride.update(overrideId, data);
      } else {
        return await base44.entities.AttendanceCreditOverride.create(data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attendanceCreditOverrides", attendanceId] });
      toast.success("Credit updated");
    },
    onError: (e) => {
      console.error(e);
      toast.error("Failed to update credit");
    },
  });

  const deleteOverrideMutation = useMutation({
    mutationFn: (overrideId) => base44.entities.AttendanceCreditOverride.delete(overrideId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attendanceCreditOverrides", attendanceId] });
      toast.success("Override removed");
    },
    onError: (e) => {
      console.error(e);
      toast.error("Failed to remove override");
    },
  });

  const generateQuarterOptions = (max = 5) => {
    const options = [];
    for (let i = 0; i <= max * 4; i++) {
      const value = i * 0.25;
      const minutes = Math.round(value * 60);
      options.push({
        value,
        label: `${value.toFixed(2)} (${minutes} min)`
      });
    }
    return options;
  };

  const handleUpdateCredit = (creditTypeId, creditTypeName, classValue, newValue) => {
    const existing = overrides.find((o) => o.credit_type_id === creditTypeId);

    if (existing && newValue === classValue) {
      // Remove override if it matches class default
      deleteOverrideMutation.mutate(existing.id);
    } else if (existing) {
      updateOverrideMutation.mutate({
        overrideId: existing.id,
        data: { value: newValue }
      });
    } else {
      updateOverrideMutation.mutate({
        overrideId: null,
        data: {
          attendance_id: attendanceId,
          credit_type_id: creditTypeId,
          credit_type_name: creditTypeName,
          value: newValue
        }
      });
    }
  };

  const handleResetAll = () => {
    if (confirm("Reset all credits to class defaults?")) {
      Promise.all(overrides.map((o) => base44.entities.AttendanceCreditOverride.delete(o.id)))
        .then(() => {
          queryClient.invalidateQueries({ queryKey: ["attendanceCreditOverrides", attendanceId] });
          toast.success("All credits reset to defaults");
        })
        .catch((e) => {
          console.error(e);
          toast.error("Failed to reset credits");
        });
    }
  };

  const quarterOptions = generateQuarterOptions(5);

  if (classCredits.length === 0) {
    return <p className="text-xs text-slate-500">No credits defined for this class</p>;
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between mb-2">
        <label className="text-xs font-semibold text-slate-600">Credit Overrides</label>
        {overrides.length > 0 && (
          <Button size="sm" variant="outline" onClick={handleResetAll} className="h-6 px-2 text-xs">
            <RotateCcw className="w-3 h-3 mr-1" />
            Reset
          </Button>
        )}
      </div>

      <div className="space-y-1 text-xs">
        {classCredits.map((cc) => {
          const override = overrides.find((o) => o.credit_type_id === cc.credit_type_id);
          const currentValue = override?.value ?? cc.value;

          return (
            <div key={cc.id} className="flex items-center gap-2 p-1.5 bg-slate-50 rounded border">
              <span className="font-medium flex-1 text-slate-700">{cc.credit_type_name}</span>
              <Select
                value={currentValue.toString()}
                onValueChange={(v) => handleUpdateCredit(cc.credit_type_id, cc.credit_type_name, cc.value, parseFloat(v))}
              >
                <SelectTrigger className="h-6 w-24 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {quarterOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value.toString()}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {override && (
                <span className="text-[10px] text-orange-600 font-medium">override</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}