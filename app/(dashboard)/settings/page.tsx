'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Platform } from '@/types';
import { getAvailablePlatforms, validatePlatformCredentials } from '@/lib/adapters';
import { getDatabaseService } from '@/lib/appwrite/database';
import { ArrowLeft, Check, X, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/components/ui/use-toast';

export default function SettingsPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const { toast } = useToast();

  const [platformCredentials, setPlatformCredentials] = useState<
    Record<Platform, { apiKey?: string; accessToken?: string; isValid: boolean }>
  >({} as any);
  const [validating, setValidating] = useState<Platform | null>(null);
  const [saving, setSaving] = useState<Platform | null>(null);

  const availablePlatforms = getAvailablePlatforms();

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    loadPlatformConfigs();
  }, [isAuthenticated, user]);

  const loadPlatformConfigs = async () => {
    if (!user) return;

    try {
      const db = getDatabaseService();
      const configs = await db.getPlatformConfigs(user.id);

      const credMap: any = {};
      configs.forEach((config) => {
        credMap[config.platform] = {
          apiKey: config.credentials.apiKey,
          accessToken: config.credentials.accessToken,
          isValid: config.isValid,
        };
      });

      setPlatformCredentials(credMap);
    } catch (error) {
      console.error('Failed to load platform configs:', error);
    }
  };

  const handleCredentialChange = (platform: Platform, field: string, value: string) => {
    setPlatformCredentials((prev) => ({
      ...prev,
      [platform]: {
        ...prev[platform],
        [field]: value,
        isValid: false,
      },
    }));
  };

  const handleValidate = async (platform: Platform) => {
    if (!user) return;

    setValidating(platform);

    try {
      const creds = platformCredentials[platform];
      const isValid = await validatePlatformCredentials(platform, {
        platform,
        apiKey: creds?.apiKey,
        accessToken: creds?.accessToken,
      });

      setPlatformCredentials((prev) => ({
        ...prev,
        [platform]: {
          ...prev[platform],
          isValid,
        },
      }));

      toast({
        title: isValid ? 'Credentials Valid' : 'Validation Failed',
        description: isValid
          ? `${platform} credentials are working correctly`
          : `Failed to validate ${platform} credentials`,
        variant: isValid ? 'default' : 'destructive',
      });
    } catch (error) {
      console.error('Validation failed:', error);
      toast({
        title: 'Validation Error',
        description: 'Failed to validate credentials',
        variant: 'destructive',
      });
    } finally {
      setValidating(null);
    }
  };

  const handleSave = async (platform: Platform) => {
    if (!user) return;

    setSaving(platform);

    try {
      const db = getDatabaseService();
      const creds = platformCredentials[platform];

      await db.upsertPlatformConfig(user.id, platform, {
        credentials: {
          platform,
          apiKey: creds?.apiKey,
          accessToken: creds?.accessToken,
        },
        isValid: creds?.isValid || false,
        lastValidatedAt: new Date().toISOString(),
      });

      toast({
        title: 'Saved Successfully',
        description: `${platform} credentials have been saved`,
      });
    } catch (error) {
      console.error('Save failed:', error);
      toast({
        title: 'Save Failed',
        description: 'Failed to save credentials',
        variant: 'destructive',
      });
    } finally {
      setSaving(null);
    }
  };

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Link href="/dashboard">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold">Settings</h1>
              <p className="text-sm text-muted-foreground">
                Configure platform credentials and preferences
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <Tabs defaultValue="platforms">
            <TabsList>
              <TabsTrigger value="platforms">Platform Credentials</TabsTrigger>
              <TabsTrigger value="preferences">Preferences</TabsTrigger>
            </TabsList>

            <TabsContent value="platforms" className="space-y-6">
              {availablePlatforms.map((platformInfo) => {
                const creds = platformCredentials[platformInfo.id];

                return (
                  <Card key={platformInfo.id}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{platformInfo.icon}</span>
                          <div>
                            <CardTitle>{platformInfo.name}</CardTitle>
                            <CardDescription>
                              Configure API credentials for {platformInfo.name}
                            </CardDescription>
                          </div>
                        </div>
                        {creds?.isValid && (
                          <Badge variant="default" className="flex items-center gap-1">
                            <Check className="h-3 w-3" />
                            Connected
                          </Badge>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {platformInfo.authType === 'api_key' && (
                        <div className="space-y-2">
                          <Label htmlFor={`${platformInfo.id}-api-key`}>
                            API Key
                          </Label>
                          <Input
                            id={`${platformInfo.id}-api-key`}
                            type="password"
                            placeholder="Enter your API key"
                            value={creds?.apiKey || ''}
                            onChange={(e) =>
                              handleCredentialChange(
                                platformInfo.id,
                                'apiKey',
                                e.target.value
                              )
                            }
                          />
                          <p className="text-xs text-muted-foreground">
                            Get your API key from{' '}
                            <a
                              href={`https://${platformInfo.id}.com/settings/extensions`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary hover:underline"
                            >
                              {platformInfo.name} settings
                            </a>
                          </p>
                        </div>
                      )}

                      {platformInfo.authType === 'oauth2' && (
                        <div className="space-y-2">
                          <Label htmlFor={`${platformInfo.id}-token`}>
                            Access Token
                          </Label>
                          <Input
                            id={`${platformInfo.id}-token`}
                            type="password"
                            placeholder="Enter your access token"
                            value={creds?.accessToken || ''}
                            onChange={(e) =>
                              handleCredentialChange(
                                platformInfo.id,
                                'accessToken',
                                e.target.value
                              )
                            }
                          />
                          <p className="text-xs text-muted-foreground">
                            Get your integration token from{' '}
                            <a
                              href={`https://${platformInfo.id}.com/settings/security`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary hover:underline"
                            >
                              {platformInfo.name} settings
                            </a>
                          </p>
                        </div>
                      )}

                      <div className="flex gap-2">
                        <Button
                          onClick={() => handleValidate(platformInfo.id)}
                          variant="outline"
                          disabled={
                            validating === platformInfo.id ||
                            (!creds?.apiKey && !creds?.accessToken)
                          }
                        >
                          {validating === platformInfo.id ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Validating...
                            </>
                          ) : (
                            <>
                              {creds?.isValid ? <Check className="h-4 w-4 mr-2" /> : <X className="h-4 w-4 mr-2" />}
                              Validate
                            </>
                          )}
                        </Button>
                        <Button
                          onClick={() => handleSave(platformInfo.id)}
                          disabled={saving === platformInfo.id}
                        >
                          {saving === platformInfo.id ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Saving...
                            </>
                          ) : (
                            'Save'
                          )}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </TabsContent>

            <TabsContent value="preferences">
              <Card>
                <CardHeader>
                  <CardTitle>User Preferences</CardTitle>
                  <CardDescription>
                    Configure your default settings
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Preferences coming soon...
                  </p>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
}
