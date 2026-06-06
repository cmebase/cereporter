import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import jsPDF from "jspdf";
import { format } from "date-fns";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FileText } from "lucide-react";

/**
 * HospitalTranscriptModal
 * Generates a hospital-wide transcript showing all participants and their CE credits
 */

export default function HospitalTranscriptModal({ open, onClose }) {
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [isPrinting, setIsPrinting] = useState(false);
  const [pdfData, setPdfData] = useState(null);
  const [showViewer, setShowViewer] = useState(false);

  const { data: participants = [] } = useQuery({
    queryKey: ["participants"],
    queryFn: () => base44.entities.Participant.list(),
    enabled: open,
  });

  const { data: ceRecords = [], isLoading: loadingRecords } = useQuery({
    queryKey: ["ceRecords"],
    queryFn: () => base44.entities.CERecord.list(),
    enabled: open,
  });

  const { data: hospital, isLoading: loadingHospital } = useQuery({
    queryKey: ["hospital"],
    queryFn: async () => {
      const context = sessionStorage.getItem("ce_context");
      if (!context) return null;
      const { hospital_id } = JSON.parse(context);
      const hospitals = await base44.entities.Hospital.list();
      return hospitals.find((h) => h.id === hospital_id) || null;
    },
    enabled: open,
  });

  const handlePrint = () => {
    if (isPrinting) return;

    console.log("🔍 handlePrint called", { fromDate, toDate, hospital, ceRecordsLength: ceRecords?.length });

    if (!fromDate || !toDate) {
      toast.error("Please select both From and To dates.");
      return;
    }

    if (!hospital) {
      console.error("❌ Hospital not loaded");
      toast.error("Hospital data not loaded");
      return;
    }

    if (!ceRecords || ceRecords.length === 0) {
      console.error("❌ No CE records");
      toast.error("No CE records loaded");
      return;
    }

    setIsPrinting(true);
    console.log("📄 Starting PDF generation...");

    try {
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'in',
        format: 'letter'
      });

      const from = new Date(fromDate);
      const to = new Date(toDate);

      // Filter active participants who have records in the date range
      const activeParticipants = participants.filter(p => p.is_active !== false);
      
      const participantsWithRecords = activeParticipants.map(participant => {
        const participantRecords = ceRecords.filter(r => {
          if (r.participant_id !== participant.id) return false;
          if (!r.date) return false;
          const recordDate = new Date(r.date);
          return recordDate >= from && recordDate <= to;
        });

        if (participantRecords.length === 0) return null;

        const totalClasses = participantRecords.length;
        const totalUnits = participantRecords.reduce((sum, r) => sum + (parseFloat(r.credit_hours) || 0), 0);

        // Group credits by type
        const creditsByType = {};
        participantRecords.forEach((r) => {
          const type = r.credit_type || "Unknown";
          const hours = parseFloat(r.credit_hours) || 0;
          creditsByType[type] = (creditsByType[type] || 0) + hours;
        });

        return {
          participant,
          totalClasses,
          totalUnits,
          creditsByType,
          records: participantRecords
        };
      }).filter(Boolean);

      if (participantsWithRecords.length === 0) {
        console.error("❌ No participants with records in date range");
        toast.error("No CE records found in selected date range");
        setIsPrinting(false);
        return;
      }
      
      console.log("✅ Found participants with records:", participantsWithRecords.length);

      // Sort by last name, first name
      participantsWithRecords.sort((a, b) => {
        const lastA = (a.participant.last_name || "").toUpperCase();
        const lastB = (b.participant.last_name || "").toUpperCase();
        if (lastA !== lastB) return lastA.localeCompare(lastB);
        return (a.participant.first_name || "").toUpperCase().localeCompare((b.participant.first_name || "").toUpperCase());
      });

      // Calculate hospital totals
      const hospitalTotalClasses = participantsWithRecords.reduce((sum, p) => sum + p.totalClasses, 0);
      const hospitalTotalUnits = participantsWithRecords.reduce((sum, p) => sum + p.totalUnits, 0);
      
      const hospitalCreditsByType = {};
      participantsWithRecords.forEach(({ creditsByType }) => {
        Object.entries(creditsByType).forEach(([type, hours]) => {
          hospitalCreditsByType[type] = (hospitalCreditsByType[type] || 0) + hours;
        });
      });

      let yPos = 1.0;

      // Header - Hospital Name
      pdf.setFont('times', 'bolditalic');
      pdf.setFontSize(18);
      pdf.text(hospital.profile_name || hospital.name || "", 5.5, yPos, { align: 'center' });
      yPos += 0.2;

      // City/State
      pdf.setFont('times', 'italic');
      pdf.setFontSize(14);
      if (hospital.city_state) {
        pdf.text(hospital.city_state, 5.5, yPos, { align: 'center' });
        yPos += 0.2;
      }

      // Title
      pdf.setFont('times', 'bold');
      pdf.setFontSize(16);
      pdf.text("Hospital-Wide CE Activity Transcript", 5.5, yPos, { align: 'center' });
      yPos += 0.18;

      // Date range
      pdf.setFont('times', 'italic');
      pdf.setFontSize(12);
      const fromStr = format(from, 'MM-dd-yyyy');
      const toStr = format(to, 'MM-dd-yyyy');
      pdf.text(`${fromStr} - ${toStr}`, 5.5, yPos, { align: 'center' });
      yPos += 0.4;

      // Summary Box
      pdf.setFont('times', 'normal');
      pdf.setFontSize(11);
      pdf.text(`Total Participants: ${participantsWithRecords.length}`, 0.75, yPos);
      yPos += 0.18;
      pdf.text(`Total Classes Attended: ${hospitalTotalClasses}`, 0.75, yPos);
      yPos += 0.18;
      pdf.text(`Total CE Units Awarded: ${hospitalTotalUnits}`, 0.75, yPos);
      yPos += 0.18;
      pdf.text("Credits by Type:", 0.75, yPos);
      yPos += 0.18;

      Object.entries(hospitalCreditsByType)
        .sort(([a], [b]) => a.localeCompare(b))
        .forEach(([type, hours]) => {
          pdf.text(`  ${type}: ${hours}`, 0.75, yPos);
          yPos += 0.18;
        });

      yPos += 0.3;

      // Table header
      pdf.setFont('times', 'bold');
      pdf.setFontSize(10);
      pdf.text("Name", 0.75, yPos);
      pdf.text("Title", 2.5, yPos);
      pdf.text("Specialty", 3.8, yPos);
      pdf.text("Classes", 5.5, yPos);
      pdf.text("Total Units", 6.4, yPos);
      pdf.text("Credits", 7.5, yPos);
      yPos += 0.05;
      pdf.setLineWidth(0.01);
      pdf.line(0.75, yPos, 10.25, yPos);
      yPos += 0.2;

      // Table rows
      pdf.setFont('times', 'normal');
      pdf.setFontSize(9);
      
      participantsWithRecords.forEach(({ participant, totalClasses, totalUnits, creditsByType }) => {
        if (yPos > 7.5) {
          pdf.addPage();
          yPos = 1.0;
        }

        const fullName = `${participant.last_name || ""}, ${participant.first_name || ""}`;
        const nameLines = pdf.splitTextToSize(fullName, 1.6);
        pdf.text(nameLines, 0.75, yPos);

        const titleLines = pdf.splitTextToSize(participant.title || "", 1.2);
        pdf.text(titleLines, 2.5, yPos);

        const specialtyLines = pdf.splitTextToSize(participant.specialty || "", 1.6);
        pdf.text(specialtyLines, 3.8, yPos);

        pdf.text(String(totalClasses), 5.5, yPos);
        pdf.text(String(totalUnits), 6.4, yPos);

        // Format credits (multiple lines if needed)
        const creditsText = Object.entries(creditsByType)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([type, hours]) => `${type}: ${hours}`)
          .join(", ");
        const creditsLines = pdf.splitTextToSize(creditsText, 2.6);
        pdf.text(creditsLines, 7.5, yPos);

        const maxLines = Math.max(nameLines.length, titleLines.length, specialtyLines.length, creditsLines.length);
        yPos += maxLines * 0.12 + 0.08;
      });

      const fileName = `Hospital_Transcript_${fromStr.replace(/\//g, '-')}_to_${toStr.replace(/\//g, '-')}.pdf`;
      
      // Get PDF data and show viewer
      const pdfOutput = pdf.output('arraybuffer');
      console.log("✅ PDF generated, output size:", pdfOutput.byteLength);
      console.log("✅ Setting PDF data and showing viewer...");
      setPdfData(pdfOutput);
      setShowViewer(true);
      console.log("✅ State updated - showViewer:", true, "pdfData size:", pdfOutput.byteLength);
      toast.success("Hospital transcript generated successfully!");
    } catch (e) {
      console.error("PDF generation error:", e);
      toast.error(e.message || "PDF generation failed");
    } finally {
      setIsPrinting(false);
    }
  };

  return (
    <>
      {showViewer && pdfData && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-4xl rounded-lg shadow-2xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <div className="font-semibold text-slate-900 truncate">{`Hospital_Transcript_${format(new Date(fromDate), 'MM-dd-yyyy')}_to_${format(new Date(toDate), 'MM-dd-yyyy')}.pdf`}</div>
              <button
                className="px-3 py-1.5 rounded-md border text-slate-700 hover:bg-slate-50"
                onClick={() => {
                  setShowViewer(false);
                  setPdfData(null);
                  onClose();
                }}
              >
                Close
              </button>
            </div>
            <div className="flex-1 overflow-auto bg-slate-50 p-4">
              <iframe
                src={`data:application/pdf;base64,${btoa(String.fromCharCode(...new Uint8Array(pdfData)))}`}
                className="w-full h-full border-0"
                title="Hospital Transcript"
              />
            </div>
          </div>
        </div>
      )}

      <Dialog open={open && !showViewer} onOpenChange={(isOpen) => !isOpen && onClose()}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-indigo-100 flex items-center justify-center">
                <FileText className="w-6 h-6 text-indigo-600" />
              </div>
              <div>
                <DialogTitle className="text-lg font-semibold">Transcript Date Range</DialogTitle>
                <p className="text-sm text-slate-600">Select the period for transcript generation</p>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div>
              <label className="text-sm font-medium text-indigo-600 mb-2 block">• Start Date</label>
              <Input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="w-full"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-indigo-600 mb-2 block">• End Date</label>
              <Input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="w-full"
              />
            </div>

            {fromDate && toDate && (
              <div className="bg-indigo-50 border border-indigo-100 rounded-lg px-4 py-3">
                <p className="text-sm text-indigo-900">
                  <span className="font-medium">Date Range:</span>{" "}
                  {format(new Date(fromDate), 'MMM d, yyyy')} → {format(new Date(toDate), 'MMM d, yyyy')}
                </p>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={onClose} type="button">
              Cancel
            </Button>
            <Button 
              onClick={handlePrint} 
              disabled={loadingRecords || loadingHospital || isPrinting || !fromDate || !toDate} 
              type="button"
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              <FileText className="w-4 h-4 mr-2" />
              {isPrinting ? "Generating..." : "Preview Transcript"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}