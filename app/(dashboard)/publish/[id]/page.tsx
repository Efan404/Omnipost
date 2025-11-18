'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';
import { useArticleStore } from '@/store/article-store';
import { PlatformPreviewModal } from '@/components/publish/platform-preview-modal';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Platform, PlatformVariants } from '@/types';
import { getAvailablePlatforms, getPlatformInfo } from '@/lib/adapters';
import { ArrowLeft, Send, Sparkles, Loader2 } from 'lucide-react';
import Link from 'next/link';

export default function PublishPage() {
  const params = useParams();
  const router = useRouter();
  const articleId = params.id as string;

  const { user, isAuthenticated } = useAuthStore();
  const { currentArticle, loadArticle, updateArticle, updateVariant } = useArticleStore();

  const [selectedPlatforms, setSelectedPlatforms] = useState<Platform[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [variants, setVariants] = useState<PlatformVariants>({});
  const [showPreview, setShowPreview] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);

  const availablePlatforms = getAvailablePlatforms();

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    loadArticle(articleId);
  }, [articleId, isAuthenticated]);

  const handleTogglePlatform = (platform: Platform) => {
    setSelectedPlatforms((prev) =>
      prev.includes(platform)
        ? prev.filter((p) => p !== platform)
        : [...prev, platform]
    );
  };

  const handleGenerateVariants = async () => {
    if (!currentArticle || selectedPlatforms.length === 0) return;

    setIsProcessing(true);

    try {
      const response = await fetch('/api/content-process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          articleId: currentArticle.id,
          userId: user?.id,
          platforms: selectedPlatforms,
          useAI: true,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setVariants(data.variants);
        setShowPreview(true);
      } else {
        alert('Failed to generate variants: ' + data.error);
      }
    } catch (error) {
      console.error('Failed to generate variants:', error);
      alert('Failed to generate variants');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUpdateVariant = (platform: Platform, content: string) => {
    setVariants((prev) => ({
      ...prev,
      [platform]: {
        content,
        lastModified: new Date().toISOString(),
        isCustomized: true,
      },
    }));
    updateVariant(platform, content);
  };

  const handlePublish = async (platforms: Platform[]) => {
    if (!currentArticle) return;

    setIsPublishing(true);

    try {
      const response = await fetch('/api/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          articleId: currentArticle.id,
          userId: user?.id,
          platforms,
          useVariants: true,
        }),
      });

      const data = await response.json();

      if (data.success || data.results.some((r: any) => r.success)) {
        alert(`Published successfully to ${data.results.filter((r: any) => r.success).length} platform(s)!`);
        router.push('/dashboard');
      } else {
        alert('Publishing failed: ' + data.error);
      }
    } catch (error) {
      console.error('Publishing failed:', error);
      alert('Publishing failed');
    } finally {
      setIsPublishing(false);
    }
  };

  if (!currentArticle) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href={`/editor/${articleId}`}>
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Editor
                </Button>
              </Link>
              <div>
                <h1 className="text-xl font-bold">{currentArticle.metadata.title}</h1>
                <p className="text-sm text-muted-foreground">Select platforms and publish</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Platform Selection */}
          <Card>
            <CardHeader>
              <CardTitle>Select Publishing Platforms</CardTitle>
              <CardDescription>
                Choose which platforms you want to publish this article to
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {availablePlatforms.map((platformInfo) => (
                  <div
                    key={platformInfo.id}
                    className="flex items-start space-x-3 p-4 border rounded-lg hover:bg-accent/50 transition-colors cursor-pointer"
                    onClick={() => handleTogglePlatform(platformInfo.id)}
                  >
                    <Checkbox
                      id={`platform-${platformInfo.id}`}
                      checked={selectedPlatforms.includes(platformInfo.id)}
                      onCheckedChange={() => handleTogglePlatform(platformInfo.id)}
                    />
                    <div className="flex-1">
                      <Label
                        htmlFor={`platform-${platformInfo.id}`}
                        className="text-base font-medium cursor-pointer flex items-center gap-2"
                      >
                        <span>{platformInfo.icon}</span>
                        <span>{platformInfo.name}</span>
                        {platformInfo.requiresManualPublish && (
                          <Badge variant="outline" className="text-xs">
                            Manual Publish
                          </Badge>
                        )}
                      </Label>
                      <p className="text-sm text-muted-foreground mt-1">
                        {platformInfo.requiresManualPublish
                          ? 'Creates draft for manual publishing'
                          : 'Publishes directly to platform'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex justify-center gap-4">
            <Button
              size="lg"
              onClick={handleGenerateVariants}
              disabled={selectedPlatforms.length === 0 || isProcessing}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Generate Platform Variants
                </>
              )}
            </Button>

            <Button
              size="lg"
              variant="outline"
              onClick={() => {
                // Use simple variants without AI
                const simpleVariants: PlatformVariants = {};
                selectedPlatforms.forEach((p) => {
                  simpleVariants[p] = {
                    content: currentArticle.contentOriginal,
                    lastModified: new Date().toISOString(),
                    isCustomized: false,
                  };
                });
                setVariants(simpleVariants);
                setShowPreview(true);
              }}
              disabled={selectedPlatforms.length === 0}
            >
              Skip AI & Preview
            </Button>
          </div>

          {/* Info Card */}
          <Card>
            <CardHeader>
              <CardTitle>How It Works</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>
                1. <strong>Select Platforms</strong> - Choose where you want to publish
              </p>
              <p>
                2. <strong>Generate Variants</strong> - AI optimizes content for each platform's audience
              </p>
              <p>
                3. <strong>Review & Edit</strong> - Preview differences and make adjustments
              </p>
              <p>
                4. <strong>Publish</strong> - Send to selected platforms with one click
              </p>
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Preview Modal */}
      {showPreview && (
        <PlatformPreviewModal
          isOpen={showPreview}
          onClose={() => setShowPreview(false)}
          originalContent={currentArticle.contentOriginal}
          variants={variants}
          onPublish={handlePublish}
          onUpdateVariant={handleUpdateVariant}
        />
      )}
    </div>
  );
}
