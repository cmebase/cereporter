import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Plus, Trash2, Copy } from 'lucide-react';

export default function StatementLibrary({ hospital_id, statement_type, onSelect, currentValue }) {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newText, setNewText] = useState('');

  // Fetch saved statements
  const { data: statements = [], isLoading } = useQuery({
    queryKey: ['statements', hospital_id, statement_type],
    queryFn: async () => {
      try {
        if (!hospital_id) return [];
        const all = await base44.entities.CertificateStatement.list();
        return all.filter(s => s.hospital_id === hospital_id && s.statement_type === statement_type);
      } catch (err) {
        console.error('Failed to load statements:', err);
        return [];
      }
    },
    enabled: !!hospital_id
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!newName.trim() || !newText.trim()) {
        throw new Error('Name and text are required');
      }
      return base44.entities.CertificateStatement.create({
        hospital_id,
        statement_type,
        name: newName,
        text: newText
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['statements', hospital_id, statement_type] });
      toast.success('Statement saved');
      setNewName('');
      setNewText('');
      setDialogOpen(false);
    },
    onError: (err) => toast.error(err.message || 'Failed to save statement')
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.CertificateStatement.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['statements', hospital_id, statement_type] });
      toast.success('Statement deleted');
    },
    onError: () => toast.error('Failed to delete statement')
  });

  const shortcodes = [
    { code: '{participant_name}', desc: 'Full name of participant' },
    { code: '{participant_title}', desc: 'Professional title' },
    { code: '{activity_title}', desc: 'Name of the activity/class' },
    { code: '{activity_date}', desc: 'Date of activity' },
    { code: '{credit_hours}', desc: 'Number of credit hours' },
    { code: '{hospital_name}', desc: 'Hospital/organization name' },
  ];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="font-semibold">Saved Statements</Label>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline">
              <Plus className="w-3 h-3 mr-1" />
              New
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Save New Statement</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Name</Label>
                <Input 
                  placeholder="e.g., Standard 2025"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                />
              </div>
              <div>
                <Label>Statement Text</Label>
                <Textarea 
                  placeholder="Enter the statement text..."
                  value={newText}
                  onChange={(e) => setNewText(e.target.value)}
                  className="min-h-32"
                />
                <div className="mt-3 p-3 bg-slate-50 rounded-lg">
                  <p className="text-xs font-medium text-slate-700 mb-2">Available Shortcodes:</p>
                  <div className="grid grid-cols-2 gap-2">
                    {shortcodes.map((sc) => (
                      <div key={sc.code} className="text-xs">
                        <code className="bg-slate-200 px-1 py-0.5 rounded text-slate-900">{sc.code}</code>
                        <p className="text-slate-600 mt-0.5">{sc.desc}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <Button 
                onClick={() => saveMutation.mutate()} 
                disabled={saveMutation.isPending}
                className="w-full"
              >
                Save Statement
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <p className="text-xs text-slate-400">Loading statements...</p>
      ) : statements.length === 0 ? (
        <p className="text-xs text-slate-400">No saved statements yet</p>
      ) : (
        <div className="space-y-2">
          {statements.map(stmt => (
            <div key={stmt.id} className="flex items-start gap-2 p-2 bg-slate-50 rounded-lg">
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium">{stmt.name}</p>
                <p className="text-xs text-slate-600 line-clamp-1">{stmt.text}</p>
              </div>
              <div className="flex gap-1 flex-shrink-0">
                <Button 
                  size="sm" 
                  variant="ghost" 
                  onClick={() => {
                    onSelect(stmt.text);
                    toast.success('Statement selected');
                  }}
                >
                  <Copy className="w-3 h-3" />
                </Button>
                <Button 
                  size="sm" 
                  variant="ghost" 
                  onClick={() => deleteMutation.mutate(stmt.id)}
                  className="text-red-600"
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}