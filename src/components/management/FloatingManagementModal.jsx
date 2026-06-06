import React, { useState } from "react";
import DraggableResizableDialog from "./DraggableResizableDialog";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Loader2, ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function FloatingManagementModal({
  open = false,
  title = "New Record",
  fields = [],
  data = {},
  onChange,
  onSave,
  onClose,
  onDelete,
  isLoading = false,
  viewOtherFieldsOptions = [],
  onEditFields,
}) {
  const [showDeleteConfirm, setShowDeleteConfirm] = React.useState(false);
  const handleSubmit = (e) => {
    e?.preventDefault?.();
    if (isLoading) return;
    onSave?.();
  };

  return (
    <DraggableResizableDialog
      open={open}
      title={title}
      onClose={onClose}
      defaultWidth={650}
      defaultHeight={500}
    >
      <form
        onSubmit={handleSubmit}
        className="flex flex-col h-full min-h-0"
        onKeyDownCapture={(e) => {
          if (e.key !== "Enter") return;
          if (e.shiftKey) return;
          if (isLoading) return;

          const el = e.target;
          if (el?.tagName === "TEXTAREA") return;
          if (el?.tagName === "SELECT") return;
          if (el?.tagName === "BUTTON") return;

          e.preventDefault();
          handleSubmit(e);
        }}
      >
        <div className="space-y-4 overflow-y-auto pr-2 flex-1 pb-4 min-h-0">
          {fields.map((field) => (
            <div key={field.key} className="space-y-2">
              <Label
                htmlFor={field.key}
                className="text-sm font-medium text-slate-700"
              >
                {field.label}
                {field.required && (
                  <span className="text-red-500 ml-1">*</span>
                )}
              </Label>

              {field.type === "textarea" ? (
                <Textarea
                  id={field.key}
                  value={data[field.key] || ""}
                  onChange={(e) => onChange(field.key, e.target.value)}
                  placeholder={field.placeholder}
                  className="min-h-[100px]"
                  required={field.required}
                />
              ) : field.type === "switch" ? (
                <div className="flex items-center gap-3 pt-1">
                  <Switch
                    id={field.key}
                    checked={data[field.key] !== false}
                    onCheckedChange={(checked) => onChange(field.key, checked)}
                  />
                  <span className="text-sm text-slate-600">
                    {data[field.key] !== false ? "Active" : "Inactive"}
                  </span>
                </div>
              ) : field.type === "number" ? (
                <Input
                  id={field.key}
                  type="number"
                  value={data[field.key] || ""}
                  onChange={(e) =>
                    onChange(field.key, parseFloat(e.target.value) || "")
                  }
                  placeholder={field.placeholder}
                  required={field.required}
                  step={field.step || 1}
                />
              ) : field.type === "select" && field.options ? (
                <select
                  id={field.key}
                  value={data[field.key] || ""}
                  onChange={(e) => onChange(field.key, e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  required={field.required}
                >
                  <option value="">Select...</option>
                  {field.options.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              ) : (
                <Input
                  id={field.key}
                  type={field.type || "text"}
                  value={data[field.key] || ""}
                  onChange={(e) => onChange(field.key, e.target.value)}
                  placeholder={field.placeholder}
                  required={field.required}
                />
              )}
            </div>
          ))}
        </div>

        <button type="submit" className="hidden" aria-hidden="true" />

        <div className="flex gap-3 justify-between pt-6 border-t border-slate-200 mt-6 flex-shrink-0">
          <div>
            {data?.id && onDelete && (
              <Button
                type="button"
                variant="destructive"
                onClick={() => setShowDeleteConfirm(true)}
                disabled={isLoading}
              >
                Delete
              </Button>
            )}
          </div>
          <div className="flex gap-3">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              className="bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save"
              )}
            </Button>
          </div>
        </div>
        </form>

        {/* Delete Confirmation Dialog */}
        {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 z-[999] flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-sm w-full">
            <div className="p-6 space-y-4">
              <h3 className="text-lg font-semibold text-slate-900">Delete Record</h3>
              <p className="text-slate-600">Are you sure you want to delete this record? This action cannot be undone.</p>
              <div className="flex gap-3 justify-end pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowDeleteConfirm(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => {
                    onDelete(data.id);
                    setShowDeleteConfirm(false);
                  }}
                >
                  Delete
                </Button>
              </div>
            </div>
          </div>
        </div>
        )}
        </DraggableResizableDialog>
        );
        }