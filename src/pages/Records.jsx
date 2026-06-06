import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { FileText, Filter, FilterX, Download, Plus, Printer } from "lucide-react";
import PageHeader from "../components/management/PageHeader";
import ManagementTable from "../components/management/ManagementTable";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import RecordModal from "../components/records/RecordModal";
import TranscriptPrintModal from "../components/management/TranscriptPrintModal";
import { format } from "date-fns";

export default function Records() {
  const queryClient = useQueryClient();
  const [context, setContext] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [formData, setFormData] = useState({});
  const [transcriptModalOpen, setTranscriptModalOpen] = useState(false);

  useEffect(() => {
    const stored = sessionStorage.getItem('ce_context');
    if (stored) {
      setContext(JSON.parse(stored));
    }
  }, []);

  const { data: records, isLoading } = useQuery({
    queryKey: ['ceRecords'],
    queryFn: async () => {
      if (!context) return [];
      const all = await base44.entities.CERecord.list();
      return all.filter(r => r.year === context.year && r.hospital === context.hospital_name);
    },
    enabled: !!context,
    refetchInterval: 3000, // Auto-refresh every 3 seconds
  });

  const { data: participants } = useQuery({
    queryKey: ['participants'],
    queryFn: () => base44.entities.Participant.list(),
  });

  const { data: classes } = useQuery({
    queryKey: ['ceClasses'],
    queryFn: () => base44.entities.CEClass.list(),
  });

  const { data: hospitals } = useQuery({
    queryKey: ['hospitals'],
    queryFn: () => base44.entities.Hospital.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.CERecord.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ceRecords'] });
      toast.success('Record created');
      handleCloseModal();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.CERecord.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ceRecords'] });
      toast.success('Record updated');
      handleCloseModal();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.CERecord.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ceRecords'] });
      toast.success('Record deleted');
    },
  });

  const filteredRecords = records?.filter(r => {
    if (statusFilter === 'all') return true;
    return r.status === statusFilter;
  });

  const statusColors = {
    completed: "bg-emerald-100 text-emerald-700 border-emerald-200",
    pending: "bg-amber-100 text-amber-700 border-amber-200",
    cancelled: "bg-red-100 text-red-700 border-red-200",
  };

  const columns = [
    { key: 'participant_name', label: 'Participant' },
    { key: 'class_title', label: 'Class' },
    { 
      key: 'date', 
      label: 'Date',
      render: (val) => val ? format(new Date(val), 'MMM d, yyyy') : '-'
    },
    { key: 'credit_type', label: 'Credit Type' },
    { key: 'credit_hours', label: 'Hours' },
    { 
      key: 'status', 
      label: 'Status',
      render: (val) => (
        <Badge variant="outline" className={statusColors[val] || statusColors.completed}>
          {val || 'completed'}
        </Badge>
      )
    },
  ];

  const handleCreate = () => {
    setEditingRecord(null);
    setFormData({ 
      year: context?.year,
      hospital: context?.hospital_name,
      status: 'completed',
      date: new Date().toISOString().split('T')[0]
    });
    setModalOpen(true);
  };

  const handleEdit = (item) => {
    setEditingRecord(item);
    setFormData(item);
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setEditingRecord(null);
    setFormData({});
  };

  const handleSave = () => {
    if (editingRecord) {
      updateMutation.mutate({ id: editingRecord.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleClearFilters = () => {
    setStatusFilter('all');
  };

  const pageTitle = context 
    ? `${context.hospital_name} - ${context.year}` 
    : 'CE Records';

  return (
    <div>
      <PageHeader
        title={pageTitle}
        description="View and manage continuing education records"
        icon={FileText}
      />

      {/* Filters Bar */}
      <div className="flex items-center justify-between gap-4 mb-6 bg-white rounded-xl border border-slate-200 p-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-slate-600">Status:</span>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-32 h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {statusFilter !== 'all' && (
            <Button variant="ghost" size="sm" onClick={handleClearFilters} className="text-slate-500">
              <FilterX className="w-4 h-4 mr-1" />
              Clear
            </Button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setTranscriptModalOpen(true)}
          >
            <Printer className="w-4 h-4 mr-2" />
            Print Transcripts
          </Button>
          <Badge variant="outline" className="text-slate-600">
            {filteredRecords?.length || 0} records
          </Badge>
        </div>
      </div>
      
      <ManagementTable
        data={filteredRecords || []}
        columns={columns}
        onEdit={handleEdit}
        onDelete={(id) => deleteMutation.mutate(id)}
        onCreate={handleCreate}
        isLoading={isLoading}
        searchPlaceholder="Search records..."
      />

      <RecordModal
        open={modalOpen}
        onClose={handleCloseModal}
        data={formData}
        onChange={(key, value) => setFormData(prev => ({ ...prev, [key]: value }))}
        onSave={handleSave}
        isLoading={createMutation.isPending || updateMutation.isPending}
        participants={participants || []}
        classes={classes || []}
        isEditing={!!editingRecord}
      />

      <TranscriptPrintModal
        open={transcriptModalOpen}
        onClose={() => setTranscriptModalOpen(false)}
        onPrinted={() => setTranscriptModalOpen(false)}
      />
    </div>
  );
}