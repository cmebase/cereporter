import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Archive, Edit2, Plus, FileText } from 'lucide-react';
import TemplateEditor from './TemplateEditor';

export default function CertificateTemplateList({ hospital_id }) {
  const queryClient = useQueryClient();
  const [selectedType, setSelectedType] = useState('physician');
  const [editingTemplate, setEditingTemplate] = useState(null);

  const { data: templates = [] } = useQuery({
    queryKey: ['certificateTemplates', hospital_id],
    queryFn: async () => {
      const all = await base44.entities.CertificateTemplate.list();
      return all.filter(t => t.hospital_id === hospital_id).sort((a, b) => b.version - a.version);
    }
  });

  const filteredTemplates = templates.filter(t => t.template_type === selectedType);

  const setDefaultMutation = useMutation({
    mutationFn: async (templateId) => {
      // Find the template
      const template = templates.find(t => t.id === templateId);
      
      // Unset all other defaults of same type
      const samType = templates.filter(t => t.template_type === template.template_type && t.is_default);
      for (const t of samType) {
        await base44.entities.CertificateTemplate.update(t.id, { is_default: false });
      }
      
      // Set this one as default
      return base44.entities.CertificateTemplate.update(templateId, { is_default: true });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['certificateTemplates', hospital_id] });
      toast.success('Default template updated');
    }
  });

  const archiveMutation = useMutation({
    mutationFn: async (templateId) => {
      return base44.entities.CertificateTemplate.update(templateId, { status: 'archived' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['certificateTemplates', hospital_id] });
      toast.success('Template archived');
    }
  });

  return (
    <>
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Certificate Templates
          </h2>
        <Dialog>
          <DialogTrigger asChild>
            <Button className="bg-indigo-600">
              <Plus className="w-4 h-4 mr-2" />
              New Template
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Template</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-sm text-slate-600">Feature coming soon: Template editor with visual layout builder</p>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Type Tabs */}
      <div className="flex gap-2 mb-6 border-b">
        {['physician', 'other'].map(type => (
          <button
            key={type}
            onClick={() => setSelectedType(type)}
            className={`px-4 py-2 font-medium text-sm transition ${
              selectedType === type
                ? 'border-b-2 border-indigo-600 text-indigo-600'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {type === 'physician' ? 'Physician' : 'Other Professional'}
          </button>
        ))}
      </div>

      {/* Templates List */}
      {filteredTemplates.length === 0 ? (
        <div className="text-center py-8 text-slate-500">
          No templates found. Create one to get started.
        </div>
      ) : (
        <div className="space-y-3">
          {filteredTemplates.map(template => (
            <div key={template.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-slate-50">
              <div>
                <div className="font-medium">{template.name}</div>
                <div className="text-sm text-slate-500">
                  v{template.version} • {template.status}
                  {template.is_default && <Badge className="ml-2 bg-green-100 text-green-800">Default</Badge>}
                </div>
              </div>
              <div className="flex gap-2">
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => setEditingTemplate(template)}
                >
                  <Edit2 className="w-3 h-3" />
                </Button>
                {!template.is_default && (
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => setDefaultMutation.mutate(template.id)}
                  >
                    Set Default
                  </Button>
                )}
                {template.status !== 'archived' && (
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => archiveMutation.mutate(template.id)}
                  >
                    <Archive className="w-3 h-3" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      </Card>

      {/* Template Editor Modal */}
      <TemplateEditor 
        template={editingTemplate} 
        open={!!editingTemplate} 
        onOpenChange={(open) => !open && setEditingTemplate(null)}
        hospital_id={hospital_id}
      />
    </>
  );
}