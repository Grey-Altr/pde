export function validateRelayToken(request: Request): boolean {
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  return token !== null && token === process.env.PDE_RELAY_TOKEN;
}
