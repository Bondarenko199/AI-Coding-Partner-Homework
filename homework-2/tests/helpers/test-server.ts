import { Server } from 'http';
import app from '../../src/app.js';
import { ticketStore } from '../../src/services/ticket-store.js';

let server: Server | null = null;

export async function startTestServer(): Promise<{ url: string; close: () => Promise<void> }> {
  // Clear store before each test
  ticketStore.clear();

  return new Promise((resolve, reject) => {
    // Let the OS choose a free ephemeral port to avoid collisions
    server = app.listen(0, '127.0.0.1', () => {
      const address = server?.address();
      const actualPort = typeof address === 'object' && address ? address.port : 0;
      resolve({
        url: `http://127.0.0.1:${actualPort}`,
        close: async () => {
          if (server) {
            return new Promise((res, rej) => {
              server!.close((err) => {
                if (err) rej(err);
                else res();
              });
            });
          }
        }
      });
    });

    server.on('error', reject);
  });
}

export async function request(
  url: string,
  options: {
    method?: string;
    headers?: Record<string, string>;
    body?: unknown;
  } = {}
): Promise<{ status: number; body: any; headers: Record<string, string> }> {
  const response = await fetch(url, {
    method: options.method || 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    },
    body: options.body ? JSON.stringify(options.body) : undefined
  });

  let body;
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    body = await response.json();
  } else {
    const text = await response.text();
    body = text || null;
  }

  const headers: Record<string, string> = {};
  response.headers.forEach((value, key) => {
    headers[key] = value;
  });

  return {
    status: response.status,
    body,
    headers
  };
}
