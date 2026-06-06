import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";

export default function ClassCreditManager({ classId }) {
  const queryClient = useQueryClient();
  const [newCreditTypeId, setNewCreditTypeId] = useState("");
  const [newCreditValue, setNewCreditValue] = useState("1.0");
  const [popoverOpen, setPopoverOpen] = useState(false);

  const { data: creditTypes = [] } = useQuery({
    queryKey: ["creditTypes"],
    queryFn: () => base44.entities.CreditType.list(),
  });

  const { data: classCredits = [] } = useQuery({
    queryKey: ["classCredits", classId],
    queryFn: async () => {
      if (!classId) return [];
      const all = await base44.entities.ClassCredit.list();
      return all.filter((cc) => cc.class_id === classId).sort((a, b) => a.credit_type_name.localeCompare(b.credit_type_name));
    },
    enabled: !!classId,
  });

  const createCreditMutation = useMutation({
    mutationFn: async () => {
      if (!newCreditTypeId) {
        throw new Error("Select a credit type");
      }
      const ct = creditTypes.find((t) => t.id === newCreditTypeId);
      return await base44.entities.ClassCredit.create({
        class_id: classId,
        credit_type_id: newCreditTypeId,
        credit_type_name: ct?.name || "",
        value: parseFloat(newCreditValue)
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["classCredits", classId] });
      setNewCreditTypeId("");
      setNewCreditValue("1.0");
      setPopoverOpen(false);
      toast.success("Credit added");
    },
    onError: (e) => {
      toast.error(e.message || "Failed to add credit");
    },
  });

  const deleteCreditMutation = useMutation({
    mutationFn: (creditId) => base44.entities.ClassCredit.delete(creditId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["classCredits", classId] });
      toast.success("Credit removed");
    },
    onError: () => {
      toast.error("Failed to remove credit");
    },
  });

  const generateQuarterOptions = (max = 5) => {
    const options = [];
    for (let i = 0; i <= max * 4; i++) {
      const value = i * 0.25;
      options.push({ value: value.toFixed(2), label: value.toFixed(2) });
    }
    return options;
  };

  const quarterOptions = generateQuarterOptions(5);
  const usedCreditTypeIds = classCredits.map((cc) => cc.credit_type_id);
  const availableCreditTypes = creditTypes.filter((ct) => ct.is_active && !usedCreditTypeIds.includes(ct.id));

  const handleAddClick = async () => {
    await createCreditMutation.mutateAsync();
  };

  return (
    <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" className="h-9 text-sm px-3 whitespace-nowrap">
          Additional credits
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72">
            <div className="space-y-3">
              <div className="text-sm font-semibold">Add Credit</div>
              
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-600">Credit Type</label>
                <Select value={newCreditTypeId} onValueChange={setNewCreditTypeId}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableCreditTypes.map((ct) => (
                      <SelectItem key={ct.id} value={ct.id}>
                        {ct.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-600">Value</label>
                <Select value={newCreditValue} onValueChange={setNewCreditValue}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {quarterOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button 
                onClick={handleAddClick} 
                size="sm" 
                className="w-full h-8 text-xs"
                disabled={!newCreditTypeId || createCreditMutation.isPending}
              >
                Add Credit
              </Button>
              </div>
              </PopoverContent>
              </Popover>
              );
              }