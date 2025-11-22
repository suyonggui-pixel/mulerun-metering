// src/auth.ts

function generateCanonicalString(params: Record<string, string>): string {
  const sortedKeys = Object.keys(params).sort();
  const parts = sortedKeys.map(key => {
    const keyStr = JSON.stringify(key);
    const valStr = JSON.stringify(params[key]); 
    return `${keyStr}:${valStr}`;
  });
  return `{${parts.join(',')}}`;
}

export async function verifyRequestAuth(
  query: Record<string, string>, 
  secret: string
): Promise<{ valid: boolean; error?: string }> {
  
  const { userId, sessionId, agentId, time, signature, origin, nonce } = query;

  if (!userId || !sessionId || !agentId || !time || !signature || !origin || !nonce) {
    return { valid: false, error: "Missing required parameters (auth)" };
  }

  const reqTime = parseInt(time);
  const now = Math.floor(Date.now() / 1000);
  if (isNaN(reqTime) || Math.abs(now - reqTime) > 300) {
    return { valid: false, error: "Request timestamp expired" };
  }

  // 仅对 query 中的参数进行签名验证
  const paramsToSign: Record<string, string> = {};
  Object.keys(query).forEach(k => {
    if (k !== 'signature') paramsToSign[k] = query[k];
  });

  const canonicalString = generateCanonicalString(paramsToSign);
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  
  const signatureBuffer = await crypto.subtle.sign('HMAC', key, encoder.encode(canonicalString));
  const computedSignature = Array.from(new Uint8Array(signatureBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');

  if (computedSignature !== signature) {
    return { valid: false, error: "Invalid signature" };
  }

  return { valid: true };
}