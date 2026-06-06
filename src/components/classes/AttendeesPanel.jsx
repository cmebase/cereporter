import React, { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, X } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import ParticipantCESummary from "../participants/ParticipantCESummary";

const statusConfig = {
  attended: { label: 'Attended', color: 'bg-green-100 text-green-700 border-green-300' },
  passed: { label: 'Passed', color: 'bg-blue-100 text-blue-700 border-blue-300' },
  failed: { label: 'Failed', color: 'bg-red-100 text-red-700 border-red-300' },
  'pre-registered': { label: 'Pre-Reg', color: 'bg-amber-100 text-amber-700 border-amber-300' },
};

export default function AttendeesPanel({ 
  attendees, 
  onRemove,
  onStatusChange,
  participants = [],
  selectedAttendeeId,
  onSelectAttendee
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [ceSummaryOpen, setCESummaryOpen] = useState(false);
  const [ceSummaryParticipantId, setCESummaryParticipantId] = useState(null);

  const filteredAttendees = attendees?.filter(a =>
    a.participant_name?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  return (
    <Card className="h-full">
      <CardHeader className="pb-3 border-b">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">
            Attendees – {attendees?.length || 0}
          </CardTitle>
        </div>
        <div className="relative mt-3">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Search attendees..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8 h-9"
          />
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[300px]">
          <div className="p-0">
            {filteredAttendees.length === 0 ? (
              <div className="text-center py-8 text-slate-500 text-sm">
                No attendees assigned
              </div>
            ) : (
              <table className="w-full text-sm">
                <tbody>
                  {filteredAttendees.map((attendee, idx) => {
                    const participant = participants.find(p => p.id === attendee.participant_id);
                    const lastName = participant?.last_name || '';
                    const firstName = participant?.first_name || '';
                    const degree = participant?.title || '';
                    
                    return (
                      <tr
                        key={attendee.id}
                        onClick={() => onSelectAttendee?.(attendee.id)}
                        className={`border-b border-slate-100 cursor-pointer ${
                          selectedAttendeeId === attendee.id 
                            ? 'bg-indigo-100' 
                            : 'hover:bg-slate-50'
                        }`}
                        onDoubleClick={() => {
                          setCESummaryParticipantId(attendee.participant_id);
                          setCESummaryOpen(true);
                        }}
                      >
                        <td className="px-3 py-2">
                          <div className="font-medium text-slate-900">{lastName}</div>
                          <div className="text-xs text-slate-400 font-mono">ID: {attendee.participant_id}</div>
                        </td>
                        <td className="px-3 py-2">
                          <div className="text-slate-900">{firstName}</div>
                          {degree && <div className="text-xs text-slate-500">{degree}</div>}
                        </td>
                        <td className="px-3 py-2 text-right">
                          <div className="flex items-center gap-2 justify-end">
                            <Badge className={statusConfig[attendee.status]?.color || 'bg-slate-100'}>
                              {statusConfig[attendee.status]?.label || attendee.status}
                            </Badge>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-slate-400 hover:text-red-600"
                              onClick={() => onRemove(attendee.id)}
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </ScrollArea>
      </CardContent>

      <ParticipantCESummary
        open={ceSummaryOpen}
        participantId={ceSummaryParticipantId}
        onClose={() => setCESummaryOpen(false)}
      />
    </Card>
  );
}