import React, { useState } from "react";
import { Wrench, Download, Upload, RefreshCw, Database, FileText, Users, BookOpen, Image } from "lucide-react";
import PageHeader from "../components/management/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import ManagementTable from "../components/management/ManagementTable";
import PhotoModal from "../components/management/PhotoModal";

export default function Utilities() {
  const [photoModalOpen, setPhotoModalOpen] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const { data: records } = useQuery({
    queryKey: ['ceRecords'],
    queryFn: () => base44.entities.CERecord.list(),
  });

  const { data: participants } = useQuery({
    queryKey: ['participants'],
    queryFn: () => base44.entities.Participant.list(),
  });

  const { data: classes } = useQuery({
    queryKey: ['ceClasses'],
    queryFn: () => base44.entities.CEClass.list(),
  });

  const { data: photos, refetch: refetchPhotos } = useQuery({
    queryKey: ['photos'],
    queryFn: () => base44.entities.Photo.list(),
  });

  const stats = [
    { label: 'Total Records', value: records?.length || 0, icon: FileText },
    { label: 'Participants', value: participants?.length || 0, icon: Users },
    { label: 'CE Classes', value: classes?.length || 0, icon: BookOpen },
  ];

  const exportData = (type) => {
    toast.success(`Export ${type} started`);
    // In a real app, this would trigger a CSV/Excel export
  };

  const utilities = [
    {
      title: 'Export Records',
      description: 'Download CE records as CSV or Excel file',
      icon: Download,
      action: () => exportData('records'),
      color: 'from-emerald-500 to-teal-600',
    },
    {
      title: 'Export Participants',
      description: 'Download participant list as CSV or Excel file',
      icon: Users,
      action: () => exportData('participants'),
      color: 'from-blue-500 to-cyan-600',
    },
    {
      title: 'Export Classes',
      description: 'Download class catalog as CSV or Excel file',
      icon: BookOpen,
      action: () => exportData('classes'),
      color: 'from-violet-500 to-purple-600',
    },
    {
      title: 'Refresh Data',
      description: 'Sync and refresh all cached data',
      icon: RefreshCw,
      action: () => {
        window.location.reload();
      },
      color: 'from-amber-500 to-orange-600',
    },
  ];

  return (
    <div>
      <PageHeader
        title="Utilities"
        description="System maintenance and administration tools"
        icon={Wrench}
      />

      {/* Stats Overview */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8"
      >
        {stats.map((stat, index) => (
          <Card key={index} className="p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center">
              <stat.icon className="w-6 h-6 text-slate-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
              <p className="text-sm text-slate-500">{stat.label}</p>
            </div>
          </Card>
        ))}
      </motion.div>

      {/* Utility Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {utilities.map((utility, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 + index * 0.1 }}
          >
            <Card className="p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${utility.color} flex items-center justify-center shadow-lg`}>
                    <utility.icon className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900">{utility.title}</h3>
                    <p className="text-sm text-slate-500 mt-1">{utility.description}</p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={utility.action}
                  className="shrink-0"
                >
                  Run
                </Button>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Photo Management */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
        className="mt-8"
      >
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <Image className="w-5 h-5 text-slate-600" />
            <h3 className="font-semibold text-slate-900">Photo Library</h3>
          </div>
          <ManagementTable
            data={photos || []}
            columns={[
              { key: 'title', label: 'Title' },
              { key: 'category', label: 'Category' },
              { key: 'url', label: 'URL', render: (url) => (
                <a href={url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline truncate block max-w-xs">
                  {url}
                </a>
              )}
            ]}
            onAdd={() => {
              setSelectedPhoto(null);
              setPhotoModalOpen(true);
            }}
            onEdit={(photo) => {
              setSelectedPhoto(photo);
              setPhotoModalOpen(true);
            }}
            onDelete={async (photo) => {
              await base44.entities.Photo.delete(photo.id);
              refetchPhotos();
              toast.success('Photo deleted');
            }}
            searchKeys={['title', 'category', 'url']}
          />
        </Card>
      </motion.div>

      {/* Database Info */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
        className="mt-8"
      >
        <Card className="p-6 bg-slate-50/50">
          <div className="flex items-center gap-3 mb-4">
            <Database className="w-5 h-5 text-slate-600" />
            <h3 className="font-semibold text-slate-900">Database Information</h3>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-slate-500">Credits</p>
              <p className="font-medium text-slate-900">Active</p>
            </div>
            <div>
              <p className="text-slate-500">Instructors</p>
              <p className="font-medium text-slate-900">Active</p>
            </div>
            <div>
              <p className="text-slate-500">Methods</p>
              <p className="font-medium text-slate-900">Active</p>
            </div>
            <div>
              <p className="text-slate-500">Specialties</p>
              <p className="font-medium text-slate-900">Active</p>
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Photo Modal */}
      <PhotoModal
        open={photoModalOpen}
        onClose={() => {
          setPhotoModalOpen(false);
          setSelectedPhoto(null);
        }}
        photo={selectedPhoto}
        onSave={async (data) => {
          if (selectedPhoto) {
            await base44.entities.Photo.update(selectedPhoto.id, data);
            toast.success('Photo updated');
          } else {
            await base44.entities.Photo.create(data);
            toast.success('Photo added');
          }
          refetchPhotos();
          setPhotoModalOpen(false);
          setSelectedPhoto(null);
        }}
      />
    </div>
  );
}