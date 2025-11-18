/**
 * Appwrite Authentication Service
 *
 * Handles user authentication, registration, and session management.
 */

import { ID } from 'appwrite';
import { getAccount, getClient } from './config';
import type { User } from '@/types';

/**
 * Authentication service class
 */
export class AuthService {
  private account = getAccount();

  /**
   * Register a new user
   */
  async register(email: string, password: string, name: string): Promise<User> {
    try {
      // Create account
      const account = await this.account.create(
        ID.unique(),
        email,
        password,
        name
      );

      // Auto-login after registration
      await this.login(email, password);

      return {
        id: account.$id,
        email: account.email,
        name: account.name,
        preferences: {
          defaultPlatforms: [],
          autoTranslate: false,
          translationAutoApproveThreshold: 0.9,
          requireManualReview: false,
          defaultLanguage: 'en',
          targetLanguages: ['zh', 'ja'],
        },
        createdAt: account.$createdAt,
        updatedAt: account.$updatedAt,
      };
    } catch (error: any) {
      console.error('Registration failed:', error);
      throw new Error(error.message || 'Registration failed');
    }
  }

  /**
   * Login user
   */
  async login(email: string, password: string): Promise<void> {
    try {
      await this.account.createEmailPasswordSession(email, password);
    } catch (error: any) {
      console.error('Login failed:', error);
      throw new Error(error.message || 'Login failed');
    }
  }

  /**
   * Logout user
   */
  async logout(): Promise<void> {
    try {
      await this.account.deleteSession('current');
    } catch (error: any) {
      console.error('Logout failed:', error);
      throw new Error(error.message || 'Logout failed');
    }
  }

  /**
   * Get current user
   */
  async getCurrentUser(): Promise<User | null> {
    try {
      const account = await this.account.get();

      return {
        id: account.$id,
        email: account.email,
        name: account.name,
        preferences: {
          defaultPlatforms: [],
          autoTranslate: false,
          translationAutoApproveThreshold: 0.9,
          requireManualReview: false,
          defaultLanguage: 'en',
          targetLanguages: ['zh', 'ja'],
        },
        createdAt: account.$createdAt,
        updatedAt: account.$updatedAt,
      };
    } catch (error) {
      return null;
    }
  }

  /**
   * Check if user is authenticated
   */
  async isAuthenticated(): Promise<boolean> {
    const user = await this.getCurrentUser();
    return user !== null;
  }

  /**
   * Update user name
   */
  async updateName(name: string): Promise<void> {
    try {
      await this.account.updateName(name);
    } catch (error: any) {
      console.error('Update name failed:', error);
      throw new Error(error.message || 'Update name failed');
    }
  }

  /**
   * Update user email
   */
  async updateEmail(email: string, password: string): Promise<void> {
    try {
      await this.account.updateEmail(email, password);
    } catch (error: any) {
      console.error('Update email failed:', error);
      throw new Error(error.message || 'Update email failed');
    }
  }

  /**
   * Update user password
   */
  async updatePassword(newPassword: string, oldPassword: string): Promise<void> {
    try {
      await this.account.updatePassword(newPassword, oldPassword);
    } catch (error: any) {
      console.error('Update password failed:', error);
      throw new Error(error.message || 'Update password failed');
    }
  }

  /**
   * Request password recovery
   */
  async requestPasswordRecovery(email: string): Promise<void> {
    try {
      const url = `${window.location.origin}/reset-password`;
      await this.account.createRecovery(email, url);
    } catch (error: any) {
      console.error('Password recovery failed:', error);
      throw new Error(error.message || 'Password recovery failed');
    }
  }

  /**
   * Complete password recovery
   */
  async completePasswordRecovery(
    userId: string,
    secret: string,
    password: string
  ): Promise<void> {
    try {
      await this.account.updateRecovery(userId, secret, password);
    } catch (error: any) {
      console.error('Password reset failed:', error);
      throw new Error(error.message || 'Password reset failed');
    }
  }
}

/**
 * Singleton instance
 */
let authServiceInstance: AuthService | null = null;

export function getAuthService(): AuthService {
  if (!authServiceInstance) {
    authServiceInstance = new AuthService();
  }
  return authServiceInstance;
}
