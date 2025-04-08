import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

export async function middleware(request: NextRequest) {
  // Check for session cart cookie
  if (!request.cookies.get('sessionCartId')) {
    const sessionCartId = crypto.randomUUID();

    // Clone request headers
    const newRequestHeaders = new Headers(request.headers);

    // Create new response
    const response = NextResponse.next({
      request: {
        headers: newRequestHeaders,
      },
    });

    // Set newly generated sessionCartId in the response cookie
    response.cookies.set('sessionCartId', sessionCartId);

    return response;
  } else {
    return NextResponse.next();
  }
}
