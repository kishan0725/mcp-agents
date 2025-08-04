'use client';

import { useState } from 'react';
import { MCPServer, MCPTool, MCPToolCall } from '@/types/mcp';
import { mcpClient } from '@/lib/mcp-client';

interface ToolInterfaceProps {
  server: MCPServer;
}

export default function ToolInterface({ server }: ToolInterfaceProps) {
  const [selectedTool, setSelectedTool] = useState<MCPTool | null>(null);
  const [toolArgs, setToolArgs] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  if (!server.tools || server.tools.length === 0) {
    return (
      <div className="p-4 text-center text-gray-500">
        No tools available for this server
      </div>
    );
  }

  const handleToolSelect = (tool: MCPTool) => {
    setSelectedTool(tool);
    setToolArgs({});
    setResult(null);
    setError(null);
  };

  const handleArgChange = (argName: string, value: any) => {
    setToolArgs(prev => ({
      ...prev,
      [argName]: value
    }));
  };

  const handleExecuteTool = async () => {
    if (!selectedTool) return;

    try {
      setLoading(true);
      setError(null);
      setResult(null);

      const toolCall: MCPToolCall = {
        name: selectedTool.name,
        arguments: toolArgs
      };

      const response = await mcpClient.callTool(server, toolCall);
      setResult(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Tool execution failed');
    } finally {
      setLoading(false);
    }
  };

  const renderInputField = (argName: string, schema: any) => {
    const value = toolArgs[argName] || '';
    const isRequired = selectedTool?.inputSchema.required?.includes(argName) || false;

    switch (schema.type) {
      case 'string':
        return (
          <input
            key={argName}
            type="text"
            value={value}
            onChange={(e) => handleArgChange(argName, e.target.value)}
            placeholder={schema.description || `Enter ${argName}`}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            required={isRequired}
          />
        );

      case 'number':
      case 'integer':
        return (
          <input
            key={argName}
            type="number"
            value={value}
            onChange={(e) => handleArgChange(argName, parseFloat(e.target.value) || 0)}
            placeholder={schema.description || `Enter ${argName}`}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            required={isRequired}
          />
        );

      case 'boolean':
        return (
          <select
            key={argName}
            value={value.toString()}
            onChange={(e) => handleArgChange(argName, e.target.value === 'true')}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            required={isRequired}
          >
            <option value="">Select...</option>
            <option value="true">True</option>
            <option value="false">False</option>
          </select>
        );

      default:
        return (
          <textarea
            key={argName}
            value={typeof value === 'string' ? value : JSON.stringify(value)}
            onChange={(e) => {
              try {
                const parsed = JSON.parse(e.target.value);
                handleArgChange(argName, parsed);
              } catch {
                handleArgChange(argName, e.target.value);
              }
            }}
            placeholder={schema.description || `Enter ${argName} (JSON format)`}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            required={isRequired}
          />
        );
    }
  };

  return (
    <div className="p-4">
      <h4 className="text-sm font-medium text-gray-900 mb-3">
        Available Tools
      </h4>

      {/* Tool Selection */}
      <div className="space-y-2 mb-4">
        {server.tools.map((tool) => (
          <button
            key={tool.name}
            onClick={() => handleToolSelect(tool)}
            className={`w-full text-left p-3 rounded-md border transition-colors ${
              selectedTool?.name === tool.name
                ? 'bg-blue-50 border-blue-200 text-blue-900'
                : 'bg-white border-gray-200 hover:bg-gray-50 text-gray-900'
            }`}
          >
            <div className="font-medium text-sm">{tool.name}</div>
            <div className="text-xs text-gray-600 mt-1">
              {tool.description}
            </div>
          </button>
        ))}
      </div>

      {/* Tool Form */}
      {selectedTool && (
        <div className="border-t pt-4">
          <h5 className="text-sm font-medium text-gray-900 mb-3">
            Execute: {selectedTool.name}
          </h5>
          
          {selectedTool.inputSchema.properties && Object.keys(selectedTool.inputSchema.properties).length > 0 ? (
            <div className="space-y-3 mb-4">
              {Object.entries(selectedTool.inputSchema.properties).map(([argName, schema]) => (
                <div key={argName}>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    {argName}
                    {selectedTool.inputSchema.required?.includes(argName) && (
                      <span className="text-red-500 ml-1">*</span>
                    )}
                  </label>
                  {renderInputField(argName, schema)}
                  {(schema as any).description && (
                    <p className="text-xs text-gray-500 mt-1">
                      {(schema as any).description}
                    </p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-gray-500 mb-4">
              This tool requires no parameters
            </p>
          )}

          <button
            onClick={handleExecuteTool}
            disabled={loading}
            className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Executing...
              </>
            ) : (
              <>
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h1m4 0h1m6-10V8a3 3 0 01-3 3H6a3 3 0 01-3-3V6a3 3 0 013-3h7a3 3 0 013 3z" />
                </svg>
                Execute Tool
              </>
            )}
          </button>
        </div>
      )}

      {/* Results */}
      {error && (
        <div className="mt-4 bg-red-50 border border-red-200 rounded-md p-3">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">
                Tool execution failed
              </h3>
              <div className="mt-2 text-sm text-red-700">
                {error}
              </div>
            </div>
          </div>
        </div>
      )}

      {result && (
        <div className="mt-4 bg-green-50 border border-green-200 rounded-md p-3">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-3 flex-1">
              <h3 className="text-sm font-medium text-green-800 mb-2">
                Tool executed successfully
              </h3>
              <div className="bg-white rounded border p-2 text-sm">
                <pre className="whitespace-pre-wrap text-gray-900 overflow-auto">
                  {typeof result === 'string' ? result : JSON.stringify(result, null, 2)}
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
