export interface MCPServer {
  id: string;
  name: string;
  description: string;
  url: string;
  oidc: OIDCConfig;
  status: 'connected' | 'disconnected' | 'error';
  tools?: MCPTool[];
}

export interface OIDCConfig {
  issuer: string;
  clientId: string;
  scopes: string[];
  redirectUri?: string;
}

export interface MCPTool {
  name: string;
  description: string;
  inputSchema: {
    type: string;
    properties: Record<string, any>;
    required?: string[];
  };
}

export interface MCPToolCall {
  name: string;
  arguments: Record<string, any>;
}

export interface MCPResponse {
  jsonrpc: string;
  id: string | number;
  result?: any;
  error?: {
    code: number;
    message: string;
    data?: any;
  };
}

export interface TokenInfo {
  id_token: string;
  access_token?: string;
  expires_at: number;
  user_info: {
    email: string;
    name: string;
    sub: string;
  };
}
