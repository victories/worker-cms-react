import { useState, useEffect } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Link as LinkIcon } from 'lucide-react';

interface LinkModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onInsert: (url: string) => void;
  initialUrl?: string;
  lang?: string;
}

export function LinkModal({ open, onOpenChange, onInsert, initialUrl = '', lang = 'en' }: LinkModalProps) {
  const [url, setUrl] = useState(initialUrl);

  useEffect(() => {
    if (open) setUrl(initialUrl);
  }, [open, initialUrl]);

  const handleInsert = () => {
    if (url.trim()) {
      onInsert(url.trim());
      onOpenChange(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleInsert();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <LinkIcon className="h-5 w-5" />
            {lang === 'tr' ? 'Baglanti Ekle' : 'Insert Link'}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          <Label>URL</Label>
          <Input
            placeholder="https://example.com"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={handleKeyDown}
            autoFocus
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {lang === 'tr' ? 'Iptal' : 'Cancel'}
          </Button>
          <Button onClick={handleInsert} disabled={!url.trim()}>
            {lang === 'tr' ? 'Ekle' : 'Insert'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
