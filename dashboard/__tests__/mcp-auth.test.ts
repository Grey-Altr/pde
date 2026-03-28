import { describe, test } from 'vitest';

describe('MCP Auth (withMcpAuth + Clerk)', () => {
  test.todo('Valid Clerk OAuth token passes authentication');
  test.todo('Missing Authorization header returns 401');
  test.todo('Invalid/expired token returns 401');
  test.todo('Auth handler calls auth({ acceptsToken: "oauth_token" })');
});
