
import { NextRequest, NextResponse } from 'next/server';
import { getGenesysToken } from '../_lib/genesysAuth';

export async function POST(req: NextRequest) {
  return handleRequest(req);
}

export async function GET(req: NextRequest) {
  return handleRequest(req);
}

async function handleRequest(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const path = searchParams.get('path');

  if (!path) {
    return NextResponse.json({ error: 'Missing path parameter' }, { status: 400 });
  }

  try {
    const { token, region } = await getGenesysToken();
    
    // searchParams.get already decodes the query param, so we use it directly.
    const targetUrl = `https://api.${region}${path}`;
    
    const method = req.method;
    let body: string | undefined = undefined;
    
    if (method === 'POST') {
      body = await req.text();
    }

    const response = await fetch(targetUrl, {
      method: method,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: body
    });

    const data = await response.json().catch(() => ({}));
    
    // If Genesys returns an error, we pass that status and body through
    if (!response.ok) {
      return NextResponse.json(
        { error: data.message || `Genesys Error ${response.status}`, details: data }, 
        { status: response.status }
      );
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error(`[Mawsool Proxy Error] ${req.method} ${path}:`, error.message);
    return NextResponse.json(
      { error: 'Genesys Bridge Failure', details: error.message },
      { status: 500 }
    );
  }
}
