import React, { useRef, useState, useMemo, useCallback } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Printer, X, ZoomIn, ZoomOut } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

export default function ClassListReport({ open, onClose, classes, settings }) {
  const [zoom, setZoom] = useState("100");
  const printRef = useRef(null);

  const zoomScale = parseInt(zoom, 10) / 100;

  const sortedClasses = useMemo(() => {
    const list = Array.isArray(classes) ? [...classes] : [];
    list.sort((a, b) => {
      const ad = a?.begin_date ? new Date(a.begin_date).getTime() : 0;
      const bd = b?.begin_date ? new Date(b.begin_date).getTime() : 0;
      if (ad !== bd) return ad - bd;
      return String(a?.title || "").localeCompare(String(b?.title || ""));
    });
    return list;
  }, [classes]);

  const renderDateRange = useCallback((cls) => {
    if (!cls?.begin_date) return "-";
    const b = new Date(cls.begin_date);
    if (cls?.end_date && cls.end_date !== cls.begin_date) {
      const e = new Date(cls.end_date);
      return `${format(b, "MM-dd-yyyy")} - ${format(e, "MM-dd-yyyy")}`;
    }
    return format(b, "MM-dd-yyyy");
  }, []);

  const baseCss = `
    @page { size: letter portrait; margin: 0.55in 0.55in 0.65in 0.55in; }

    .page {
      font-family: "Times New Roman", Times, serif;
      font-size: 10px;
      line-height: 1.15;
      color: #000;
    }

    .report-header {
      text-align: center;
      margin-top: 8px;
      margin-bottom: 14px;
      font-style: italic;
    }
    .report-header .h1 { font-size: 14px; font-weight: 600; margin: 0; }
    .report-header .h2 { font-size: 12px; font-weight: 500; margin: 2px 0; }
    .report-header .h3 { font-size: 12px; font-weight: 600; margin: 8px 0 0; }

    table { width: 100%; border-collapse: collapse; table-layout: fixed; }

    col.col-id     { width: 12%; }
    col.col-name   { width: 46%; }
    col.col-date   { width: 20%; }
    col.col-units  { width: 6%;  }
    col.col-credit { width: 16%; }

    thead th {
      text-align: left;
      font-weight: 600;
      padding: 4px 8px 6px 8px;
      border-bottom: 1px solid #000;
      font-style: italic;
      white-space: nowrap;
    }
    thead th.units { text-align: center; }

    tbody td { vertical-align: top; padding: 6px 8px; }

    .class-title { font-weight: 600; font-style: italic; word-break: break-word; }
    .subline { margin-top: 2px; font-size: 9px; font-style: italic; }

    .date-cell  { white-space: nowrap; }
    .units-cell { text-align: center; white-space: nowrap; }
    .credit-cell { white-space: normal; word-break: break-word; }

    .no-data { text-align: center; padding: 40px; font-style: italic; }

    .footer {
      margin-top: 18px;
      font-size: 9px;
      font-style: italic;
      display: flex;
      justify-content: space-between;
    }

    @media print {
      html, body { margin: 0; padding: 0; background: #fff; }
      body { font-family: "Times New Roman", Times, serif; font-size: 10px; line-height: 1.15; color: #000; }

      a[href]:after { content: "" !important; }
      * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }

      .footer {
        position: fixed;
        left: 0.55in;
        right: 0.55in;
        bottom: 0.35in;
        margin-top: 0;
      }

      .page-count:after {
        content: "Page " counter(page) " of " counter(pages);
      }
    }
  `;

  const reportHtml = useMemo(() => {
    const org = settings?.organization_name || "Organization Name";
    const loc = settings?.location || "Location";
    const dept = settings?.department || "Department";
    const todayLeft = format(new Date(), "MM-dd-yyyy");

    const rows =
      sortedClasses.length > 0
        ? `
          <table>
            <colgroup>
              <col class="col-id" />
              <col class="col-name" />
              <col class="col-date" />
              <col class="col-units" />
              <col class="col-credit" />
            </colgroup>
            <thead>
              <tr>
                <th>Class ID</th>
                <th>ClassName</th>
                <th>Date</th>
                <th class="units">Units</th>
                <th>Credit</th>
              </tr>
            </thead>
            <tbody>
              ${sortedClasses
                .map((cls) => {
                  const id = (cls?.id || "").substring(0, 8) || "-";
                  const title = cls?.title || "-";
                  const instructor = cls?.instructor_name || "N/A";
                  const dateRange = renderDateRange(cls);
                  const units = cls?.credit_hours ?? "-";
                  const credit = cls?.credit_type || "-";

                  return `
                    <tr>
                      <td>${escapeHtml(id)}</td>
                      <td>
                        <div class="class-title">${escapeHtml(title)}</div>
                        <div class="subline">Instructor: ${escapeHtml(instructor)}</div>
                      </td>
                      <td class="date-cell">${escapeHtml(dateRange)}</td>
                      <td class="units-cell">${escapeHtml(String(units))}</td>
                      <td class="credit-cell">${escapeHtml(credit)}</td>
                    </tr>
                  `;
                })
                .join("")}
            </tbody>
          </table>
        `
        : `<div class="no-data">No classes found for selected criteria.</div>`;

    return `
      <div class="page">
        <div class="report-header">
          <div class="h1">${escapeHtml(org)}</div>
          <div class="h2">${escapeHtml(loc)}</div>
          <div class="h2">${escapeHtml(dept)}</div>
          <div class="h3">Class List</div>
        </div>

        ${rows}

        <div class="footer">
          <div>${escapeHtml(todayLeft)}</div>
          <div class="page-count"></div>
        </div>
      </div>
    `;
  }, [settings, sortedClasses, renderDateRange]);

  const handlePrint = () => {
    const printWindow = window.open("about:blank", "_blank", "width=900,height=1100");
    if (!printWindow) {
      toast.error("Pop-up blocked. Allow pop-ups to print.");
      return;
    }

    const html = `
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title></title>
          <style>${baseCss}</style>
        </head>
        <body>
          ${reportHtml}
        </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();

    setTimeout(() => {
      printWindow.focus();
      printWindow.print();
    }, 600);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      {/* IMPORTANT: hides Radix's injected close button so you only have one X */}
      <DialogContent className="max-w-4xl max-h-[90vh] p-0 overflow-hidden [&>button]:hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b bg-slate-50">
          <div className="text-lg font-semibold">Print Preview - Class List</div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setZoom((prev) => Math.max(50, parseInt(prev, 10) - 25).toString())}
              >
                <ZoomOut className="w-4 h-4" />
              </Button>

              <Select value={zoom} onValueChange={setZoom}>
                <SelectTrigger className="w-24 h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="50">50%</SelectItem>
                  <SelectItem value="75">75%</SelectItem>
                  <SelectItem value="100">100%</SelectItem>
                  <SelectItem value="125">125%</SelectItem>
                  <SelectItem value="150">150%</SelectItem>
                </SelectContent>
              </Select>

              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setZoom((prev) => Math.min(150, parseInt(prev, 10) + 25).toString())}
              >
                <ZoomIn className="w-4 h-4" />
              </Button>
            </div>

            <div className="w-px h-6 bg-slate-300" />

            <Button onClick={handlePrint} className="h-8 bg-indigo-600 hover:bg-indigo-700">
              <Printer className="w-4 h-4 mr-2" />
              Print
            </Button>

            {/* The ONLY visible X */}
            <Button variant="ghost" size="icon" className="h-8 w-8 ml-2" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div className="overflow-auto bg-slate-200 p-6" style={{ maxHeight: "calc(90vh - 60px)" }}>
          <div
            className="bg-white shadow-lg mx-auto"
            style={{
              width: `${8.5 * 96 * zoomScale}px`,
              minHeight: `${11 * 96 * zoomScale}px`,
              padding: `${0.55 * 96 * zoomScale}px`,
              transformOrigin: "top center",
            }}
          >
            <style>{baseCss}</style>
            <div ref={printRef} dangerouslySetInnerHTML={{ __html: reportHtml }} />
          </div>

          <div className="mt-3 text-xs text-slate-600">
            Tip: In Chrome print dialog → More settings → turn off “Headers and footers” to remove any URL/title.
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function escapeHtml(input) {
  const s = String(input ?? "");
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}