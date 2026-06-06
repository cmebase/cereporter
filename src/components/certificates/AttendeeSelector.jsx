import React from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CheckSquare } from "lucide-react";

export default function AttendeeSelector({ attendees, selectedIds, onToggle, onSelectAll, onAttendeeClick }) {
  const eligibleAttendees = attendees?.filter(a => 
    a.status === 'attended' || a.status === 'passed'
  ) || [];

  return (
    <Card className="h-full flex flex-col">
      <div className="p-4 border-b bg-slate-50">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-sm">Select Attendees to Print</h3>
          <Button 
            onClick={onSelectAll}
            variant="outline" 
            size="sm"
            className="h-7 text-xs"
          >
            <CheckSquare className="w-3 h-3 mr-1" />
            All Names
          </Button>
        </div>
        <p className="text-xs text-slate-500">
          {selectedIds.length} of {eligibleAttendees.length} selected
        </p>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {eligibleAttendees.length === 0 ? (
            <div className="text-center py-8 text-slate-500 text-sm">
              No eligible attendees
            </div>
          ) : (
            eligibleAttendees.map((attendee) => (
              <div
                key={attendee.id}
                onClick={() => onAttendeeClick(attendee)}
                className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded cursor-pointer"
              >
                <Checkbox
                  checked={selectedIds.includes(attendee.id)}
                  onCheckedChange={() => onToggle(attendee.id)}
                  onClick={(e) => e.stopPropagation()}
                />
                <div className="flex-1 text-sm">
                  <div className="font-medium text-slate-900">
                    {attendee.participant_name}
                  </div>
                  <div className="text-xs text-slate-500">
                    Status: {attendee.status}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </Card>
  );
}