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
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";

export default function ManagementModal({
  open,
  onClose,
  title,
  fields = [],
  data = {},
  onChange,
  onSave,
  isLoading,
}) {
  const handleSubmit = (e) => {
    e?.preventDefault?.();
    if (isLoading) return;
    onSave?.();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">{title}</DialogTitle>
        </DialogHeader>

        <form
          onSubmit={handleSubmit}
          className="space-y-5 py-4"
          // ✅ Force Enter to save (except textarea). Radix Dialog sometimes prevents native submit.
          onKeyDownCapture={(e) => {
            if (e.key !== "Enter") return;
            if (e.shiftKey) return; // allow Shift+Enter behavior if any
            if (isLoading) return;

            const el = e.target;

            // Don't submit inside textarea (user expects new line)
            if (el?.tagName === "TEXTAREA") return;

            // If user is interacting with a native select, let Enter behave normally
            if (el?.tagName === "SELECT") return;

            // Prevent accidental submits on buttons
            if (el?.tagName === "BUTTON") return;

            e.preventDefault();
            handleSubmit(e);
          }}
        >
          {fields.map((field) => (
            <div key={field.key} className="space-y-2">
              <Label
                htmlFor={field.key}
                className="text-sm font-medium text-slate-700"
              >
                {field.label}
                {field.required && <span className="text-red-500 ml-1">*</span>}
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

          {/* ✅ hidden submit helps Safari/Chrome in modals */}
          <button type="submit" className="hidden" aria-hidden="true" />

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>

            <button
              type="submit"
              disabled={isLoading}
              className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 h-9 px-4 py-2 bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save"
              )}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
