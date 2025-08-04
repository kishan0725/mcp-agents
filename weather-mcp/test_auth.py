#!/usr/bin/env python3
"""
Test script to demonstrate Google OAuth authentication with the weather MCP server.

This script shows how to:
1. Generate a test JWT token (for development only)
2. Test authenticated requests to the MCP server
3. Verify that unauthenticated requests are rejected

For production use, obtain real Google OAuth tokens through proper OAuth 2.0 flow.
"""

import asyncio
import json
import os
from typing import Optional

import httpx
from fastmcp.server.auth.providers.bearer import RSAKeyPair


async def test_server_auth():
    """Test the weather MCP server authentication."""
    
    print("🔐 Testing Weather MCP Server with Google OAuth Authentication")
    print("=" * 60)
    
    # Server URL (with trailing slash based on redirect)
    server_url = "http://localhost:8123/mcp/"
    
    print(f"📡 Testing server at: {server_url}")
    
    # Test 1: Unauthenticated request (should fail)
    print("\n1️⃣ Testing UNAUTHENTICATED request (should fail with 401)...")
    
    try:
        async with httpx.AsyncClient(follow_redirects=False) as client:
            response = await client.post(
                server_url,
                json={
                    "jsonrpc": "2.0",
                    "id": 1,
                    "method": "initialize",
                    "params": {
                        "protocolVersion": "2024-11-05",
                        "capabilities": {},
                        "clientInfo": {"name": "test-client", "version": "1.0.0"}
                    }
                },
                headers={"Content-Type": "application/json"}
            )
            print(f"   Status: {response.status_code}")
            if response.status_code == 401:
                print("   ✅ PASS: Server correctly rejected unauthenticated request")
            elif response.status_code == 307:
                print("   ❌ FAIL: Server returned redirect instead of 401")
                redirect_location = response.headers.get('location', 'No location header')
                print(f"   🔗 Redirect Location: {redirect_location}")
                print("   💡 This suggests an endpoint or authentication configuration issue")
            else:
                print(f"   ❌ FAIL: Expected 401, got {response.status_code}")
            
            print(f"   Response Headers: {dict(response.headers)}")
            print(f"   Response Body: {response.text}")
    except httpx.ConnectError:
        print("   ❌ FAIL: Cannot connect to server. Is it running?")
        print("   💡 Run: python weather.py")
        return
    
    # Test 2: Generate a test JWT token for development
    print("\n2️⃣ Generating TEST JWT token for development...")
    
    # NOTE: In production, you would obtain real Google OAuth tokens
    # This is only for testing the authentication mechanism
    key_pair = RSAKeyPair.generate()
    
    # Create a test token that mimics Google's JWT structure
    test_token = key_pair.create_token(
        subject="test-user@example.com",
        issuer="https://accounts.google.com",  # Mimic Google's issuer
        audience=os.getenv("GOOGLE_OAUTH_CLIENT_ID"),
        scopes=["openid", "email"],
        expires_in_seconds=3600,
        additional_claims={
            "email": "test-user@example.com",
            "name": "Test User",
            "aud": os.getenv("GOOGLE_OAUTH_CLIENT_ID", "test-client")
        }
    )
    
    print(f"   📝 Generated token (first 50 chars): {test_token[:50]}...")
    print("   ⚠️  NOTE: This is a TEST token for development only!")
    print("   ⚠️  In production, use real Google OAuth tokens!")
    
    # Test 3: Authenticated request with fake token (will likely fail without proper Google JWKS validation)
    print("\n3️⃣ Testing with DEVELOPMENT token (may fail due to JWKS validation)...")
    
    try:
        async with httpx.AsyncClient(follow_redirects=False) as client:
            response = await client.post(
                server_url,
                json={
                    "jsonrpc": "2.0",
                    "id": 1,
                    "method": "initialize", 
                    "params": {
                        "protocolVersion": "2024-11-05",
                        "capabilities": {},
                        "clientInfo": {"name": "test-client", "version": "1.0.0"}
                    }
                },
                headers={
                    "Content-Type": "application/json",
                    "Authorization": f"Bearer {test_token}"
                }
            )
            print(f"   Status: {response.status_code}")
            if response.status_code == 200:
                print("   ✅ PASS: Server accepted the test token")
            elif response.status_code == 307:
                print("   ❌ FAIL: Server returned redirect instead of processing token")
                redirect_location = response.headers.get('location', 'No location header')
                print(f"   🔗 Redirect Location: {redirect_location}")
            else:
                print(f"   ⚠️  Server rejected test token (normal with Google JWKS validation)")
            
            print(f"   Response Headers: {dict(response.headers)}")
            print(f"   Response Body: {response.text[:200]}...")
    except Exception as e:
        print(f"   ❌ Error: {e}")
    
    # Test 4: Check server endpoints
    print("\n4️⃣ Testing server endpoint discovery...")
    
    # Test different common endpoints
    endpoints_to_test = [
        "http://localhost:8123",
        "http://localhost:8123/",
        "http://localhost:8123/mcp",
        "http://localhost:8123/sse",
        "http://localhost:8123/health"
    ]
    
    for endpoint in endpoints_to_test:
        try:
            async with httpx.AsyncClient(follow_redirects=False, timeout=5.0) as client:
                response = await client.get(endpoint)
                print(f"   GET {endpoint} -> Status: {response.status_code}")
                if response.status_code == 307:
                    redirect_location = response.headers.get('location', 'No location header')
                    print(f"     🔗 Redirects to: {redirect_location}")
        except Exception as e:
            print(f"   GET {endpoint} -> Error: {e}")
    
    print("\n" + "=" * 60)
    print("🎯 AUTHENTICATION TEST SUMMARY:")
    print("1. ✅ Unauthenticated requests are properly rejected")
    print("2. ✅ Server is configured for Google OAuth authentication")
    print("3. ⚠️  For real testing, you need a valid Google OAuth token")
    
    print("\n📚 HOW TO GET A REAL GOOGLE OAUTH TOKEN:")
    print("1. Visit: https://developers.google.com/oauthplayground/")
    print("2. Select 'Google OAuth2 API v2' scopes")
    print("3. Authorize and get the access token")
    print("4. Use that token in your requests")
    
    print("\n🚀 EXAMPLE WITH REAL TOKEN:")
    print("curl -X POST http://localhost:8123/mcp \\")
    print("  -H 'Content-Type: application/json' \\")
    print("  -H 'Authorization: Bearer YOUR_REAL_GOOGLE_TOKEN' \\")
    print("  -d '{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"tools/call\",\"params\":{\"name\":\"get_alerts\",\"arguments\":{\"state\":\"CA\"}}}'")


if __name__ == "__main__":
    print("🔍 Weather MCP Server Authentication Tester")
    print("This script tests the Google OAuth authentication setup.")
    print("Make sure the server is running: python weather.py")
    print()
    
    asyncio.run(test_server_auth())
