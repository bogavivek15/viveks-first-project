import { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { compressExamPhoto, formatBytes, CompressionResult } from '@/lib/image-compression';
import { toast } from 'sonner';
import {
  Camera,
  Upload,
  RefreshCw,
  Trash2,
  CheckCircle2,
  AlertCircle,
  FileImage,
  Eye,
  Loader2,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

export interface PaperSlotData {
  slotIndex: number;
  dbId?: string;
  examYear: number;
  frontFile: File | null;
  frontPreview: string | null;
  frontStats: CompressionResult | null;
  backFile: File | null;
  backPreview: string | null;
  backStats: CompressionResult | null;
  status: 'draft' | 'uploading' | 'uploaded' | 'processing_ocr' | 'review_required' | 'verified' | 'failed';
  errorMessage?: string;
}

interface PaperUploadCardProps {
  slot: PaperSlotData;
  onChange: (updated: PaperSlotData) => void;
  onRemove?: () => void;
  disabled?: boolean;
}

export function PaperUploadCard({ slot, onChange, onRemove, disabled }: PaperUploadCardProps) {
  const frontInputRef = useRef<HTMLInputElement>(null);
  const backInputRef = useRef<HTMLInputElement>(null);

  const [compressingFront, setCompressingFront] = useState(false);
  const [compressingBack, setCompressingBack] = useState(false);
  const [previewModalUrl, setPreviewModalUrl] = useState<string | null>(null);

  const handleYearChange = (val: string) => {
    const year = parseInt(val) || new Date().getFullYear();
    onChange({ ...slot, examYear: year });
  };

  const handleFileSelect = async (file: File, side: 'front' | 'back') => {
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file (JPG, PNG, WebP)');
      return;
    }

    try {
      if (side === 'front') {
        setCompressingFront(true);
        const result = await compressExamPhoto(file);
        onChange({
          ...slot,
          frontFile: result.file,
          frontPreview: result.previewUrl,
          frontStats: result,
          status: 'draft',
        });
        toast.success(`Front photo compressed: ${formatBytes(result.originalSizeBytes)} → ${formatBytes(result.compressedSizeBytes)} (-${result.reductionPercentage}%)`);
      } else {
        setCompressingBack(true);
        const result = await compressExamPhoto(file);
        onChange({
          ...slot,
          backFile: result.file,
          backPreview: result.previewUrl,
          backStats: result,
          status: 'draft',
        });
        toast.success(`Back photo compressed: ${formatBytes(result.originalSizeBytes)} → ${formatBytes(result.compressedSizeBytes)} (-${result.reductionPercentage}%)`);
      }
    } catch (err: any) {
      console.error('Compression error:', err);
      toast.error(`Failed to process ${side} photo: ${err.message || 'Unknown error'}`);
    } finally {
      if (side === 'front') setCompressingFront(false);
      else setCompressingBack(false);
    }
  };

  const removeSide = (side: 'front' | 'back') => {
    if (side === 'front') {
      onChange({
        ...slot,
        frontFile: null,
        frontPreview: null,
        frontStats: null,
        status: 'draft',
      });
    } else {
      onChange({
        ...slot,
        backFile: null,
        backPreview: null,
        backStats: null,
        status: 'draft',
      });
    }
  };

  const getStatusBadge = () => {
    switch (slot.status) {
      case 'verified':
        return <Badge className="bg-green-600 text-white gap-1"><CheckCircle2 className="h-3 w-3" /> Verified</Badge>;
      case 'review_required':
        return <Badge variant="secondary" className="bg-amber-500/10 text-amber-600 border-amber-300 gap-1"><AlertCircle className="h-3 w-3" /> Review Pending</Badge>;
      case 'processing_ocr':
        return <Badge variant="outline" className="animate-pulse gap-1"><Loader2 className="h-3 w-3 animate-spin" /> Vision OCR Running</Badge>;
      case 'uploaded':
        return <Badge variant="outline" className="text-primary border-primary gap-1"><CheckCircle2 className="h-3 w-3" /> Uploaded to Cloud</Badge>;
      case 'uploading':
        return <Badge variant="outline" className="gap-1"><Loader2 className="h-3 w-3 animate-spin" /> Uploading...</Badge>;
      case 'failed':
        return <Badge variant="destructive" className="gap-1"><AlertCircle className="h-3 w-3" /> Extraction Failed</Badge>;
      default:
        return <Badge variant="outline" className="text-muted-foreground">Draft (Unsaved)</Badge>;
    }
  };

  return (
    <Card className="relative overflow-hidden border border-border shadow-sm hover:border-primary/40 transition-all">
      <CardHeader className="pb-3 border-b bg-muted/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center text-sm">
              #{slot.slotIndex + 1}
            </div>
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                Historical Paper #{slot.slotIndex + 1}
              </CardTitle>
              <CardDescription className="text-xs">
                Front + Back photographs combine into 1 complete paper
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {getStatusBadge()}
            {onRemove && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onRemove}
                disabled={disabled}
                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                title="Remove this paper slot"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-4 space-y-4">
        {/* Exam Year Input */}
        <div className="flex items-center gap-4">
          <div className="w-48 space-y-1">
            <Label htmlFor={`year-input-${slot.slotIndex}`} className="text-xs font-semibold">
              Examination Year
            </Label>
            <Input
              id={`year-input-${slot.slotIndex}`}
              type="number"
              min={2000}
              max={2100}
              value={slot.examYear}
              onChange={(e) => handleYearChange(e.target.value)}
              disabled={disabled}
              className="h-9"
              placeholder="e.g. 2024"
            />
          </div>
          <div className="text-xs text-muted-foreground flex-1 pt-4">
            {slot.frontFile && slot.backFile ? (
              <span className="text-emerald-600 font-medium flex items-center gap-1">
                <CheckCircle2 className="h-4 w-4" /> Both sides captured and ready
              </span>
            ) : (
              <span>Capture or upload both sides to enable OCR question extraction.</span>
            )}
          </div>
        </div>

        {/* Two-Column Grid: Front & Back Sides */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* FRONT SIDE */}
          <div className="border rounded-lg p-3 bg-background flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                <FileImage className="h-3.5 w-3.5 text-primary" /> Front Side
              </span>
              {slot.frontStats && (
                <Badge variant="secondary" className="text-[10px] h-5">
                  {formatBytes(slot.frontStats.compressedSizeBytes)} (-{slot.frontStats.reductionPercentage}%)
                </Badge>
              )}
            </div>

            {slot.frontPreview ? (
              <div className="relative group rounded-md overflow-hidden border bg-muted aspect-[3/4] flex items-center justify-center">
                <img
                  src={slot.frontPreview}
                  alt="Front Side Preview"
                  className="object-contain w-full h-full"
                />
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => setPreviewModalUrl(slot.frontPreview)}
                    className="h-8 px-2 gap-1 text-xs"
                  >
                    <Eye className="h-3.5 w-3.5" /> Full View
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => frontInputRef.current?.click()}
                    disabled={disabled}
                    className="h-8 px-2 gap-1 text-xs bg-background/80"
                  >
                    <RefreshCw className="h-3.5 w-3.5" /> Retake
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => removeSide('front')}
                    disabled={disabled}
                    className="h-8 px-2 text-xs"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ) : (
              <div
                onClick={() => !compressingFront && !disabled && frontInputRef.current?.click()}
                className={`border-2 border-dashed rounded-md aspect-[3/4] flex flex-col items-center justify-center p-4 text-center cursor-pointer transition-colors ${
                  compressingFront
                    ? 'bg-muted/50 border-muted'
                    : 'border-muted-foreground/30 hover:border-primary/60 hover:bg-primary/5'
                }`}
              >
                {compressingFront ? (
                  <div className="flex flex-col items-center gap-2">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <span className="text-xs text-muted-foreground font-medium">Compressing photo...</span>
                  </div>
                ) : (
                  <>
                    <div className="h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-2">
                      <Camera className="h-5 w-5" />
                    </div>
                    <p className="text-xs font-medium">Capture or Upload Front</p>
                    <p className="text-[10px] text-muted-foreground mt-1">Tap for camera or gallery</p>
                  </>
                )}
              </div>
            )}

            <input
              ref={frontInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFileSelect(file, 'front');
                e.target.value = '';
              }}
              disabled={disabled || compressingFront}
            />
          </div>

          {/* BACK SIDE */}
          <div className="border rounded-lg p-3 bg-background flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                <FileImage className="h-3.5 w-3.5 text-secondary" /> Back Side
              </span>
              {slot.backStats && (
                <Badge variant="secondary" className="text-[10px] h-5">
                  {formatBytes(slot.backStats.compressedSizeBytes)} (-{slot.backStats.reductionPercentage}%)
                </Badge>
              )}
            </div>

            {slot.backPreview ? (
              <div className="relative group rounded-md overflow-hidden border bg-muted aspect-[3/4] flex items-center justify-center">
                <img
                  src={slot.backPreview}
                  alt="Back Side Preview"
                  className="object-contain w-full h-full"
                />
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => setPreviewModalUrl(slot.backPreview)}
                    className="h-8 px-2 gap-1 text-xs"
                  >
                    <Eye className="h-3.5 w-3.5" /> Full View
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => backInputRef.current?.click()}
                    disabled={disabled}
                    className="h-8 px-2 gap-1 text-xs bg-background/80"
                  >
                    <RefreshCw className="h-3.5 w-3.5" /> Retake
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => removeSide('back')}
                    disabled={disabled}
                    className="h-8 px-2 text-xs"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ) : (
              <div
                onClick={() => !compressingBack && !disabled && backInputRef.current?.click()}
                className={`border-2 border-dashed rounded-md aspect-[3/4] flex flex-col items-center justify-center p-4 text-center cursor-pointer transition-colors ${
                  compressingBack
                    ? 'bg-muted/50 border-muted'
                    : 'border-muted-foreground/30 hover:border-primary/60 hover:bg-primary/5'
                }`}
              >
                {compressingBack ? (
                  <div className="flex flex-col items-center gap-2">
                    <Loader2 className="h-8 w-8 animate-spin text-secondary" />
                    <span className="text-xs text-muted-foreground font-medium">Compressing photo...</span>
                  </div>
                ) : (
                  <>
                    <div className="h-10 w-10 rounded-full bg-secondary/10 text-secondary flex items-center justify-center mb-2">
                      <Camera className="h-5 w-5" />
                    </div>
                    <p className="text-xs font-medium">Capture or Upload Back</p>
                    <p className="text-[10px] text-muted-foreground mt-1">Tap for camera or gallery</p>
                  </>
                )}
              </div>
            )}

            <input
              ref={backInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFileSelect(file, 'back');
                e.target.value = '';
              }}
              disabled={disabled || compressingBack}
            />
          </div>
        </div>

        {slot.errorMessage && (
          <div className="p-2.5 rounded bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{slot.errorMessage}</span>
          </div>
        )}
      </CardContent>

      {/* Full-Screen Preview Dialog */}
      <Dialog open={!!previewModalUrl} onOpenChange={(open) => !open && setPreviewModalUrl(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Exam Paper High-Resolution Inspection</DialogTitle>
            <DialogDescription>
              Verify legibility of printed questions, figures, and marks.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[75vh] overflow-auto flex items-center justify-center p-2 bg-black/5 rounded">
            {previewModalUrl && (
              <img
                src={previewModalUrl}
                alt="Enlarged Exam Paper Preview"
                className="max-h-[70vh] object-contain rounded"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
