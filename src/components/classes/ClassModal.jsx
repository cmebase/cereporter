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
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Loader2, CalendarIcon, AlertCircle } from "lucide-react";
import { format, isAfter, isBefore, isEqual, parseISO } from "date-fns";
import { cn } from "@/lib/utils";

export default function ClassModal({
  open,
  onClose,
  data,
  onChange,
  onSave,
  isLoading,
  isEditing,
  instructors,
  credits,
  methods,
  sponsors,
}) {
  const [beginDateOpen, setBeginDateOpen] = useState(false);
  const [endDateOpen, setEndDateOpen] = useState(false);
  const [errors, setErrors] = useState({});

  // Validate dates whenever they change
  useEffect(() => {
    validateDates();
  }, [data.begin_date, data.end_date]);

  const validateDates = () => {
    const newErrors = {};
    
    if (!data.begin_date) {
      newErrors.begin_date = "Begin Date is required";
    }
    
    if (!data.end_date) {
      newErrors.end_date = "End Date is required";
    }
    
    if (data.begin_date && data.end_date) {
      const beginDate = parseISO(data.begin_date);
      const endDate = parseISO(data.end_date);
      
      if (isAfter(beginDate, endDate)) {
        newErrors.end_date = "End Date must be the same as or after Begin Date";
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleBeginDateSelect = (date) => {
    if (date) {
      const formattedDate = format(date, 'yyyy-MM-dd');
      onChange('begin_date', formattedDate);
      
      // Auto-sync: If end_date is empty or before new begin_date, set end_date = begin_date
      if (!data.end_date || isBefore(parseISO(data.end_date), date)) {
        onChange('end_date', formattedDate);
      }
    }
    setBeginDateOpen(false);
  };

  const handleEndDateSelect = (date) => {
    if (date) {
      onChange('end_date', format(date, 'yyyy-MM-dd'));
    }
    setEndDateOpen(false);
  };

  const handleInstructorChange = (instructorId) => {
    const instructor = instructors.find(i => i.id === instructorId);
    if (instructor) {
      onChange('instructor_id', instructorId);
      onChange('instructor_name', `${instructor.first_name} ${instructor.last_name}`);
    }
  };

  const handleCreditChange = (creditName) => {
    const credit = credits.find(c => c.name === creditName);
    onChange('credit_type', creditName);
    if (credit?.hours) {
      onChange('credit_hours', credit.hours);
    }
  };

  const isValid = () => {
    return data.title && data.begin_date && data.end_date && Object.keys(errors).length === 0;
  };

  const getDateValue = (dateString) => {
    if (!dateString) return undefined;
    return parseISO(dateString);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">
            {isEditing ? 'Edit Class' : 'Add Class'}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-5 py-4">
          {/* Title */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-slate-700">
              Class Title <span className="text-red-500">*</span>
            </Label>
            <Input
              value={data.title || ''}
              onChange={(e) => onChange('title', e.target.value)}
              placeholder="Enter class title"
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-slate-700">Description</Label>
            <Textarea
              value={data.description || ''}
              onChange={(e) => onChange('description', e.target.value)}
              placeholder="Class description"
              className="min-h-[80px]"
            />
          </div>

          {/* Date Fields */}
          <div className="grid grid-cols-2 gap-4">
            {/* Begin Date */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-slate-700">
                Begin Date <span className="text-red-500">*</span>
              </Label>
              <Popover open={beginDateOpen} onOpenChange={setBeginDateOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal h-10",
                      !data.begin_date && "text-muted-foreground",
                      errors.begin_date && "border-red-500 focus:ring-red-500"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {data.begin_date ? format(parseISO(data.begin_date), 'MM/dd/yyyy') : 'Select date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={getDateValue(data.begin_date)}
                    onSelect={handleBeginDateSelect}
                    defaultMonth={getDateValue(data.begin_date) || new Date()}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              {errors.begin_date && (
                <div className="flex items-center gap-1 text-red-500 text-sm">
                  <AlertCircle className="w-3 h-3" />
                  {errors.begin_date}
                </div>
              )}
            </div>

            {/* End Date */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-slate-700">
                End Date <span className="text-red-500">*</span>
              </Label>
              <Popover open={endDateOpen} onOpenChange={setEndDateOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal h-10",
                      !data.end_date && "text-muted-foreground",
                      errors.end_date && "border-red-500 focus:ring-red-500"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {data.end_date ? format(parseISO(data.end_date), 'MM/dd/yyyy') : 'Select date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={getDateValue(data.end_date)}
                    onSelect={handleEndDateSelect}
                    defaultMonth={getDateValue(data.end_date) || getDateValue(data.begin_date) || new Date()}
                    disabled={(date) => data.begin_date && isBefore(date, parseISO(data.begin_date))}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              {errors.end_date && (
                <div className="flex items-center gap-1 text-red-500 text-sm">
                  <AlertCircle className="w-3 h-3" />
                  {errors.end_date}
                </div>
              )}
            </div>
          </div>

          {/* Time Fields */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-slate-700">Start Time</Label>
              <Input
                type="time"
                value={data.start_time || ''}
                onChange={(e) => onChange('start_time', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-slate-700">End Time</Label>
              <Input
                type="time"
                value={data.end_time || ''}
                onChange={(e) => onChange('end_time', e.target.value)}
              />
            </div>
          </div>

          {/* Credit Info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-slate-700">Credit Type</Label>
              <Select value={data.credit_type || ''} onValueChange={handleCreditChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select credit type" />
                </SelectTrigger>
                <SelectContent>
                  {credits.filter(c => c.is_active !== false).map((credit) => (
                    <SelectItem key={credit.id} value={credit.name}>
                      {credit.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-slate-700">Credit Hours</Label>
              <Input
                type="number"
                step="0.5"
                min="0"
                value={data.credit_hours || ''}
                onChange={(e) => onChange('credit_hours', parseFloat(e.target.value) || '')}
                placeholder="1.0"
              />
            </div>
          </div>

          {/* Instructor */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-slate-700">Instructor</Label>
            <Select value={data.instructor_id || ''} onValueChange={handleInstructorChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select instructor" />
              </SelectTrigger>
              <SelectContent>
                {instructors.filter(i => i.is_active !== false).map((instructor) => (
                  <SelectItem key={instructor.id} value={instructor.id}>
                    {instructor.first_name} {instructor.last_name}
                    {instructor.credentials && `, ${instructor.credentials}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Method & Sponsor */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-slate-700">Delivery Method</Label>
              <Select value={data.method || ''} onValueChange={(val) => onChange('method', val)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select method" />
                </SelectTrigger>
                <SelectContent>
                  {methods.filter(m => m.is_active !== false).map((method) => (
                    <SelectItem key={method.id} value={method.name}>
                      {method.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-slate-700">Joint Sponsor</Label>
              <Select value={data.joint_sponsor || ''} onValueChange={(val) => onChange('joint_sponsor', val)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select sponsor (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={null}>None</SelectItem>
                  {sponsors.filter(s => s.is_active !== false).map((sponsor) => (
                    <SelectItem key={sponsor.id} value={sponsor.name}>
                      {sponsor.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Location */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-slate-700">Location</Label>
            <Input
              value={data.location || ''}
              onChange={(e) => onChange('location', e.target.value)}
              placeholder="Room or location"
            />
          </div>

          {/* Max Participants & Status */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-slate-700">Max Participants</Label>
              <Input
                type="number"
                min="0"
                value={data.max_participants || ''}
                onChange={(e) => onChange('max_participants', parseInt(e.target.value) || '')}
                placeholder="Unlimited"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-slate-700">Status</Label>
              <div className="flex items-center gap-3 pt-2">
                <Switch
                  checked={data.is_active !== false}
                  onCheckedChange={(checked) => onChange('is_active', checked)}
                />
                <span className="text-sm text-slate-600">
                  {data.is_active !== false ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            onClick={onSave}
            disabled={isLoading || !isValid()}
            className={cn(
              "bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700",
              !isValid() && "opacity-50 cursor-not-allowed"
            )}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Class'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}