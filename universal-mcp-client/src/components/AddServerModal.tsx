'use client';

import { useState } from 'react';
import { useServers } from '@/contexts/ServerContext';
import { MCPServer } from '@/types/mcp';

interface AddServerModalProps {
  onClose: () => void;
}

export default function AddServerModal({ onClose }: AddServerModalProps) {
  const { addServer, loading } = useServers();
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    url: '',
    issuer: '',
    clientId: '',
    scopes: 'openid email profile'
  });
  const [errors, setErrors] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear errors when user starts typing
    if (errors.length > 0) {
      setErrors([]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setSubmitting(true);
      setErrors([]);

      // Create server object
      const server: MCPServer = {
        id: `server_${Date.now()}`,
        name: formData.name.trim(),
        description: formData.description.trim(),
        url: formData.url.trim(),
        status: 'disconnected',
        oidc: {
          issuer: formData.issuer.trim(),
          clientId: formData.clientId.trim(),
          scopes: formData.scopes.split(/\s+/).map(s => s.trim()).filter(s => s.length > 0),
          redirectUri: `${window.location.origin}/auth/callback`
        }
      };

      await addServer(server);
      onClose();
    } catch (error) {
      if (error instanceof Error) {
        setErrors([error.message]);
      } else {
        setErrors(['Failed to add server']);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const fillExampleGoogle = () => {
    setFormData({
      name: 'Weather Service',
      description: 'Weather forecast and alerts with Google OAuth',
      url: 'http://localhost:8123/mcp',
      issuer: 'https://accounts.google.com',
      clientId: '213097156996-loocjmc6lf10bs9q6k9o86ka51s7birj.apps.googleusercontent.com',
      scopes: 'openid email profile'
    });
  };

  const fillExampleMicrosoft = () => {
    setFormData({
      name: 'File Service',
      description: 'File management with Microsoft OAuth',
      url: 'http://localhost:8124/mcp/',
      issuer: 'https://login.microsoftonline.com/common/v2.0',
      clientId: 'your-azure-client-id',
      scopes: 'openid User.Read Files.Read'
    });
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white">
        <div className="mt-3">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-medium text-gray-900">
              Add New MCP Server
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Quick Examples */}
          <div className="mb-6 p-4 bg-blue-50 rounded-lg">
            <h4 className="text-sm font-medium text-blue-900 mb-2">Quick Examples</h4>
            <div className="flex space-x-2">
              <button
                onClick={fillExampleGoogle}
                className="px-3 py-1 text-xs bg-white border border-blue-200 rounded text-blue-800 hover:bg-blue-100 transition-colors"
              >
                Google OAuth Example
              </button>
              <button
                onClick={fillExampleMicrosoft}
                className="px-3 py-1 text-xs bg-white border border-blue-200 rounded text-blue-800 hover:bg-blue-100 transition-colors"
              >
                Microsoft OAuth Example
              </button>
            </div>
          </div>

          {/* Errors */}
          {errors.length > 0 && (
            <div className="mb-4 bg-red-50 border border-red-200 rounded-md p-3">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">
                    Please fix the following errors:
                  </h3>
                  <ul className="mt-2 text-sm text-red-700 list-disc list-inside">
                    {errors.map((error, index) => (
                      <li key={index}>{error}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Server Information */}
            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-3">Server Information</h4>
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Server Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => handleChange('name', e.target.value)}
                    placeholder="e.g., Weather Service"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <input
                    type="text"
                    value={formData.description}
                    onChange={(e) => handleChange('description', e.target.value)}
                    placeholder="e.g., Weather forecast and alerts"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    MCP Server URL *
                  </label>
                  <input
                    type="url"
                    value={formData.url}
                    onChange={(e) => handleChange('url', e.target.value)}
                    placeholder="http://localhost:8123/mcp"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    The HTTP endpoint for your MCP server
                  </p>
                </div>
              </div>
            </div>

            {/* OIDC Configuration */}
            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-3">OIDC Configuration</h4>
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    OIDC Issuer URL *
                  </label>
                  <input
                    type="url"
                    value={formData.issuer}
                    onChange={(e) => handleChange('issuer', e.target.value)}
                    placeholder="https://accounts.google.com"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    The OAuth provider's issuer URL (auto-discovers endpoints)
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Client ID *
                  </label>
                  <input
                    type="text"
                    value={formData.clientId}
                    onChange={(e) => handleChange('clientId', e.target.value)}
                    placeholder="your-client-id.apps.googleusercontent.com"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Your OAuth application's client ID
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Scopes *
                  </label>
                  <input
                    type="text"
                    value={formData.scopes}
                    onChange={(e) => handleChange('scopes', e.target.value)}
                    placeholder="openid email profile"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Space-separated list of OAuth scopes (must include "openid")
                  </p>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end space-x-3 pt-6 border-t">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                disabled={submitting || loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting || loading}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Adding Server...
                  </>
                ) : (
                  'Add Server'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
