import React, { useEffect, useMemo, useState } from "react";
import EditWindow from "@/components/common/EditWindow";
import StatusForm from "../forms/StatusForm";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export default function StatusEditWindow({ initialStatus, open, onClose }) {
  const queryClient = useQueryClient();
  const [statusData, setStatusData] = useState(
    initialStatus || { name: "", code: "", description: "", is_active: true }
  );

  useEffect(() => {
    if (initialStatus) setStatusData(initialStatus);
  }, [initialStatus]);

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      if (data.id) return base44.entities.Status.update(data.id, data);
      return base44.entities.Status.create(data);
    },
    onSuccess: async () => {
      toast.success("Saved");
      await queryClient.invalidateQueries({ queryKey: ["statuses"] });
      onClose();
    },
    onError: () => toast.error("Save failed"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => base44.entities.Status.delete(id),
    onSuccess: async () => {
      toast.success("Deleted");
      await queryClient.invalidateQueries({ queryKey: ["statuses"] });
      onClose();
    },
    onError: () => toast.error("Delete failed"),
  });

  const saveDisabled = useMemo(() => !statusData?.name?.trim(), [statusData]);

  return (
    <EditWindow
      open={open}
      title={statusData?.id ? "Edit Status" : "New Status"}
      storageKey="edit_status"
      onClose={onClose}
      onSave={() => saveMutation.mutate(statusData)}
      onDelete={statusData?.id ? () => deleteMutation.mutate(statusData.id) : null}
      saving={saveMutation.isPending || deleteMutation.isPending}
      saveDisabled={saveDisabled}
      defaultWidth={720}
      defaultHeight={520}
    >
      <StatusForm value={statusData} onChange={setStatusData} />
    </EditWindow>
  );
}