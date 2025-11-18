'use client';

import { useState } from 'react';
import { Platform, PlatformVariants } from '@/types';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { getPlatformInfo } from '@/lib/adapters';
import ReactDiffViewer from 'react-diff-viewer-continued';
import { Textarea } from '@/components/ui/textarea';
import { Check, Edit } from 'lucide-react';

interface PlatformPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  originalContent: string;
  variants: PlatformVariants;
  onPublish: (selectedPlatforms: Platform[]) => void;
  onUpdateVariant?: (platform: Platform, content: string) => void;
}

export function PlatformPreviewModal({
  isOpen,
  onClose,
  originalContent,
  variants,
  onPublish,
  onUpdateVariant,
}: PlatformPreviewModalProps) {
  const platforms = Object.keys(variants) as Platform[];
  const [selectedPlatforms, setSelectedPlatforms] = useState<Platform[]>(platforms);
  const [editingPlatform, setEditingPlatform] = useState<Platform | null>(null);
  const [editContent, setEditContent] = useState('');

  const handleTogglePlatform = (platform: Platform) => {
    setSelectedPlatforms((prev) =>
      prev.includes(platform)
        ? prev.filter((p) => p !== platform)
        : [...prev, platform]
    );
  };

  const handleStartEdit = (platform: Platform) => {
    setEditingPlatform(platform);
    setEditContent(variants[platform]?.content || '');
  };

  const handleSaveEdit = () => {
    if (editingPlatform && onUpdateVariant) {
      onUpdateVariant(editingPlatform, editContent);
    }
    setEditingPlatform(null);
  };

  const handlePublish = () => {
    onPublish(selectedPlatforms);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Preview & Publish</DialogTitle>
          <DialogDescription>
            Review platform-specific content and select where to publish
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue={platforms[0]} className="w-full">
          <TabsList className="grid w-full grid-cols-auto">
            {platforms.map((platform) => {
              const info = getPlatformInfo(platform);
              return (
                <TabsTrigger key={platform} value={platform} className="flex items-center gap-2">
                  <span>{info.icon}</span>
                  <span>{info.name}</span>
                  {selectedPlatforms.includes(platform) && (
                    <Check className="h-3 w-3 text-green-600" />
                  )}
                </TabsTrigger>
              );
            })}
          </TabsList>

          {platforms.map((platform) => {
            const info = getPlatformInfo(platform);
            const variant = variants[platform];

            return (
              <TabsContent key={platform} value={platform} className="space-y-4">
                {/* Platform Selection */}
                <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id={`platform-${platform}`}
                      checked={selectedPlatforms.includes(platform)}
                      onCheckedChange={() => handleTogglePlatform(platform)}
                    />
                    <Label
                      htmlFor={`platform-${platform}`}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      Publish to {info.name}
                    </Label>
                  </div>

                  {variant?.isCustomized && (
                    <Badge variant="secondary">Customized</Badge>
                  )}

                  {editingPlatform !== platform && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleStartEdit(platform)}
                    >
                      <Edit className="h-3 w-3 mr-1" />
                      Edit
                    </Button>
                  )}
                </div>

                {/* Content Preview */}
                {editingPlatform === platform ? (
                  <div className="space-y-2">
                    <Label>Edit Content for {info.name}</Label>
                    <Textarea
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      className="min-h-[400px] font-mono text-sm"
                    />
                    <div className="flex gap-2">
                      <Button onClick={handleSaveEdit}>Save Changes</Button>
                      <Button
                        variant="outline"
                        onClick={() => setEditingPlatform(null)}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="border rounded-lg overflow-hidden">
                    <div className="bg-muted px-4 py-2 text-sm font-medium">
                      Changes from Original
                    </div>
                    <div className="max-h-[500px] overflow-y-auto">
                      <ReactDiffViewer
                        oldValue={originalContent}
                        newValue={variant?.content || ''}
                        splitView={true}
                        leftTitle="Original"
                        rightTitle={`${info.name} Version`}
                        hideLineNumbers={false}
                        showDiffOnly={false}
                        styles={{
                          diffContainer: {
                            fontSize: '13px',
                          },
                        }}
                      />
                    </div>
                  </div>
                )}
              </TabsContent>
            );
          })}
        </Tabs>

        <DialogFooter className="flex justify-between items-center">
          <div className="text-sm text-muted-foreground">
            {selectedPlatforms.length} platform(s) selected
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              onClick={handlePublish}
              disabled={selectedPlatforms.length === 0}
            >
              Publish to {selectedPlatforms.length} Platform(s)
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
