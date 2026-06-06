import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertCircle } from "lucide-react";

export default function QuickAddParticipantModal({ 
  open, 
  onClose, 
  onCreateAndEdit,
  onAddExisting,
  existingParticipants = []
}) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [matches, setMatches] = useState([]);

  useEffect(() => {
    if (!firstName && !lastName) {
      setMatches([]);
      return;
    }

    const fn = firstName.trim().toLowerCase();
    const ln = lastName.trim().toLowerCase();

    const found = existingParticipants.filter(p => {
      const pFirst = (p.first_name || "").toLowerCase();
      const pLast = (p.last_name || "").toLowerCase();
      
      // Match if both first and last name match partially or fully
      const firstMatch = fn && pFirst.includes(fn);
      const lastMatch = ln && pLast.includes(ln);
      
      return (firstMatch && lastMatch) || (pFirst === fn && pLast === ln);
    });

    setMatches(found);
  }, [firstName, lastName, existingParticipants]);

  const handleCreate = () => {
    if (!firstName.trim() || !lastName.trim()) return;
    onCreateAndEdit({ first_name: firstName.trim(), last_name: lastName.trim() });
    setFirstName("");
    setLastName("");
  };

  const handleAddExisting = (participant) => {
    onAddExisting(participant);
    setFirstName("");
    setLastName("");
  };

  const handleClose = () => {
    setFirstName("");
    setLastName("");
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Participant to Class</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <Label>First Name</Label>
            <Input 
              value={firstName} 
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="Enter first name"
              autoFocus
            />
          </div>

          <div>
            <Label>Last Name</Label>
            <Input 
              value={lastName} 
              onChange={(e) => setLastName(e.target.value)}
              placeholder="Enter last name"
            />
          </div>

          {matches.length > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="flex items-start gap-2 mb-2">
                <AlertCircle className="w-4 h-4 text-blue-600 mt-0.5" />
                <div className="text-sm font-medium text-blue-900">
                  Did you mean this person?
                </div>
              </div>
              <div className="space-y-2 max-h-48 overflow-auto">
                {matches.map(match => (
                  <div key={match.id} className="flex items-center justify-between bg-white p-2 rounded border hover:border-blue-300 transition-colors">
                    <div className="text-sm">
                      <div className="font-medium">{match.first_name} {match.last_name}</div>
                      <div className="text-xs text-slate-500">{match.title || "No title"}</div>
                      <div className="text-xs text-slate-400 font-mono">ID: {match.id}</div>
                    </div>
                    <Button 
                      size="sm" 
                      onClick={() => handleAddExisting(match)}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      Yes, Add This One
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleCreate}
            disabled={!firstName.trim() || !lastName.trim()}
          >
            {matches.length > 0 ? "Create New Anyway" : "Create & Edit Details"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}