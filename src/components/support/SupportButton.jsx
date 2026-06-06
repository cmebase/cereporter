import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { MessageCircleQuestion } from "lucide-react";
import SupportTicketModal from "./SupportTicketModal";

export default function SupportButton() {
  const [modalOpen, setModalOpen] = useState(false);
  const [position, setPosition] = useState(() => {
    const saved = localStorage.getItem('support_button_position');
    return saved ? JSON.parse(saved) : { bottom: 24, right: 24 };
  });
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef(null);
  const offsetRef = useRef({ x: 0, y: 0 });

  const { data: currentUser } = useQuery({
    queryKey: ["currentUser"],
    queryFn: () => base44.auth.me().catch(() => null),
  });

  const { data: tickets = [] } = useQuery({
    queryKey: ["supportTickets", currentUser?.email],
    queryFn: () => base44.entities.SupportTicket.list(),
    enabled: !!currentUser?.email,
  });

  const unresolvedCount = tickets.filter(
    (t) => t.submitted_by_email === currentUser?.email && t.status !== "closed" && t.status !== "resolved"
  ).length;

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isDragging) return;
      
      const newBottom = window.innerHeight - e.clientY - offsetRef.current.y;
      const newRight = window.innerWidth - e.clientX - offsetRef.current.x;
      
      setPosition({
        bottom: Math.max(0, Math.min(window.innerHeight - 56, newBottom)),
        right: Math.max(0, Math.min(window.innerWidth - 56, newRight))
      });
    };

    const handleMouseUp = () => {
      if (isDragging) {
        setIsDragging(false);
        localStorage.setItem('support_button_position', JSON.stringify(position));
      }
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, position]);

  const handleMouseDown = (e) => {
    if (e.button !== 0) return;
    
    const rect = dragRef.current.getBoundingClientRect();
    offsetRef.current = {
      x: rect.width / 2,
      y: rect.height / 2
    };
    
    setIsDragging(true);
    e.preventDefault();
  };

  const btn = (
    <div 
      ref={dragRef}
      className="fixed z-[2147483647] pointer-events-auto"
      style={{
        bottom: `${position.bottom}px`,
        right: `${position.right}px`,
        cursor: isDragging ? 'grabbing' : 'grab'
      }}
      onMouseDown={handleMouseDown}
    >
      <Button
        onClick={(e) => {
          if (!isDragging) {
            setModalOpen(true);
          }
        }}
        className="relative rounded-full w-14 h-14 !bg-black !text-white hover:!bg-black shadow-lg"
        title="Get Support - Drag to move"
      >
        <MessageCircleQuestion className="w-6 h-6" />
        {unresolvedCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
            {unresolvedCount}
          </span>
        )}
      </Button>
    </div>
  );

  return (
    <>
      {typeof document !== "undefined" ? createPortal(btn, document.body) : null}
      <SupportTicketModal 
        open={modalOpen} 
        onClose={() => setModalOpen(false)} 
      />
    </>
  );
}