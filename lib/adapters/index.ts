/**
 * Platform Adapters Registry
 *
 * Central registry for all platform adapters.
 * Provides factory methods to create adapter instances.
 */

import { Platform, PlatformCredentials, PlatformInfo } from '@/types';
import { PlatformAdapter } from './base';
import { DevToAdapter } from './devto';
import { MediumAdapter } from './medium';

/**
 * Platform information registry
 */
export const PLATFORM_INFO: Record<Platform, PlatformInfo> = {
  [Platform.DEV_TO]: {
    id: Platform.DEV_TO,
    name: 'Dev.to',
    icon: '📝',
    color: '#0A0A0A',
    requiresAuth: true,
    authType: 'api_key',
    isAvailable: true,
  },
  [Platform.MEDIUM]: {
    id: Platform.MEDIUM,
    name: 'Medium',
    icon: 'Ⓜ️',
    color: '#00AB6C',
    requiresAuth: true,
    authType: 'oauth2',
    isAvailable: true,
  },
  [Platform.JUEJIN]: {
    id: Platform.JUEJIN,
    name: '掘金 (Juejin)',
    icon: '⛏️',
    color: '#006CFF',
    requiresAuth: true,
    authType: 'cookie',
    isAvailable: false, // Phase 2
  },
  [Platform.ZHIHU]: {
    id: Platform.ZHIHU,
    name: '知乎 (Zhihu)',
    icon: '知',
    color: '#0084FF',
    requiresAuth: true,
    authType: 'cookie',
    isAvailable: false, // Phase 2
  },
  [Platform.SSPAI]: {
    id: Platform.SSPAI,
    name: '少数派 (SSPAI)',
    icon: '📱',
    color: '#D32F2F',
    requiresAuth: true,
    authType: 'cookie',
    isAvailable: false, // Phase 3
  },
};

/**
 * Get platform information
 */
export function getPlatformInfo(platform: Platform): PlatformInfo {
  return PLATFORM_INFO[platform];
}

/**
 * Get all available platforms
 */
export function getAvailablePlatforms(): PlatformInfo[] {
  return Object.values(PLATFORM_INFO).filter((p) => p.isAvailable);
}

/**
 * Create platform adapter instance
 */
export function createPlatformAdapter(
  platform: Platform,
  credentials: PlatformCredentials
): PlatformAdapter {
  switch (platform) {
    case Platform.DEV_TO:
      return new DevToAdapter(credentials);

    case Platform.MEDIUM:
      return new MediumAdapter(credentials);

    case Platform.JUEJIN:
      throw new Error('Juejin adapter not implemented yet (Phase 2)');

    case Platform.ZHIHU:
      throw new Error('Zhihu adapter not implemented yet (Phase 2)');

    case Platform.SSPAI:
      throw new Error('SSPAI adapter not implemented yet (Phase 3)');

    default:
      throw new Error(`Unknown platform: ${platform}`);
  }
}

/**
 * Validate credentials for a platform
 */
export async function validatePlatformCredentials(
  platform: Platform,
  credentials: PlatformCredentials
): Promise<boolean> {
  try {
    const adapter = createPlatformAdapter(platform, credentials);
    return await adapter.validateCredentials();
  } catch (error) {
    console.error('Failed to validate credentials:', error);
    return false;
  }
}

// Export adapters
export { PlatformAdapter } from './base';
export { DevToAdapter } from './devto';
export { MediumAdapter } from './medium';
