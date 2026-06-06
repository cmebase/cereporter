import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Card } from "@/components/ui/card";
import { Loader2, CalendarIcon, AlertCircle, X, ChevronUp } from "lucide-react";
import { format, isAfter, isBefore, parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

export default function ClassFormPanel({
  open,
  onClose,
  data,
  onChange,
  onSave,
  isLoading,
  mode,
  instructors,
  credits,
  methods,
  sponsors,
}) {
  const [beginDateOpen, setBeginDateOpen] = useState(false);
  const [endDateOpen, setEndDateOpen] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (open) {
      validateDates();
    }
  }, [data.begin_date, data.end_date, open]);

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

    if (data.start_time && data.end_time && data.start_time >= data.end_time) {
      newErrors.end_time = "End Time must be after Start Time";
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleBeginDateSelect = (date) => {
    if (date) {
      const formattedDate = format(date, 'yyyy-MM-dd');
      onChange('begin_date', formattedDate);
      
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
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="overflow-hidden"
        >
          <Card className="mb-6 border-indigo-200 bg-gradient-to-br from-white to-indigo-50/30">
            {/* Panel Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-indigo-100">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">
                  {mode === 'edit' ? 'Edit Class' : 'Add Class'}
                </h3>
                <p className="text-sm text-slate-500">Required fields marked *</p>
              </div>
              <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
                <ChevronUp className="w-5 h-5" />
              </Button>
            </div>

            {/* Panel Body */}
            <div className="p-6 space-y-5">
              {/* Row 1: Title */}
              <div className="space-y-2">
                <Label className="text-sm font-medium text-slate-700">
                  Class Title <span className="text-red-500">*</span>
                </Label>
                <Input
                  value={data.title || ''}
                  onChange={(e) => onChange('title', e.target.value)}
                  placeholder="Enter class title"
                  className="bg-white"
                />
              </div>

              {/* Row 2: Dates */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
                          "w-full justify-start text-left font-normal h-10 bg-white",
                          !data.begin_date && "text-muted-foreground",
                          errors.begin_date && "border-red-500"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {data.begin_date ? format(parseISO(data.begin_date), 'MM/dd/yyyy') : 'Select'}
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
                    <div className="flex items-center gap-1 text-red-500 text-xs">
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
                          "w-full justify-start text-left font-normal h-10 bg-white",
                          !data.end_date && "text-muted-foreground",
                          errors.end_date && "border-red-500"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {data.end_date ? format(parseISO(data.end_date), 'MM/dd/yyyy') : 'Select'}
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
                    <div className="flex items-center gap-1 text-red-500 text-xs">
                      <AlertCircle className="w-3 h-3" />
                      {errors.end_date}
                    </div>
                  )}
                </div>

                {/* Start Time */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-slate-700">Start Time</Label>
                  <Input
                    type="time"
                    value={data.start_time || ''}
                    onChange={(e) => onChange('start_time', e.target.value)}
                    className="bg-white"
                  />
                </div>

                {/* End Time */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-slate-700">End Time</Label>
                  <Input
                    type="time"
                    value={data.end_time || ''}
                    onChange={(e) => onChange('end_time', e.target.value)}
                    className={cn("bg-white", errors.end_time && "border-red-500")}
                  />
                  {errors.end_time && (
                    <div className="flex items-center gap-1 text-red-500 text-xs">
                      <AlertCircle className="w-3 h-3" />
                      {errors.end_time}
                    </div>
                  )}
                </div>
              </div>

              {/* Row 3: Description */}
              <div className="space-y-2">
                <Label className="text-sm font-medium text-slate-700">Description</Label>
                <Textarea
                  value={data.description || ''}
                  onChange={(e) => onChange('description', e.target.value)}
                  placeholder="Class description"
                  className="min-h-[60px] bg-white"
                />
              </div>

              {/* Row 4: Credit & Instructor */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-slate-700">Credit Type</Label>
                  <Select value={data.credit_type || ''} onValueChange={handleCreditChange}>
                    <SelectTrigger className="bg-white">
                      <SelectValue placeholder="Select" />
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
                    className="bg-white"
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label className="text-sm font-medium text-slate-700">Instructor</Label>
                  <Select value={data.instructor_id || ''} onValueChange={handleInstructorChange}>
                    <SelectTrigger className="bg-white">
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
              </div>

              {/* Row 5: Method, Sponsor, Location */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-slate-700">Delivery Method</Label>
                  <Select value={data.method || ''} onValueChange={(val) => onChange('method', val)}>
                    <SelectTrigger className="bg-white">
                      <SelectValue placeholder="Select" />
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
                    <SelectTrigger className="bg-white">
                      <SelectValue placeholder="None" />
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

                <div className="space-y-2">
                  <Label className="text-sm font-medium text-slate-700">Location</Label>
                  <Input
                    value={data.location || ''}
                    onChange={(e) => onChange('location', e.target.value)}
                    placeholder="Room"
                    className="bg-white"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium text-slate-700">Max Participants</Label>
                  <Input
                    type="number"
                    min="0"
                    value={data.max_participants || ''}
                    onChange={(e) => onChange('max_participants', parseInt(e.target.value) || '')}
                    placeholder="Unlimited"
                    className="bg-white"
                  />
                </div>
              </div>

              {/* Row 6: Status */}
              <div className="flex items-center gap-3">
                <Label className="text-sm font-medium text-slate-700">Status:</Label>
                <Switch
                  checked={data.is_active !== false}
                  onCheckedChange={(checked) => onChange('is_active', checked)}
                />
                <span className="text-sm text-slate-600">
                  {data.is_active !== false ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>

            {/* Panel Footer */}
            <div className="flex items-center justify-between px-6 py-4 border-t border-indigo-100 bg-slate-50/50">
              <Button variant="outline" onClick={onClose}>
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
                  mode === 'edit' ? 'Save Changes' : 'Save Class'
                )}
              </Button>
            </div>
          </Card>
        </motion.div>
      )}
    </AnimatePresence>
  );
}