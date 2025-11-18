'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';
import { useArticleStore } from '@/store/article-store';
import { MarkdownEditor } from '@/components/editor/markdown-editor';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Save, ArrowLeft, Send } from 'lucide-react';
import Link from 'next/link';
import { debounce } from '@/lib/utils';

export default function EditorPage() {
  const params = useParams();
  const router = useRouter();
  const articleId = params.id as string;

  const { user, isAuthenticated } = useAuthStore();
  const {
    currentArticle,
    loadArticle,
    updateArticle,
    updateContent,
    updateMetadata,
    isSaving,
    lastSaved,
    enableAutoSave,
    disableAutoSave,
  } = useArticleStore();

  const [localTitle, setLocalTitle] = useState('');
  const [localTags, setLocalTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    loadArticle(articleId);
    enableAutoSave();

    return () => {
      disableAutoSave();
    };
  }, [articleId, isAuthenticated]);

  useEffect(() => {
    if (currentArticle) {
      setLocalTitle(currentArticle.metadata.title);
      setLocalTags(currentArticle.metadata.tags);
    }
  }, [currentArticle]);

  // Debounced save for title
  const debouncedSaveTitle = debounce((title: string) => {
    updateMetadata({ title });
  }, 500);

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTitle = e.target.value;
    setLocalTitle(newTitle);
    debouncedSaveTitle(newTitle);
  };

  const handleContentChange = (content: string) => {
    updateContent(content);
  };

  const handleAddTag = () => {
    if (tagInput.trim() && !localTags.includes(tagInput.trim())) {
      const newTags = [...localTags, tagInput.trim()];
      setLocalTags(newTags);
      updateMetadata({ tags: newTags });
      setTagInput('');
    }
  };

  const handleRemoveTag = (tag: string) => {
    const newTags = localTags.filter((t) => t !== tag);
    setLocalTags(newTags);
    updateMetadata({ tags: newTags });
  };

  const handleSave = async () => {
    if (!currentArticle) return;

    await updateArticle(currentArticle.id, {
      contentOriginal: currentArticle.contentOriginal,
      metadata: currentArticle.metadata,
    });
  };

  const handlePublish = () => {
    // Navigate to publish page
    router.push(`/publish/${articleId}`);
  };

  if (!currentArticle) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-muted-foreground">Loading article...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card sticky top-0 z-10">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/dashboard">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>
              </Link>
              <div className="text-sm text-muted-foreground">
                {isSaving ? (
                  <span>Saving...</span>
                ) : lastSaved ? (
                  <span>Saved at {new Date(lastSaved).toLocaleTimeString()}</span>
                ) : (
                  <span>Not saved</span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={handleSave} disabled={isSaving}>
                <Save className="h-4 w-4 mr-2" />
                Save
              </Button>
              <Button onClick={handlePublish}>
                <Send className="h-4 w-4 mr-2" />
                Publish
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Editor */}
          <div className="lg:col-span-2 space-y-6">
            {/* Title */}
            <div>
              <Input
                type="text"
                value={localTitle}
                onChange={handleTitleChange}
                placeholder="Article Title"
                className="text-3xl font-bold border-0 border-b rounded-none px-0 focus-visible:ring-0"
              />
            </div>

            {/* Content Editor */}
            <MarkdownEditor
              content={currentArticle.contentOriginal}
              onChange={handleContentChange}
              placeholder="Start writing your article..."
            />
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Tags */}
            <Card>
              <CardHeader>
                <CardTitle>Tags</CardTitle>
                <CardDescription>
                  Add tags to help categorize your article
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex gap-2">
                  <Input
                    type="text"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddTag();
                      }
                    }}
                    placeholder="Add a tag"
                  />
                  <Button type="button" onClick={handleAddTag}>
                    Add
                  </Button>
                </div>

                <div className="flex flex-wrap gap-2">
                  {localTags.map((tag) => (
                    <Badge
                      key={tag}
                      variant="secondary"
                      className="cursor-pointer"
                      onClick={() => handleRemoveTag(tag)}
                    >
                      #{tag} ×
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Publishing Info */}
            <Card>
              <CardHeader>
                <CardTitle>Article Info</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div>
                  <Label>Status</Label>
                  <p className="text-muted-foreground mt-1">
                    {currentArticle.status}
                  </p>
                </div>
                <div>
                  <Label>Created</Label>
                  <p className="text-muted-foreground mt-1">
                    {new Date(currentArticle.createdAt).toLocaleString()}
                  </p>
                </div>
                <div>
                  <Label>Last Updated</Label>
                  <p className="text-muted-foreground mt-1">
                    {new Date(currentArticle.updatedAt).toLocaleString()}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Platform Markup Guide */}
            <Card>
              <CardHeader>
                <CardTitle>Platform Markup</CardTitle>
                <CardDescription>
                  Control content visibility per platform
                </CardDescription>
              </CardHeader>
              <CardContent className="text-sm space-y-2">
                <div>
                  <code className="block bg-muted p-2 rounded text-xs">
                    [[platforms: dev.to, medium]]
                    <br />
                    Content for specific platforms
                    <br />
                    [[/platforms]]
                  </code>
                </div>
                <div>
                  <code className="block bg-muted p-2 rounded text-xs">
                    [[exclude: medium]]
                    <br />
                    Excluded content
                    <br />
                    [[/exclude]]
                  </code>
                </div>
                <Link
                  href="/docs/platform-markup"
                  className="text-primary hover:underline text-xs"
                >
                  Learn more →
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
