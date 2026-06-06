import React, { useState, useEffect } from "react";
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
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format, parseISO } from "date-fns";
import { CalendarIcon, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

export default function CERecordEditModal({
  open,
  onClose,
  record,
  onSave,
  onCancel,
  participantName,
  className,
}) {
  const [formData, setFormData] = useState({});
  const [datePickerOpen, setDatePickerOpen] = useState(false);

  useEffect(() => {
    if (record) {
      setFormData(record);
    }
  }, [record]);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    onSave(formData);
  };

  const handleCancel = () => {
    onCancel();
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleCancel()}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4 text-green-600" />
            </div>
            <div>
              <DialogTitle className="text-lg font-semibold">
                CE Record Created
              </DialogTitle>
              <p className="text-sm text-slate-500 mt-0.5">
                Review and adjust details for {participantName || 'participant'}
              </p>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Class Info - Read Only */}
          <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
            <div className="text-xs font-medium text-slate-500 mb-1">Class</div>
            <div className="text-sm font-medium text-slate-900">{className || formData.class_title}</div>
          </div>

          {/* Participant Info - Read Only */}
          <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
            <div className="text-xs font-medium text-slate-500 mb-1">Participant</div>
            <div className="text-sm font-medium text-slate-900">{participantName || formData.participant_name}</div>
          </div>

          {/* Editable Fields */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-medium">Credit Type</Label>
              <Input
                value={formData.credit_type || ''}
                onChange={(e) => handleChange('credit_type', e.target.value)}
                placeholder="e.g., CME, CNE"
              />
            </div>
            <div>
              <Label className="text-sm font-medium">Credit Hours</Label>
              <Input
                type="number"
                step="0.5"
                min="0"
                value={formData.credit_hours || ''}
                onChange={(e) => handleChange('credit_hours', parseFloat(e.target.value) || '')}
                placeholder="1.0"
              />
            </div>
          </div>

          <div>
            <Label className="text-sm font-medium">Date</Label>
            <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !formData.date && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {formData.date ? format(parseISO(formData.date), "MM/dd/yyyy") : "Select date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={formData.date ? parseISO(formData.date) : undefined}
                  onSelect={(date) => {
                    if (date) {
                      handleChange('date', format(date, 'yyyy-MM-dd'));
                      handleChange('year', date.getFullYear());
                    }
                    setDatePickerOpen(false);
                  }}
                />
              </PopoverContent>
            </Popover>
          </div>

          <div>
            <Label className="text-sm font-medium">Status</Label>
            <Select
              value={formData.status || 'completed'}
              onValueChange={(val) => handleChange('status', val)}
            >
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

          <div>
            <Label className="text-sm font-medium">Notes</Label>
            <Textarea
              value={formData.notes || ''}
              onChange={(e) => handleChange('notes', e.target.value)}
              placeholder="Add any additional notes"
              rows={3}
            />
          </div>
        </div>

        <DialogFooter className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleCancel}
            className="text-red-600 hover:text-red-700 hover:bg-red-50"
          >
            Cancel (Discard Record)
          </Button>
          <Button
            onClick={handleSave}
            className="bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700"
          >
            Save & Continue
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}