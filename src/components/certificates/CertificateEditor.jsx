import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { X } from 'lucide-react';

export default function CertificateEditor({ classData, settings, onClose, onSave }) {
  const [formData, setFormData] = useState({
    orgName: classData?.hospital_name || settings?.organization_name || '',
    location: settings?.location || '',
    classTitle: classData?.title || '',
    creditHours: classData?.credit_hours || '',
    creditType: classData?.credit_type || 'AMA PRA',
    customStatement: '',
    courseDirectorText: 'Course Director',
    creditDesignationText: '',
    creditDesignationTopOffset: 65,
    creditDesignationFontSize: 11,
    onText: 'on',
    onTopOffset: 42,
    onFontSize: 11,
  });

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    onSave(formData);
  };

  return (
    <Card className="absolute inset-y-6 left-6 w-96 bg-white shadow-lg overflow-y-auto z-50">
      <div className="sticky top-0 bg-white border-b p-4 flex items-center justify-between">
        <h3 className="font-semibold text-slate-900">Edit Certificate</h3>
        <Button size="sm" variant="ghost" onClick={onClose}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      <div className="p-4 space-y-4">
        <div>
          <Label className="text-xs font-medium">Organization Name</Label>
          <Input
            value={formData.orgName}
            onChange={(e) => handleChange('orgName', e.target.value)}
            className="mt-1"
          />
        </div>

        <div>
          <Label className="text-xs font-medium">Location</Label>
          <Input
            value={formData.location}
            onChange={(e) => handleChange('location', e.target.value)}
            className="mt-1"
            placeholder="City, State"
          />
        </div>

        <div>
          <Label className="text-xs font-medium">Class/Activity Title</Label>
          <Input
            value={formData.classTitle}
            onChange={(e) => handleChange('classTitle', e.target.value)}
            className="mt-1"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs font-medium">Credit Hours</Label>
            <Input
              value={formData.creditHours}
              onChange={(e) => handleChange('creditHours', e.target.value)}
              className="mt-1"
              type="number"
              step="0.25"
            />
          </div>
          <div>
            <Label className="text-xs font-medium">Credit Type</Label>
            <Input
              value={formData.creditType}
              onChange={(e) => handleChange('creditType', e.target.value)}
              className="mt-1"
            />
          </div>
        </div>

        <div>
          <Label className="text-xs font-medium">Additional Statement</Label>
          <Textarea
            value={formData.customStatement}
            onChange={(e) => handleChange('customStatement', e.target.value)}
            className="mt-1 text-xs"
            placeholder="Optional custom text to include on certificate"
            rows={3}
          />
        </div>

        <div>
          <Label className="text-xs font-medium">Course Director Label</Label>
          <Input
            value={formData.courseDirectorText}
            onChange={(e) => handleChange('courseDirectorText', e.target.value)}
            className="mt-1"
            placeholder="Course Director"
          />
        </div>

        <div>
          <Label className="text-xs font-medium">Credit Designation Text</Label>
          <Textarea
            value={formData.creditDesignationText}
            onChange={(e) => handleChange('creditDesignationText', e.target.value)}
            className="mt-1 text-xs"
            placeholder="e.g., (This activity was designated for 1 CME Category 1 Credits™)"
            rows={2}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs font-medium">Position (% from top)</Label>
            <Input
              type="number"
              value={formData.creditDesignationTopOffset}
              onChange={(e) => handleChange('creditDesignationTopOffset', parseInt(e.target.value))}
              className="mt-1"
              min="0"
              max="100"
            />
          </div>
          <div>
            <Label className="text-xs font-medium">Font Size</Label>
            <Input
              type="number"
              value={formData.creditDesignationFontSize}
              onChange={(e) => handleChange('creditDesignationFontSize', parseInt(e.target.value))}
              className="mt-1"
              min="6"
              max="24"
            />
          </div>
        </div>

        <div>
          <Label className="text-xs font-medium">"On" Text</Label>
          <Input
            value={formData.onText}
            onChange={(e) => handleChange('onText', e.target.value)}
            className="mt-1"
            placeholder="on"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs font-medium">Position (% from top)</Label>
            <Input
              type="number"
              value={formData.onTopOffset}
              onChange={(e) => handleChange('onTopOffset', parseInt(e.target.value))}
              className="mt-1"
              min="0"
              max="100"
            />
          </div>
          <div>
            <Label className="text-xs font-medium">Font Size</Label>
            <Input
              type="number"
              value={formData.onFontSize}
              onChange={(e) => handleChange('onFontSize', parseInt(e.target.value))}
              className="mt-1"
              min="6"
              max="24"
            />
          </div>
        </div>

        <div className="flex gap-2 pt-4">
          <Button variant="outline" size="sm" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button size="sm" className="flex-1 bg-indigo-600" onClick={handleSave}>
            Apply Changes
          </Button>
        </div>
      </div>
    </Card>
  );
}