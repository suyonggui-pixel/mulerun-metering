// src/metering.ts

interface MeteringPayload {
  agentId: string;
  sessionId: string;
  cost: number;
  timestamp: string;
  isFinal: boolean;
  meteringId: string;
}

export async function processMetering(
  params: {
    agentId: string;
    sessionId: string;
    cost: number;
    apiUrl: string;
    apiToken: string;
  }
): Promise<{ success: boolean; error?: string }> {
  
  const payload: MeteringPayload = {
    agentId: params.agentId,
    sessionId: params.sessionId,
    cost: params.cost,
    timestamp: new Date().toISOString(),
    isFinal: false,
    meteringId: crypto.randomUUID()
  };

  try {
    console.log(`[Metering Request] POST ${params.apiUrl}`, payload);

    const response = await fetch(params.apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${params.apiToken}`
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Metering API Error] Status: ${response.status}, Body: ${errorText}`);
      
      let cleanError = `API Error ${response.status}`;
      
      // 尝试解析 JSON 错误
      try {
        const errorJson = JSON.parse(errorText);
        // 兼容常见的 API 错误格式
        if (errorJson.message) cleanError = errorJson.message;
        else if (errorJson.error) cleanError = errorJson.error;
        else if (errorJson.detail) cleanError = errorJson.detail;
        else cleanError = errorText; 
      } catch (e) {
        if (errorText.length > 0) cleanError = errorText;
      }

      if (response.status === 402) {
        return { success: false, error: "Insufficient balance (API)" };
      }
      
      return { success: false, error: cleanError };
    }

    const responseData = await response.json();
    console.log("[Metering Response] Success:", responseData);
    
    return { success: true };

  } catch (err: any) {
    console.error("[Metering Network Error]", err);
    return { success: false, error: "Worker Network Error: " + err.message };
  }
}