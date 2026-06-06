import React, { useEffect } from "react";
import { X, Download } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function PDFViewer({ pdfData, fileName = "document.pdf", onClose }) {
  if (!pdfData) {
    return (
      <div className="fixed inset-0 bg-black/50 z-[9999] flex items-center justify-center">
        <div className="bg-white rounded-lg p-8 max-w-md">
          <p className="text-red-600 font-semibold">Error: No PDF data provided</p>
          <Button onClick={onClose} variant="outline" className="mt-4">Close</Button>
        </div>
      </div>
    );
  }

  const blob = new Blob([pdfData], { type: "application/pdf" });
  const pdfUrl = URL.createObjectURL(blob);

  useEffect(() => {
    return () => {
      URL.revokeObjectURL(pdfUrl);
    };
  }, [pdfUrl]);

  const handleDownload = () => {
    const a = document.createElement("a");
    a.href = pdfUrl;
    a.download = fileName;
    a.click();
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-[9999] flex flex-col">
      <div className="bg-white border-b p-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold truncate">{fileName}</h2>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleDownload}>
            <Download className="w-4 h-4 mr-2" />
            Download
          </Button>
          <Button variant="outline" size="sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-auto bg-slate-100">
        <iframe
          src={pdfUrl}
          className="w-full h-full border-0"
          title="PDF Viewer"
        />
      </div>
    </div>
  );
}