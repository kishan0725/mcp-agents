'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { MCPServer } from '@/types/mcp';
import { oidcManager } from '@/lib/oidc-manager';
import { mcpClient } from '@/lib/mcp-client';

interface ServerContextType {
  servers: MCPServer[];
  addServer: (server: MCPServer) => Promise<void>;
  removeServer: (serverId: string) => void;
  updateServer: (serverId: string, updates: Partial<MCPServer>) => void;
  authenticateServer: (serverId: string) => Promise<void>;
  signOutServer: (serverId: string) => Promise<void>;
  isAuthenticated: (serverId: string) => boolean;
  getUserInfo: (serverId: string) => { email: string; name: string } | null;
  refreshServerTools: (serverId: string) => Promise<void>;
  loading: boolean;
  error: string | null;
}

const ServerContext = createContext<ServerContextType | undefined>(undefined);

interface ServerProviderProps {
  children: ReactNode;
}

export function ServerProvider({ children }: ServerProviderProps) {
  const [servers, setServers] = useState<MCPServer[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Load servers from localStorage on mount
    loadServersFromStorage();

    // Listen for token updates
    const handleTokenUpdate = (event: CustomEvent) => {
      const { serverId } = event.detail;
      console.log('🎉 Token updated event received for server:', serverId);
      updateServerStatus(serverId, 'connected');
      console.log('✅ Authentication successful - ready for tool fetching');
    };

    const handleTokenRemoved = (event: CustomEvent) => {
      const { serverId } = event.detail;
      console.log('🚫 Token removed event received for server:', serverId);
      updateServerStatus(serverId, 'disconnected');
    };

    window.addEventListener('oidc:token-updated', handleTokenUpdate as EventListener);
    window.addEventListener('oidc:token-removed', handleTokenRemoved as EventListener);

    return () => {
      window.removeEventListener('oidc:token-updated', handleTokenUpdate as EventListener);
      window.removeEventListener('oidc:token-removed', handleTokenRemoved as EventListener);
    };
  }, []);

  const loadServersFromStorage = () => {
    try {
      const storedServers = localStorage.getItem('mcp_servers');
      console.log('Loading servers from storage:', storedServers);
      
      if (storedServers) {
        const parsed = JSON.parse(storedServers) as MCPServer[];
        console.log('Parsed servers:', parsed);
        
        const serversWithStatus = parsed.map(server => ({
          ...server,
          status: oidcManager.isAuthenticated(server.id) ? 'connected' as const : 'disconnected' as const
        }));
        
        setServers(serversWithStatus);
        console.log('Set servers with status:', serversWithStatus);

        // Initialize OIDC clients for all servers
        parsed.forEach(async server => {
          await oidcManager.addServer(server);
          console.log('Added OIDC client for server:', server.name);
        });
      } else {
        console.log('No servers found in storage');
      }
    } catch (err) {
      console.error('Failed to load servers from storage:', err);
      setError('Failed to load saved servers');
    }
  };

  const saveServersToStorage = (updatedServers: MCPServer[]) => {
    try {
      localStorage.setItem('mcp_servers', JSON.stringify(updatedServers));
    } catch (err) {
      console.error('Failed to save servers to storage:', err);
    }
  };

  const addServer = async (server: MCPServer): Promise<void> => {
    try {
      setLoading(true);
      setError(null);

      // Validate server configuration
      const validation = mcpClient.validateServerConfig(server);
      if (!validation.valid) {
        throw new Error(`Invalid server configuration: ${validation.errors.join(', ')}`);
      }

      // Add OIDC client
      await oidcManager.addServer(server);

      // Add to state
      const updatedServers = [...servers, { ...server, status: 'disconnected' as const }];
      setServers(updatedServers);
      saveServersToStorage(updatedServers);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add server');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const removeServer = (serverId: string) => {
    try {
      // Remove from OIDC manager
      oidcManager.removeServer(serverId);

      // Remove from state
      const updatedServers = servers.filter(s => s.id !== serverId);
      setServers(updatedServers);
      saveServersToStorage(updatedServers);
    } catch (err) {
      console.error('Failed to remove server:', err);
      setError(err instanceof Error ? err.message : 'Failed to remove server');
    }
  };

  const updateServer = (serverId: string, updates: Partial<MCPServer>) => {
    const updatedServers = servers.map(server =>
      server.id === serverId ? { ...server, ...updates } : server
    );
    setServers(updatedServers);
    saveServersToStorage(updatedServers);
  };

  const updateServerStatus = async (serverId: string, status: MCPServer['status']) => {
    // Try to update existing server
    const existingServer = servers.find(s => s.id === serverId);
    
    if (existingServer) {
      updateServer(serverId, { status });
    } else {
      // Server not in state, load from OIDC storage
      console.log('🔄 Server not found in state, loading from OIDC storage for status update');
      const serverConfigs = localStorage.getItem('mcp_server_configs');
      if (serverConfigs) {
        const parsedConfigs = JSON.parse(serverConfigs) as Record<string, MCPServer>;
        const server = parsedConfigs[serverId];
        if (server) {
          console.log('✅ Found server in OIDC storage, adding to state:', server.name);
          // Add server to state with the new status
          const serverWithStatus = { ...server, status };
          const updatedServers = [...servers, serverWithStatus];
          setServers(updatedServers);
          saveServersToStorage(updatedServers);
        }
      }
    }
  };

  const authenticateServer = async (serverId: string): Promise<void> => {
    try {
      setLoading(true);
      setError(null);
      await oidcManager.authenticate(serverId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const signOutServer = async (serverId: string): Promise<void> => {
    try {
      setLoading(true);
      await oidcManager.signOut(serverId);
      updateServerStatus(serverId, 'disconnected');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign out failed');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const isAuthenticated = (serverId: string): boolean => {
    return oidcManager.isAuthenticated(serverId);
  };

  const getUserInfo = (serverId: string) => {
    const tokenInfo = oidcManager.getTokenInfo(serverId);
    return tokenInfo ? {
      email: tokenInfo.user_info.email,
      name: tokenInfo.user_info.name
    } : null;
  };

  const refreshServerTools = async (serverId: string): Promise<void> => {
    try {
      console.log('🔍 refreshServerTools called for:', serverId);
      
      // First try to find server in current state
      let server = servers.find(s => s.id === serverId);
      
      // If not found in state, load directly from localStorage
      if (!server) {
        console.log('🔄 Server not found in state, loading from localStorage');
        
        // First try mcp_servers (ServerContext storage)
        let storedServers = localStorage.getItem('mcp_servers');
        if (storedServers) {
          const parsedServers = JSON.parse(storedServers) as MCPServer[];
          server = parsedServers.find(s => s.id === serverId);
        }
        
        // If not found, try mcp_server_configs (OIDC Manager storage)
        if (!server) {
          console.log('🔄 Trying mcp_server_configs storage');
          const serverConfigs = localStorage.getItem('mcp_server_configs');
          if (serverConfigs) {
            const parsedConfigs = JSON.parse(serverConfigs) as Record<string, MCPServer>;
            server = parsedConfigs[serverId];
            console.log('🎯 Found server in OIDC storage:', server ? server.name : 'NOT FOUND');
          }
        }
      }
      
      if (!server) {
        console.error('❌ Server not found in state or localStorage for ID:', serverId);
        return;
      }

      console.log('🚀 Calling mcpClient.listTools for server:', server.name);
      const tools = await mcpClient.listTools(server);
      console.log('✅ Received tools:', tools);
      
      updateServer(serverId, { tools, status: 'connected' });
      console.log('✅ Server updated with tools and connected status');
    } catch (err) {
      console.error(`❌ Failed to refresh tools for server ${serverId}:`, err);
      
      // Check if it's an authentication error
      if (err instanceof Error && (
        err.message.includes('Authentication required') || 
        err.message.includes('No authentication token found')
      )) {
        console.log('🔐 Authentication required - prompting user');
        updateServerStatus(serverId, 'disconnected');
        
        // Show user-friendly authentication prompt
        const shouldAuthenticate = confirm(`Authentication required to fetch tools for this server.\n\nClick OK to authenticate with Google OAuth, or Cancel to skip.`);
        
        if (shouldAuthenticate) {
          try {
            console.log('🚀 Starting OAuth authentication...');
            await authenticateServer(serverId);
          } catch (authError) {
            console.error('❌ Authentication failed:', authError);
            setError('Authentication failed. Please try again.');
          }
        }
      } else {
        updateServerStatus(serverId, 'error');
      }
    }
  };

  const value: ServerContextType = {
    servers,
    addServer,
    removeServer,
    updateServer,
    authenticateServer,
    signOutServer,
    isAuthenticated,
    getUserInfo,
    refreshServerTools,
    loading,
    error
  };

  return (
    <ServerContext.Provider value={value}>
      {children}
    </ServerContext.Provider>
  );
}

export function useServers(): ServerContextType {
  const context = useContext(ServerContext);
  if (context === undefined) {
    throw new Error('useServers must be used within a ServerProvider');
  }
  return context;
}
