import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '4444', 10),
  litellmUrl: process.env.LITELLM_URL || 'http://127.0.0.1:4000',
  defaultApiKey: process.env.API_KEY || '',
};
