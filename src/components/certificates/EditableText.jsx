import React, { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";

export default function EditableText({ 
  value, 
  onChange, 
  className = "", 
  multiline = false, 
  placeholder = "Click to edit",
  style = {}
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [draftValue, setDraftValue] = useState(value);
  const inputRef = useRef(null);

  useEffect(() => {
    setDraftValue(value);
  }, [value]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleSave = () => {
    onChange(draftValue);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setDraftValue(value);
    setIsEditing(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !multiline) {
      e.preventDefault();
      handleSave();
    } else if (e.key === "Enter" && multiline && e.ctrlKey) {
      e.preventDefault();
      handleSave();
    } else if (e.key === "Escape") {
      e.preventDefault();
      handleCancel();
    }
  };

  const handleBlur = () => {
    handleSave();
  };

  if (isEditing) {
    const Component = multiline ? "textarea" : "input";
    return (
      <Component
        ref={inputRef}
        type={multiline ? undefined : "text"}
        value={draftValue}
        onChange={(e) => setDraftValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        className={cn("outline-none border-2 border-blue-500 bg-blue-50 rounded px-2 py-1", className)}
        style={{
          ...style,
          minWidth: "200px",
          resize: multiline ? "none" : undefined,
        }}
        rows={multiline ? 2 : undefined}
      />
    );
  }

  return (
    <span
      onClick={() => setIsEditing(true)}
      className={cn(
        "cursor-pointer text-blue-700 hover:underline hover:decoration-dashed transition-all",
        className
      )}
      style={style}
      title="Click to edit"
    >
      {value || placeholder}
    </span>
  );
}