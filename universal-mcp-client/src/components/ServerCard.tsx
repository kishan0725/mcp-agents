'use client';

import { useState } from 'react';
import { MCPServer } from '@/types/mcp';
import { useServers } from '@/contexts/ServerContext';
import ToolInterface from './ToolInterface';

interface ServerCardProps {
  server: MCPServer;
}

export default function ServerCard({ server }: ServerCardProps) {
  const { 
    authenticateServer, 
    signOutServer, 
    removeServer, 
    isAuthenticated, 
    getUserInfo,
    refreshServerTools,
    loading 
  } = useServers();
  const [showTools, setShowTools] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const authenticated = isAuthenticated(server.id);
  const userInfo = getUserInfo(server.id);

  const handleAuthenticate = async () => {
    try {
      setActionLoading(true);
      await authenticateServer(server.id);
    } catch (error) {
      // Error handled by context
    } finally {
      setActionLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      setActionLoading(true);
      await signOutServer(server.id);
      setShowTools(false);
    } catch (error) {
      // Error handled by context
    } finally {
      setActionLoading(false);
    }
  };

  const handleFetchTools = async () => {
    try {
      setActionLoading(true);
      await refreshServerTools(server.id);
    } catch (error) {
      // Error handled by context
    } finally {
      setActionLoading(false);
    }
  };

  const handleRemove = () => {
    if (confirm(`Are you sure you want to remove "${server.name}"?`)) {
      removeServer(server.id);
    }
  };

  const statusColor = {
    connected: 'bg-green-100 text-green-800',
    disconnected: 'bg-yellow-100 text-yellow-800',
    error: 'bg-red-100 text-red-800'
  };

  const statusIcon = {
    connected: '✓',
    disconnected: '○',
    error: '✕'
  };

  return (
    <div className="bg-white rounded-lg border shadow-sm hover:shadow-md transition-shadow">
      <div className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 mb-1">
              {server.name}
            </h3>
            <p className="text-sm text-gray-600 mb-2">
              {server.description}
            </p>
            <div className="flex items-center space-x-4 text-xs text-gray-500">
              <span>OIDC: {new URL(server.oidc.issuer).hostname}</span>
              <span>•</span>
              <span>{server.oidc.scopes.length} scopes</span>
            </div>
          </div>
          <div className="flex-shrink-0 ml-4">
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColor[server.status]}`}>
              <span className="mr-1">{statusIcon[server.status]}</span>
              {server.status}
            </span>
          </div>
        </div>

        {/* User Info */}
        {authenticated && userInfo && (
          <div className="bg-green-50 rounded-md p-3 mb-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                  <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
              </div>
              <div className="ml-3 flex-1 min-w-0">
                <p className="text-sm font-medium text-green-800">
                  {userInfo.name}
                </p>
                <p className="text-sm text-green-600 truncate">
                  {userInfo.email}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Tools Summary */}
        {authenticated && server.tools && server.tools.length > 0 && (
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">
                Available Tools ({server.tools.length})
              </span>
              <button
                onClick={() => setShowTools(!showTools)}
                className="text-sm text-blue-600 hover:text-blue-700"
              >
                {showTools ? 'Hide' : 'Show'} Tools
              </button>
            </div>
            <div className="flex flex-wrap gap-1">
              {server.tools.slice(0, 3).map((tool) => (
                <span
                  key={tool.name}
                  className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800"
                >
                  {tool.name}
                </span>
              ))}
              {server.tools.length > 3 && (
                <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-600">
                  +{server.tools.length - 3} more
                </span>
              )}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between pt-4 border-t">
          <div className="flex items-center space-x-2">
            {/* Always show Fetch Tools button */}
            {(!server.tools || server.tools.length === 0) ? (
              <button
                onClick={handleFetchTools}
                disabled={actionLoading || loading}
                className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
              >
                {actionLoading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                ) : (
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                  </svg>
                )}
                Fetch Tools
              </button>
            ) : (
              /* Show Refresh button if tools already exist */
              <button
                onClick={handleFetchTools}
                disabled={actionLoading || loading}
                className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                title="Refresh tools"
              >
                {actionLoading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-700 mr-2"></div>
                ) : (
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                )}
                Refresh
              </button>
            )}

            {/* Show Sign Out only when authenticated */}
            {authenticated && (
              <button
                onClick={handleSignOut}
                disabled={actionLoading || loading}
                className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {actionLoading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-700 mr-2"></div>
                ) : (
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                )}
                Sign Out
              </button>
            )}
          </div>

          <button
            onClick={handleRemove}
            className="inline-flex items-center p-2 border border-transparent text-sm leading-4 font-medium rounded-md text-red-600 hover:text-red-700 hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
            title="Remove server"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>

      {/* Tool Interface */}
      {showTools && authenticated && server.tools && (
        <div className="border-t bg-gray-50">
          <ToolInterface server={server} />
        </div>
      )}
    </div>
  );
}
