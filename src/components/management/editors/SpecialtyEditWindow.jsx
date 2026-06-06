import React, { useEffect, useMemo, useState } from "react";
import EditWindow from "@/components/common/EditWindow";
import SpecialtyForm from "../forms/SpecialtyForm";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export default function SpecialtyEditWindow({ initialSpecialty, open, onClose }) {
  const queryClient = useQueryClient();
  const [specialtyData, setSpecialtyData] = useState(
    initialSpecialty || { name: "", code: "", description: "", is_active: true }
  );

  useEffect(() => {
    if (initialSpecialty) setSpecialtyData(initialSpecialty);
  }, [initialSpecialty]);

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      if (data.id) return base44.entities.Specialty.update(data.id, data);
      return base44.entities.Specialty.create(data);
    },
    onSuccess: async () => {
      toast.success("Saved");
      await queryClient.invalidateQueries({ queryKey: ["specialties"] });
      onClose();
    },
    onError: () => toast.error("Save failed"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => base44.entities.Specialty.delete(id),
    onSuccess: async () => {
      toast.success("Deleted");
      await queryClient.invalidateQueries({ queryKey: ["specialties"] });
      onClose();
    },
    onError: () => toast.error("Delete failed"),
  });

  const saveDisabled = useMemo(() => !specialtyData?.name?.trim(), [specialtyData]);

  return (
    <EditWindow
      open={open}
      title={specialtyData?.id ? "Edit Specialty" : "New Specialty"}
      storageKey="edit_specialty"
      onClose={onClose}
      onSave={() => saveMutation.mutate(specialtyData)}
      onDelete={specialtyData?.id ? () => deleteMutation.mutate(specialtyData.id) : null}
      saving={saveMutation.isPending || deleteMutation.isPending}
      saveDisabled={saveDisabled}
      defaultWidth={720}
      defaultHeight={520}
    >
      <SpecialtyForm value={specialtyData} onChange={setSpecialtyData} />
    </EditWindow>
  );
}