#!/usr/bin/env node

const { Terminal } = require('./terminal');
const { NixiScriptEngine } = require('./nixi-engine');
const path = require('path');
const fs = require('fs');

class NixiTerminal {
  constructor() {
    this.terminal = null;
    this.scriptEngine = null;
    this.config = this.loadConfig();
  }

  loadConfig() {
    const configPath = path.join(process.env.HOME || '', '.config', 'nixi-terminal', 'config.nixi');
    
    if (fs.existsSync(configPath)) {
      try {
        return this.parseNixiConfig(fs.readFileSync(configPath, 'utf8'));
      } catch (error) {
        console.warn('Failed to load config, using defaults:', error.message);
      }
    }
    
    return {
      theme: 'dark',
      font: { family: 'JetBrains Mono', size: 12 },
      gpuAcceleration: true,
      scripts: {}
    };
  }

  parseNixiConfig(configContent) {
    // Parse Nixi configuration
    return {
      theme: 'dark',
      font: { family: 'JetBrains Mono', size: 12 },
      gpuAcceleration: true,
      scripts: {}
    };
  }

  async start() {
    console.log('🚀 Starting Nixi Terminal...');
    
    // Initialize Nixi script engine
    this.scriptEngine = new NixiScriptEngine();
    await this.scriptEngine.initialize();
    
    // Initialize terminal
    this.terminal = new Terminal(this.config);
    
    // Set up scripting hooks
    this.setupScriptingHooks();
    
    // Start the terminal
    await this.terminal.start();
  }

  setupScriptingHooks() {
    // Terminal event hooks for Nixi scripts
    this.terminal.on('command', async (command) => {
      if (command.startsWith('.nixi ')) {
        const script = command.substring(6);
        await this.executeNixiScript(script);
      }
    });

    this.terminal.on('startup', async () => {
      // Execute startup scripts
      for (const [name, script] of Object.entries(this.config.scripts)) {
        if (name === 'startup') {
          await this.executeNixiScript(script);
        }
      }
    });
  }

  async executeNixiScript(script) {
    try {
      const result = await this.scriptEngine.execute(script);
      if (result) {
        this.terminal.write(result.toString());
      }
    } catch (error) {
      this.terminal.write(`Error executing Nixi script: ${error.message}\n`);
    }
  }
}

// Main entry point
async function main() {
  const terminal = new NixiTerminal();
  
  try {
    await terminal.start();
  } catch (error) {
    console.error('Failed to start terminal:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { NixiTerminal };