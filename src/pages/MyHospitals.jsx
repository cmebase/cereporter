import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Building2 } from "lucide-react";

export default function MyHospitals() {
  const { data: currentUser } = useQuery({
    queryKey: ["currentUser"],
    queryFn: () => base44.auth.me().catch(() => null),
  });

  const { data: assignments = [] } = useQuery({
    queryKey: ["userAssignments", currentUser?.email],
    queryFn: async () => {
      if (!currentUser?.email) return [];
      const all = await base44.entities.Assignment.list();
      return all.filter(
        (a) => a.user_email === currentUser.email && a.role === "manager" && a.is_active
      );
    },
    enabled: !!currentUser?.email,
  });

  const { data: hospitals = [] } = useQuery({
    queryKey: ["hospitals"],
    queryFn: () => base44.entities.Hospital.list(),
  });

  const myHospitals = React.useMemo(() => {
    return assignments.map((a) => {
      const hospital = hospitals.find((h) => h.id === a.hospital_id);
      return {
        ...hospital,
        assignedYears: a.years || [],
      };
    });
  }, [assignments, hospitals]);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
          <Building2 className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">My Hospitals</h1>
          <p className="text-sm text-slate-500">Hospitals you manage</p>
        </div>
      </div>

      {myHospitals.length === 0 ? (
        <Card className="p-8 text-center text-slate-500">
          No hospitals assigned
        </Card>
      ) : (
        <div className="space-y-3">
          {myHospitals.map((hospital, idx) => (
            <Card key={idx} className="p-5">
              <div className="flex items-start gap-3">
                <Building2 className="w-6 h-6 text-indigo-600 mt-1" />
                <div className="flex-1">
                  <h3 className="font-semibold text-slate-900 text-lg mb-1">
                    {hospital?.name || "Unknown Hospital"}
                  </h3>
                  {hospital?.city_state && (
                    <p className="text-sm text-slate-600">{hospital.city_state}</p>
                  )}
                  {hospital?.assignedYears?.length > 0 && (
                    <p className="text-sm text-slate-500 mt-2">
                      Years: {hospital.assignedYears.join(", ")}
                    </p>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}