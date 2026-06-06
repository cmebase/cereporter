import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from "@/components/ui/command";
import { X, UserPlus, Check, ChevronsUpDown } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export default function SpeakerSelector({ selectedSpeakerIds = [], onChange }) {
  const queryClient = useQueryClient();
  const [showAddModal, setShowAddModal] = useState(false);
  const [newSpeaker, setNewSpeaker] = useState({
    first_name: "",
    last_name: "",
    credentials: "",
    email: "",
    hospital: ""
  });

  const { data: instructors = [] } = useQuery({
    queryKey: ["instructors"],
    queryFn: () => base44.entities.Instructor.list(),
  });

  const createSpeakerMutation = useMutation({
    mutationFn: (data) => base44.entities.Instructor.create(data),
    onSuccess: (newInstructor) => {
      queryClient.invalidateQueries({ queryKey: ["instructors"] });
      // Auto-select the newly created speaker
      onChange([...selectedSpeakerIds, newInstructor.id]);
      setShowAddModal(false);
      setNewSpeaker({ first_name: "", last_name: "", credentials: "", email: "", hospital: "" });
    },
  });

  const activeSpeakers = instructors.filter((i) => i.is_active !== false);
  const selectedSpeakers = activeSpeakers.filter((s) => selectedSpeakerIds.includes(s.id));
  const availableSpeakers = activeSpeakers.filter((s) => !selectedSpeakerIds.includes(s.id));

  const handleSelect = (speakerId) => {
    if (!speakerId) return;
    onChange([...selectedSpeakerIds, speakerId]);
  };

  const handleRemove = (speakerId) => {
    onChange(selectedSpeakerIds.filter((id) => id !== speakerId));
  };

  const handleAddSpeaker = () => {
    if (!newSpeaker.first_name || !newSpeaker.last_name) return;
    createSpeakerMutation.mutate({
      ...newSpeaker,
      is_active: true
    });
  };

  const [searchTerm, setSearchTerm] = useState("");
  const [openCombobox, setOpenCombobox] = useState(false);

  const filteredSpeakers = availableSpeakers.filter((speaker) => {
    const fullName = `${speaker.first_name} ${speaker.last_name}`.toLowerCase();
    const hospital = (speaker.hospital || "").toLowerCase();
    const credentials = (speaker.credentials || "").toLowerCase();
    const term = searchTerm.toLowerCase();
    return fullName.includes(term) || hospital.includes(term) || credentials.includes(term);
  });

  return (
    <div className="space-y-2">
      {/* Selected speakers as chips */}
      {selectedSpeakers.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedSpeakers.map((speaker) => (
            <div
              key={speaker.id}
              className="flex items-center gap-1 bg-indigo-50 text-indigo-700 px-2 py-1 rounded-md text-xs"
            >
              <span className="flex items-center gap-2">
                <span>
                  {speaker.first_name} {speaker.last_name}
                  {speaker.credentials && `, ${speaker.credentials}`}
                </span>
                {speaker.hospital && (
                  <span className="text-slate-400 text-[0.7rem]">
                    {speaker.hospital}
                  </span>
                )}
              </span>
              <button
                type="button"
                onClick={() => handleRemove(speaker.id)}
                className="hover:bg-indigo-100 rounded"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Speaker combobox */}
      <Popover open={openCombobox} onOpenChange={setOpenCombobox}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={openCombobox}
            className="w-full justify-between h-9 text-sm"
          >
            <span className="truncate text-slate-500">Select speaker</span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0" align="start">
          <div className="p-2 border-b">
            <Input
              placeholder="Search by name, credentials, or hospital..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-9"
            />
          </div>
          <Command shouldFilter={false}>
            {filteredSpeakers.length === 0 && <CommandEmpty>No speakers found.</CommandEmpty>}
            <CommandList className="max-h-48">
              {filteredSpeakers.length > 0 && (
              <CommandGroup>
                {filteredSpeakers.map((speaker) => (
                  <CommandItem
                    key={speaker.id}
                    value={speaker.id}
                    onSelect={(currentValue) => {
                      handleSelect(currentValue);
                      setSearchTerm("");
                      setOpenCombobox(false);
                    }}
                  >
                    <div className="flex items-center justify-between gap-3 w-full">
                      <span>
                        {speaker.first_name} {speaker.last_name}
                        {speaker.credentials && `, ${speaker.credentials}`}
                      </span>
                      {speaker.hospital && (
                        <span className="text-slate-400 text-xs flex-shrink-0">
                          {speaker.hospital}
                        </span>
                      )}
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>



      {/* Add Speaker Modal */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Speaker</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm">First Name *</Label>
                <Input
                  value={newSpeaker.first_name}
                  onChange={(e) => setNewSpeaker({ ...newSpeaker, first_name: e.target.value })}
                  placeholder="John"
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-sm">Last Name *</Label>
                <Input
                  value={newSpeaker.last_name}
                  onChange={(e) => setNewSpeaker({ ...newSpeaker, last_name: e.target.value })}
                  placeholder="Smith"
                  className="mt-1"
                />
              </div>
            </div>
            <div>
              <Label className="text-sm">Credentials</Label>
              <Input
                value={newSpeaker.credentials}
                onChange={(e) => setNewSpeaker({ ...newSpeaker, credentials: e.target.value })}
                placeholder="MD, PhD"
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-sm">Email</Label>
              <Input
                type="email"
                value={newSpeaker.email}
                onChange={(e) => setNewSpeaker({ ...newSpeaker, email: e.target.value })}
                placeholder="speaker@example.com"
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-sm">Hospital</Label>
              <Input
                value={newSpeaker.hospital}
                onChange={(e) => setNewSpeaker({ ...newSpeaker, hospital: e.target.value })}
                placeholder="Hospital or organization"
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddModal(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleAddSpeaker}
              disabled={!newSpeaker.first_name || !newSpeaker.last_name || createSpeakerMutation.isPending}
            >
              {createSpeakerMutation.isPending ? "Adding..." : "Add Speaker"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}