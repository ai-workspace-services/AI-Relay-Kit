import fs from 'fs';
import path from 'path';
import os from 'os';
import { ModelDetails } from './fetch_models';
import { config } from '../config';

export function injectIaCConfig(models: ModelDetails[]) {
  const iacDir = path.join(os.homedir(), '.ai-relay-kit', 'iac');
  fs.mkdirSync(iacDir, { recursive: true });

  const aiRelayKitConfig = {
    relay_port: config.port,
    litellm_url: config.litellmUrl,
    models: models.map(m => m.id),
  };

  // 1. Export for Ansible (ansible_vars.json)
  const ansibleVarsPath = path.join(iacDir, 'ansible_vars.json');
  const ansibleData = {
    ai_relay_kit_port: config.port,
    ai_relay_kit_litellm_url: config.litellmUrl,
    ai_relay_kit_available_models: models.map(m => m.id)
  };
  fs.writeFileSync(ansibleVarsPath, JSON.stringify(ansibleData, null, 2), 'utf8');
  console.log(`[IaC] Wrote Ansible variables to ${ansibleVarsPath}`);

  // 2. Export for Terraform (terraform.tfvars.json)
  const tfVarsPath = path.join(iacDir, 'terraform.tfvars.json');
  fs.writeFileSync(tfVarsPath, JSON.stringify(aiRelayKitConfig, null, 2), 'utf8');
  console.log(`[IaC] Wrote Terraform tfvars to ${tfVarsPath}`);
}
