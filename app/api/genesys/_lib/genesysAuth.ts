/**
 * Server-side Auth Library for Genesys Cloud
 * Handles OAuth Client Credentials flow using process.env secrets.
 */

let tokenCache: { token: string; expiresAt: number } | null = null;

export async function getGenesysToken() {
  const CLIENT_ID = process.env.GENESYS_CLIENT_ID;
  const CLIENT_SECRET = process.env.GENESYS_CLIENT_SECRET;
  const REGION = process.env.GENESYS_REGION || 'mec1.pure.cloud';

  if (!CLIENT_ID || !CLIENT_SECRET) {
    console.error('SERVER_CONFIG_ERROR: Genesys credentials missing in environment.');
    throw new Error('Genesys credentials not configured on server.');
  }

  // Check cache (with 1 minute buffer)
  if (tokenCache && Date.now() < tokenCache.expiresAt - 60000) {
    return { token: tokenCache.token, region: REGION };
  }

  const authUrl = `https://login.${REGION}/oauth/token`;
  
  // Use btoa for Base64 encoding to be compatible with both Node.js and Edge runtimes
  // and to resolve the "Cannot find name 'Buffer'" error in environments without Node.js types.
  const authHeader = btoa(`${CLIENT_ID}:${CLIENT_SECRET}`);

  try {
    const response = await fetch(authUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${authHeader}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: 'grant_type=client_credentials'
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`Genesys OAuth Failed (${response.status}):`, errorBody);
      throw new Error(`Genesys Authentication Failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    tokenCache = {
      token: data.access_token,
      expiresAt: Date.now() + (data.expires_in * 1000)
    };

    return { token: tokenCache.token, region: REGION };
  } catch (err: any) {
    console.error('Network error during Genesys OAuth:', err.message);
    throw err;
  }
}
