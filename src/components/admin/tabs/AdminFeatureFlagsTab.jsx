import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card } from "@/components/ui/card";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Save } from "lucide-react";

const FEATURES = [
  { key: "name_management", label: "Name Management" },
  { key: "class_management", label: "Class Management" },
  { key: "records", label: "Records" },
  { key: "certificates", label: "Certificates" },
  { key: "transcripts", label: "Transcripts" },
  { key: "expiration_report", label: "Expiration Report" },
  { key: "mailing_labels", label: "Mailing Labels" },
];

export default function AdminFeatureFlagsTab() {
  const queryClient = useQueryClient();
  const [selectedHospitalId, setSelectedHospitalId] = useState("");
  const [flags, setFlags] = useState({});

  const { data: hospitals = [] } = useQuery({
    queryKey: ["hospitals"],
    queryFn: () => base44.entities.Hospital.list(),
  });

  const { data: selectedHospital } = useQuery({
    queryKey: ["hospital", selectedHospitalId],
    queryFn: async () => {
      if (!selectedHospitalId) return null;
      const list = await base44.entities.Hospital.list();
      return list.find((h) => h.id === selectedHospitalId);
    },
    enabled: !!selectedHospitalId,
  });

  const updateFlagsMutation = useMutation({
    mutationFn: async (data) => {
      return base44.entities.Hospital.update(selectedHospitalId, data);
    },
    onSuccess: () => {
      toast.success("Feature flags updated");
      queryClient.invalidateQueries({ queryKey: ["hospital", selectedHospitalId] });
    },
    onError: (err) => {
      console.error(err);
      toast.error("Failed to update flags");
    },
  });

  const handleHospitalChange = (hospitalId) => {
    setSelectedHospitalId(hospitalId);
    const hospital = hospitals.find((h) => h.id === hospitalId);
    if (hospital?.feature_flags) {
      setFlags(hospital.feature_flags);
    } else {
      setFlags(
        FEATURES.reduce((acc, f) => {
          acc[f.key] = true;
          return acc;
        }, {})
      );
    }
  };

  const handleToggleFeature = (featureKey) => {
    setFlags((prev) => ({ ...prev, [featureKey]: !prev[featureKey] }));
  };

  const handleSave = () => {
    if (!selectedHospitalId) {
      toast.error("Select a hospital first");
      return;
    }
    updateFlagsMutation.mutate({
      ...selectedHospital,
      feature_flags: flags,
    });
  };

  return (
    <div className="p-4 space-y-4">
      <div>
        <h3 className="font-semibold mb-3">Select Hospital</h3>
        <Select value={selectedHospitalId} onValueChange={handleHospitalChange}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select hospital" />
          </SelectTrigger>
          <SelectContent>
            {hospitals.map((h) => (
              <SelectItem key={h.id} value={h.id}>
                {h.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selectedHospitalId && (
        <div>
          <h3 className="font-semibold mb-3">Feature Toggles</h3>
          <Card className="p-4">
            <div className="space-y-3">
              {FEATURES.map((feature) => (
                <div key={feature.key} className="flex items-center gap-3">
                  <Checkbox
                    id={feature.key}
                    checked={!!flags[feature.key]}
                    onCheckedChange={() => handleToggleFeature(feature.key)}
                  />
                  <Label htmlFor={feature.key} className="cursor-pointer">
                    {feature.label}
                  </Label>
                </div>
              ))}
            </div>

            <div className="mt-4 pt-4 border-t">
              <Button onClick={handleSave} disabled={updateFlagsMutation.isPending}>
                <Save className="w-4 h-4 mr-2" />
                Save
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}