import fs from 'fs';
import path from 'path';
import os from 'os';
import { config } from '../config';

export function injectClaudeConfig() {
  const envFilePath = path.join(os.homedir(), '.ai-relay-kit.env');
  
  let envContent = '';
  if (fs.existsSync(envFilePath)) {
    envContent = fs.readFileSync(envFilePath, 'utf8');
  }

  const claudeBaseUrl = `http://127.0.0.1:${config.port}/claude/v1`;
  
  // Replace or append ANTHROPIC_BASE_URL
  const regex = /^export ANTHROPIC_BASE_URL=.*$/m;
  if (regex.test(envContent)) {
    envContent = envContent.replace(regex, `export ANTHROPIC_BASE_URL="${claudeBaseUrl}"`);
  } else {
    envContent += `\nexport ANTHROPIC_BASE_URL="${claudeBaseUrl}"\n`;
  }

  // Claude CLI uses this to route API requests
  fs.writeFileSync(envFilePath, envContent.trim() + '\n', 'utf8');
  console.log(`[Claude] Updated Claude environment variables in ${envFilePath}`);
}
