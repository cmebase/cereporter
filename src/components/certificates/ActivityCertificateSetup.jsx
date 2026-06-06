import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { FileText, Eye, Settings, Upload } from 'lucide-react';
import StatementLibrary from './StatementLibrary';
import TemplateEditor from './TemplateEditor';
import CertificatePreviewRender from './CertificatePreviewRender';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export default function ActivityCertificateSetup({ activityId, hospital_id }) {
  const queryClient = useQueryClient();
  
  const [formData, setFormData] = useState({
    activity_id: activityId,
    hospital_id,
    physician_template_id: '',
    other_template_id: '',
    accreditation_statement: '',
    credit_designation_statement: '',
    client_name: '',
    issue_date_rule: 'activity_date',
    manual_issue_date: '',
    background_image_url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6967f27ce8cf4aad99353f66/20244a0e1__CertificatePhysician.jpg'
  });

  const [uploading, setUploading] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showDebug, setShowDebug] = useState(false);
  const [showCertPreview, setShowCertPreview] = useState(false);

  const [editingTemplate, setEditingTemplate] = useState(null);

  // Fetch existing config
  const { data: existingConfig } = useQuery({
    queryKey: ['activityCertificateConfig', activityId],
    queryFn: async () => {
      const configs = await base44.entities.ActivityCertificateConfig.list();
      return configs.find(c => c.activity_id === activityId);
    }
  });

  // Fetch templates
  const { data: templates = [] } = useQuery({
    queryKey: ['certificateTemplates', hospital_id],
    queryFn: async () => {
      const all = await base44.entities.CertificateTemplate.list();
      return all.filter(t => t.hospital_id === hospital_id && t.status !== 'archived');
    }
  });

  const physicianTemplates = templates.filter(t => t.template_type === 'physician');
  const otherTemplates = templates.filter(t => t.template_type === 'other');

  // Fetch statements to auto-populate "Main" on first load
  const { data: accreditationStatements = [] } = useQuery({
    queryKey: ['statements', hospital_id, 'accreditation'],
    queryFn: async () => {
      if (!hospital_id) return [];
      const all = await base44.entities.CertificateStatement.list();
      return all.filter(s => s.hospital_id === hospital_id && s.statement_type === 'accreditation');
    },
    enabled: !!hospital_id
  });

  const { data: creditStatements = [] } = useQuery({
    queryKey: ['statements', hospital_id, 'credit_designation'],
    queryFn: async () => {
      if (!hospital_id) return [];
      const all = await base44.entities.CertificateStatement.list();
      return all.filter(s => s.hospital_id === hospital_id && s.statement_type === 'credit_designation');
    },
    enabled: !!hospital_id
  });

  const { data: photos = [] } = useQuery({
    queryKey: ["photos"],
    queryFn: () => base44.entities.Photo.list(),
  });

  // Load existing data or populate with defaults
  React.useEffect(() => {
    if (existingConfig) {
      setFormData(prev => ({
        ...prev,
        ...existingConfig
      }));
    } else {
      // Auto-populate "Main" statements on first load
      const mainAccreditation = accreditationStatements.find(s => s.name === 'Main');
      const mainCredit = creditStatements.find(s => s.name === 'Main');
      if (mainAccreditation || mainCredit) {
        setFormData(prev => ({
          ...prev,
          accreditation_statement: mainAccreditation?.text || prev.accreditation_statement,
          credit_designation_statement: mainCredit?.text || prev.credit_designation_statement
        }));
      }
    }
  }, [existingConfig, accreditationStatements, creditStatements]);

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async (data) => {
      if (existingConfig?.id) {
        return base44.entities.ActivityCertificateConfig.update(existingConfig.id, data);
      } else {
        return base44.entities.ActivityCertificateConfig.create(data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activityCertificateConfig', activityId] });
      toast.success('Certificate setup saved');
    },
    onError: () => toast.error('Failed to save certificate setup')
  });

  // Create default templates mutation
  const createTemplatesMutation = useMutation({
    mutationFn: async () => {
      const result = await base44.functions.invoke('createDefaultTemplates', { hospital_id });
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['certificateTemplates', hospital_id] });
      toast.success('Default templates created');
    },
    onError: (err) => toast.error(err.message || 'Failed to create templates')
  });

  const handleSave = () => {
    if (!formData.accreditation_statement.trim()) {
      toast.error('Accreditation statement is required');
      return;
    }
    saveMutation.mutate(formData, {
      onSuccess: () => {
        setShowCertPreview(true);
      }
    });
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size must be under 5MB');
      return;
    }

    setUploading(true);
    try {
      const result = await base44.integrations.Core.UploadFile({ file });
      const publicUrl = result.file_url;
      
      if (!publicUrl) {
        throw new Error('No URL returned from upload');
      }
      
      setFormData(prev => ({ ...prev, background_image_url: publicUrl }));
      toast.success('Background image uploaded');
    } catch (error) {
      console.error('Upload error:', error);
      toast.error(error.message || 'Failed to upload file');
    } finally {
      setUploading(false);
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Certificate Configuration
          </CardTitle>
          <CardDescription>Set up templates and statements for this activity's certificates</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
        {/* Issue Date Rule */}
        <div className="space-y-3">
          <Label className="font-semibold">Issue Date</Label>
          <Select value={formData.issue_date_rule} onValueChange={(v) => setFormData(prev => ({ ...prev, issue_date_rule: v }))}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="activity_date">Activity Date</SelectItem>
              <SelectItem value="completion_date">Completion Date</SelectItem>
              <SelectItem value="manual">Manual Date</SelectItem>
            </SelectContent>
          </Select>
          
          {formData.issue_date_rule === 'manual' && (
            <Input 
              type="date" 
              value={formData.manual_issue_date}
              onChange={(e) => setFormData(prev => ({ ...prev, manual_issue_date: e.target.value }))}
            />
          )}
        </div>

        {/* Client Name */}
        <div className="space-y-3">
          <Label className="font-semibold">Client/Organization Name (optional)</Label>
          <Input 
            placeholder="e.g., Hospital Name, Organization"
            value={formData.client_name}
            onChange={(e) => setFormData(prev => ({ ...prev, client_name: e.target.value }))}
          />
        </div>

        {/* Background Image */}
        <div className="space-y-3">
          <Label className="font-semibold">Certificate Background</Label>
          
          {/* URL Input or Photo Library Selector */}
          <div className="space-y-2">
            <Label className="text-sm">Background URL</Label>
            <Input 
              placeholder="Paste image URL or upload below"
              value={formData.background_image_url}
              onChange={(e) => setFormData(prev => ({ ...prev, background_image_url: e.target.value }))}
            />
          </div>

          {/* Photo Library Selector */}
          <div className="space-y-2">
            <Label className="text-sm">Or select from Photo Library</Label>
            <Select
              value={formData.background_image_url || ""}
              onValueChange={(value) => setFormData(prev => ({ ...prev, background_image_url: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Choose from library..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={null}>None</SelectItem>
                {photos
                  .filter((p) => p.category === "certificate_background")
                  .map((photo) => (
                    <SelectItem key={photo.id} value={photo.url}>
                      {photo.title}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          {/* File Upload */}
          <div className="border-2 border-dashed rounded-lg p-4 hover:bg-slate-50 transition">
            <label className="cursor-pointer flex items-center justify-center gap-2">
              <Upload className="w-4 h-4 text-slate-400" />
              <span className="text-sm text-slate-600">
                {uploading ? 'Uploading...' : 'Or click to upload new image'}
              </span>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                disabled={uploading}
                className="hidden"
              />
            </label>
          </div>

          {/* Preview Button */}
          {formData.background_image_url && (
            <>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowPreview(!showPreview)}
                className="w-full"
              >
                <Eye className="w-4 h-4 mr-2" />
                {showPreview ? 'Hide Preview' : 'Show Preview'}
              </Button>
              
              {showPreview && (
                <div className="border rounded-lg p-4 bg-slate-50">
                  <img 
                    src={formData.background_image_url}
                    alt="Certificate Background"
                    className="w-full h-auto rounded"
                  />
                  <p className="text-xs text-slate-500 mt-2">Current URL: {formData.background_image_url}</p>
                </div>
              )}
            </>
          )}
          
          {/* Debug Toggle */}
          <button
            type="button"
            onClick={() => setShowDebug(!showDebug)}
            className="text-xs text-slate-500 hover:text-slate-700"
          >
            {showDebug ? 'Hide' : 'Show'} Debug Info
          </button>
          
          {/* Debug Info */}
          {showDebug && (
            <div className="border border-yellow-300 bg-yellow-50 rounded-lg p-3 text-xs space-y-1">
              <p className="font-semibold text-yellow-800">Debug Info:</p>
              <p className="text-slate-600">Form URL: {formData.background_image_url || '(empty)'}</p>
              <p className="text-slate-600">Saved Config URL: {existingConfig?.background_image_url || '(none saved)'}</p>
            </div>
          )}
        </div>

        {/* Accreditation Statement */}
        <div className="space-y-3">
          <Label className="font-semibold">Accreditation Statement *</Label>
          <Textarea 
            placeholder="Required. Enter the accreditation statement for all certificates..."
            value={formData.accreditation_statement}
            onChange={(e) => setFormData(prev => ({ ...prev, accreditation_statement: e.target.value }))}
            className="min-h-32"
          />
          <p className="text-xs text-slate-500">This appears on both physician and other professional certificates</p>
          <StatementLibrary 
            hospital_id={hospital_id}
            statement_type="accreditation"
            onSelect={(text) => setFormData(prev => ({ ...prev, accreditation_statement: text }))}
            currentValue={formData.accreditation_statement}
          />
        </div>

        {/* Credit Designation Statement */}
        <div className="space-y-3">
          <Label className="font-semibold">Credit Designation Statement</Label>
          <Textarea 
            placeholder="Required for physician certificates. Enter the credit designation statement..."
            value={formData.credit_designation_statement}
            onChange={(e) => setFormData(prev => ({ ...prev, credit_designation_statement: e.target.value }))}
            className="min-h-32"
          />
          <p className="text-xs text-slate-500">Only appears on physician (MD/DO/MBBS) certificates</p>
          <StatementLibrary 
            hospital_id={hospital_id}
            statement_type="credit_designation"
            onSelect={(text) => setFormData(prev => ({ ...prev, credit_designation_statement: text }))}
            currentValue={formData.credit_designation_statement}
          />
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-4 border-t">
          <Button onClick={handleSave} disabled={saveMutation.isPending} className="bg-indigo-600">
            Save Configuration
          </Button>
        </div>
        </CardContent>
      </Card>

      {editingTemplate && (
        <TemplateEditor
          template={editingTemplate}
          open={!!editingTemplate}
          onOpenChange={(open) => !open && setEditingTemplate(null)}
          hospital_id={hospital_id}
        />
      )}

      {/* Certificate Preview Modal */}
      <Dialog open={showCertPreview} onOpenChange={setShowCertPreview}>
        <DialogContent className="max-w-6xl h-[90vh]">
          <DialogHeader>
            <DialogTitle>Certificate Preview</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-auto bg-gradient-to-br from-slate-100 to-slate-200 rounded-lg p-8 flex items-center justify-center">
            <CertificatePreviewRender
              template={templates[0]}
              config={{
                ...formData,
                background_image_url: formData.background_image_url
              }}
              activity={{ title: 'Sample Activity Title', method: 'Webinar', credit_hours: 1, credit_type: 'CME' }}
              attendee={{
                participant: { first_name: 'John', last_name: 'Doe' },
                credential: 'MD',
                attended_units: 1
              }}
              editedData={{
                ...formData,
                background_image_url: formData.background_image_url
              }}
              isEditing={false}
              previewMode="physician"
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}