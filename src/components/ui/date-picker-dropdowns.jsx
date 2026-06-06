import * as React from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

/**
 * DatePickerDropdowns - A simple date picker with separate month, day, year dropdowns
 */
export function DatePickerDropdowns({ 
  value, 
  onChange, 
  label,
  fromYear = 2000,
  toYear = 2100,
  className = ""
}) {
  const date = value ? new Date(value) : null;
  const month = date ? date.getMonth() + 1 : null;
  const day = date ? date.getDate() : null;
  const year = date ? date.getFullYear() : null;

  const months = [
    { value: "1", label: "January" },
    { value: "2", label: "February" },
    { value: "3", label: "March" },
    { value: "4", label: "April" },
    { value: "5", label: "May" },
    { value: "6", label: "June" },
    { value: "7", label: "July" },
    { value: "8", label: "August" },
    { value: "9", label: "September" },
    { value: "10", label: "October" },
    { value: "11", label: "November" },
    { value: "12", label: "December" },
  ];

  const getDaysInMonth = (m, y) => {
    if (!m || !y) return 31;
    return new Date(y, m, 0).getDate();
  };

  const daysInMonth = getDaysInMonth(month, year);
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const years = Array.from({ length: toYear - fromYear + 1 }, (_, i) => fromYear + i);

  const handleChange = (field, val) => {
    const newMonth = field === "month" ? parseInt(val) : month || 1;
    const newDay = field === "day" ? parseInt(val) : day || 1;
    const newYear = field === "year" ? parseInt(val) : year || new Date().getFullYear();

    // Adjust day if it's invalid for the new month
    const maxDay = getDaysInMonth(newMonth, newYear);
    const adjustedDay = Math.min(newDay, maxDay);

    const newDate = new Date(newYear, newMonth - 1, adjustedDay);
    onChange?.(newDate);
  };

  return (
    <div className={className}>
      {label && <Label className="mb-2 block">{label}</Label>}
      <div className="flex gap-2">
        <Select value={month?.toString()} onValueChange={(val) => handleChange("month", val)}>
          <SelectTrigger className="flex-1">
            <SelectValue placeholder="Month" />
          </SelectTrigger>
          <SelectContent>
            {months.map((m) => (
              <SelectItem key={m.value} value={m.value}>
                {m.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={day?.toString()} onValueChange={(val) => handleChange("day", val)}>
          <SelectTrigger className="w-24">
            <SelectValue placeholder="Day" />
          </SelectTrigger>
          <SelectContent>
            {days.map((d) => (
              <SelectItem key={d} value={d.toString()}>
                {d}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={year?.toString()} onValueChange={(val) => handleChange("year", val)}>
          <SelectTrigger className="w-28">
            <SelectValue placeholder="Year" />
          </SelectTrigger>
          <SelectContent>
            {years.map((y) => (
              <SelectItem key={y} value={y.toString()}>
                {y}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}