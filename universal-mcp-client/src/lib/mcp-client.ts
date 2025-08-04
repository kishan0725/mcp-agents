import { MCPServer, MCPTool, MCPToolCall, MCPResponse } from '@/types/mcp';
import { oidcManager } from './oidc-manager';

export class MCPClient {
  private static instance: MCPClient;

  static getInstance(): MCPClient {
    if (!MCPClient.instance) {
      MCPClient.instance = new MCPClient();
    }
    return MCPClient.instance;
  }

  /**
   * Initialize connection and discover server capabilities
   */
  async initialize(server: MCPServer): Promise<MCPResponse> {
    const idToken = oidcManager.getIdToken(server.id);
    if (!idToken) {
      throw new Error(`No authentication token found for server: ${server.name}`);
    }

    return this.makeRequest(server.url, {
      jsonrpc: '2.0',
      id: this.generateId(),
      method: 'initialize',
      params: {
        protocolVersion: '2024-11-05',
        capabilities: {
          experimental: {},
          sampling: {}
        },
        clientInfo: {
          name: 'Universal MCP Client',
          version: '1.0.0'
        }
      }
    }, idToken);
  }

  /**
   * List available tools from an MCP server
   */
  async listTools(server: MCPServer): Promise<MCPTool[]> {
    const idToken = oidcManager.getIdToken(server.id);
    if (!idToken) {
      throw new Error(`No authentication token found for server: ${server.name}`);
    }

    const response = await this.makeRequest(server.url, {
      jsonrpc: '2.0',
      id: this.generateId(),
      method: 'tools/list',
      params: {}
    }, idToken);

    if (response.error) {
      throw new Error(`Failed to list tools: ${response.error.message}`);
    }

    return response.result?.tools || [];
  }

  /**
   * Call a specific tool on an MCP server
   */
  async callTool(server: MCPServer, toolCall: MCPToolCall): Promise<any> {
    const idToken = oidcManager.getIdToken(server.id);
    if (!idToken) {
      throw new Error(`No authentication token found for server: ${server.name}`);
    }

    const response = await this.makeRequest(server.url, {
      jsonrpc: '2.0',
      id: this.generateId(),
      method: 'tools/call',
      params: {
        name: toolCall.name,
        arguments: toolCall.arguments
      }
    }, idToken);

    if (response.error) {
      throw new Error(`Tool call failed: ${response.error.message}`);
    }

    return response.result;
  }

  /**
   * List available resources from an MCP server
   */
  async listResources(server: MCPServer): Promise<any[]> {
    const idToken = oidcManager.getIdToken(server.id);
    if (!idToken) {
      throw new Error(`No authentication token found for server: ${server.name}`);
    }

    const response = await this.makeRequest(server.url, {
      jsonrpc: '2.0',
      id: this.generateId(),
      method: 'resources/list',
      params: {}
    }, idToken);

    if (response.error) {
      throw new Error(`Failed to list resources: ${response.error.message}`);
    }

    return response.result?.resources || [];
  }

  /**
   * Read a specific resource from an MCP server
   */
  async readResource(server: MCPServer, uri: string): Promise<any> {
    const idToken = oidcManager.getIdToken(server.id);
    if (!idToken) {
      throw new Error(`No authentication token found for server: ${server.name}`);
    }

    const response = await this.makeRequest(server.url, {
      jsonrpc: '2.0',
      id: this.generateId(),
      method: 'resources/read',
      params: {
        uri: uri
      }
    }, idToken);

    if (response.error) {
      throw new Error(`Failed to read resource: ${response.error.message}`);
    }

    return response.result;
  }

  /**
   * List available prompts from an MCP server
   */
  async listPrompts(server: MCPServer): Promise<any[]> {
    const idToken = oidcManager.getIdToken(server.id);
    if (!idToken) {
      throw new Error(`No authentication token found for server: ${server.name}`);
    }

    const response = await this.makeRequest(server.url, {
      jsonrpc: '2.0',
      id: this.generateId(),
      method: 'prompts/list',
      params: {}
    }, idToken);

    if (response.error) {
      throw new Error(`Failed to list prompts: ${response.error.message}`);
    }

    return response.result?.prompts || [];
  }

