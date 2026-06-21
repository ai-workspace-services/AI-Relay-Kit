import axios, { AxiosRequestConfig, AxiosResponse } from 'axios';
import { config } from '../config';

export async function proxyToLiteLLM(
  endpoint: string,
  method: 'GET' | 'POST' = 'POST',
  data?: any,
  headers?: any,
  responseType: 'json' | 'stream' = 'json'
): Promise<AxiosResponse> {
  const url = `${config.litellmUrl}${endpoint}`;
  
  // Strip out host and connection headers that might cause issues when proxying
  const safeHeaders = { ...headers };
  delete safeHeaders['host'];
  delete safeHeaders['connection'];
  delete safeHeaders['content-length'];
  
  const reqConfig: AxiosRequestConfig = {
    method,
    url,
    data,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': safeHeaders.Authorization || `Bearer ${config.defaultApiKey}`,
      ...safeHeaders
    },
    responseType
  };

  try {
    return await axios(reqConfig);
  } catch (error: any) {
    console.error(`LiteLLM Proxy Error [${method} ${url}]:`, error.response?.data || error.message);
    throw error;
  }
}
