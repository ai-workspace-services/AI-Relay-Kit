import { cleanCodexConfig, cleanEnvConfigs } from './cleaner';

function runCleaner() {
  console.log('--- Starting AI-Relay-Kit Config Cleanup ---');
  
  // 1. Clean Codex
  cleanCodexConfig();

  // 2. Clean Environment Configs (Claude & Antigravity)
  cleanEnvConfigs();

  console.log('--- Cleanup Complete ---');
  console.log('\n💡 Your AI Workspace has been restored to its pure, pristine state.');
  console.log('   Please restart your terminal to apply the removed environment variables,');
  console.log('   or manually run `unset ANTHROPIC_BASE_URL OPENAI_BASE_URL` in current sessions.');
}

runCleaner();
