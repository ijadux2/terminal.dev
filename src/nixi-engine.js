const path = require('path');
const fs = require('fs');

class NixiScriptEngine {
  constructor() {
    this.nixiPath = path.resolve(__dirname, '../../nixi');
    this.compiler = null;
    this.terminalAPI = new TerminalAPI();
  }

  async initialize() {
    try {
      // Load Nixi compiler
      const Compiler = require(path.join(this.nixiPath, 'src', 'compiler.js'));
      this.compiler = new Compiler();
      
      console.log('Nixi script engine initialized');
    } catch (error) {
      console.warn('Failed to initialize Nixi compiler:', error.message);
      // Fallback to simple script execution
      this.compiler = null;
    }
  }

  async execute(script) {
    if (this.compiler) {
      return this.executeNixiScript(script);
    } else {
      return this.executeSimpleScript(script);
    }
  }

  async executeNixiScript(script) {
    try {
      // Add terminal API to script context
      const scriptWithAPI = `
        # Terminal API bindings
        let terminal = {
          write = text: __terminal_write(text);
          clear = (): __terminal_clear();
          setTheme = theme: __terminal_setTheme(theme);
          getTheme = (): __terminal_getTheme();
        };
        
        # Built-in terminal functions
        let echo = text: terminal.write(text + "\\n");
        let clear = terminal.clear;
        let theme = terminal.setTheme;
        
        # User script
        ${script}
      `;

      // Compile and execute
      const result = this.compiler.compile(scriptWithAPI);
      
      // Execute with terminal API context
      return this.executeWithContext(result.code, this.terminalAPI);
    } catch (error) {
      throw new Error(`Nixi script execution failed: ${error.message}`);
    }
  }

  async executeSimpleScript(script) {
    // Simple script execution for when Nixi is not available
    const commands = script.split('\n').filter(line => line.trim());
    
    for (const command of commands) {
      await this.executeCommand(command.trim());
    }
  }

  async executeCommand(command) {
    const parts = command.split(' ');
    const cmd = parts[0];
    const args = parts.slice(1);

    switch (cmd) {
      case 'echo':
        this.terminalAPI.write(args.join(' ') + '\n');
        break;
      case 'clear':
        this.terminalAPI.clear();
        break;
      case 'theme':
        if (args[0]) {
          this.terminalAPI.setTheme(args[0]);
        }
        break;
      case 'color':
        if (args[0]) {
          this.terminalAPI.setColor(args[0]);
        }
        break;
      default:
        // Try to execute as system command
        try {
          const { exec } = require('child_process');
          await new Promise((resolve, reject) => {
            exec(command, (error, stdout, stderr) => {
              if (error) {
                reject(error);
              } else {
                if (stdout) this.terminalAPI.write(stdout);
                if (stderr) this.terminalAPI.write(stderr);
                resolve();
              }
            });
          });
        } catch (error) {
          this.terminalAPI.write(`Command not found: ${cmd}\n`);
        }
    }
  }

  executeWithContext(code, context) {
    // Create a sandboxed execution context
    const sandbox = {
      __terminal_write: (text) => context.write(text),
      __terminal_clear: () => context.clear(),
      __terminal_setTheme: (theme) => context.setTheme(theme),
      __terminal_getTheme: () => context.getTheme(),
      console: {
        log: (...args) => context.write(args.join(' ') + '\n')
      }
    };

    // Execute in sandbox (simplified)
    try {
      const func = new Function(...Object.keys(sandbox), code);
      return func(...Object.values(sandbox));
    } catch (error) {
      throw new Error(`Script execution error: ${error.message}`);
    }
  }
}

class TerminalAPI {
  constructor() {
    this.terminal = null;
    this.currentTheme = 'dark';
    this.currentColor = 'default';
  }

  setTerminal(terminal) {
    this.terminal = terminal;
  }

  write(text) {
    if (this.terminal) {
      this.terminal.write(text);
    } else {
      process.stdout.write(text);
    }
  }

  clear() {
    if (this.terminal) {
      this.terminal.clear();
    } else {
      console.clear();
    }
  }

  setTheme(theme) {
    this.currentTheme = theme;
    if (this.terminal) {
      this.terminal.setTheme(theme);
    }
  }

  getTheme() {
    return this.currentTheme;
  }

  setColor(color) {
    this.currentColor = color;
    // ANSI color codes
    const colors = {
      black: '\x1b[30m',
      red: '\x1b[31m',
      green: '\x1b[32m',
      yellow: '\x1b[33m',
      blue: '\x1b[34m',
      magenta: '\x1b[35m',
      cyan: '\x1b[36m',
      white: '\x1b[37m',
      reset: '\x1b[0m'
    };
    
    const colorCode = colors[color] || colors.reset;
    this.write(colorCode);
  }
}

module.exports = { NixiScriptEngine, TerminalAPI };