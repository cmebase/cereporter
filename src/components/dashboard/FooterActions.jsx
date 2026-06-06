import React from "react";
import { Button } from "@/components/ui/button";
import { Settings, Wrench, LogOut } from "lucide-react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";

export default function FooterActions() {
  const navigate = useNavigate();

  const handleExit = () => {
    base44.auth.logout();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.4 }}
      className="flex items-center justify-center gap-4"
    >
      <Button
        variant="outline"
        className="h-12 px-6 border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700"
        onClick={() => navigate(createPageUrl("Properties"))}
      >
        <Settings className="w-4 h-4 mr-2" />
        Properties
      </Button>
      <Button
        variant="outline"
        className="h-12 px-6 border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700"
        onClick={() => navigate(createPageUrl("Utilities"))}
      >
        <Wrench className="w-4 h-4 mr-2" />
        Utilities
      </Button>
      <Button
        variant="outline"
        className="h-12 px-6 border-red-100 hover:border-red-200 hover:bg-red-50 text-red-600"
        onClick={handleExit}
      >
        <LogOut className="w-4 h-4 mr-2" />
        Exit
      </Button>
    </motion.div>
  );
}