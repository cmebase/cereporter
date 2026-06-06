import React, { useEffect, useMemo, useState } from "react";
import EditWindow from "@/components/common/EditWindow";
import TitleForm from "../forms/TitleForm";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export default function TitleEditWindow({ initialTitle, open, onClose }) {
  const queryClient = useQueryClient();
  const [titleData, setTitleData] = useState(
    initialTitle || { name: "", abbreviation: "", description: "", is_active: true }
  );

  useEffect(() => {
    if (initialTitle) setTitleData(initialTitle);
  }, [initialTitle]);

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      if (data.id) return base44.entities.Title.update(data.id, data);
      return base44.entities.Title.create(data);
    },
    onSuccess: async () => {
      toast.success("Saved");
      await queryClient.invalidateQueries({ queryKey: ["titles"] });
      onClose();
    },
    onError: () => toast.error("Save failed"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => base44.entities.Title.delete(id),
    onSuccess: async () => {
      toast.success("Deleted");
      await queryClient.invalidateQueries({ queryKey: ["titles"] });
      onClose();
    },
    onError: () => toast.error("Delete failed"),
  });

  const saveDisabled = useMemo(() => !titleData?.name?.trim(), [titleData]);

  return (
    <EditWindow
      open={open}
      title={titleData?.id ? "Edit Title" : "New Title"}
      storageKey="edit_title"
      onClose={onClose}
      onSave={() => saveMutation.mutate(titleData)}
      onDelete={titleData?.id ? () => deleteMutation.mutate(titleData.id) : null}
      saving={saveMutation.isPending || deleteMutation.isPending}
      saveDisabled={saveDisabled}
      defaultWidth={720}
      defaultHeight={520}
    >
      <TitleForm value={titleData} onChange={setTitleData} />
    </EditWindow>
  );
}