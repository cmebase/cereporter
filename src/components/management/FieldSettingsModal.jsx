import React, { useState, useMemo } from "react";
import DraggableResizableDialog from "./DraggableResizableDialog";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";

import { Loader2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const DEFAULT_FIELD_SETTINGS = {
  dropdownDisplay: {
    primaryLabel: "name", // name, code, name_code, code_name
    separator: " - ",
    includeCode: false,
    includeDescription: false,
  },
  filterRules: {
    onlyActive: true,
  },
  formFields: {
    name: { visible: true, required: true, editable: true },
    code: { visible: false, required: false, editable: true },
    description: { visible: false, required: false, editable: true },
    is_active: { visible: true, required: false, editable: true },
  },
};

export default function FieldSettingsModal({
  open = false,
  entityType = "status", // status, title, specialty
  onClose,
  onSave,
  isLoading = false,
  currentSettings = {},
  allData = [], // all status/title/specialty records for preview
}) {
  const [settings, setSettings] = useState(
    currentSettings && Object.keys(currentSettings).length > 0
      ? currentSettings
      : DEFAULT_FIELD_SETTINGS
  );

  const separatorOptions = [
    { value: " - ", label: '" - "' },
    { value: " | ", label: '" | "' },
    { value: " ( ) ", label: '" ( ) "' },
    { value: " : ", label: '" : "' },
  ];

  // Generate dropdown preview
  const dropdownPreview = useMemo(() => {
    return allData.slice(0, 3).map((item) => {
      const { primaryLabel, separator, includeCode, includeDescription } =
        settings.dropdownDisplay;
      let display = "";

      if (primaryLabel === "code") {
        display = item.code || "";
      } else if (primaryLabel === "name_code") {
        display = item.name || "";
        if (includeCode && item.code) display += separator + item.code;
      } else if (primaryLabel === "code_name") {
        display = item.code || "";
        if (includeCode && item.name) display += separator + item.name;
      } else {
        // name (default)
        display = item.name || "";
        if (includeCode && item.code) display += separator + item.code;
      }

      return display || "(no display)";
    });
  }, [settings.dropdownDisplay, allData]);

  const handleDisplayRuleChange = (key, value) => {
    setSettings((prev) => ({
      ...prev,
      dropdownDisplay: {
        ...prev.dropdownDisplay,
        [key]: value,
      },
    }));
  };

  const handleFilterRuleChange = (key, value) => {
    setSettings((prev) => ({
      ...prev,
      filterRules: {
        ...prev.filterRules,
        [key]: value,
      },
    }));
  };

  const handleFormFieldChange = (fieldKey, settingKey, value) => {
    setSettings((prev) => ({
      ...prev,
      formFields: {
        ...prev.formFields,
        [fieldKey]: {
          ...prev.formFields[fieldKey],
          [settingKey]: value,
        },
      },
    }));
  };

  const handleSave = () => {
    onSave?.(settings);
  };

  return (
    <DraggableResizableDialog
      open={open}
      title={`${entityType.charAt(0).toUpperCase() + entityType.slice(1)} Field Settings`}
      onClose={onClose}
      defaultWidth={750}
      defaultHeight={700}
    >
      <div className="space-y-6 overflow-y-auto pr-2 flex-1">
        {/* Dropdown Display Section */}
        <div>
          <h3 className="text-sm font-semibold text-slate-900 mb-4">
            Dropdown Display
          </h3>

          {/* Preview */}
          <div className="mb-4 p-3 bg-slate-50 border border-slate-200 rounded-lg">
            <Label className="text-xs font-medium text-slate-600 block mb-2">
              Dropdown Preview
            </Label>
            <div className="space-y-1">
              {dropdownPreview.map((preview, idx) => (
                <div
                  key={idx}
                  className="text-sm text-slate-900 p-2 bg-white rounded border border-slate-200"
                >
                  {preview}
                </div>
              ))}
            </div>
          </div>

          {/* Display Rule Builder */}
          <div className="space-y-3">
            <div>
              <Label className="text-xs font-medium text-slate-600 mb-2 block">
                Primary Label
              </Label>
              <div className="space-y-2">
                {[
                  { value: "name", label: "Name" },
                  { value: "code", label: "Code" },
                  { value: "name_code", label: "Name + Code" },
                  { value: "code_name", label: "Code + Name" },
                ].map((opt) => (
                  <div key={opt.value} className="flex items-center gap-2">
                    <input
                      type="radio"
                      id={`primary_${opt.value}`}
                      name="primary_label"
                      value={opt.value}
                      checked={settings.dropdownDisplay.primaryLabel === opt.value}
                      onChange={(e) =>
                        handleDisplayRuleChange("primaryLabel", e.target.value)
                      }
                      className="w-4 h-4"
                    />
                    <label
                      htmlFor={`primary_${opt.value}`}
                      className="text-sm text-slate-700 cursor-pointer"
                    >
                      {opt.label}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <Label className="text-xs font-medium text-slate-600 mb-2 block">
                Separator
              </Label>
              <Select
                value={settings.dropdownDisplay.separator}
                onValueChange={(v) =>
                  handleDisplayRuleChange("separator", v)
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {separatorOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs font-medium text-slate-600 mb-2 block">
                Optional Additions
              </Label>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={settings.dropdownDisplay.includeCode}
                    onChange={(e) =>
                      handleDisplayRuleChange("includeCode", e.target.checked)
                    }
                    className="h-4 w-4 rounded border-slate-300"
                  />
                  <Label className="text-sm text-slate-700 font-normal cursor-pointer">
                    Include Code
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={settings.dropdownDisplay.includeDescription}
                    onChange={(e) =>
                      handleDisplayRuleChange("includeDescription", e.target.checked)
                    }
                    className="h-4 w-4 rounded border-slate-300"
                  />
                  <Label className="text-sm text-slate-700 font-normal cursor-pointer">
                    Include Description
                  </Label>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Filter Rules Section */}
        <div className="pt-4 border-t border-slate-200">
          <h3 className="text-sm font-semibold text-slate-900 mb-3">
            Filter Rules
          </h3>
          <div className="flex items-center gap-3">
            <Switch
              checked={settings.filterRules.onlyActive}
              onCheckedChange={(v) =>
                handleFilterRuleChange("onlyActive", v)
              }
            />
            <Label className="text-sm text-slate-700 font-normal cursor-pointer">
              Only show Active items
            </Label>
          </div>
        </div>

        {/* Form Fields Section */}
        <div className="pt-4 border-t border-slate-200">
          <h3 className="text-sm font-semibold text-slate-900 mb-3">
            Form Fields
          </h3>
          <div className="space-y-3">
            {Object.entries(settings.formFields).map(([fieldKey, fieldSettings]) => (
              <div key={fieldKey} className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-sm font-medium text-slate-900 capitalize">
                    {fieldKey === "is_active" ? "Active" : fieldKey}
                  </Label>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={fieldSettings.visible}
                      onCheckedChange={(v) =>
                        handleFormFieldChange(fieldKey, "visible", v)
                      }
                    />
                    <Label className="text-xs text-slate-600 font-normal cursor-pointer">
                      Visible
                    </Label>
                  </div>
                  {fieldKey !== "is_active" && (
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={fieldSettings.required}
                        onCheckedChange={(v) =>
                          handleFormFieldChange(fieldKey, "required", v)
                        }
                        disabled={!fieldSettings.visible}
                      />
                      <Label className="text-xs text-slate-600 font-normal cursor-pointer">
                        Required
                      </Label>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={fieldSettings.editable}
                      onCheckedChange={(v) =>
                        handleFormFieldChange(fieldKey, "editable", v)
                      }
                      disabled={!fieldSettings.visible}
                    />
                    <Label className="text-xs text-slate-600 font-normal cursor-pointer">
                      Editable
                    </Label>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex gap-3 justify-end pt-6 border-t border-slate-200 mt-6 flex-shrink-0">
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button
          type="button"
          disabled={isLoading}
          className="bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white"
          onClick={handleSave}
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            "Save Settings"
          )}
        </Button>
      </div>
    </DraggableResizableDialog>
  );
}