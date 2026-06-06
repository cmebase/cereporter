import React from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronRight } from "lucide-react";
import { motion } from "framer-motion";

export default function DashboardCard({ 
  title, 
  description, 
  icon: Icon, 
  actions, 
  gradient,
  delay = 0 
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
    >
      <Card className="group relative overflow-hidden bg-white border-slate-200/60 hover:border-slate-300 hover:shadow-xl hover:shadow-slate-200/40 transition-all duration-500">
        {/* Gradient Background Decoration */}
        <div className={`absolute -top-20 -right-20 w-40 h-40 rounded-full ${gradient} opacity-[0.08] group-hover:opacity-[0.15] group-hover:scale-150 transition-all duration-700`} />
        
        <div className="relative p-6">
          {/* Header */}
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className={`w-11 h-11 rounded-xl ${gradient} flex items-center justify-center shadow-lg shadow-slate-200/50`}>
                <Icon className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900 text-lg">{title}</h3>
                <p className="text-sm text-slate-500 mt-0.5">{description}</p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-2">
            {actions.map((action, index) => (
              <Button
                key={index}
                variant="ghost"
                className="w-full justify-between h-11 px-4 text-slate-700 hover:text-slate-900 hover:bg-slate-50 group/btn disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={action.onClick}
                disabled={action.disabled}
              >
                <div className="flex flex-col items-start">
                  <span className="font-medium">{action.label}</span>
                  {action.disabled && <span className="text-xs text-slate-400">Select hospital & year first</span>}
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover/btn:text-slate-600 group-hover/btn:translate-x-1 transition-all" />
              </Button>
            ))}
          </div>
        </div>
      </Card>
    </motion.div>
  );
}