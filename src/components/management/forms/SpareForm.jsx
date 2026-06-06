import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function SpareForm({ value, onChange }) {
  const handleChange = (field, val) => {
    onChange({ ...value, [field]: val });
  };

  return (
    <div className="space-y-6 p-4">
      <div>
        <Label>Field Number *</Label>
        <Select value={String(value.field_number || 1)} onValueChange={(v) => handleChange("field_number", parseInt(v))}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1">Spare Field 1</SelectItem>
            <SelectItem value="2">Spare Field 2</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label>Label *</Label>
        <Input
          placeholder="e.g., Department"
          value={value.label || ""}
          onChange={(e) => handleChange("label", e.target.value)}
        />
      </div>

      <div>
        <Label>Value</Label>
        <Input
          placeholder="Default value"
          value={value.value || ""}
          onChange={(e) => handleChange("value", e.target.value)}
        />
      </div>

      <div className="flex items-center gap-2">
        <Switch
          checked={value.is_active !== false}
          onCheckedChange={(v) => handleChange("is_active", v)}
        />
        <Label className="text-sm">Active</Label>
      </div>
    </div>
  );
}