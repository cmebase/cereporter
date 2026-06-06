import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

export default function ClassCreditSummary({ classId, primaryCreditType }) {
  const { data: classCredits = [] } = useQuery({
    queryKey: ["classCredits", classId],
    queryFn: async () => {
      if (!classId) return [];
      const all = await base44.entities.ClassCredit.list();
      return all.filter((cc) => cc.class_id === classId).sort((a, b) => a.credit_type_name.localeCompare(b.credit_type_name));
    },
    enabled: !!classId,
  });

  if (!primaryCreditType && classCredits.length === 0) {
    return <span className="text-xs text-slate-400">—</span>;
  }

  const parts = [];
  if (primaryCreditType) {
    parts.push(primaryCreditType);
  }
  classCredits.forEach((cc) => {
    parts.push(`${cc.credit_type_name} ${cc.value.toFixed(2)}`);
  });

  return <span className="text-xs text-slate-600">{parts.join(" • ")}</span>;
}