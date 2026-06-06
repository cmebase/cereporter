import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function Properties() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [hospitalData, setHospitalData] = useState({ profile_name: "", city_state: "", comment: "", certificate_background_url: "" });
  const [settingsData, setSettingsData] = useState({});
  const [dirty, setDirty] = useState(false);
  const [context, setContext] = useState(null);

  useEffect(() => {
    const stored = sessionStorage.getItem("ce_context");
    if (stored) {
      setContext(JSON.parse(stored));
    }
  }, []);

  const { data: hospital } = useQuery({
    queryKey: ["hospital", context?.hospital_id],
    queryFn: async () => {
      if (!context?.hospital_id) return null;
      const hospitals = await base44.entities.Hospital.list();
      return hospitals.find((h) => h.id === context.hospital_id) || null;
    },
    enabled: !!context?.hospital_id,
  });

  const { data: settings } = useQuery({
    queryKey: ["systemSettings"],
    queryFn: async () => {
      const result = await base44.entities.SystemSettings.list();
      return result[0] || null;
    },
  });

  const { data: photos = [] } = useQuery({
    queryKey: ["photos"],
    queryFn: () => base44.entities.Photo.list(),
  });

  useEffect(() => {
    if (hospital) {
      setHospitalData({
        profile_name: hospital.profile_name || hospital.name || "",
        city_state: hospital.city_state || "",
        comment: hospital.comment || "",
        certificate_background_url: hospital.certificate_background_url || "",
      });
    }
  }, [hospital]);

  useEffect(() => {
    if (settings) {
      setSettingsData({
        use_class_id: settings.use_class_id ?? true,
        class_id_label: settings.class_id_label || "Class Id",
        speaker_label: settings.speaker_label || "Instructor",
        class_spare1_label: settings.class_spare1_label || "Spare",
        class_spare2_label: settings.class_spare2_label || "Spare",
        use_name_id: settings.use_name_id ?? true,
        name_id_label: settings.name_id_label || "Name Id",
        track_expiration_dates: settings.track_expiration_dates ?? false,
        specialty_label: settings.specialty_label || "Specialty",
        name_spare1_label: settings.name_spare1_label || "Spare",
        name_spare2_label: settings.name_spare2_label || "Status",
        print_name: settings.print_name ?? true,
        print_city_state: settings.print_city_state ?? true,
        print_comment: settings.print_comment ?? true,
        print_specialty_on_signin: settings.print_specialty_on_signin ?? false,
        preview_reports: settings.preview_reports ?? true,
      });
    }
  }, [settings]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const promises = [];
      
      if (hospital?.id) {
        promises.push(base44.entities.Hospital.update(hospital.id, hospitalData));
      }
      
      if (settings?.id) {
        promises.push(base44.entities.SystemSettings.update(settings.id, settingsData));
      } else {
        promises.push(base44.entities.SystemSettings.create(settingsData));
      }
      
      return Promise.all(promises);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["hospital"] });
      await queryClient.invalidateQueries({ queryKey: ["systemSettings"] });
      toast.success("Properties saved");
      setDirty(false);
    },
    onError: (e) => {
      console.error(e);
      toast.error("Save failed");
    },
  });

  const setHospitalField = (key, value) => {
    setHospitalData((prev) => ({ ...prev, [key]: value }));
    setDirty(true);
  };

  const setSettingsField = (key, value) => {
    setSettingsData((prev) => ({ ...prev, [key]: value }));
    setDirty(true);
  };

  const handleSave = () => saveMutation.mutate();

  return (
    <div className="space-y-4">
      {/* Header row like legacy: Properties + Done */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Properties</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate(-1)}>
            Done
          </Button>
          <Button onClick={handleSave} disabled={!dirty || saveMutation.isPending}>
            Save
          </Button>
        </div>
      </div>

      <Card className="p-5">
        <div className="grid grid-cols-2 gap-6">
          {/* LEFT: Class Mgmt */}
          <section className="space-y-3">
            <div className="font-semibold text-blue-700">Class Mgmt</div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={!!settingsData.use_class_id}
                onChange={(e) => setSettingsField("use_class_id", e.target.checked)}
                className="h-4 w-4 rounded border-slate-300"
              />
              <Label>Use Class Id</Label>
            </div>

            <div className="grid grid-cols-3 items-center gap-2">
              <Label className="col-span-1 text-blue-700 font-semibold">Class Id</Label>
              <Input
                className="col-span-2"
                value={settingsData.class_id_label || ""}
                onChange={(e) => setSettingsField("class_id_label", e.target.value)}
              />
            </div>

            <div className="grid grid-cols-3 items-center gap-2">
              <Label className="col-span-1 text-blue-700 font-semibold">Speaker</Label>
              <Input
                className="col-span-2"
                value={settingsData.speaker_label || ""}
                onChange={(e) => setSettingsField("speaker_label", e.target.value)}
              />
            </div>

            <div className="grid grid-cols-3 items-center gap-2">
              <Label className="col-span-1 text-blue-700 font-semibold">Spare 1</Label>
              <Input
                className="col-span-2"
                value={settingsData.class_spare1_label || ""}
                onChange={(e) => setSettingsField("class_spare1_label", e.target.value)}
              />
            </div>

            <div className="grid grid-cols-3 items-center gap-2">
              <Label className="col-span-1 text-blue-700 font-semibold">Spare 2</Label>
              <Input
                className="col-span-2"
                value={settingsData.class_spare2_label || ""}
                onChange={(e) => setSettingsField("class_spare2_label", e.target.value)}
              />
            </div>
          </section>

          {/* RIGHT: Name Mgmt */}
          <section className="space-y-3">
            <div className="font-semibold text-blue-700">Name Mgmt</div>

            <div className="flex items-center gap-2 justify-between">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={!!settingsData.use_name_id}
                  onChange={(e) => setSettingsField("use_name_id", e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300"
                />
                <Label>Use Name Id</Label>
              </div>
            </div>

            <div className="grid grid-cols-3 items-center gap-2">
              <Label className="col-span-1 text-blue-700 font-semibold">Name Id</Label>
              <Input
                className="col-span-2"
                value={settingsData.name_id_label || ""}
                onChange={(e) => setSettingsField("name_id_label", e.target.value)}
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={!!settingsData.track_expiration_dates}
                onChange={(e) => setSettingsField("track_expiration_dates", e.target.checked)}
                className="h-4 w-4 rounded border-slate-300"
              />
              <Label>Track Expiration Dates</Label>
            </div>

            <div className="grid grid-cols-3 items-center gap-2">
              <Label className="col-span-1 text-blue-700 font-semibold">Specialty</Label>
              <Input
                className="col-span-2"
                value={settingsData.specialty_label || ""}
                onChange={(e) => setSettingsField("specialty_label", e.target.value)}
              />
            </div>

            <div className="grid grid-cols-3 items-center gap-2">
              <Label className="col-span-1 text-blue-700 font-semibold">Spare 1</Label>
              <Input
                className="col-span-2"
                value={settingsData.name_spare1_label || ""}
                onChange={(e) => setSettingsField("name_spare1_label", e.target.value)}
              />
            </div>

            <div className="grid grid-cols-3 items-center gap-2">
              <Label className="col-span-1 text-blue-700 font-semibold">Spare 2</Label>
              <Input
                className="col-span-2"
                value={settingsData.name_spare2_label || ""}
                onChange={(e) => setSettingsField("name_spare2_label", e.target.value)}
              />
            </div>
          </section>
        </div>

        {/* Report Headers */}
        <div className="mt-6 space-y-3">
          <div className="font-semibold text-blue-700">Report Headers</div>

          <div className="grid grid-cols-[1fr,2fr,auto] items-center gap-3">
            <Label className="text-blue-700 font-semibold">Facility Name</Label>
            <Input
              value={hospitalData.profile_name || ""}
              onChange={(e) => setHospitalField("profile_name", e.target.value)}
            />
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={!!settingsData.print_name}
                onChange={(e) => setSettingsField("print_name", e.target.checked)}
                className="h-4 w-4 rounded border-slate-300"
              />
              <Label className="text-blue-700 font-semibold whitespace-nowrap">Print Name</Label>
            </div>
          </div>

          <div className="grid grid-cols-[1fr,2fr,auto] items-center gap-3">
            <Label className="text-blue-700 font-semibold">City, State</Label>
            <Input
              value={hospitalData.city_state || ""}
              onChange={(e) => setHospitalField("city_state", e.target.value)}
            />
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={!!settingsData.print_city_state}
                onChange={(e) => setSettingsField("print_city_state", e.target.checked)}
                className="h-4 w-4 rounded border-slate-300"
              />
              <Label className="text-blue-700 font-semibold whitespace-nowrap">Print City, State</Label>
            </div>
          </div>

          <div className="grid grid-cols-[1fr,2fr,auto] items-center gap-3">
            <Label className="text-blue-700 font-semibold">Comment</Label>
            <Input
              value={hospitalData.comment || ""}
              onChange={(e) => setHospitalField("comment", e.target.value)}
            />
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={!!settingsData.print_comment}
                onChange={(e) => setSettingsField("print_comment", e.target.checked)}
                className="h-4 w-4 rounded border-slate-300"
              />
              <Label className="text-blue-700 font-semibold whitespace-nowrap">Print Comment</Label>
            </div>
          </div>
        </div>

        {/* Certificate Settings */}
        <div className="mt-6 space-y-3">
          <div className="font-semibold text-blue-700">Certificate Settings</div>
          
          <div className="grid grid-cols-[1fr,2fr] items-center gap-3">
            <Label className="text-blue-700 font-semibold">Background Image</Label>
            <Select
              value={hospitalData.certificate_background_url || ""}
              onValueChange={(value) => setHospitalField("certificate_background_url", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select certificate background..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={null}>None</SelectItem>
                {photos
                  .filter((p) => p.category === "certificate_background")
                  .map((photo) => (
                    <SelectItem key={photo.id} value={photo.url}>
                      {photo.title}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          
          {hospitalData.certificate_background_url && (
            <div className="pl-[calc(33.33%+0.75rem)]">
              <img 
                src={hospitalData.certificate_background_url} 
                alt="Certificate background preview" 
                className="max-w-xs border rounded shadow-sm"
              />
            </div>
          )}
        </div>

        {/* Bottom toggles */}
        <div className="mt-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={!!settingsData.print_specialty_on_signin}
              onChange={(e) => setSettingsField("print_specialty_on_signin", e.target.checked)}
              className="h-4 w-4 rounded border-slate-300"
            />
            <Label>Print Specialty on Sign-in Sheets</Label>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={!!settingsData.preview_reports}
              onChange={(e) => setSettingsField("preview_reports", e.target.checked)}
              className="h-4 w-4 rounded border-slate-300"
            />
            <Label>Preview Reports</Label>
          </div>
        </div>
      </Card>
    </div>
  );
}