import React, { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, ArrowRight, Building2 } from "lucide-react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";

export default function RecordsCard() {
  const navigate = useNavigate();
  const currentYear = new Date().getFullYear();
  const [hospital, setHospital] = useState('');
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [activeContext, setActiveContext] = useState(null);

  useEffect(() => {
    const stored = sessionStorage.getItem('ce_context');
    if (stored) {
      setActiveContext(JSON.parse(stored));
    }
  }, []);

  const { data: hospitals } = useQuery({
    queryKey: ['hospitals'],
    queryFn: () => base44.entities.Hospital.list(),
  });

  const handleViewRecords = () => {
    if (!hospital) {
      return;
    }
    
    const selectedHospital = hospitals.find(h => h.name === hospital);
    
    // Store in sessionStorage for persistence
    sessionStorage.setItem('ce_context', JSON.stringify({
      hospital_id: selectedHospital.id,
      hospital_name: hospital,
      year: selectedYear
    }));
    
    // Trigger re-render by reloading
    window.location.reload();
  };

  const handleClearContext = () => {
    sessionStorage.removeItem('ce_context');
    window.location.reload();
  };

  if (activeContext) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
      >
        <Card className="relative overflow-hidden bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-200/60">
          <div className="absolute -top-20 -right-20 w-40 h-40 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 opacity-10" />
          
          <div className="relative p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-emerald-900 mb-1">Active Context</h3>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-emerald-600" />
                    <span className="text-lg font-semibold text-emerald-900">{activeContext.hospital_name}</span>
                  </div>
                  <span className="text-emerald-300">•</span>
                  <span className="text-lg font-semibold text-emerald-900">{activeContext.year}</span>
                </div>
                <p className="text-sm text-emerald-700 mt-2">
                  All modules now scoped to this hospital and year
                </p>
              </div>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={handleClearContext}
                  className="border-emerald-300 text-emerald-700 hover:bg-emerald-100"
                >
                  Change
                </Button>
                <Button 
                  size="sm"
                  onClick={() => navigate(createPageUrl("Records"))}
                  className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white shadow-lg shadow-emerald-500/25"
                >
                  View Records
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>
          </div>
        </Card>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.3 }}
    >
      <Card className="relative overflow-hidden bg-white border-slate-200/60 hover:border-slate-300 hover:shadow-xl hover:shadow-slate-200/40 transition-all duration-500">
        {/* Gradient Background Decoration */}
        <div className="absolute -top-20 -right-20 w-40 h-40 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 opacity-[0.08]" />
        
        <div className="relative p-6">
          {/* Header */}
          <div className="flex items-center gap-3 mb-6">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 text-lg">View Records</h3>
              <p className="text-sm text-slate-500 mt-0.5">Access CE records by year</p>
            </div>
          </div>

          {/* Hospital and Year Inputs */}
          <div className="flex items-end gap-4">
            <div className="flex-1">
              <Label className="text-sm font-medium mb-2 block">Hospital</Label>
              <Select value={hospital} onValueChange={setHospital}>
                <SelectTrigger className="h-10">
                  <SelectValue placeholder="Select hospital" />
                </SelectTrigger>
                <SelectContent>
                  {hospitals?.filter(h => h.is_active !== false).map((hosp) => (
                    <SelectItem key={hosp.id} value={hosp.name}>
                      {hosp.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="w-32">
              <Label className="text-sm font-medium mb-2 block">Year</Label>
              <Input
                type="number"
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value) || currentYear)}
                className="h-10"
              />
            </div>
            <Button 
              onClick={handleViewRecords}
              disabled={!hospital}
              className="h-10 px-6 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              View Records
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}