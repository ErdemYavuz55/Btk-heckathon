import { NextRequest, NextResponse } from 'next/server';
import { generateRequestSchema } from '@interactive-edu/shared-schema';

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json();
    
    // Validate with schema
    const validatedRequest = generateRequestSchema.parse(body);
    
    // Get generator API URL
    const genApiUrl = process.env.GEN_API_URL || 'http://localhost:4000';
    
    // Proxy to generator-api
    const response = await fetch(`${genApiUrl}/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(validatedRequest),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Generator API error:', response.status, errorText);
      return NextResponse.json(
        { error: 'Generator API error', details: errorText },
        { status: response.status }
      );
    }
    
    // Stream back the response
    const result = await response.json();
    return NextResponse.json(result);
    
  } catch (error) {
    console.error('Visualize API error:', error);
    
    if (error && typeof error === 'object' && 'name' in error && error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Invalid request format', details: (error as any).errors },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 