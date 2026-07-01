import type { BridgeConfig } from './config';

export interface BridgePrintJob {
  id: string;
  document_type: string;
  payload_format: string;
  payload_base64: string;
  attempt_count?: number;
  metadata?: Record<string, unknown>;
}

function bridgeHeaders(config: BridgeConfig): Record<string, string> {
  return {
    'x-bridge-key': config.bridgeKey,
    // Allows local testing through ngrok without receiving the browser warning page.
    'ngrok-skip-browser-warning': 'true',
  };
}

function withEstablishment(config: BridgeConfig, routePath: string): URL {
  const url = new URL(`${config.apiUrl}${routePath}`);
  url.searchParams.set('establishment_id', config.establishmentId);
  return url;
}

async function readError(response: Response): Promise<string> {
  const text = await response.text();
  if (!text) return response.statusText || 'No response body';
  try {
    const body = JSON.parse(text) as { error?: { message?: string }; message?: string };
    return body.error?.message || body.message || JSON.stringify(body);
  } catch {
    return text.slice(0, 500);
  }
}

export async function pollJob(config: BridgeConfig): Promise<BridgePrintJob | null> {
  const response = await fetch(withEstablishment(config, '/api/printing/bridge/poll'), {
    method: 'GET',
    headers: bridgeHeaders(config),
  });
  if (!response.ok) {
    throw new Error(`Poll failed (${response.status}): ${await readError(response)}`);
  }
  const body = await response.json() as { job?: BridgePrintJob | null };
  return body.job ?? null;
}

export async function ackJob(config: BridgeConfig, jobId: string): Promise<void> {
  const response = await fetch(withEstablishment(config, `/api/printing/bridge/jobs/${jobId}/ack`), {
    method: 'POST',
    headers: bridgeHeaders(config),
  });
  if (!response.ok) {
    throw new Error(`ACK failed (${response.status}): ${await readError(response)}`);
  }
}

export async function failJob(config: BridgeConfig, jobId: string, error: unknown): Promise<void> {
  const response = await fetch(withEstablishment(config, `/api/printing/bridge/jobs/${jobId}/fail`), {
    method: 'POST',
    headers: {
      ...bridgeHeaders(config),
      'content-type': 'application/json',
    },
    body: JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
  });
  if (!response.ok) {
    throw new Error(`FAIL report failed (${response.status}): ${await readError(response)}`);
  }
}
