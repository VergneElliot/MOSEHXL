'use strict';

function bridgeHeaders(config) {
  return {
    'x-bridge-key': config.bridgeKey,
    // Allows local testing through ngrok without receiving the browser warning page.
    'ngrok-skip-browser-warning': 'true',
  };
}

function withEstablishment(config, path) {
  const url = new URL(`${config.apiUrl}${path}`);
  url.searchParams.set('establishment_id', config.establishmentId);
  return url;
}

async function readError(response) {
  const text = await response.text();
  if (!text) return response.statusText || 'No response body';
  try {
    const body = JSON.parse(text);
    return body?.error?.message || body?.message || JSON.stringify(body);
  } catch {
    return text.slice(0, 500);
  }
}

async function pollJob(config) {
  const response = await fetch(withEstablishment(config, '/api/printing/bridge/poll'), {
    method: 'GET',
    headers: bridgeHeaders(config),
  });
  if (!response.ok) {
    throw new Error(`Poll failed (${response.status}): ${await readError(response)}`);
  }
  const body = await response.json();
  return body.job || null;
}

async function ackJob(config, jobId) {
  const response = await fetch(withEstablishment(config, `/api/printing/bridge/jobs/${jobId}/ack`), {
    method: 'POST',
    headers: bridgeHeaders(config),
  });
  if (!response.ok) {
    throw new Error(`ACK failed (${response.status}): ${await readError(response)}`);
  }
}

async function failJob(config, jobId, error) {
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

module.exports = { pollJob, ackJob, failJob };
