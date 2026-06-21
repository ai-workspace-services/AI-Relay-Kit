import axios from 'axios';
import { config } from '../config';

export interface ModelDetails {
  id: string;
  object: string;
  created: number;
  owned_by: string;
}

export async function fetchLiteLLMModels(): Promise<ModelDetails[]> {
  try {
    const response = await axios.get(`${config.litellmUrl}/v1/models`, {
      headers: {
        'Authorization': `Bearer ${config.defaultApiKey}`
      }
    });
    return response.data.data || [];
  } catch (error: any) {
    console.error('Failed to fetch models from LiteLLM:', error.message);
    return [];
  }
}
