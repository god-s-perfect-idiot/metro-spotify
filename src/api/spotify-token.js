// Server-side token exchange endpoint
// This should be implemented on your backend server for security
// Client-side token exchange is not recommended for production

export async function exchangeToken(code, clientId, clientSecret, redirectUri) {
  // In production, make this a server-side API call
  const response = await fetch('/api/spotify/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      code,
      clientId,
      clientSecret,
      redirectUri
    })
  });

  if (!response.ok) {
    throw new Error('Token exchange failed');
  }

  return await response.json();
}
