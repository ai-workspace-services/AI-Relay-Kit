import fs from 'fs';
import path from 'path';
import os from 'os';
import { config } from '../config';

export function injectAntigravityConfig() {
  const envFilePath = path.join(os.homedir(), '.ai-relay-kit.env');
  
  let envContent = '';
  if (fs.existsSync(envFilePath)) {
    envContent = fs.readFileSync(envFilePath, 'utf8');
  }

  // Antigravity (and other OpenAI compatible tools) can just point directly to LiteLLM
  const openaiBaseUrl = `${config.litellmUrl}/v1`;
  
  const regex = /^export OPENAI_BASE_URL=.*$/m;
  if (regex.test(envContent)) {
    envContent = envContent.replace(regex, `export OPENAI_BASE_URL="${openaiBaseUrl}"`);
  } else {
    envContent += `\nexport OPENAI_BASE_URL="${openaiBaseUrl}"\n`;
  }

  fs.writeFileSync(envFilePath, envContent.trim() + '\n', 'utf8');
  console.log(`[Antigravity] Updated OpenAI compatible environment variables in ${envFilePath}`);
}
