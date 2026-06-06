import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2, Calendar } from "lucide-react";

export default function MyAccess() {
  const { data: currentUser } = useQuery({
    queryKey: ["currentUser"],
    queryFn: () => base44.auth.me().catch(() => null),
  });

  const { data: assignments = [] } = useQuery({
    queryKey: ["userAssignments", currentUser?.email],
    queryFn: async () => {
      if (!currentUser?.email) return [];
      const all = await base44.entities.Assignment.list();
      return all.filter((a) => a.user_email === currentUser.email && a.is_active);
    },
    enabled: !!currentUser?.email,
  });

  const { data: hospitals = [] } = useQuery({
    queryKey: ["hospitals"],
    queryFn: () => base44.entities.Hospital.list(),
  });

  const accessList = React.useMemo(() => {
    return assignments.map((assignment) => {
      const hospital = hospitals.find((h) => h.id === assignment.hospital_id);
      return {
        hospitalName: hospital?.name || "Unknown Hospital",
        years: assignment.years?.length > 0 ? assignment.years : ["All Years"],
        role: assignment.role,
      };
    });
  }, [assignments, hospitals]);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
          <Building2 className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">My Access</h1>
          <p className="text-sm text-slate-500">Hospitals and years you can access</p>
        </div>
      </div>

      {accessList.length === 0 ? (
        <Card className="p-8 text-center text-slate-500">
          No hospital access assigned. Contact your administrator.
        </Card>
      ) : (
        <div className="space-y-3">
          {accessList.map((access, idx) => (
            <Card key={idx} className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Building2 className="w-5 h-5 text-indigo-600" />
                    <h3 className="font-semibold text-slate-900">{access.hospitalName}</h3>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <Calendar className="w-4 h-4" />
                    <span>
                      {Array.isArray(access.years) && access.years.length > 0 
                        ? access.years.join(", ") 
                        : "All Years"}
                    </span>
                  </div>
                </div>
                <Badge className={
                  access.role === "super_admin" ? "bg-purple-100 text-purple-700" :
                  access.role === "manager" ? "bg-blue-100 text-blue-700" :
                  "bg-green-100 text-green-700"
                }>
                  {access.role === "super_admin" ? "Super Admin" :
                   access.role === "manager" ? "Manager" : "Coordinator"}
                </Badge>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}