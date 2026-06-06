import React, { useEffect, useMemo, useState } from "react";
import EditWindow from "@/components/common/EditWindow";
import SpareForm from "../forms/SpareForm";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export default function SpareEditWindow({ initialSpare, open, onClose }) {
  const queryClient = useQueryClient();
  const [spareData, setSpareData] = useState(
    initialSpare || { field_number: 1, label: "", value: "", is_active: true }
  );

  useEffect(() => {
    if (initialSpare) setSpareData(initialSpare);
  }, [initialSpare]);

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      if (data.id) return base44.entities.SpareField.update(data.id, data);
      return base44.entities.SpareField.create(data);
    },
    onSuccess: async () => {
      toast.success("Saved");
      await queryClient.invalidateQueries({ queryKey: ["spareFields"] });
      onClose();
    },
    onError: () => toast.error("Save failed"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => base44.entities.SpareField.delete(id),
    onSuccess: async () => {
      toast.success("Deleted");
      await queryClient.invalidateQueries({ queryKey: ["spareFields"] });
      onClose();
    },
    onError: () => toast.error("Delete failed"),
  });

  const saveDisabled = useMemo(() => !spareData?.label?.trim(), [spareData]);

  return (
    <EditWindow
      open={open}
      title={spareData?.id ? "Edit Spare Field" : "New Spare Field"}
      storageKey="edit_spare"
      onClose={onClose}
      onSave={() => saveMutation.mutate(spareData)}
      onDelete={spareData?.id ? () => deleteMutation.mutate(spareData.id) : null}
      saving={saveMutation.isPending || deleteMutation.isPending}
      saveDisabled={saveDisabled}
      defaultWidth={720}
      defaultHeight={520}
    >
      <SpareForm value={spareData} onChange={setSpareData} />
    </EditWindow>
  );
}