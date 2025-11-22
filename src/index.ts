// src/index.ts
import { Hono } from 'hono';
import { Database } from '@cloudflare/d1';
import { verifyRequestAuth } from './auth';
import { processMetering } from './metering';
import { getMockupStudioHTML } from './ui';

type Bindings = {
  DB: Database;
  HMAC_SECRET: string;
  SESSION_COST: string;
  MULERUN_METERING_URL: string;
  MULERUN_API_TOKEN: string;
};

const app = new Hono<{ Bindings: Bindings }>();

// =====================================================
// 1. 初始页面加载 (GET)
// =====================================================
app.get('/', async (c) => {
  const query = c.req.query();
  
  // 1. 鉴权
  const authResult = await verifyRequestAuth(query, c.env.HMAC_SECRET);
  if (!authResult.valid) {
    return c.text(`Auth Failed: ${authResult.error}`, 401);
  }

  // 2. 初始扣费 (从环境变量读取默认值)
  const initialCost = parseInt(c.env.SESSION_COST || '10');
  
  const meteringResult = await processMetering({
    agentId: query.agentId,
    sessionId: query.sessionId,
    cost: initialCost,
    apiUrl: c.env.MULERUN_METERING_URL || "https://api.mulerun.com/sessions/metering",
    apiToken: c.env.MULERUN_API_TOKEN
  });

  if (!meteringResult.success) {
    return c.text(`Metering Failed: ${meteringResult.error}`, 402);
  }

  console.log(`[Session Init] Session: ${query.sessionId} | Cost: ${initialCost}`);

  // 3. 返回 UI
  return c.html(getMockupStudioHTML(query.sessionId, {
    sessionId: query.sessionId,
    agentId: query.agentId,
    cost: initialCost,
    type: "Session Init"
  }));
});

// =====================================================
// 2. 动作扣费接口 (POST)
// =====================================================
app.post('/api/action/filter', async (c) => {
  // A. 获取 URL 参数 (用于鉴权)
  const query = c.req.query();
  const { agentId, sessionId } = query;

  // 参数防空检查
  if (!agentId || !sessionId) {
    return c.json({ success: false, error: "Missing agentId or sessionId in URL params" }, 400);
  }

  // B. 鉴权 (复用 URL 签名)
  const authResult = await verifyRequestAuth(query, c.env.HMAC_SECRET);
  if (!authResult.valid) {
    return c.json({ success: false, error: authResult.error }, 401);
  }

  // C. 获取 Body 参数 (用于确定扣多少钱)
  let requestedCost = 20; // 默认值
  try {
    const body = await c.req.json();
    if (body.cost && typeof body.cost === 'number') {
      requestedCost = body.cost;
    }
  } catch (e) {
    console.warn("Failed to parse JSON body, using default cost");
  }

  // D. 调用计费 API
  const meteringResult = await processMetering({
    agentId: agentId,
    sessionId: sessionId,
    cost: requestedCost,
    apiUrl: c.env.MULERUN_METERING_URL || "https://api.mulerun.com/sessions/metering",
    apiToken: c.env.MULERUN_API_TOKEN
  });

  if (!meteringResult.success) {
    return c.json({ success: false, error: meteringResult.error }, 402);
  }

  console.log(`[Action Charge] Filter | Session: ${sessionId} | Cost: ${requestedCost}`);
  
  // E. 返回成功
  return c.json({
    success: true,
    cost: requestedCost
  });
});

app.get('/favicon.ico', (c) => c.text(''));

export default app;