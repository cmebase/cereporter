import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { X } from "lucide-react";

export default function CreditLinesEditor({ credits = [], onChange }) {
  const [editingIndex, setEditingIndex] = useState(null);
  
  const { data: creditTypes = [] } = useQuery({
    queryKey: ["credits"],
    queryFn: () => base44.entities.Credit.list(),
  });

  const activeCreditTypes = creditTypes.filter((c) => c.is_active !== false);
  const selectedCreditIds = credits.map((c) => c.credit_type_id).filter(Boolean);
  const availableCredits = activeCreditTypes.filter((ct) => !selectedCreditIds.includes(ct.id));

  const handleAddCredit = (creditTypeId) => {
    if (!creditTypeId) return;
    onChange([...credits, { credit_type_id: creditTypeId, amount: 1.0 }]);
  };

  const handleRemove = (index) => {
    onChange(credits.filter((_, i) => i !== index));
    setEditingIndex(null);
  };

  const handleUpdateAmount = (index, amount) => {
    const updated = [...credits];
    updated[index] = { ...updated[index], amount: parseFloat(amount) || 0 };
    onChange(updated);
  };

  return (
    <div className="space-y-2">
      {/* Selected credits as chips */}
      {credits.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {credits.map((creditLine, index) => {
            const creditType = activeCreditTypes.find((ct) => ct.id === creditLine.credit_type_id);
            const isEditing = editingIndex === index;

            return (
              <div
                key={index}
                className="flex items-center gap-1 bg-indigo-50 text-indigo-700 px-2 py-1 rounded-md text-xs"
              >
                <span>
                  {creditType?.name || "Unknown"}
                </span>
                {isEditing ? (
                  <Input
                    type="number"
                    step="0.25"
                    min="0"
                    value={creditLine.amount || ""}
                    onChange={(e) => handleUpdateAmount(index, e.target.value)}
                    onBlur={() => setEditingIndex(null)}
                    className="h-5 w-12 text-center text-xs px-1"
                    autoFocus
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => setEditingIndex(index)}
                    className="hover:underline"
                  >
                    {creditLine.amount?.toFixed(2) || "0.00"}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => handleRemove(index)}
                  className="hover:bg-indigo-100 rounded"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Credit dropdown */}
      <Select value="" onValueChange={handleAddCredit}>
        <SelectTrigger className="h-9 text-sm">
          <SelectValue placeholder="Select credit" />
        </SelectTrigger>
        <SelectContent>
          {availableCredits.length > 0 ? (
            availableCredits.map((ct) => (
              <SelectItem key={ct.id} value={ct.id}>
                {ct.name}
              </SelectItem>
            ))
          ) : (
            <div className="px-2 py-1.5 text-sm text-slate-500">No credits available</div>
          )}
        </SelectContent>
      </Select>
    </div>
  );
}