import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import PageHeader from "../components/management/PageHeader";
import ManagementTable from "../components/management/ManagementTable";
import FloatingManagementModal from "../components/management/FloatingManagementModal";
import { Zap } from "lucide-react";

export default function StatusManagement() {
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({});
  const queryClient = useQueryClient();

  const { data: statuses = [], isLoading } = useQuery({
    queryKey: ["statuses"],
    queryFn: () => base44.entities.Status.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Status.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["statuses"] });
      setShowModal(false);
      setFormData({});
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data) => base44.entities.Status.update(editingItem.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["statuses"] });
      setShowModal(false);
      setFormData({});
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Status.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["statuses"] });
    },
  });

  const columns = [
    { key: "name", label: "Name" },
    { key: "code", label: "Code" },
    { key: "description", label: "Description" },
    { key: "is_active", label: "Active", type: "boolean" },
  ];

  const fields = [
    { key: "name", label: "Name", type: "text", required: true },
    { key: "code", label: "Code", type: "text" },
    { key: "description", label: "Description", type: "textarea" },
    { key: "is_active", label: "Active", type: "switch", defaultValue: true },
  ];

  const handleOpenModal = (item = null) => {
    if (item) {
      setEditingItem(item);
      setFormData(item);
    } else {
      setEditingItem(null);
      setFormData({ is_active: true });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingItem(null);
    setFormData({});
  };

  const handleSave = () => {
    if (editingItem) {
      updateMutation.mutate(formData);
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleFieldChange = (name, value) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Status Management"
        description="Manage participant status types"
        icon={Zap}
      />

      <ManagementTable
        data={statuses}
        columns={columns}
        isLoading={isLoading}
        onEdit={handleOpenModal}
        onDelete={(item) => deleteMutation.mutate(item.id)}
        onCreate={() => handleOpenModal()}
      />

      <FloatingManagementModal
        open={showModal}
        title={editingItem ? "Edit Status" : "New Status"}
        fields={fields}
        data={formData}
        onChange={handleFieldChange}
        onSave={handleSave}
        onClose={handleCloseModal}
        onDelete={(id) => deleteMutation.mutate(id)}
        isLoading={createMutation.isPending || updateMutation.isPending}
      />
    </div>
  );
}