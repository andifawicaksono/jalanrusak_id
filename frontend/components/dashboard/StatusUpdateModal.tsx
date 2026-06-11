'use client';

import { useState } from 'react';
import axios from 'axios';
import { Loader2 } from 'lucide-react';
import apiClient from '@/lib/axios';
import { cn, getStatusLabel } from '@/lib/utils';
import type { ReportStatus } from '@/types';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';

// ─── Valid Status Transitions (mirroring backend) ────────────────────

const VALID_TRANSITIONS: Record<ReportStatus, ReportStatus[]> = {
  PENDING:     ['VERIFIED', 'REJECTED'],
  VERIFIED:    ['IN_PROGRESS', 'REJECTED'],
  IN_PROGRESS: ['RESOLVED', 'REJECTED'],
  RESOLVED:    [],
  REJECTED:    [],
};

const STATUS_COLORS: Record<ReportStatus, string> = {
  PENDING:     'text-yellow-700 bg-yellow-50 border-yellow-200',
  VERIFIED:    'text-blue-700 bg-blue-50 border-blue-200',
  IN_PROGRESS: 'text-orange-700 bg-orange-50 border-orange-200',
  RESOLVED:    'text-green-700 bg-green-50 border-green-200',
  REJECTED:    'text-red-700 bg-red-50 border-red-200',
};

// ─── Types ───────────────────────────────────────────────────────────

export interface ReportToUpdate {
  readonly id: string;
  readonly reportNumber: string;
  readonly title: string;
  readonly currentStatus: ReportStatus;
}

interface StatusUpdateModalProps {
  readonly report: ReportToUpdate | null;
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly onSuccess: () => void;
}

// ─── Component ───────────────────────────────────────────────────────

export default function StatusUpdateModal({
  report,
  open,
  onOpenChange,
  onSuccess,
}: StatusUpdateModalProps) {
  const [selectedStatus, setSelectedStatus] = useState<ReportStatus | ''>('');
  const [notes, setNotes] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validNext = report ? VALID_TRANSITIONS[report.currentStatus] : [];

  function handleOpenChange(open: boolean) {
    if (!open) {
      setSelectedStatus('');
      setNotes('');
      setError(null);
    }
    onOpenChange(open);
  }

  async function handleSubmit() {
    if (!report || !selectedStatus) return;

    setIsLoading(true);
    setError(null);

    try {
      await apiClient.patch(`/reports/${report.id}/status`, {
        status: selectedStatus,
        notes:  notes.trim() || undefined,
      });
      onSuccess();
      handleOpenChange(false);
    } catch (err) {
      const msg = axios.isAxiosError(err)
        ? ((err.response?.data as { error?: string })?.error ?? 'Gagal mengubah status')
        : 'Gagal mengubah status';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }

  if (!report) return null;

  const isFinal = validNext.length === 0;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Update Status Laporan</DialogTitle>
          <DialogDescription className="pt-1">
            <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">
              {report.reportNumber}
            </span>
            {' '}
            <span className="line-clamp-1">{report.title}</span>
          </DialogDescription>
        </DialogHeader>

        {/* Current status */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground shrink-0">Status saat ini:</span>
            <span
              className={cn(
                'px-2.5 py-0.5 rounded-full text-xs font-semibold border',
                STATUS_COLORS[report.currentStatus],
              )}
            >
              {getStatusLabel(report.currentStatus)}
            </span>
          </div>

          {isFinal ? (
            <p className="text-sm text-muted-foreground bg-muted rounded-lg px-3 py-2.5">
              Status ini sudah final dan tidak dapat diubah lagi.
            </p>
          ) : (
            <>
              {/* Status selector */}
              <div className="space-y-1.5">
                <Label>Ubah ke Status</Label>
                <Select
                  value={selectedStatus}
                  onValueChange={(v) => setSelectedStatus(v as ReportStatus)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih status baru..." />
                  </SelectTrigger>
                  <SelectContent>
                    {validNext.map((status) => (
                      <SelectItem key={status} value={status}>
                        <div className="flex items-center gap-2">
                          <span
                            className={cn(
                              'inline-block h-2 w-2 rounded-full',
                              status === 'VERIFIED'    && 'bg-blue-500',
                              status === 'IN_PROGRESS' && 'bg-orange-500',
                              status === 'RESOLVED'    && 'bg-green-500',
                              status === 'REJECTED'    && 'bg-red-500',
                            )}
                          />
                          {getStatusLabel(status)}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Catatan */}
              <div className="space-y-1.5">
                <Label>
                  Catatan{' '}
                  <span className="font-normal text-muted-foreground">
                    {selectedStatus === 'REJECTED' ? '(wajib)' : '(opsional)'}
                  </span>
                </Label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  placeholder={
                    selectedStatus === 'REJECTED'
                      ? 'Jelaskan alasan penolakan...'
                      : 'Tambahkan catatan proses...'
                  }
                  className="w-full px-3 py-2 text-sm border border-input rounded-md bg-background resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>

              {/* Error */}
              {error && (
                <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">
                  {error}
                </p>
              )}
            </>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={isLoading}>
            Batal
          </Button>
          {!isFinal && (
            <Button
              onClick={() => void handleSubmit()}
              disabled={
                !selectedStatus ||
                (selectedStatus === 'REJECTED' && !notes.trim()) ||
                isLoading
              }
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Simpan Perubahan
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
