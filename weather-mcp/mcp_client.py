#!/usr/bin/env python3
"""
MCP Client Tool Lister
A sample script to connect to MCP servers and list their available tools.
Supports multiple transport types: stdio, HTTP/SSE, and in-memory.
"""

import asyncio
import sys
from fastmcp import Client

async def list_tools_stdio(server_path):
    """Connect to a server via stdio transport and list tools."""
    print(f"🔌 Connecting to stdio server: {server_path}")
    
    try:
        async with Client(server_path) as client:
            tools_response = await client.list_tools()
            
            # Handle both possible response formats
            if hasattr(tools_response, 'tools'):
                tools_list = tools_response.tools
            else:
                tools_list = tools_response
                
            print(f"✅ Found {len(tools_list)} tools:")
            for tool in tools_list:
                name = getattr(tool, 'name', 'Unknown')
                description = getattr(tool, 'description', 'No description')
                print(f"  • {name}: {description}")
                
                # Show parameters if available
                if hasattr(tool, 'inputSchema') and tool.inputSchema:
                    props = tool.inputSchema.get('properties', {})
                    if props:
                        print(f"    Parameters: {list(props.keys())}")
            
    except Exception as e:
        print(f"❌ Error connecting to {server_path}: {e}")
        import traceback
        traceback.print_exc()

async def list_tools_http(url: str):
    """Connect to a server via HTTP/SSE and list tools."""
    print(f"🌐 Connecting to HTTP server: {url}")
    
    try:
        async with Client(url) as client:
            tools_response = await client.list_tools()
            
            # Handle both possible response formats
            if hasattr(tools_response, 'tools'):
                tools_list = tools_response.tools
            else:
                tools_list = tools_response
                
            print(f"✅ Found {len(tools_list)} tools:")
            for tool in tools_list:
                name = getattr(tool, 'name', 'Unknown')
                description = getattr(tool, 'description', 'No description')
                print(f"  • {name}: {description}")
                
                # Show parameters if available
                if hasattr(tool, 'inputSchema') and tool.inputSchema:
                    props = tool.inputSchema.get('properties', {})
                    if props:
                        print(f"    Parameters: {list(props.keys())}")
                
    except Exception as e:
        print(f"❌ Error connecting to {url}: {e}")
        import traceback
        traceback.print_exc()

async def list_tools_in_memory(mcp_server):
    """Connect to a server via in-memory transport and list tools."""
    print(f"🧠 Connecting to in-memory server")
    
    try:
        async with Client(mcp_server) as client:
            tools_response = await client.list_tools()
            
            # Handle both possible response formats
            if hasattr(tools_response, 'tools'):
                tools_list = tools_response.tools
            else:
                tools_list = tools_response
                
            print(f"✅ Found {len(tools_list)} tools:")
            for tool in tools_list:
                name = getattr(tool, 'name', 'Unknown')
                description = getattr(tool, 'description', 'No description')
                print(f"  • {name}: {description}")
                
                # Show parameters if available
                if hasattr(tool, 'inputSchema') and tool.inputSchema:
                    props = tool.inputSchema.get('properties', {})
                    if props:
                        print(f"    Parameters: {list(props.keys())}")
                
    except Exception as e:
        print(f"❌ Error with in-memory server: {e}")
        import traceback
        traceback.print_exc()

async def test_tool_call(server_identifier, tool_name: str, args: dict):
    """Test calling a specific tool."""
    print(f"🧪 Testing tool '{tool_name}' with args: {args}")
    
    try:
        async with Client(server_identifier) as client:
            result = await client.call_tool(tool_name, args)
            print(f"✅ Tool result: {result.content[0].text if result.content else 'No content'}")
            
    except Exception as e:
        print(f"❌ Error calling tool: {e}")

async def main():
    """Main function demonstrating different connection types."""
    
    if len(sys.argv) < 2:
        print("Usage:")
        print("  python mcp_client.py <server_path_or_url>")
        print("\nExamples:")
        print("  python mcp_client.py weather.py                    # stdio")
        print("  python mcp_client.py python3 weather.py            # stdio with interpreter")
        print("  python mcp_client.py http://localhost:8000/sse     # HTTP/SSE")
        print("  python mcp_client.py http://localhost:8123/mcp     # HTTP streaming")
        print("\nOptional: Add --test to test calling a tool:")
        print("  python mcp_client.py weather.py --test")
        return
    
    server_identifier = sys.argv[1]
    test_mode = "--test" in sys.argv
    
    # Handle different input formats
    if server_identifier.startswith(('http://', 'https://')):
        # HTTP/SSE transport
        await list_tools_http(server_identifier)
        
        # Optional: Test a tool call if requested
        if test_mode:
            print("\n" + "="*50)
            await test_tool_call(server_identifier, "get_forecast", {
                "latitude": 37.7749, "longitude": -122.4194
            })
        
    elif len(sys.argv) > 2 and not sys.argv[2].startswith('--'):
        # Handle "python3 weather.py" format
        command_parts = [arg for arg in sys.argv[1:] if not arg.startswith('--')]
        await list_tools_stdio(command_parts)
        
        if test_mode:
            print("\n" + "="*50)
            await test_tool_call(command_parts, "get_alerts", {"state": "CA"})
        
    else:
        # Simple script path
        await list_tools_stdio(server_identifier)
        
        # Optional: Test a tool call if requested
        if test_mode:
            print("\n" + "="*50)
            await test_tool_call(server_identifier, "get_alerts", {"state": "CA"})

if __name__ == "__main__":
    asyncio.run(main())
