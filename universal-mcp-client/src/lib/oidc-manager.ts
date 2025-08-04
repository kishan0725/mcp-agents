import { UserManager, WebStorageStateStore, User } from 'oidc-client-ts';
import { MCPServer, OIDCConfig, TokenInfo } from '@/types/mcp';

export class UniversalOIDCManager {
  private clients: Map<string, UserManager> = new Map();
  private tokens: Map<string, TokenInfo> = new Map();
  private serverConfigs: Map<string, MCPServer> = new Map();

  constructor() {
    this.loadTokensFromStorage();
    this.loadServerConfigsFromStorage();
  }

  /**
   * Create and configure OIDC client for a server
   */
  async addServer(server: MCPServer): Promise<void> {
    // Store server config for persistence
    this.serverConfigs.set(server.id, server);
    this.saveServerConfigsToStorage();
    const clientConfig: any = {
      authority: server.oidc.issuer,
      client_id: server.oidc.clientId,
      redirect_uri: server.oidc.redirectUri || `${window.location.origin}/auth/callback`,
      response_type: 'code',
      scope: server.oidc.scopes.join(' '),
      automaticSilentRenew: true,
      userStore: new WebStorageStateStore({ 
        store: window.localStorage,
        prefix: `oidc_${server.id}_`
      }),
      // Enable PKCE for security
      filterProtocolClaims: false,
      loadUserInfo: true
    };

    // Add client_secret for development testing if available
    // WARNING: This should only be used for local testing
    if (process.env.NODE_ENV === 'development') {
      const clientSecret = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_SECRET;
      if (clientSecret && server.oidc.issuer.includes('accounts.google.com')) {
        console.warn('⚠️ Using client_secret for development testing - will move to backend for production!');
        clientConfig.client_secret = clientSecret;
      }
    }

    const client = new UserManager(clientConfig);

    // Handle token events
    client.events.addUserLoaded((user: User) => {
      this.handleTokenUpdate(server.id, user);
    });

    client.events.addUserSignedOut(() => {
      this.handleTokenRemoved(server.id);
    });

    client.events.addAccessTokenExpiring(() => {
      console.log(`Token expiring for server: ${server.name}`);
    });

    this.clients.set(server.id, client);

    // Try to load existing user
    try {
      const user = await client.getUser();
      if (user && !user.expired) {
        this.handleTokenUpdate(server.id, user);
      }
    } catch (error) {
      console.log(`No existing user for server: ${server.name}`);
    }
  }

  /**
   * Initiate OAuth flow for a server
   */
  async authenticate(serverId: string): Promise<void> {
    const client = this.clients.get(serverId);
    if (!client) {
      throw new Error(`No OIDC client found for server: ${serverId}`);
    }

    try {
      // Store server ID in session storage for callback retrieval
      sessionStorage.setItem('mcp_auth_server_id', serverId);
      await client.signinRedirect();
    } catch (error) {
      console.error(`Authentication failed for server ${serverId}:`, error);
      throw error;
    }
  }

  /**
   * Handle OAuth callback
   */
  async handleCallback(serverId?: string): Promise<User | null> {
    let client: UserManager | undefined;
    let targetServerId: string | undefined = serverId;

    if (!targetServerId) {
      // Get server ID from session storage
      targetServerId = sessionStorage.getItem('mcp_auth_server_id') || undefined;
      if (targetServerId) {
        console.log(`Retrieved server ID from session: ${targetServerId}`);
        // Clean up session storage after use
        sessionStorage.removeItem('mcp_auth_server_id');
      }
    }

    // Try to get existing client or create it if missing
    if (targetServerId) {
      client = await this.ensureClient(targetServerId);
    }

    // Fallback to first available client
    if (!client) {
      client = this.clients.values().next().value;
    }

    if (!client) {
      throw new Error('No OIDC client found for callback');
    }

    try {
      const user = await client.signinRedirectCallback();
      return user;
    } catch (error) {
      console.error('Callback handling failed:', error);
      throw error;
    }
  }

  /**
   * Ensure OIDC client exists for a server (lazy creation)
   */
  private async ensureClient(serverId: string): Promise<UserManager | undefined> {
    let client = this.clients.get(serverId);
    
    if (!client) {
      const serverConfig = this.serverConfigs.get(serverId);
      if (serverConfig) {
        console.log(`Recreating OIDC client for server: ${serverConfig.name}`);
        await this.addServer(serverConfig);
        client = this.clients.get(serverId);
      }
    }
    
    return client;
  }

