import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Users } from "lucide-react";
import PageHeader from "../components/management/PageHeader";
import ManagementTable from "../components/management/ManagementTable";
import ManagementModal from "../components/management/ManagementModal";
import { toast } from "sonner";

export default function ParticipantManagement() {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({});

  const { data: participants, isLoading } = useQuery({
    queryKey: ['participants'],
    queryFn: () => base44.entities.Participant.list(),
  });

  const { data: titles } = useQuery({
    queryKey: ['titles'],
    queryFn: () => base44.entities.Title.list(),
  });

  const { data: specialties } = useQuery({
    queryKey: ['specialties'],
    queryFn: () => base44.entities.Specialty.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Participant.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['participants'] });
      toast.success('Participant created');
      handleCloseModal();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Participant.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['participants'] });
      toast.success('Participant updated');
      handleCloseModal();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Participant.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['participants'] });
      toast.success('Participant deleted');
    },
  });

  const columns = [
    { key: 'first_name', label: 'First Name' },
    { key: 'last_name', label: 'Last Name' },
    { key: 'title', label: 'Title' },
    { key: 'specialty', label: 'Specialty' },
    { key: 'email', label: 'Email' },
    { key: 'is_active', label: 'Status' },
  ];

  const fields = [
    { key: 'first_name', label: 'First Name', type: 'text', required: true },
    { key: 'last_name', label: 'Last Name', type: 'text', required: true },
    { key: 'title', label: 'Title', type: 'select', options: titles?.filter(t => t.is_active !== false).map(t => t.name) || [] },
    { key: 'specialty', label: 'Specialty', type: 'select', options: specialties?.filter(s => s.is_active !== false).map(s => s.name) || [] },
    { key: 'email', label: 'Email', type: 'email' },
    { key: 'employee_id', label: 'Employee ID', type: 'text' },
    { key: 'department', label: 'Department', type: 'text' },
    { key: 'is_active', label: 'Active', type: 'switch' },
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
        title="Participant Management"
        description="Manage participants and their information"
        icon={Users}
      />
      
      <ManagementTable
        data={participants || []}
        columns={columns}
        onEdit={handleEdit}
        onDelete={(id) => deleteMutation.mutate(id)}
        onCreate={handleCreate}
        isLoading={isLoading}
        searchPlaceholder="Search participants..."
      />

      <ManagementModal
        open={modalOpen}
        onClose={handleCloseModal}
        title={editingItem ? 'Edit Participant' : 'Add Participant'}
        fields={fields}
        data={formData}
        onChange={handleFieldChange}
        onSave={handleSave}
        isLoading={createMutation.isPending || updateMutation.isPending}
      />
    </div>
  );
}