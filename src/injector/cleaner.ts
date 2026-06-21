import fs from 'fs';
import path from 'path';
import os from 'os';

export function cleanCodexConfig() {
  const codexConfigPath = path.join(os.homedir(), '.codex', 'config.toml');
  const codexCatalogPath = path.join(os.homedir(), '.codex', 'custom_model_catalog.json');

  if (fs.existsSync(codexCatalogPath)) {
    fs.unlinkSync(codexCatalogPath);
    console.log(`[Codex Cleaner] Removed custom model catalog: ${codexCatalogPath}`);
  }

  if (fs.existsSync(codexConfigPath)) {
    let tomlContent = fs.readFileSync(codexConfigPath, 'utf8');
    let originalLength = tomlContent.length;

    // 1. Remove top-level injected configurations
    tomlContent = tomlContent.replace(/^model_provider\s*=\s*".*?"\r?\n?/gm, '');
    tomlContent = tomlContent.replace(/^model_catalog_json\s*=\s*".*?"\r?\n?/gm, '');

    // 2. Remove AI-Relay-Kit injected block
    const markerStart = '\n# --- UNIFIED RELAY CONFIG START ---';
    const markerEnd = '# --- UNIFIED RELAY CONFIG END ---\n';
    
    // Some older iterations might not have the marker, so let's also specifically target the deepseek-relay block if it exists
    const fallbackRegex1 = /\[model_providers\.unified-relay\][\s\S]*?(?=\n\[|$)/g;
    const fallbackRegex2 = /\[model_providers\.deepseek-relay\][\s\S]*?(?=\n\[|$)/g;
    
    if (tomlContent.includes(markerStart)) {
      const regex = new RegExp(`${markerStart}[\\s\\S]*?${markerEnd}`, 'g');
      tomlContent = tomlContent.replace(regex, '');
    } else {
      tomlContent = tomlContent.replace(fallbackRegex1, '');
      tomlContent = tomlContent.replace(fallbackRegex2, '');
    }

    // Optional: Remove specific XWorkmate block if desired (as per user context)
    const xworkmateStart = '# BEGIN XWORKMATE MANAGED MCP BLOCK';
    const xworkmateEnd = '# END XWORKMATE MANAGED MCP BLOCK';
    if (tomlContent.includes(xworkmateStart)) {
      const xworkRegex = new RegExp(`${xworkmateStart}[\\s\\S]*?${xworkmateEnd}\r?\n?`, 'g');
      tomlContent = tomlContent.replace(xworkRegex, '');
      console.log(`[Codex Cleaner] Removed XWorkmate managed MCP block`);
    }

    if (tomlContent.length !== originalLength) {
      fs.writeFileSync(codexConfigPath, tomlContent.trim() + '\n', 'utf8');
      console.log(`[Codex Cleaner] Restored ~/.codex/config.toml to pristine state.`);
    } else {
      console.log(`[Codex Cleaner] ~/.codex/config.toml is already clean.`);
    }
  }
}

export function cleanEnvConfigs() {
  const envFilePath = path.join(os.homedir(), '.ai-relay-kit.env');
  const iacDir = path.join(os.homedir(), '.ai-relay-kit');

  // 1. Delete the generated env file
  if (fs.existsSync(envFilePath)) {
    fs.unlinkSync(envFilePath);
    console.log(`[Env Cleaner] Deleted ${envFilePath}`);
  }

  // 2. Delete the IaC directory
  if (fs.existsSync(iacDir)) {
    fs.rmSync(iacDir, { recursive: true, force: true });
    console.log(`[Env Cleaner] Deleted IaC output directory ${iacDir}`);
  }

  // 3. Remove source lines from .bashrc and .zshrc
  const rcFiles = ['.zshrc', '.bashrc'].map(f => path.join(os.homedir(), f));
  for (const rcPath of rcFiles) {
    if (fs.existsSync(rcPath)) {
      let content = fs.readFileSync(rcPath, 'utf8');
      if (content.includes('.ai-relay-kit.env')) {
        const regex = /^.*source\s+.*\.ai-relay-kit\.env.*$/gm;
        content = content.replace(regex, '');
        fs.writeFileSync(rcPath, content, 'utf8');
        console.log(`[Env Cleaner] Removed source line from ${rcPath}`);
      }
    }
  }
  
  console.log(`[Env Cleaner] Claude Code and Antigravity third-party environment variables cleaned.`);
}
