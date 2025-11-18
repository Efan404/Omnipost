'use client';

import { Article, ArticleStatus, Platform, PlatformPublishStatus } from '@/types';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatDate } from '@/lib/utils';
import { getPlatformInfo } from '@/lib/adapters';
import {
  FileEdit,
  Eye,
  Trash2,
  AlertTriangle,
  Clock,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import Link from 'next/link';

interface ArticleCardProps {
  article: Article;
  onDelete?: (id: string) => void;
}

const STATUS_CONFIG = {
  [ArticleStatus.DRAFT]: {
    label: 'Draft',
    variant: 'secondary' as const,
    icon: FileEdit,
  },
  [ArticleStatus.TRANSLATING]: {
    label: 'Translating',
    variant: 'default' as const,
    icon: Clock,
  },
  [ArticleStatus.TRANSLATION_REVIEW]: {
    label: 'Review',
    variant: 'default' as const,
    icon: Eye,
  },
  [ArticleStatus.READY_TO_PUBLISH]: {
    label: 'Ready',
    variant: 'default' as const,
    icon: CheckCircle2,
  },
  [ArticleStatus.PUBLISHING]: {
    label: 'Publishing',
    variant: 'default' as const,
    icon: Clock,
  },
  [ArticleStatus.PUBLISHED]: {
    label: 'Published',
    variant: 'default' as const,
    icon: CheckCircle2,
  },
  [ArticleStatus.PARTIALLY_PUBLISHED]: {
    label: 'Partial',
    variant: 'destructive' as const,
    icon: AlertTriangle,
  },
  [ArticleStatus.FAILED]: {
    label: 'Failed',
    variant: 'destructive' as const,
    icon: XCircle,
  },
};

export function ArticleCard({ article, onDelete }: ArticleCardProps) {
  const statusConfig = STATUS_CONFIG[article.status];
  const StatusIcon = statusConfig.icon;

  // Get published platforms
  const publishedPlatforms = Object.entries(article.publications || {})
    .filter(([_, pub]) => pub.status === PlatformPublishStatus.PUBLISHED)
    .map(([platform]) => platform as Platform);

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <CardTitle className="truncate">{article.metadata.title}</CardTitle>
            <CardDescription className="mt-1">
              Updated {formatDate(article.updatedAt)}
            </CardDescription>
          </div>
          <Badge variant={statusConfig.variant} className="flex items-center gap-1">
            <StatusIcon className="h-3 w-3" />
            {statusConfig.label}
          </Badge>
        </div>
      </CardHeader>

      <CardContent>
        {/* Tags */}
        {article.metadata.tags && article.metadata.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {article.metadata.tags.slice(0, 3).map((tag) => (
              <Badge key={tag} variant="outline" className="text-xs">
                #{tag}
              </Badge>
            ))}
            {article.metadata.tags.length > 3 && (
              <Badge variant="outline" className="text-xs">
                +{article.metadata.tags.length - 3}
              </Badge>
            )}
          </div>
        )}

        {/* Published Platforms */}
        {publishedPlatforms.length > 0 && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
            <span>Published on:</span>
            <div className="flex gap-1">
              {publishedPlatforms.map((platform) => {
                const info = getPlatformInfo(platform);
                return (
                  <Badge key={platform} variant="secondary" className="text-xs">
                    {info.icon} {info.name}
                  </Badge>
                );
              })}
            </div>
          </div>
        )}

        {/* Sync Warning */}
        {article.syncWarning?.hasUnsynced && (
          <div className="flex items-start gap-2 p-2 bg-destructive/10 text-destructive text-sm rounded-md">
            <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <span>{article.syncWarning.message}</span>
          </div>
        )}
      </CardContent>

      <CardFooter className="flex justify-between gap-2">
        <div className="flex gap-2">
          <Link href={`/editor/${article.id}`}>
            <Button size="sm" variant="default">
              <FileEdit className="h-4 w-4 mr-1" />
              Edit
            </Button>
          </Link>
          <Link href={`/article/${article.id}`}>
            <Button size="sm" variant="outline">
              <Eye className="h-4 w-4 mr-1" />
              View
            </Button>
          </Link>
        </div>

        {onDelete && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onDelete(article.id)}
            className="text-destructive hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
