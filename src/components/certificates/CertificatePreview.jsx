import React, { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";
import { toast } from "sonner";
import * as pdfjsLib from 'pdfjs-dist';

export default function CertificatePreview({ classData, attendee, settings, template }) {
  const [pdfImage, setPdfImage] = useState(null);

  useEffect(() => {
    console.log('Template background_pdf_file_id:', template?.background_pdf_file_id);
    
    if (template?.background_pdf_file_id) {
      // Use PDF as direct background image URL
      setPdfImage(template.background_pdf_file_id);
    }
  }, [template?.background_pdf_file_id]);

  if (!classData || !attendee) {
    return (
      <Card className="h-full flex items-center justify-center bg-slate-50">
        <p className="text-slate-500">Select an attendee to preview certificate</p>
      </Card>
    );
  }

  const handlePrint = () => {
    const success = printCertificateLandscape({ classData, attendee, settings: settings || {} });
    if (!success) {
      toast.error("Pop-up blocked. Allow pop-ups to print.");
    }
  };

  const orgName = classData?.hospital_name || settings?.organization_name || "Continuing Education";
  const location = settings?.location || "";
  const classTitle = classData?.title || "";
  const dateText = classData?.begin_date
    ? new Date(classData.begin_date).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "";
  const creditHours = classData?.credit_hours ?? "";
  const creditTypeCaps = String(classData?.credit_type || "AMA PRA").toUpperCase();
  const attendeeName = attendee?.participant_name || "";

  const escapeHtml = (v) =>
    String(v ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");

  const certificateHtml = `
    <div class="page">
      <div>
        <div class="header">
          <div class="org">${escapeHtml(orgName)}</div>
          ${location ? `<div class="loc">${escapeHtml(location)}</div>` : ""}
        </div>

        <div class="title">${escapeHtml(classTitle)}</div>
        <div class="date">${escapeHtml(dateText)}</div>

        <div class="credit">
          ${location ? `<div><em>Site:</em> ${escapeHtml(location)}</div>` : ""}
          ${
            creditHours !== ""
              ? `<div>
                  ${escapeHtml(creditHours)} hour${Number(creditHours) !== 1 ? "s" : ""}
                  of credit approved by <strong>${escapeHtml(creditTypeCaps)}</strong>
                </div>`
              : ""
          }
        </div>
      </div>

      <div class="award">
        <div class="award-label">Awarded to:</div>
        <div class="award-name">${escapeHtml(attendeeName)}</div>
      </div>

      <div class="signature">
        <div class="sig-line">Authorized Signature</div>
      </div>
    </div>
  `;

  const css = `
    @page { size: letter landscape; margin: 0; }
    html, body { margin: 0; padding: 0; background: #fff; color: #000; font-family: "Times New Roman", Times, serif; }
    body { overflow: hidden; }
    .page { width: 11in; height: 8.5in; box-sizing: border-box; padding: 0.55in 0.7in; display: flex; flex-direction: column; justify-content: space-between; page-break-after: avoid; page-break-inside: avoid; break-after: avoid; break-inside: avoid; overflow: hidden; }
    .header { text-align: center; margin-top: 0.05in; }
    .org { font-size: 30px; font-weight: 500; letter-spacing: 0.3px; }
    .loc { font-size: 18px; margin-top: 6px; }
    .title { margin-top: 0.35in; text-align: center; font-size: 28px; letter-spacing: 0.6px; text-transform: uppercase; line-height: 1.15; }
    .date { text-align: center; margin-top: 0.18in; font-size: 18px; }
    .credit { text-align: center; margin-top: 0.32in; font-size: 15px; line-height: 1.35; }
    .award { text-align: center; }
    .award-label { font-size: 15px; margin-bottom: 10px; }
    .award-name { font-size: 36px; font-style: italic; font-weight: 600; letter-spacing: 0.8px; }
    .signature { text-align: center; margin-bottom: 0.08in; }
    .sig-line { width: 4.8in; margin: 0 auto; border-top: 2px solid #000; padding-top: 8px; font-size: 12px; font-style: italic; }
    @media print { * { -webkit-print-color-adjust: exact; print-color-adjust: exact; } a[href]:after { content: "" !important; } }
  `;

  return (
    <Card className="h-full bg-slate-100 flex flex-col">
      <div className="p-2 flex justify-end">
        <Button onClick={handlePrint} className="gap-2">
          <Printer className="w-4 h-4" />
          Print Certificate
        </Button>
      </div>

      <div className="flex-1 overflow-auto bg-slate-200 p-6">
        <div
          className="shadow-lg mx-auto relative"
          style={{
            width: "11in",
            height: "8.5in",
            padding: "0.55in 0.7in",
            backgroundImage: pdfImage ? `url('${pdfImage}')` : 'none',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        >
          {!pdfImage && <div className="absolute inset-0 bg-white" />}
          <style>{css}</style>
          <div style={{ position: 'relative', zIndex: 10 }} dangerouslySetInnerHTML={{ __html: certificateHtml }} />
        </div>
      </div>
    </Card>
  );
}

export function printCertificateLandscape({ classData, attendee, settings = {} }) {
  const orgName = classData?.hospital_name || settings?.organization_name || "Continuing Education";
  const location = settings?.location || "";
  const classTitle = classData?.title || "";
  const dateText = classData?.begin_date
    ? new Date(classData.begin_date).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "";
  const creditHours = classData?.credit_hours ?? "";
  const creditTypeCaps = String(classData?.credit_type || "AMA PRA").toUpperCase();
  const attendeeName = attendee?.participant_name || "";

  const escapeHtml = (v) =>
    String(v ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");

  const css = `
    @page { size: letter landscape; margin: 0; }
    html, body { margin: 0; padding: 0; background: #fff; color: #000; font-family: "Times New Roman", Times, serif; }
    body { overflow: hidden; }
    .page { width: 11in; height: 8.5in; box-sizing: border-box; padding: 0.55in 0.7in; display: flex; flex-direction: column; justify-content: space-between; page-break-after: avoid; page-break-inside: avoid; break-after: avoid; break-inside: avoid; overflow: hidden; }
    .header { text-align: center; margin-top: 0.05in; }
    .org { font-size: 30px; font-weight: 500; letter-spacing: 0.3px; }
    .loc { font-size: 18px; margin-top: 6px; }
    .title { margin-top: 0.35in; text-align: center; font-size: 28px; letter-spacing: 0.6px; text-transform: uppercase; line-height: 1.15; }
    .date { text-align: center; margin-top: 0.18in; font-size: 18px; }
    .credit { text-align: center; margin-top: 0.32in; font-size: 15px; line-height: 1.35; }
    .award { text-align: center; }
    .award-label { font-size: 15px; margin-bottom: 10px; }
    .award-name { font-size: 36px; font-style: italic; font-weight: 600; letter-spacing: 0.8px; }
    .signature { text-align: center; margin-bottom: 0.08in; }
    .sig-line { width: 4.8in; margin: 0 auto; border-top: 2px solid #000; padding-top: 8px; font-size: 12px; font-style: italic; }
    @media print { * { -webkit-print-color-adjust: exact; print-color-adjust: exact; } a[href]:after { content: "" !important; } }
  `;

  const html = `
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title></title>
        <style>${css}</style>
      </head>
      <body>
        <div class="page">
          <div>
            <div class="header">
              <div class="org">${escapeHtml(orgName)}</div>
              ${location ? `<div class="loc">${escapeHtml(location)}</div>` : ""}
            </div>

            <div class="title">${escapeHtml(classTitle)}</div>
            <div class="date">${escapeHtml(dateText)}</div>

            <div class="credit">
              ${location ? `<div><em>Site:</em> ${escapeHtml(location)}</div>` : ""}
              ${
                creditHours !== ""
                  ? `<div>
                      ${escapeHtml(creditHours)} hour${Number(creditHours) !== 1 ? "s" : ""}
                      of credit approved by <strong>${escapeHtml(creditTypeCaps)}</strong>
                    </div>`
                  : ""
              }
            </div>
          </div>

          <div class="award">
            <div class="award-label">Awarded to:</div>
            <div class="award-name">${escapeHtml(attendeeName)}</div>
          </div>

          <div class="signature">
            <div class="sig-line">Authorized Signature</div>
          </div>
        </div>
      </body>
    </html>
  `;

  const win = window.open("about:blank", "_blank", "width=1200,height=900");
  if (!win) return false;

  win.document.open();
  win.document.write(html);
  win.document.close();

  win.onload = () => {
    setTimeout(() => {
      win.focus();
      win.print();
    }, 250);
  };

  return true;
}