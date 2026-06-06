import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Plus, Edit, Trash2, Calendar } from "lucide-react";

export default function AdminYearsTab() {
  const queryClient = useQueryClient();
  const [newYear, setNewYear] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editingYear, setEditingYear] = useState("");

  const context = React.useMemo(() => {
    const stored = sessionStorage.getItem('ce_context');
    return stored ? JSON.parse(stored) : null;
  }, []);

  const { data: hospital } = useQuery({
    queryKey: ['hospital', context?.hospital_id],
    queryFn: async () => {
      if (!context?.hospital_id) return null;
      const hospitals = await base44.entities.Hospital.list();
      return hospitals.find((h) => h.id === context.hospital_id) || null;
    },
    enabled: !!context?.hospital_id,
  });

  const { data: allClasses = [] } = useQuery({
    queryKey: ["allClasses"],
    queryFn: () => base44.entities.CEClass.list(),
  });

  const { data: allParticipants = [] } = useQuery({
    queryKey: ["allParticipants"],
    queryFn: () => base44.entities.Participant.list(),
  });

  // Get unique years from all records
  const uniqueYears = Array.from(
    new Set([
      ...allClasses.map((c) => c.year).filter(Boolean),
      ...allParticipants.map((p) => p.year).filter(Boolean),
    ])
  ).sort((a, b) => b - a);

  const createYearMutation = useMutation({
    mutationFn: async (year) => {
      // Create a placeholder class to establish the year
      const currentYear = new Date().getFullYear();
      const hospitals = await base44.entities.Hospital.list();
      
      if (hospitals.length === 0) {
        throw new Error("No hospitals found. Create a hospital first.");
      }

      return base44.entities.CEClass.create({
        hospital_id: hospitals[0].id,
        hospital_name: hospitals[0].name,
        year: parseInt(year),
        title: `${year} Year Marker`,
        begin_date: new Date(parseInt(year), 0, 1).toISOString().split('T')[0],
        end_date: new Date(parseInt(year), 11, 31).toISOString().split('T')[0],
        is_active: false,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["allClasses"] });
      toast.success("Year created successfully");
      setNewYear("");
    },
    onError: (e) => {
      toast.error(e.message || "Failed to create year");
    },
  });

  const handleAddYear = () => {
    const year = parseInt(newYear);
    if (!year || year < 1900 || year > 2100) {
      toast.error("Please enter a valid year (1900-2100)");
      return;
    }

    if (uniqueYears.includes(year)) {
      toast.error("Year already exists");
      return;
    }

    createYearMutation.mutate(newYear);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="mb-4">
        <h3 className="text-lg font-semibold flex items-center gap-2 mb-2">
          <Calendar className="w-5 h-5" />
          Manage Years
        </h3>
        {hospital && (
          <div className="text-sm text-slate-600 flex items-center gap-2">
            <span className="font-medium">Current Hospital:</span>
            <span className="text-indigo-600">{hospital.profile_name || hospital.name}</span>
            {hospital.city_state && (
              <span className="text-slate-400">• {hospital.city_state}</span>
            )}
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Add Year Form */}
        <div className="space-y-4 p-4 rounded-lg border-2 border-slate-200">
          <h4 className="font-medium text-slate-900">Create New Year</h4>
          <div className="space-y-2">
            <Label htmlFor="year">Year</Label>
            <Input
              id="year"
              type="number"
              value={newYear}
              onChange={(e) => setNewYear(e.target.value)}
              placeholder="e.g., 2026"
              min="1900"
              max="2100"
            />
          </div>
          <Button 
            onClick={handleAddYear} 
            disabled={createYearMutation.isPending || !newYear}
            className="w-full bg-indigo-600 hover:bg-indigo-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Year
          </Button>
        </div>

        {/* Years List */}
        <div className="space-y-2">
          <Label className="text-sm font-semibold">Available Years ({uniqueYears.length})</Label>
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {uniqueYears.length === 0 ? (
              <div className="text-sm text-slate-500 p-4 text-center border rounded-lg">
                No years created yet. Create one to get started.
              </div>
            ) : (
              uniqueYears.map((year) => {
                const yearClasses = allClasses.filter((c) => c.year === year).filter(c => c.title !== `${year} Year Marker`);
                const yearParticipants = allParticipants.filter((p) => p.year === year);
                
                return (
                  <div
                    key={year}
                    className="p-3 border rounded-lg hover:bg-slate-50 transition"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="font-semibold text-lg">{year}</div>
                        <div className="text-xs text-slate-500 mt-1">
                          {yearClasses.length} classes • {yearParticipants.length} participants
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}