import fs from 'fs';
import path from 'path';
import os from 'os';
import { ModelDetails } from './fetch_models';
import { config } from '../config';

const codexConfigPath = path.join(os.homedir(), '.codex', 'config.toml');
const codexCatalogPath = path.join(os.homedir(), '.codex', 'custom_model_catalog.json');

export function injectCodexConfig(models: ModelDetails[]) {
  // 1. Generate catalog.json
  const catalog = {
    models: models.map(m => ({
      id: m.id,
      name: m.id,
      provider: "unified-relay"
    }))
  };
  fs.mkdirSync(path.dirname(codexCatalogPath), { recursive: true });
  fs.writeFileSync(codexCatalogPath, JSON.stringify(catalog, null, 2), 'utf8');
  console.log(`[Codex] Wrote model catalog to ${codexCatalogPath}`);

  // 2. Modify config.toml
  let tomlContent = '';
  if (fs.existsSync(codexConfigPath)) {
    tomlContent = fs.readFileSync(codexConfigPath, 'utf8');
  }

  // Ensure model_provider and model_catalog_json are set at the root
  const providerRegex = /^model_provider\s*=\s*".*?"/m;
  if (providerRegex.test(tomlContent)) {
    tomlContent = tomlContent.replace(providerRegex, 'model_provider = "unified-relay"');
  } else {
    tomlContent = `model_provider = "unified-relay"\n` + tomlContent;
  }

  const catalogRegex = /^model_catalog_json\s*=\s*".*?"/m;
  if (catalogRegex.test(tomlContent)) {
    tomlContent = tomlContent.replace(catalogRegex, `model_catalog_json = "${codexCatalogPath}"`);
  } else {
    tomlContent = `model_catalog_json = "${codexCatalogPath}"\n` + tomlContent;
  }

  // Clean up any old unified-relay blocks if they exist (simple approach: we just append a fresh one or replace)
  // For safety and idempotency in this script, we'll look for our specific marker
  const markerStart = '\n# --- UNIFIED RELAY CONFIG START ---';
  const markerEnd = '# --- UNIFIED RELAY CONFIG END ---\n';
  
  if (tomlContent.includes(markerStart)) {
    const regex = new RegExp(`${markerStart}[\\s\\S]*?${markerEnd}`, 'g');
    tomlContent = tomlContent.replace(regex, '');
  }

  // Build the new provider and properties block
  let providerBlock = `${markerStart}\n`;
  providerBlock += `[model_providers.unified-relay]\n`;
  providerBlock += `name = "Unified AI-Relay-Kit"\n`;
  providerBlock += `base_url = "http://127.0.0.1:${config.port}/codex/v1"\n`;
  providerBlock += `wire_api = "responses"\n`;
  providerBlock += `env_key = "LITELLM_API_KEY"\n\n`;

  for (const m of models) {
    providerBlock += `[model_properties."${m.id}"]\n`;
    providerBlock += `context_window = 128000\n`;
    providerBlock += `max_context_window = 128000\n`;
    // Reasoning models usually don't support parallel tool calls
    const isReasoning = m.id.includes('reasoner') || m.id.includes('o1') || m.id.includes('o3');
    providerBlock += `supports_parallel_tool_calls = ${isReasoning ? 'false' : 'true'}\n`;
    providerBlock += `supports_reasoning_summaries = ${isReasoning ? 'true' : 'false'}\n`;
    providerBlock += `input_modalities = ["text"]\n\n`;
  }
  providerBlock += `${markerEnd}`;

  tomlContent += providerBlock;
  fs.writeFileSync(codexConfigPath, tomlContent, 'utf8');
  console.log(`[Codex] Updated config.toml at ${codexConfigPath}`);
}
