"""Weather tools for MCP Streamable HTTP server using NWS API with Google OAuth."""

import argparse
import os
from typing import Any

import httpx

from fastmcp import FastMCP, Context
from fastmcp.server.auth.providers.bearer import BearerAuthProvider
from fastmcp.server.dependencies import get_access_token, AccessToken
from starlette.middleware.cors import CORSMiddleware
from starlette.middleware import Middleware


def create_google_oauth_provider() -> BearerAuthProvider:
    """Create a Bearer auth provider for Google OAuth tokens."""
    return BearerAuthProvider(
        jwks_uri="https://www.googleapis.com/oauth2/v3/certs",
        issuer="https://accounts.google.com",
        # You can set audience to your Google OAuth client ID if needed
        # audience=os.getenv("GOOGLE_OAUTH_CLIENT_ID"),  # Optional: set this for stricter validation
        algorithm="RS256"
    )


# Initialize FastMCP server for Weather tools with Google OAuth authentication.
# If json_response is set to True, the server will use JSON responses instead of SSE streams
# If stateless_http is set to True, the server uses true stateless mode (new transport per request)
auth_provider = create_google_oauth_provider()
mcp = FastMCP(name="weather", json_response=False, stateless_http=True, auth=auth_provider)

# Constants
NWS_API_BASE = "https://api.weather.gov"
USER_AGENT = "weather-app/1.0"


async def make_nws_request(url: str) -> dict[str, Any] | None:
    """Make a request to the NWS API with proper error handling."""
    headers = {"User-Agent": USER_AGENT, "Accept": "application/geo+json"}
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(url, headers=headers, timeout=30.0)
            response.raise_for_status()
            return response.json()
        except Exception:
            return None


def format_alert(feature: dict) -> str:
    """Format an alert feature into a readable string."""
    props = feature["properties"]
    return f"""
Event: {props.get('event', 'Unknown')}
Area: {props.get('areaDesc', 'Unknown')}
Severity: {props.get('severity', 'Unknown')}
Description: {props.get('description', 'No description available')}
Instructions: {props.get('instruction', 'No specific instructions provided')}
"""

@mcp.tool
async def get_alerts(state: str, ctx: Context) -> str:
    """Get detailed weather alerts for any US state.
    Requires Google OAuth authentication.

    Args:
        state: Two-letter US state code (e.g. CA, NY)
    """
    # Access the authenticated user's token information
    access_token: AccessToken = get_access_token()
    
    # Log the authenticated request
    await ctx.info(f"Fetching weather alerts for {state.upper()} - User: {access_token.client_id}")
    
    # Validate state format
    state = state.upper()
    if len(state) != 2 or not state.isalpha():
        return "Error: Please provide a valid two-letter US state code (e.g. CA, NY)"
    
    url = f"{NWS_API_BASE}/alerts/active/area/{state}"
    data = await make_nws_request(url)

    if not data or "features" not in data:
        return "Unable to fetch alerts or no alerts found."

    if not data["features"]:
        return "No active alerts for this state."

    alerts = [format_alert(feature) for feature in data["features"]]
    return "\n---\n".join(alerts)

@mcp.tool
async def get_forecast(latitude: float, longitude: float, ctx: Context) -> str:
    """Get detailed weather forecast for any location by coordinates.
    Requires Google OAuth authentication.

    Args:
        latitude: Latitude of the location
        longitude: Longitude of the location
    """
    # Access the authenticated user's token information
    access_token: AccessToken = get_access_token()
    
    # Log the authenticated request
    await ctx.info(f"Fetching weather forecast for coordinates ({latitude}, {longitude}) - User: {access_token.client_id}")
    
    # First get the forecast grid endpoint
    points_url = f"{NWS_API_BASE}/points/{latitude},{longitude}"
    points_data = await make_nws_request(points_url)

    if not points_data:
        return "Unable to fetch forecast data for this location."

    # Get the forecast URL from the points response
    forecast_url = points_data["properties"]["forecast"]
    forecast_data = await make_nws_request(forecast_url)

    if not forecast_data:
        return "Unable to fetch detailed forecast."

    # Format the periods into a readable forecast
    periods = forecast_data["properties"]["periods"]
    forecasts = []
    for period in periods[:5]:  # Only show next 5 periods
        forecast = f"""
{period['name']}:
Temperature: {period['temperature']}°{period['temperatureUnit']}
Wind: {period['windSpeed']} {period['windDirection']}
Forecast: {period['detailedForecast']}
"""
        forecasts.append(forecast)

    return "\n---\n".join(forecasts)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Run MCP Streamable HTTP based server")
    parser.add_argument("--port", type=int, default=8123, help="Port to listen on")
    parser.add_argument("--host", type=str, default="0.0.0.0", help="Host to bind to (use 0.0.0.0 for Docker)")
    args = parser.parse_args()
    mcp.run(
        transport="http",
        host=args.host,
        port=args.port,
        middleware=[
            Middleware(
                CORSMiddleware,
                allow_origins=["*"],
                allow_credentials=True,
                allow_methods=["*"],
                allow_headers=["*"],
            )
        ])
    # mcp.run(transport="stdio") # Use this for stdio transport
