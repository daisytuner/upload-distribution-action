import fs from 'fs';

export const DEBUG: boolean = process.env.DAISYTUNER_RUNNER_MODE === 'DEBUG';

export let DEBUG_CONFIG: Record<string, any> = {};

if (DEBUG) {
  const debug_config_file = process.env.DAISYTUNER_DEBUG_CONFIG;
  if (debug_config_file && fs.existsSync(debug_config_file)) {
    DEBUG_CONFIG = JSON.parse(fs.readFileSync(debug_config_file, 'utf-8'));
  }
}