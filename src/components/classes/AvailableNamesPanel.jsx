import React, { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, Plus, UserPlus } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function AvailableNamesPanel({ 
  participants, 
  selectedIds, 
  onToggleSelect,
  onAddNew,
  onEdit
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [clickedId, setClickedId] = useState(null);

  const filteredParticipants = participants.filter(p =>
    p.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.title?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Card className="h-full">
      <CardHeader className="pb-3 border-b">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">Names</CardTitle>
          <Button size="sm" variant="outline" onClick={onAddNew}>
            <Plus className="w-4 h-4 mr-1" />
            New
          </Button>
        </div>
        <div className="relative mt-3">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Search names..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8 h-9"
          />
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[300px]">
          <div className="p-0">
            {filteredParticipants.length === 0 ? (
              <div className="text-center py-8 text-slate-500 text-sm">
                No available participants
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-slate-100 border-b border-slate-200">
                  <tr>
                    <th className="text-left px-3 py-2 font-semibold text-slate-700">Last Name</th>
                    <th className="text-left px-3 py-2 font-semibold text-slate-700">First Name</th>
                    <th className="text-left px-3 py-2 font-semibold text-slate-700">Degree</th>
                    <th className="w-20"></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredParticipants.map((participant) => (
                    <tr
                      key={participant.id}
                      onClick={() => {
                        onToggleSelect(participant.id);
                        setClickedId(participant.id);
                      }}
                      className={`cursor-pointer border-b border-slate-100 ${
                        selectedIds.includes(participant.id)
                          ? 'bg-indigo-100'
                          : 'hover:bg-slate-50'
                      }`}
                    >
                      <td className="px-3 py-2">
                        <div className="font-medium text-slate-900">
                          {participant.last_name}
                        </div>
                        <div className="text-xs text-slate-400 font-mono">
                          ID: {participant.id}
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        <div className="text-slate-900">
                          {participant.first_name}
                        </div>
                      </td>
                      <td className="px-3 py-2 text-slate-700">
                        {participant.title || ''}
                      </td>
                      <td className="px-3 py-2">
                        {clickedId === participant.id && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              onEdit(participant);
                            }}
                            className="h-7 text-xs"
                          >
                            Edit
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}