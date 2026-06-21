import { fetchLiteLLMModels } from './fetch_models';
import { injectCodexConfig } from './codex_injector';
import { injectClaudeConfig } from './claude_injector';
import { injectAntigravityConfig } from './anti_injector';
import { injectIaCConfig } from './iac_injector';

async function runInjector() {
  console.log('--- Starting AI-Relay-Kit Config Injector ---');
  
  const models = await fetchLiteLLMModels();
  
  if (models.length === 0) {
    console.warn('⚠️ No models found from LiteLLM. Is LiteLLM running? Configurations might be incomplete.');
  } else {
    console.log(`✅ Fetched ${models.length} models from LiteLLM.`);
  }

  // 1. Configure Codex
  injectCodexConfig(models);

  // 2. Configure Claude Code
  injectClaudeConfig();

  // 3. Configure Antigravity
  injectAntigravityConfig();

  // 4. Export IaC Configurations
  injectIaCConfig(models);

  console.log('--- Config Injection Complete ---');
  console.log('\n💡 To apply the environment variables, run:');
  console.log('   source ~/.ai-relay-kit.env');
  console.log('\n   Or add this line to your ~/.zshrc or ~/.bashrc:');
  console.log('   source ~/.ai-relay-kit.env');
}

runInjector().catch(console.error);
