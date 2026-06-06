import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Stethoscope } from "lucide-react";
import PageHeader from "../components/management/PageHeader";
import ManagementTable from "../components/management/ManagementTable";
import FloatingManagementModal from "../components/management/FloatingManagementModal";
import { toast } from "sonner";

export default function SpecialtyManagement() {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({});

  const { data: specialties, isLoading } = useQuery({
    queryKey: ['specialties'],
    queryFn: () => base44.entities.Specialty.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Specialty.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['specialties'] });
      toast.success('Specialty created');
      handleCloseModal();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Specialty.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['specialties'] });
      toast.success('Specialty updated');
      handleCloseModal();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Specialty.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['specialties'] });
      toast.success('Specialty deleted');
    },
  });

  const columns = [
    { key: 'name', label: 'Specialty Name' },
    { key: 'code', label: 'Code' },
    { key: 'description', label: 'Description' },
    { key: 'is_active', label: 'Status' },
  ];

  const fields = [
    { key: 'name', label: 'Specialty Name', required: true, placeholder: 'e.g., Cardiology' },
    { key: 'code', label: 'Code', placeholder: 'e.g., CARD' },
    { key: 'description', label: 'Description', type: 'textarea', placeholder: 'Description of this specialty' },
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
        title="Specialty Management"
        description="Manage medical specialties"
        icon={Stethoscope}
      />
      
      <ManagementTable
        data={specialties || []}
        columns={columns}
        onEdit={handleEdit}
        onDelete={(id) => deleteMutation.mutate(id)}
        onCreate={handleCreate}
        isLoading={isLoading}
        searchPlaceholder="Search specialties..."
      />

      <FloatingManagementModal
        open={modalOpen}
        onClose={handleCloseModal}
        title={editingItem ? 'Edit Specialty' : 'Add Specialty'}
        fields={fields}
        data={formData}
        onChange={handleFieldChange}
        onSave={handleSave}
        isLoading={createMutation.isPending || updateMutation.isPending}
      />
    </div>
  );
}