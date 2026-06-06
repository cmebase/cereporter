import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Handshake } from "lucide-react";
import PageHeader from "../components/management/PageHeader";
import ManagementTable from "../components/management/ManagementTable";
import FloatingManagementModal from "../components/management/FloatingManagementModal";
import { toast } from "sonner";

export default function JointSponsorManagement() {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({});

  const { data: sponsors, isLoading } = useQuery({
    queryKey: ['jointSponsors'],
    queryFn: () => base44.entities.JointSponsor.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.JointSponsor.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jointSponsors'] });
      toast.success('Joint sponsor created');
      handleCloseModal();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.JointSponsor.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jointSponsors'] });
      toast.success('Joint sponsor updated');
      handleCloseModal();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.JointSponsor.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jointSponsors'] });
      toast.success('Joint sponsor deleted');
    },
  });

  const columns = [
    { key: 'name', label: 'Organization Name' },
    { key: 'contact_name', label: 'Contact' },
    { key: 'email', label: 'Email' },
    { key: 'is_active', label: 'Status' },
  ];

  const fields = [
    { key: 'name', label: 'Organization Name', required: true, placeholder: 'Joint sponsor organization' },
    { key: 'contact_name', label: 'Contact Name', placeholder: 'Primary contact name' },
    { key: 'email', label: 'Email', type: 'email', placeholder: 'contact@organization.com' },
    { key: 'phone', label: 'Phone', placeholder: '(555) 123-4567' },
    { key: 'address', label: 'Address', type: 'textarea', placeholder: 'Full address' },
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
        title="Joint Sponsor Management"
        description="Manage joint provider organizations"
        icon={Handshake}
      />
      
      <ManagementTable
        data={sponsors || []}
        columns={columns}
        onEdit={handleEdit}
        onDelete={(id) => deleteMutation.mutate(id)}
        onCreate={handleCreate}
        isLoading={isLoading}
        searchPlaceholder="Search sponsors..."
      />

      <FloatingManagementModal
        open={modalOpen}
        onClose={handleCloseModal}
        title={editingItem ? 'Edit Joint Sponsor' : 'Add Joint Sponsor'}
        fields={fields}
        data={formData}
        onChange={handleFieldChange}
        onSave={handleSave}
        isLoading={createMutation.isPending || updateMutation.isPending}
      />
    </div>
  );
}