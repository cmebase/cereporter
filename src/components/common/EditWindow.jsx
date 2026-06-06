import React from "react";
import { Button } from "@/components/ui/button";
import DraggableResizableDialog from "../management/DraggableResizableDialog";

export default function EditWindow({
  open,
  title,
  storageKey,
  onClose,
  onSave,
  saving = false,
  saveDisabled = false,
  onEditFields,
  showEditFields = false,
  showCancel = true,
  defaultWidth = 900,
  defaultHeight = 600,
  children,
}) {
  return (
    <DraggableResizableDialog
      open={open}
      title={title}
      storageKey={storageKey}
      onClose={onClose}
      defaultWidth={defaultWidth}
      defaultHeight={defaultHeight}
      footerLeft={
        showCancel ? (
          <Button variant="outline" type="button" onClick={onClose}>
            Cancel
          </Button>
        ) : null
      }
      footerRight={
        <>
          {showEditFields && (
            <Button
              variant="outline"
              type="button"
              onClick={onEditFields}
              disabled={!onEditFields}
            >
              Edit Fields
            </Button>
          )}
          <Button
            type="button"
            onClick={onSave}
            disabled={saveDisabled || saving}
            className="bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white"
          >
            {saving ? "Saving..." : "Save"}
          </Button>
        </>
      }
    >
      {children}
    </DraggableResizableDialog>
  );
}