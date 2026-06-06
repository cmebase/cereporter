import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { toast } from "sonner";
import { Plus, Edit, Trash2, Building2, Calendar, X, Upload } from "lucide-react";

export default function AdminHospitalsTab() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");

  // Get current user
  const { data: currentUser } = useQuery({
    queryKey: ["currentUser"],
    queryFn: () => base44.auth.me().catch(() => null),
  });

  // Check if user is global admin
  const isGlobalAdmin = useMemo(() => {
    if (!currentUser) return false;
    const role = (currentUser?.role || "").toString().toLowerCase();
    return role === "admin" || role === "super_admin" || role === "supreme_technician";
  }, [currentUser]);
  const [selectedHospital, setSelectedHospital] = useState(null);
  const [newYear, setNewYear] = useState("");
  const [form, setForm] = useState({
    name: "",
    profile_name: "",
    city_state: "",
    comment: "",
    location: "",
    logo_url: "",
    year: new Date().getFullYear(),
    is_active: true,
    feature_flags: {
      name_management: true,
      class_management: true,
      records: true,
      certificates: true,
      transcripts: true,
      expiration_report: true,
      mailing_labels: true,
    },
  });
  const [isUploading, setIsUploading] = useState(false);

  const { data: hospitals = [] } = useQuery({
    queryKey: ["hospitals"],
    queryFn: () => base44.entities.Hospital.list(),
  });

  const { data: assignments = [] } = useQuery({
    queryKey: ["assignments"],
    queryFn: () => base44.entities.Assignment.list(),
  });

  // Get visible hospitals based on user role
  const visibleHospitals = useMemo(() => {
    let filtered = isGlobalAdmin ? hospitals : hospitals.filter(h => 
      assignments.some(a => a.user_email === currentUser?.email && a.hospital_id === h.id && a.is_active)
    );

    if (!searchTerm.trim()) return filtered;

    const lower = searchTerm.toLowerCase();
    return filtered.filter(h => 
      h.name.toLowerCase().includes(lower) ||
      (h.profile_name?.toLowerCase().includes(lower)) ||
      (h.city_state?.toLowerCase().includes(lower))
    );
  }, [isGlobalAdmin, currentUser?.email, hospitals, assignments, searchTerm]);

  const { data: hospitalYears = [] } = useQuery({
    queryKey: ["hospitalYears"],
    queryFn: () => base44.entities.HospitalYear.list(),
  });

  const { data: classes = [] } = useQuery({
    queryKey: ["classes"],
    queryFn: () => base44.entities.CEClass.list(),
  });

  const { data: participants = [] } = useQuery({
    queryKey: ["participants"],
    queryFn: () => base44.entities.Participant.list(),
  });

  const { data: photos = [] } = useQuery({
    queryKey: ["photos"],
    queryFn: async () => {
      try {
        return await base44.entities.Photo.list();
      } catch {
        return [];
      }
    },
  });

  const hospitalPhotos = photos.filter(
    (p) => p.category === "logo" && (!selectedHospital || p.hospital_id === selectedHospital.id)
  );

  const getHospitalUsers = (hospitalId) => {
    return assignments.filter((a) => a.hospital_id === hospitalId && a.is_active);
  };

  const getHospitalYears = (hospitalId) => {
    return hospitalYears
      .filter((hy) => hy.hospital_id === hospitalId && hy.is_active)
      .sort((a, b) => b.year - a.year);
  };

  const getYearCounts = (hospitalId, year) => {
    const classCount = classes.filter((c) => c.hospital_id === hospitalId && c.year === year).length;
    const participantCount = participants.filter((p) => p.hospital_id === hospitalId && p.year === year).length;
    return { classCount, participantCount };
  };

  const createMutation = useMutation({
    mutationFn: async (data) => {
      if (!isGlobalAdmin) {
        throw new Error("You don't have permission to create organizations");
      }
      const { year, ...hospitalData } = data;
      const result = await base44.entities.Hospital.create(hospitalData);
      
      // Create initial HospitalYear if year is provided
      if (year && result?.id) {
        await base44.entities.HospitalYear.create({
          hospital_id: result.id,
          hospital_name: result.name,
          year: parseInt(year),
          is_active: true,
        });
      }
      
      return result;
    },
    onSuccess: (result) => {
      console.log("Create mutation success, invalidating hospitals query");
      queryClient.invalidateQueries({ queryKey: ["hospitals"] });
      queryClient.invalidateQueries({ queryKey: ["hospitalYears"] });
      toast.success("Organization created successfully");
      resetForm();
    },
    onError: (e) => {
      console.error("Create organization error:", e);
      toast.error(e?.message || "Failed to create organization");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Hospital.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hospitals"] });
      toast.success("Organization updated");
      resetForm();
    },
    onError: (e) => {
      console.error(e);
      toast.error("Failed to update organization");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Hospital.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hospitals"] });
      toast.success("Organization deleted");
      resetForm();
    },
    onError: (e) => {
      console.error(e);
      toast.error("Failed to delete organization");
    },
  });

  const createYearMutation = useMutation({
    mutationFn: (data) => base44.entities.HospitalYear.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hospitalYears"] });
      toast.success("Year created");
      setNewYear("");
    },
    onError: (e) => {
      console.error(e);
      toast.error("Failed to create year");
    },
  });

  const deleteYearMutation = useMutation({
    mutationFn: (id) => base44.entities.HospitalYear.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hospitalYears"] });
      toast.success("Year deleted");
    },
    onError: (e) => {
      console.error(e);
      toast.error("Failed to delete year");
    },
  });

  const resetForm = () => {
    setSelectedHospital(null);
    setNewYear("");
    setForm({
      name: "",
      profile_name: "",
      city_state: "",
      comment: "",
      location: "",
      logo_url: "",
      year: new Date().getFullYear(),
      is_active: true,
      feature_flags: {
        name_management: true,
        class_management: true,
        records: true,
        certificates: true,
        transcripts: true,
        expiration_report: true,
        mailing_labels: true,
      },
    });
  };

  const handleCreateYear = () => {
    if (!selectedHospital) {
      toast.error("Please select an organization first");
      return;
    }
    
    const yearNum = parseInt(newYear);
    if (!yearNum || yearNum < 2000 || yearNum > 2100) {
      toast.error("Please enter a valid year");
      return;
    }

    const exists = hospitalYears.some(
      (hy) => hy.hospital_id === selectedHospital.id && hy.year === yearNum
    );
    if (exists) {
      toast.error("Year already exists for this organization");
      return;
    }

    createYearMutation.mutate({
      hospital_id: selectedHospital.id,
      hospital_name: selectedHospital.name,
      year: yearNum,
      is_active: true,
    });
  };

  const handleDeleteYear = (yearId) => {
    if (!confirm("Delete this year?")) return;
    deleteYearMutation.mutate(yearId);
  };

  const handleEdit = (hospital) => {
    setSelectedHospital(hospital);
    setForm({
      name: hospital.name || "",
      profile_name: hospital.profile_name || "",
      city_state: hospital.city_state || "",
      comment: hospital.comment || "",
      location: hospital.location || "",
      logo_url: hospital.logo_url || "",
      is_active: hospital.is_active !== false,
      feature_flags: hospital.feature_flags || {
        name_management: true,
        class_management: true,
        records: true,
        certificates: true,
        transcripts: true,
        expiration_report: true,
        mailing_labels: true,
      },
    });
  };

  const handleSave = async () => {
    if (!form.name) {
      toast.error("Organization name is required");
      return;
    }

    if (!isGlobalAdmin && !selectedHospital) {
      toast.error("You don't have permission to create organizations");
      return;
    }

    if (selectedHospital) {
      updateMutation.mutate({ id: selectedHospital.id, data: form });
    } else {
      console.log("Creating new hospital with data:", form);
      createMutation.mutate(form);
    }
  };

  const handleDelete = (hospital) => {
    if (!confirm(`Delete ${hospital.name}?`)) return;
    deleteMutation.mutate(hospital.id);
  };

  const setFeatureFlag = (flag, value) => {
    setForm((prev) => ({
      ...prev,
      feature_flags: {
        ...prev.feature_flags,
        [flag]: value,
      },
    }));
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setIsUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      
      // Save to Photo entity
      await base44.entities.Photo.create({
        title: file.name,
        url: file_url,
        category: "logo",
        hospital_id: selectedHospital?.id || "",
        is_active: true,
      });
      
      setForm((prev) => ({ ...prev, logo_url: file_url }));
      await queryClient.invalidateQueries({ queryKey: ["photos"] });
      toast.success("Logo uploaded to Photo library");
    } catch (err) {
      console.error(err);
      toast.error("Failed to upload logo");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Building2 className="w-5 h-5" />
          Organizations {!isGlobalAdmin && `(${visibleHospitals.length} assigned)`}
        </h3>
        <Button onClick={resetForm} size="sm" variant="outline" disabled={!isGlobalAdmin}>
          <Plus className="w-4 h-4 mr-1" />
          New Organization
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Form */}
        <div className={`max-h-[75vh] overflow-y-auto space-y-4 p-4 pb-6 rounded-lg border-2 transition ${selectedHospital ? 'border-indigo-300 bg-indigo-50/30' : 'border-slate-200'}`}>
          {selectedHospital && (
            <div className="mb-2 text-sm font-medium text-indigo-700">
              Editing: {selectedHospital.name}
            </div>
          )}
          <div className="space-y-2">
            <Label>Organization Name *</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g., Memorial Hospital"
            />
          </div>

          <div className="space-y-2">
            <Label>Profile Name (Display Name)</Label>
            <Input
              value={form.profile_name}
              onChange={(e) => setForm({ ...form, profile_name: e.target.value })}
              placeholder="e.g., Memorial Hospital CE Department"
            />
          </div>

          <div className="space-y-2">
            <Label>City, State</Label>
            <Input
              value={form.city_state}
              onChange={(e) => setForm({ ...form, city_state: e.target.value })}
              placeholder="e.g., Los Angeles, CA"
            />
          </div>

          <div className="space-y-2">
            <Label>Comment/Subtitle</Label>
            <Input
              value={form.comment}
              onChange={(e) => setForm({ ...form, comment: e.target.value })}
              placeholder="e.g., Education Department"
            />
          </div>

          <div className="space-y-2">
            <Label>Location</Label>
            <Input
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
              placeholder="e.g., Building A, Floor 3"
            />
          </div>

          <div className="space-y-2">
            <Label>Logo</Label>
            <div className="flex items-center gap-2">
              <input
                type="file"
                accept="image/*"
                onChange={handleLogoUpload}
                disabled={isUploading}
                className="flex-1 text-sm"
              />
            </div>
            {form.logo_url && (
              <div className="mt-2 relative w-32 h-32 bg-slate-100 rounded border flex items-center justify-center">
                <img src={form.logo_url} alt="Hospital logo" className="max-w-full max-h-full" />
              </div>
            )}
            {hospitalPhotos.length > 0 && (
              <div className="mt-3 space-y-1">
                <div className="text-xs font-medium text-slate-600">Photo Library</div>
                <div className="space-y-1 max-h-[150px] overflow-y-auto border rounded p-2 bg-slate-50">
                  {hospitalPhotos.map((photo) => (
                    <div key={photo.id} className="flex items-center justify-between gap-2 p-1.5 bg-white rounded border text-xs">
                      <span className="truncate">{photo.title}</span>
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 w-6 p-0"
                          onClick={() => {
                            setForm((prev) => ({ ...prev, logo_url: photo.url }));
                            toast.success("Logo selected");
                          }}
                          title="Use this logo"
                        >
                          ✓
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 w-6 p-0"
                          onClick={() => {
                            const urlToCopy = photo.url.replace(/^https:\/\/base44\.app\/api\/apps\/[^/]+\//, '');
                            navigator.clipboard.writeText(urlToCopy);
                            toast.success("URL copied");
                          }}
                          title="Copy URL"
                        >
                          📋
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {!selectedHospital && (
            <div className="space-y-2">
              <Label>Initial Year</Label>
              <Input
                type="number"
                value={form.year}
                onChange={(e) => setForm({ ...form, year: parseInt(e.target.value) || new Date().getFullYear() })}
                placeholder="e.g., 2026"
                min="2000"
                max="2100"
              />
            </div>
          )}

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
              className="h-4 w-4 rounded border-slate-300"
            />
            <Label>Active</Label>
          </div>

          {/* Years Section */}
          {selectedHospital && (
            <div className="pt-4 border-t space-y-3">
              <Label className="text-sm font-semibold flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Years
              </Label>
              <div className="space-y-2 max-h-[200px] overflow-y-auto">
                {getHospitalYears(selectedHospital.id).map((hy) => {
                  const counts = getYearCounts(selectedHospital.id, hy.year);
                  return (
                    <div key={hy.id} className="flex items-center justify-between p-2 bg-slate-50 rounded border">
                      <div>
                        <span className="font-medium">{hy.year}</span>
                        <span className="text-xs text-slate-500 ml-2">
                          {counts.classCount} classes • {counts.participantCount} participants
                        </span>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDeleteYear(hy.id)}
                      >
                        <X className="w-3 h-3 text-red-500" />
                      </Button>
                    </div>
                  );
                })}
                <div className="flex gap-2">
                  <Input
                    type="number"
                    placeholder="e.g., 2026"
                    value={newYear}
                    onChange={(e) => setNewYear(e.target.value)}
                    className="flex-1"
                  />
                  <Button
                    size="sm"
                    onClick={handleCreateYear}
                    disabled={createYearMutation.isPending}
                  >
                    <Plus className="w-3 h-3 mr-1" />
                    Add
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Feature Flags */}
          <div className="pt-4 border-t space-y-3">
            <Label className="text-sm font-semibold">Feature Flags</Label>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.feature_flags.name_management}
                  onChange={(e) => setFeatureFlag("name_management", e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300"
                />
                <Label className="font-normal">Name Management</Label>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.feature_flags.class_management}
                  onChange={(e) => setFeatureFlag("class_management", e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300"
                />
                <Label className="font-normal">Class Management</Label>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.feature_flags.records}
                  onChange={(e) => setFeatureFlag("records", e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300"
                />
                <Label className="font-normal">Records</Label>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.feature_flags.certificates}
                  onChange={(e) => setFeatureFlag("certificates", e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300"
                />
                <Label className="font-normal">Certificates</Label>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.feature_flags.transcripts}
                  onChange={(e) => setFeatureFlag("transcripts", e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300"
                />
                <Label className="font-normal">Transcripts</Label>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.feature_flags.expiration_report}
                  onChange={(e) => setFeatureFlag("expiration_report", e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300"
                />
                <Label className="font-normal">Expiration Report</Label>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.feature_flags.mailing_labels}
                  onChange={(e) => setFeatureFlag("mailing_labels", e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300"
                />
                <Label className="font-normal">Mailing Labels</Label>
              </div>
            </div>
          </div>

          <div className="flex gap-2 pt-4">
            <Button onClick={handleSave} disabled={createMutation.isPending || updateMutation.isPending}>
              {selectedHospital ? "Update" : "Create"} Organization
            </Button>
            {selectedHospital && (
              <Button onClick={resetForm} variant="outline">
                Cancel
              </Button>
            )}
          </div>
        </div>

        {/* Hospital List */}
        <div className="space-y-2">
          <Label className="text-sm font-semibold">Existing Organizations ({visibleHospitals.length})</Label>
          <Input
            placeholder="Search organizations..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="mb-2"
          />
          <div className="space-y-2 max-h-[75vh] overflow-y-auto pr-2">
            {visibleHospitals.map((h) => {
              const hospitalUsers = getHospitalUsers(h.id);
              return (
                <div
                  key={h.id}
                  className="p-3 border rounded-lg hover:bg-slate-50 transition"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="font-medium">{h.name}</div>
                      {h.profile_name && (
                        <div className="text-xs text-slate-500">{h.profile_name}</div>
                      )}
                      {h.city_state && (
                        <div className="text-xs text-slate-400">{h.city_state}</div>
                      )}
                      {h.is_active === false && (
                        <div className="text-xs text-red-500 mt-1">Inactive</div>
                      )}
                    </div>
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleEdit(h)}
                      >
                        <Edit className="w-3 h-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDelete(h)}
                      >
                        <Trash2 className="w-3 h-3 text-red-500" />
                      </Button>
                    </div>
                  </div>
                  {hospitalUsers.length > 0 && (
                    <div className="pt-2 border-t border-slate-100">
                      <div className="text-xs font-medium text-slate-600 mb-1">
                        Users with Access ({hospitalUsers.length})
                      </div>
                      <div className="space-y-1">
                        {hospitalUsers.map((assignment) => (
                          <div
                            key={assignment.id}
                            className="text-xs text-slate-500 flex items-center gap-2"
                          >
                            <span className="font-mono">{assignment.user_email}</span>
                            <span className="px-1.5 py-0.5 bg-indigo-100 text-indigo-700 rounded text-[10px]">
                              {assignment.role}
                            </span>
                            {assignment.years && assignment.years.length > 0 && (
                              <span className="text-slate-400">
                                ({assignment.years.join(", ")})
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}