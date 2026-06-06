import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";

export default function RecordModal({
  open,
  onClose,
  data,
  onChange,
  onSave,
  isLoading,
  participants,
  classes,
  isEditing,
}) {
  const handleParticipantChange = (participantId) => {
    const participant = participants.find(p => p.id === participantId);
    if (participant) {
      onChange('participant_id', participantId);
      onChange('participant_name', `${participant.first_name} ${participant.last_name}`);
    }
  };

  const handleClassChange = (classId) => {
    const ceClass = classes.find(c => c.id === classId);
    if (ceClass) {
      onChange('class_id', classId);
      onChange('class_title', ceClass.title);
      onChange('credit_type', ceClass.credit_type);
      onChange('credit_hours', ceClass.credit_hours);
      onChange('instructor_name', ceClass.instructor_name);
      onChange('method', ceClass.method);
      onChange('hospital', ceClass.hospital);
      if (ceClass.date) {
        onChange('date', ceClass.date);
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">
            {isEditing ? 'Edit CE Record' : 'Add CE Record'}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-5 py-4">
          {/* Participant Selection */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-slate-700">
              Participant <span className="text-red-500">*</span>
            </Label>
            <Select value={data.participant_id || ''} onValueChange={handleParticipantChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select participant" />
              </SelectTrigger>
              <SelectContent>
                {participants.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.first_name} {p.last_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Class Selection */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-slate-700">
              CE Class <span className="text-red-500">*</span>
            </Label>
            <Select value={data.class_id || ''} onValueChange={handleClassChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select class" />
              </SelectTrigger>
              <SelectContent>
                {classes.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Date */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-slate-700">
              Date <span className="text-red-500">*</span>
            </Label>
            <Input
              type="date"
              value={data.date || ''}
              onChange={(e) => {
                onChange('date', e.target.value);
                const year = new Date(e.target.value).getFullYear();
                onChange('year', year);
              }}
            />
          </div>

          {/* Credit Info - Read Only from Class */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-slate-700">Credit Type</Label>
              <Input
                value={data.credit_type || ''}
                onChange={(e) => onChange('credit_type', e.target.value)}
                placeholder="Credit type"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-slate-700">Credit Hours</Label>
              <Input
                type="number"
                step="0.5"
                value={data.credit_hours || ''}
                onChange={(e) => onChange('credit_hours', parseFloat(e.target.value) || '')}
                placeholder="Hours"
              />
            </div>
          </div>

          {/* Instructor & Method */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-slate-700">Instructor</Label>
              <Input
                value={data.instructor_name || ''}
                onChange={(e) => onChange('instructor_name', e.target.value)}
                placeholder="Instructor name"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-slate-700">Method</Label>
              <Input
                value={data.method || ''}
                onChange={(e) => onChange('method', e.target.value)}
                placeholder="Delivery method"
              />
            </div>
          </div>

          {/* Status */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-slate-700">Status</Label>
            <Select value={data.status || 'completed'} onValueChange={(val) => onChange('status', val)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-slate-700">Notes</Label>
            <Textarea
              value={data.notes || ''}
              onChange={(e) => onChange('notes', e.target.value)}
              placeholder="Additional notes"
              className="min-h-[80px]"
            />
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            onClick={onSave}
            disabled={isLoading || !data.participant_id || !data.class_id}
            className="bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Record'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}