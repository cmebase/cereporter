import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Award } from "lucide-react";
import PageHeader from "../components/management/PageHeader";
import ManagementTable from "../components/management/ManagementTable";
import FloatingManagementModal from "../components/management/FloatingManagementModal";
import { toast } from "sonner";

export default function TitleManagement() {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({});

  const { data: titles, isLoading } = useQuery({
    queryKey: ['titles'],
    queryFn: () => base44.entities.Title.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Title.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['titles'] });
      toast.success('Title created');
      handleCloseModal();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Title.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['titles'] });
      toast.success('Title updated');
      handleCloseModal();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Title.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['titles'] });
      toast.success('Title deleted');
    },
  });

  const columns = [
    { key: 'name', label: 'Title Name' },
    { key: 'abbreviation', label: 'Abbreviation' },
    { key: 'is_active', label: 'Status' },
  ];

  const fields = [
    { key: 'name', label: 'Title Name', required: true, placeholder: 'e.g., Medical Doctor' },
    { key: 'abbreviation', label: 'Abbreviation', placeholder: 'e.g., MD' },
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
        title="Title Management"
        description="Manage professional titles and designations"
        icon={Award}
      />
      
      <ManagementTable
        data={titles || []}
        columns={columns}
        onEdit={handleEdit}
        onDelete={(id) => deleteMutation.mutate(id)}
        onCreate={handleCreate}
        isLoading={isLoading}
        searchPlaceholder="Search titles..."
      />

      <FloatingManagementModal
        open={modalOpen}
        onClose={handleCloseModal}
        title={editingItem ? 'Edit Title' : 'Add Title'}
        fields={fields}
        data={formData}
        onChange={handleFieldChange}
        onSave={handleSave}
        isLoading={createMutation.isPending || updateMutation.isPending}
      />
    </div>
  );
}