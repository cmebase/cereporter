import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Upload, Download, FileText, Loader } from 'lucide-react';

export default function TemplateEditor({ template, open, onOpenChange, hospital_id }) {
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);
  const [backgroundUrl, setBackgroundUrl] = useState(template?.background_image_url || 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6967f27ce8cf4aad99353f66/b1dd82356__CertificatePhysician.jpg');

  React.useEffect(() => {
    if (template?.background_image_url) {
      setBackgroundUrl(template.background_image_url);
    }
  }, [template]);

  const updateMutation = useMutation({
    mutationFn: async (data) => {
      return base44.entities.CertificateTemplate.update(template.id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['certificateTemplates', hospital_id] });
      toast.success('Template updated');
      onOpenChange(false);
    }
  });

  const handleUploadPDF = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      // Upload file
      const uploadResult = await base44.integrations.Core.UploadFile({ file });
      
      // Update template with new file ID
      await updateMutation.mutateAsync({
        background_pdf_file_id: uploadResult.file_url
      });
    } catch (error) {
      toast.error('Failed to upload PDF');
    } finally {
      setUploading(false);
    }
  };

  if (!template) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit Certificate Template</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Template Info */}
          <Card className="p-4 bg-slate-50">
            <div className="space-y-2">
              <div>
                <p className="text-sm font-medium text-slate-600">Template Name</p>
                <p className="text-lg font-semibold">{template.name}</p>
              </div>
              <div className="flex gap-4">
                <div>
                  <p className="text-sm font-medium text-slate-600">Type</p>
                  <Badge className="mt-1">
                    {template.template_type === 'physician' ? 'Physician' : 'Other Professional'}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-600">Status</p>
                  <Badge variant="outline" className="mt-1">{template.status}</Badge>
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-600">Version</p>
                  <p className="mt-1">v{template.version}</p>
                </div>
              </div>
            </div>
          </Card>

          {/* Background Image */}
          <div className="space-y-3">
            <h3 className="font-semibold text-slate-900">Background Image</h3>
            
            {backgroundUrl && (
              <div className="border rounded-lg overflow-hidden bg-slate-50">
                <img 
                  src={backgroundUrl} 
                  alt="Certificate Background" 
                  className="w-full h-auto"
                />
              </div>
            )}
          </div>

          {/* Background PDF */}
          <div className="space-y-3">
            <h3 className="font-semibold text-slate-900">Background PDF (Optional)</h3>
            
            {template.background_pdf_file_id ? (
              <div className="p-4 border rounded-lg bg-blue-50 border-blue-200 space-y-3">
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-blue-600" />
                  <div className="flex-1">
                    <p className="font-medium text-slate-900">PDF Uploaded</p>
                    <p className="text-sm text-slate-600">{template.background_pdf_file_id.split('/').pop()}</p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    asChild
                  >
                    <a href={template.background_pdf_file_id} download target="_blank" rel="noopener noreferrer">
                      <Download className="w-3 h-3 mr-1" />
                      Download
                    </a>
                  </Button>
                </div>
                <p className="text-xs text-slate-600">Click the button below to upload a new PDF to replace it</p>
              </div>
            ) : (
              <p className="text-sm text-slate-600">No background PDF uploaded yet</p>
            )}

            <div className="border-2 border-dashed rounded-lg p-6 text-center hover:bg-slate-50 transition">
              <label className="cursor-pointer space-y-2 block">
                <div className="flex justify-center">
                  <Upload className="w-6 h-6 text-slate-400" />
                </div>
                <div>
                  <p className="font-medium text-slate-900">Upload Background PDF</p>
                  <p className="text-xs text-slate-600">Click to select or drag and drop a PDF file</p>
                </div>
                <input
                  type="file"
                  accept=".pdf"
                  onChange={handleUploadPDF}
                  disabled={uploading}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          {/* Info */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
            <p className="text-xs text-amber-800">
              <strong>Note:</strong> Template editor with visual layout builder coming soon. For now, you can upload and manage your background PDF here.
            </p>
          </div>

          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}