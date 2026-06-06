import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";

export default function FieldInfoModal({ open, onClose, fields = [], title = "Field Information", onFieldToggle }) {
  const [activeFields, setActiveFields] = useState(new Set(fields.filter(f => f.is_active !== false).map(f => f.key)));
  const getTypeLabel = (type) => {
    const types = {
      text: "Text",
      textarea: "Text Area",
      number: "Number",
      switch: "Toggle",
      select: "Dropdown",
      email: "Email",
      date: "Date",
    };
    return types[type] || type;
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8">Active</TableHead>
                <TableHead>Field Label</TableHead>
                <TableHead>Key</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Required</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {fields.map((field) => (
                <TableRow key={field.key}>
                  <TableCell>
                    <Checkbox
                      checked={activeFields.has(field.key)}
                      onCheckedChange={(checked) => {
                        const newActive = new Set(activeFields);
                        if (checked) {
                          newActive.add(field.key);
                        } else {
                          newActive.delete(field.key);
                        }
                        setActiveFields(newActive);
                        onFieldToggle?.(field.key, checked);
                      }}
                    />
                  </TableCell>
                  <TableCell className="font-medium">{field.label}</TableCell>
                  <TableCell className="text-slate-600 text-sm font-mono">{field.key}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{getTypeLabel(field.type || "text")}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={field.required ? "bg-red-50 text-red-700 border-red-200" : ""}
                    >
                      {field.required ? "Yes" : "No"}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}