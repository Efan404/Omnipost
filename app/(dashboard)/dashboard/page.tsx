'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';
import { useArticleStore } from '@/store/article-store';
import { ArticleCard } from '@/components/article/article-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Search, LogOut } from 'lucide-react';
import { ArticleStatus } from '@/types';

export default function DashboardPage() {
  const router = useRouter();
  const { user, isAuthenticated, logout } = useAuthStore();
  const {
    articles,
    loadArticles,
    createArticle,
    deleteArticle,
    isLoading,
  } = useArticleStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    if (user) {
      loadArticles(user.id);
    }
  }, [isAuthenticated, user]);

  const handleCreateArticle = async () => {
    if (!user) return;

    try {
      const article = await createArticle(user.id, 'Untitled Article');
      router.push(`/editor/${article.id}`);
    } catch (error) {
      console.error('Failed to create article:', error);
    }
  };

  const handleDeleteArticle = async (id: string) => {
    if (confirm('Are you sure you want to delete this article?')) {
      await deleteArticle(id);
    }
  };

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  // Filter articles
  const filteredArticles = articles.filter((article) => {
    const matchesSearch =
      searchQuery === '' ||
      article.metadata.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      article.metadata.tags.some((tag) =>
        tag.toLowerCase().includes(searchQuery.toLowerCase())
      );

    const matchesStatus =
      statusFilter === 'all' || article.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Omnipost</h1>
              <p className="text-sm text-muted-foreground">
                Welcome back, {user?.name}!
              </p>
            </div>
            <div className="flex items-center gap-4">
              <Button onClick={handleCreateArticle}>
                <Plus className="h-4 w-4 mr-2" />
                New Article
              </Button>
              <Button variant="outline" onClick={handleLogout}>
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search articles by title or tags..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full md:w-[200px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Articles</SelectItem>
              <SelectItem value={ArticleStatus.DRAFT}>Drafts</SelectItem>
              <SelectItem value={ArticleStatus.PUBLISHED}>Published</SelectItem>
              <SelectItem value={ArticleStatus.PARTIALLY_PUBLISHED}>
                Partially Published
              </SelectItem>
              <SelectItem value={ArticleStatus.FAILED}>Failed</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Articles Grid */}
        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className="text-muted-foreground">Loading articles...</div>
          </div>
        ) : filteredArticles.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <p className="text-muted-foreground mb-4">
              {searchQuery || statusFilter !== 'all'
                ? 'No articles found matching your filters'
                : 'No articles yet. Create your first article!'}
            </p>
            {!searchQuery && statusFilter === 'all' && (
              <Button onClick={handleCreateArticle}>
                <Plus className="h-4 w-4 mr-2" />
                Create Article
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredArticles.map((article) => (
              <ArticleCard
                key={article.id}
                article={article}
                onDelete={handleDeleteArticle}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
