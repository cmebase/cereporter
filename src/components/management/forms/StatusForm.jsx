import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

export default function StatusForm({ value, onChange }) {
  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <Label>Status Name *</Label>
        <Input
          value={value.name || ""}
          onChange={(e) => onChange({ ...value, name: e.target.value })}
          placeholder="e.g., Active"
        />
      </div>

      <div className="space-y-2">
        <Label>Code</Label>
        <Input
          value={value.code || ""}
          onChange={(e) => onChange({ ...value, code: e.target.value })}
          placeholder="e.g., ACT"
        />
      </div>

      <div className="space-y-2">
        <Label>Description</Label>
        <Textarea
          value={value.description || ""}
          onChange={(e) => onChange({ ...value, description: e.target.value })}
          placeholder="Description"
        />
      </div>

      <div className="flex items-center gap-3 pt-2">
        <Switch
          checked={value.is_active !== false}
          onCheckedChange={(checked) => onChange({ ...value, is_active: checked })}
        />
        <span className="text-sm text-slate-700">
          {value.is_active !== false ? "Active" : "Inactive"}
        </span>
      </div>
    </div>
  );
}