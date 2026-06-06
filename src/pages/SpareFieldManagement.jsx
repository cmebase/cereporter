import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Grid3X3 } from "lucide-react";
import PageHeader from "../components/management/PageHeader";
import ManagementTable from "../components/management/ManagementTable";
import ManagementModal from "../components/management/ManagementModal";
import { toast } from "sonner";

export default function SpareFieldManagement() {
  const urlParams = new URLSearchParams(window.location.search);
  const fieldNumber = parseInt(urlParams.get('field')) || 1;
  
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({});

  const { data: spareFields, isLoading } = useQuery({
    queryKey: ['spareFields', fieldNumber],
    queryFn: async () => {
      const all = await base44.entities.SpareField.list();
      return all.filter(f => f.field_number === fieldNumber);
    },
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.SpareField.create({ ...data, field_number: fieldNumber }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['spareFields', fieldNumber] });
      toast.success('Spare field value created');
      handleCloseModal();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.SpareField.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['spareFields', fieldNumber] });
      toast.success('Spare field value updated');
      handleCloseModal();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.SpareField.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['spareFields', fieldNumber] });
      toast.success('Spare field value deleted');
    },
  });

  const columns = [
    { key: 'label', label: 'Label' },
    { key: 'value', label: 'Value' },
    { key: 'is_active', label: 'Status' },
  ];

  const fields = [
    { key: 'label', label: 'Label', required: true, placeholder: 'Field label' },
    { key: 'value', label: 'Value', placeholder: 'Field value' },
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
        title={`Spare Field ${fieldNumber} Management`}
        description="Manage custom configurable field values"
        icon={Grid3X3}
      />
      
      <ManagementTable
        data={spareFields || []}
        columns={columns}
        onEdit={handleEdit}
        onDelete={(id) => deleteMutation.mutate(id)}
        onCreate={handleCreate}
        isLoading={isLoading}
        searchPlaceholder="Search values..."
      />

      <ManagementModal
        open={modalOpen}
        onClose={handleCloseModal}
        title={editingItem ? 'Edit Spare Field Value' : 'Add Spare Field Value'}
        fields={fields}
        data={formData}
        onChange={handleFieldChange}
        onSave={handleSave}
        isLoading={createMutation.isPending || updateMutation.isPending}
      />
    </div>
  );
}