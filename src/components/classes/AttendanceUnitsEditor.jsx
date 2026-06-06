import React from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function AttendanceUnitsEditor({ value, defaultUnits, onChange }) {
  // Generate quarter-step options from 0 to defaultUnits + some buffer
  const generateOptions = () => {
    const options = [];
    const maxUnits = Math.ceil(defaultUnits * 1.5 * 4) / 4; // Allow up to 50% above default in quarter steps
    
    for (let i = 0; i <= maxUnits * 4; i++) {
      const units = i * 0.25;
      const minutes = Math.round(units * 60);
      options.push({
        units,
        label: `${units.toFixed(2)} (${minutes} min)`
      });
    }
    
    return options;
  };

  const options = generateOptions();
  const currentValue = (value || defaultUnits).toFixed(2);

  return (
    <Select value={currentValue} onValueChange={(v) => onChange(parseFloat(v))}>
      <SelectTrigger className="w-32 h-8">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((opt) => (
          <SelectItem key={opt.units} value={opt.units.toString()}>
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}