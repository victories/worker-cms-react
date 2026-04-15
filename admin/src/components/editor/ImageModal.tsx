import { useState, useRef } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@ui/dialog';
import { Button } from '@ui/button';
import { Input } from '@ui/input';
import { Label } from '@ui/label';
import { api } from '@/lib/api';
import { Image as ImageIcon, Upload, Link as LinkIcon, Loader2 } from 'lucide-react';
import { mediaUrl } from '@ui/lib/utils';

interface ImageModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onInsert: (url: string) => void;
  lang?: string;
}

export function ImageModal({ open, onOpenChange, onInsert, lang = 'en' }: ImageModalProps) {
  const [tab, setTab] = useState<'url' | 'upload'>('upload');
  const [url, setUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setUrl('');
    setPreview(null);
    setUploadedUrl(null);
    setUploading(false);
    setTab('upload');
  };

  const handleClose = (open: boolean) => {
    if (!open) reset();
    onOpenChange(open);
  };

  const handleFileSelect = async (file: File) => {
    if (!file.type.startsWith('image/')) return;

    // Show local preview
    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target?.result as string);
    reader.readAsDataURL(file);

    // Upload
    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await api.uploadMedia(formData) as any;
      if (res.success && res.data) {
        setUploadedUrl(res.data.r2_key ? mediaUrl(res.data.r2_key) : `/uploads/${res.data.filename}`);
      }
    } catch (err) {
      console.error('Upload failed:', err);
    }
    setUploading(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) handleFileSelect(file);
  };

  const handleInsert = () => {
    const finalUrl = tab === 'url' ? url : uploadedUrl;
    if (finalUrl) {
      onInsert(finalUrl);
      handleClose(false);
    }
  };

  const canInsert = tab === 'url' ? !!url.trim() : !!uploadedUrl;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ImageIcon className="h-5 w-5" />
            {lang === 'tr' ? 'Resim Ekle' : 'Insert Image'}
          </DialogTitle>
        </DialogHeader>

        {/* Tab switcher */}
        <div className="flex gap-1 p-1 bg-muted rounded-lg">
          <button
            className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              tab === 'upload' ? 'bg-background shadow-sm' : 'text-muted-foreground hover:text-foreground'
            }`}
            onClick={() => setTab('upload')}
          >
            <Upload className="h-4 w-4" />
            {lang === 'tr' ? 'Yukle' : 'Upload'}
          </button>
          <button
            className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              tab === 'url' ? 'bg-background shadow-sm' : 'text-muted-foreground hover:text-foreground'
            }`}
            onClick={() => setTab('url')}
          >
            <LinkIcon className="h-4 w-4" />
            URL
          </button>
        </div>

        {tab === 'upload' ? (
          <div className="space-y-4">
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFileSelect(file);
              }}
            />

            {!preview ? (
              <div
                className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 hover:bg-muted/30 transition-all"
                onClick={() => fileRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
              >
                <Upload className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">
                  {lang === 'tr' ? 'Dosya surukle veya tikla' : 'Drag & drop or click to browse'}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  PNG, JPG, GIF, WebP
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="relative rounded-lg overflow-hidden bg-muted flex items-center justify-center" style={{ maxHeight: '250px' }}>
                  <img src={preview} alt="Preview" className="max-w-full max-h-[250px] object-contain" />
                  {uploading && (
                    <div className="absolute inset-0 bg-background/70 flex items-center justify-center">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                  )}
                </div>
                <Button variant="outline" size="sm" onClick={() => { setPreview(null); setUploadedUrl(null); if (fileRef.current) fileRef.current.value = ''; }}>
                  {lang === 'tr' ? 'Degistir' : 'Change'}
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{lang === 'tr' ? 'Resim URL' : 'Image URL'}</Label>
              <Input
                placeholder="https://example.com/image.jpg"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                autoFocus
              />
            </div>
            {url && (
              <div className="rounded-lg overflow-hidden bg-muted flex items-center justify-center p-4" style={{ maxHeight: '200px' }}>
                <img
                  src={url}
                  alt="Preview"
                  className="max-w-full max-h-[180px] object-contain"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => handleClose(false)}>
            {lang === 'tr' ? 'Iptal' : 'Cancel'}
          </Button>
          <Button onClick={handleInsert} disabled={!canInsert || uploading}>
            {uploading ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" />{lang === 'tr' ? 'Yukleniyor...' : 'Uploading...'}</>
            ) : (
              lang === 'tr' ? 'Ekle' : 'Insert'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