  /**
   * Test connection to MCP server
   */
  async testConnection(server: MCPServer): Promise<boolean> {
    try {
      const response = await this.initialize(server);
      return !response.error;
    } catch (error) {
      console.error(`Connection test failed for ${server.name}:`, error);
      return false;
    }
  }

  /**
   * Make HTTP request to MCP server with authentication
   */
  private async makeRequest(
    url: string, 
    payload: any, 
    idToken: string
  ): Promise<MCPResponse> {
    try {
      console.log('🚀 MCP JSON-RPC Request:');
      console.log('📡 URL:', url);
      console.log('📋 Payload:', JSON.stringify(payload, null, 2));
      console.log('🔐 ID Token (first 50 chars):', idToken.substring(0, 50) + '...');
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`,
          'Accept': 'application/json, text/event-stream'
        },
        body: JSON.stringify(payload)
      });

      console.log('📡 HTTP Response Status:', response.status, response.statusText);
      console.log('📋 Response Headers:', Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        // Handle authentication errors
        if (response.status === 401) {
          console.error('❌ Authentication failed (401)');
          throw new Error('Authentication required. Please sign in again.');
        }
        console.error(`❌ HTTP error! status: ${response.status}`);
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const contentType = response.headers.get('content-type');
      let data: MCPResponse;

      if (contentType?.includes('text/event-stream')) {
        console.log('📡 Processing SSE stream response');
        // Handle Server-Sent Events stream
        const text = await response.text();
        console.log('📋 Raw SSE Response:', text);
        
        // Parse SSE format: extract JSON from data: lines
        const lines = text.split('\n');
        const dataLines = lines.filter(line => line.startsWith('data: '));
        
        if (dataLines.length === 0) {
          throw new Error('No data found in SSE response');
        }
        
        // Get the JSON from the last data line (most recent)
        const jsonString = dataLines[dataLines.length - 1].substring(6); // Remove 'data: '
        console.log('📋 Extracted JSON:', jsonString);
        
        data = JSON.parse(jsonString) as MCPResponse;
      } else {
        console.log('📡 Processing regular JSON response');
        data = await response.json();
      }

      console.log('✅ MCP JSON-RPC Response:', JSON.stringify(data, null, 2));
      return data as MCPResponse;
    } catch (error) {
      console.error('❌ MCP request failed:', error);
      if (error instanceof TypeError && error.message.includes('fetch')) {
        console.error('🌐 Network error: Is the MCP server running on', url, '?');
      }
      throw error;
    }
  }

  /**
   * Generate unique request ID
   */
  private generateId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Validate MCP server configuration
   */
  validateServerConfig(server: MCPServer): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!server.name || server.name.trim() === '') {
      errors.push('Server name is required');
    }

    if (!server.url || !this.isValidUrl(server.url)) {
      errors.push('Valid server URL is required');
    }

    if (!server.oidc.issuer || !this.isValidUrl(server.oidc.issuer)) {
      errors.push('Valid OIDC issuer URL is required');
    }

    if (!server.oidc.clientId || server.oidc.clientId.trim() === '') {
      errors.push('OIDC client ID is required');
    }

    if (!server.oidc.scopes || server.oidc.scopes.length === 0) {
      errors.push('OIDC scopes are required');
    }

    if (!server.oidc.scopes.includes('openid')) {
      errors.push('OIDC scopes must include "openid"');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Helper to validate URLs
   */
  private isValidUrl(string: string): boolean {
    try {
      new URL(string);
      return true;
    } catch (_) {
      return false;
    }
  }
}

// Export singleton instance
export const mcpClient = MCPClient.getInstance();