  /**
   * Sign out from a specific server
   */
  async signOut(serverId: string): Promise<void> {
    const client = this.clients.get(serverId);
    if (!client) {
      throw new Error(`No OIDC client found for server: ${serverId}`);
    }

    try {
      await client.signoutRedirect();
      this.handleTokenRemoved(serverId);
    } catch (error) {
      console.error(`Sign out failed for server ${serverId}:`, error);
      throw error;
    }
  }

  /**
   * Get current token info for a server
   */
  getTokenInfo(serverId: string): TokenInfo | null {
    return this.tokens.get(serverId) || null;
  }

  /**
   * Check if user is authenticated for a server
   */
  isAuthenticated(serverId: string): boolean {
    const token = this.tokens.get(serverId);
    return token ? Date.now() < token.expires_at * 1000 : false;
  }

  /**
   * Get ID token for MCP server authentication
   */
  getIdToken(serverId: string): string | null {
    const token = this.tokens.get(serverId);
    return token?.id_token || null;
  }

  /**
   * Remove a server and clean up
   */
  removeServer(serverId: string): void {
    const client = this.clients.get(serverId);
    if (client) {
      client.clearStaleState();
    }
    
    this.clients.delete(serverId);
    this.tokens.delete(serverId);
    this.serverConfigs.delete(serverId);
    
    // Update storage
    this.saveServerConfigsToStorage();
    
    // Clean up localStorage
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(`oidc_${serverId}_`)) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key));
  }

  /**
   * Get all authenticated servers
   */
  getAuthenticatedServers(): string[] {
    return Array.from(this.tokens.keys()).filter(serverId => 
      this.isAuthenticated(serverId)
    );
  }

  private handleTokenUpdate(serverId: string, user: User): void {
    console.log('🔐 handleTokenUpdate called for server:', serverId);
    console.log('👤 User profile:', user.profile);
    
    const tokenInfo: TokenInfo = {
      id_token: user.id_token || '',
      access_token: user.access_token,
      expires_at: user.expires_at || 0,
      user_info: {
        email: user.profile?.email || '',
        name: user.profile?.name || '',
        sub: user.profile?.sub || ''
      }
    };

    this.tokens.set(serverId, tokenInfo);
    this.saveTokensToStorage();
    
    console.log('📢 Dispatching oidc:token-updated event for:', serverId);
    // Emit event for UI updates
    window.dispatchEvent(new CustomEvent('oidc:token-updated', {
      detail: { serverId, tokenInfo }
    }));
  }

  private handleTokenRemoved(serverId: string): void {
    this.tokens.delete(serverId);
    this.saveTokensToStorage();
    
    // Emit event for UI updates
    window.dispatchEvent(new CustomEvent('oidc:token-removed', {
      detail: { serverId }
    }));
  }

  private saveTokensToStorage(): void {
    const tokenData: Record<string, TokenInfo> = {};
    this.tokens.forEach((token, serverId) => {
      tokenData[serverId] = token;
    });
    localStorage.setItem('mcp_tokens', JSON.stringify(tokenData));
  }

  private loadTokensFromStorage(): void {
    try {
      const tokenData = localStorage.getItem('mcp_tokens');
      if (tokenData) {
        const tokens: Record<string, TokenInfo> = JSON.parse(tokenData);
        Object.entries(tokens).forEach(([serverId, token]) => {
          // Only load non-expired tokens
          if (Date.now() < token.expires_at * 1000) {
            this.tokens.set(serverId, token);
          }
        });
      }
    } catch (error) {
      console.error('Failed to load tokens from storage:', error);
    }
  }

  private saveServerConfigsToStorage(): void {
    try {
      const serverData: Record<string, MCPServer> = {};
      this.serverConfigs.forEach((server, serverId) => {
        serverData[serverId] = server;
      });
      localStorage.setItem('mcp_server_configs', JSON.stringify(serverData));
    } catch (error) {
      console.error('Failed to save server configs to storage:', error);
    }
  }

  private loadServerConfigsFromStorage(): void {
    try {
      const serverData = localStorage.getItem('mcp_server_configs');
      if (serverData) {
        const servers: Record<string, MCPServer> = JSON.parse(serverData);
        Object.entries(servers).forEach(([serverId, server]) => {
          this.serverConfigs.set(serverId, server);
        });
      }
    } catch (error) {
      console.error('Failed to load server configs from storage:', error);
    }
  }
}

// Global instance
export const oidcManager = new UniversalOIDCManager();
