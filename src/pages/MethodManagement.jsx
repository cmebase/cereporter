import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Monitor } from "lucide-react";
import PageHeader from "../components/management/PageHeader";
import ManagementTable from "../components/management/ManagementTable";
import FloatingManagementModal from "../components/management/FloatingManagementModal";
import { toast } from "sonner";

export default function MethodManagement() {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({});

  const { data: methods, isLoading } = useQuery({
    queryKey: ['methods'],
    queryFn: () => base44.entities.Method.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Method.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['methods'] });
      toast.success('Method created');
      handleCloseModal();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Method.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['methods'] });
      toast.success('Method updated');
      handleCloseModal();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Method.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['methods'] });
      toast.success('Method deleted');
    },
  });

  const columns = [
    { key: 'name', label: 'Name' },
    { key: 'code', label: 'Code' },
    { key: 'description', label: 'Description' },
    { key: 'is_active', label: 'Status' },
  ];

  const fields = [
    { key: 'name', label: 'Method Name', required: true, placeholder: 'e.g., Live Lecture' },
    { key: 'code', label: 'Code', required: true, placeholder: 'e.g., LIVE' },
    { key: 'description', label: 'Description', type: 'textarea', placeholder: 'Description of this delivery method' },
    { key: 'is_active', label: 'Status', type: 'switch' },
  ];

  const handleCreate = () => {
    setEditingItem(null);
    setFormData({ is_active: true });
    setModalOpen(true);
  };

  const handleEdit = (item) => {
    setEditingItem(item);
    setFormData(item);
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setEditingItem(null);
    setFormData({});
  };

  const handleSave = () => {
    if (editingItem) {
      updateMutation.mutate({ id: editingItem.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleFieldChange = (key, value) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div>
      <PageHeader
        title="Method Management"
        description="Manage delivery methods for CE activities"
        icon={Monitor}
      />
      
      <ManagementTable
        data={methods || []}
        columns={columns}
        onEdit={handleEdit}
        onDelete={(id) => deleteMutation.mutate(id)}
        onCreate={handleCreate}
        isLoading={isLoading}
        searchPlaceholder="Search methods..."
      />

      <FloatingManagementModal
        open={modalOpen}
        onClose={handleCloseModal}
        title={editingItem ? 'Edit Method' : 'Add Method'}
        fields={fields}
        data={formData}
        onChange={handleFieldChange}
        onSave={handleSave}
        isLoading={createMutation.isPending || updateMutation.isPending}
      />
    </div>
  );
}