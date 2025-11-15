let gl;
try {
  gl = require("gl");
} catch (error) {
  console.warn("OpenGL bindings not available, GPU acceleration disabled");
  gl = null;
}

let glfw;
try {
  glfw = require("glfw");
} catch (error) {
  console.warn("GLFW not available, window system disabled");
  glfw = null;
}
let pty;
try {
  pty = require("node-pty");
} catch (error) {
  console.warn("node-pty not available, terminal emulation disabled");
  pty = null;
}
const path = require("path");
const fs = require("fs");

class Terminal {
  constructor(config = {}) {
    this.config = {
      width: 800,
      height: 600,
      theme: "dark",
      font: { family: "JetBrains Mono", size: 12 },
      gpuAcceleration: true,
      ...config,
    };

    this.window = null;
    this.glContext = null;
    this.shell = null;
    this.eventHandlers = {};
    this.renderer = null;
  }

  async start() {
    console.log("Initializing terminal...");

    // Check if GLFW is available
    if (!glfw) {
      console.warn("GLFW not available, running in headless mode");
      this.config.gpuAcceleration = false;
      return this.startHeadless();
    }

    // Initialize GLFW
    if (!glfw.init()) {
      throw new Error("Failed to initialize GLFW");
    }

    // Create window
    this.window = glfw.createWindow(
      this.config.width,
      this.config.height,
      "Nixi Terminal",
      null,
      null,
    );

    if (!this.window) {
      glfw.terminate();
      throw new Error("Failed to create window");
    }

    // Make window context current
    glfw.makeContextCurrent(this.window);

    // Initialize OpenGL
    this.glContext = gl(this.config.width, this.config.height, {
      preserveDrawingBuffer: true,
    });

    // Initialize renderer
    this.renderer = new TerminalRenderer(this.glContext, this.config);
    await this.renderer.initialize();

    // Initialize shell
    this.initializeShell();

    // Set up event handlers
    this.setupEventHandlers();

    // Emit startup event
    this.emit("startup");

    // Start render loop
    this.renderLoop();
  }

  initializeShell() {
    if (!pty) {
      console.warn("PTY not available, using basic I/O");
      this.shell = null;
      return;
    }

    const shell = process.env.SHELL || "/bin/bash";

    this.shell = pty.spawn(shell, [], {
      name: "xterm-256color",
      cols: 80,
      rows: 24,
      cwd: process.cwd(),
      env: process.env,
    });

    this.shell.on("data", (data) => {
      this.renderer.addTerminalOutput(data);
    });
  }

  setupEventHandlers() {
    glfw.setKeyCallback(this.window, (window, key, scancode, action, mods) => {
      if (action === glfw.PRESS || action === glfw.REPEAT) {
        this.handleKeyPress(key, mods);
      }
    });

    glfw.setCharCallback(this.window, (window, char) => {
      this.handleCharInput(char);
    });

    glfw.setWindowSizeCallback(this.window, (window, width, height) => {
      this.handleResize(width, height);
    });
  }

  handleKeyPress(key, mods) {
    if (!this.shell) return;

    // Handle special keys
    switch (key) {
      case glfw.KEY_ENTER:
        this.shell.write("\r");
        break;
      case glfw.KEY_BACKSPACE:
        this.shell.write("\x7f");
        break;
      case glfw.KEY_TAB:
        this.shell.write("\t");
        break;
      case glfw.KEY_UP:
        this.shell.write("\x1b[A");
        break;
      case glfw.KEY_DOWN:
        this.shell.write("\x1b[B");
        break;
      case glfw.KEY_LEFT:
        this.shell.write("\x1b[D");
        break;
      case glfw.KEY_RIGHT:
        this.shell.write("\x1b[C");
        break;
      case glfw.KEY_ESCAPE:
        this.shell.write("\x1b");
        break;
    }
  }

  handleCharInput(char) {
    if (this.shell) {
      this.shell.write(char);
    }
  }

  handleResize(width, height) {
    this.config.width = width;
    this.config.height = height;

    // Update GL context if available
    if (gl) {
      this.glContext = gl(width, height, {
        preserveDrawingBuffer: true,
      });
    }

    // Update renderer
    if (this.renderer && this.renderer.resize) {
      this.renderer.resize(width, height);
    }

    // Update PTY size
    if (this.shell && this.renderer) {
      const cols = Math.floor(width / this.renderer.getCharWidth());
      const rows = Math.floor(height / this.renderer.getCharHeight());
      this.shell.resize(cols, rows);
    }
  }

  renderLoop() {
    while (!glfw.windowShouldClose(this.window)) {
      // Clear screen
      this.glContext.clearColor(0.0, 0.0, 0.0, 1.0);
      this.glContext.clear(this.glContext.COLOR_BUFFER_BIT);

      // Render terminal
      this.renderer.render();

      // Swap buffers
      glfw.swapBuffers(this.window);

      // Poll events
      glfw.pollEvents();
    }

    // Cleanup
    this.cleanup();
  }

  write(text) {
    this.renderer.addTerminalOutput(text);
  }

  on(event, handler) {
    if (!this.eventHandlers[event]) {
      this.eventHandlers[event] = [];
    }
    this.eventHandlers[event].push(handler);
  }

  emit(event, ...args) {
    if (this.eventHandlers[event]) {
      this.eventHandlers[event].forEach((handler) => handler(...args));
    }
  }

  async startHeadless() {
    console.log("Starting in headless mode...");

    // Initialize shell
    this.initializeShell();

    // Set up a simple renderer that doesn't require OpenGL
    this.renderer = new TerminalRenderer(null, this.config);

    // Emit startup event
    this.emit("startup");

    if (this.shell) {
      // Simple event loop for headless mode
      this.shell.on("data", (data) => {
        process.stdout.write(data);
      });
    } else {
      console.log("No PTY available. Running in basic mode.");
      process.stdin.on("data", (data) => {
        process.stdout.write(data);
      });
    }

    console.log("Headless terminal started.");
  }

  cleanup() {
    if (this.shell) {
      this.shell.destroy();
    }
    if (glfw) {
      glfw.terminate();
    }
  }
}

class TerminalRenderer {
  constructor(glContext, config) {
    this.gl = glContext;
    this.config = config;
    this.terminalBuffer = [];
    this.charWidth = 8;
    this.charHeight = 16;
    this.theme = this.loadTheme(config.theme);
  }

  async initialize() {
    if (!this.gl) {
      console.log("No OpenGL context available, using software rendering");
      return;
    }

    // Initialize OpenGL resources
    this.setupShaders();
    this.setupTextures();
    this.setupBuffers();
  }

  loadTheme(themeName) {
    const themes = {
      dark: {
        background: [0.1, 0.1, 0.1, 1.0],
        foreground: [1.0, 1.0, 1.0, 1.0],
        cursor: [0.5, 0.5, 1.0, 1.0],
        selection: [0.3, 0.3, 0.5, 0.5],
      },
      light: {
        background: [1.0, 1.0, 1.0, 1.0],
        foreground: [0.0, 0.0, 0.0, 1.0],
        cursor: [0.0, 0.5, 1.0, 1.0],
        selection: [0.7, 0.7, 0.9, 0.5],
      },
    };

    return themes[themeName] || themes.dark;
  }

  setupShaders() {
    // Vertex shader
    const vertexShaderSource = `
      attribute vec2 a_position;
      attribute vec2 a_texCoord;
      varying vec2 v_texCoord;
      
      void main() {
        gl_Position = vec4(a_position, 0.0, 1.0);
        v_texCoord = a_texCoord;
      }
    `;

    // Fragment shader
    const fragmentShaderSource = `
      precision mediump float;
      varying vec2 v_texCoord;
      uniform vec4 u_color;
      uniform sampler2D u_texture;
      
      void main() {
        gl_FragColor = u_color * texture2D(u_texture, v_texCoord);
      }
    `;

    // Compile shaders (simplified)
    this.shaderProgram = this.createShaderProgram(
      vertexShaderSource,
      fragmentShaderSource,
    );
  }

  createShaderProgram(vertexSource, fragmentSource) {
    // Simplified shader creation
    return {
      use: () => {},
      setUniform: (name, value) => {},
    };
  }

  setupTextures() {
    if (!this.gl) return;

    // Setup font texture (simplified)
    this.fontTexture = this.gl.createTexture();
    this.gl.bindTexture(this.gl.TEXTURE_2D, this.fontTexture);

    // Create a simple 1x1 white texture for now
    this.gl.texImage2D(
      this.gl.TEXTURE_2D,
      0,
      this.gl.RGBA,
      1,
      1,
      0,
      this.gl.RGBA,
      this.gl.UNSIGNED_BYTE,
      new Uint8Array([255, 255, 255, 255]),
    );
  }

  setupBuffers() {
    if (!this.gl) return;

    // Setup vertex buffers for quad rendering
    const vertices = new Float32Array([
      -1.0, -1.0, 0.0, 0.0, 1.0, -1.0, 1.0, 0.0, -1.0, 1.0, 0.0, 1.0, 1.0, 1.0,
      1.0, 1.0,
    ]);

    this.vertexBuffer = this.gl.createBuffer();
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.vertexBuffer);
    this.gl.bufferData(this.gl.ARRAY_BUFFER, vertices, this.gl.STATIC_DRAW);
  }

  addTerminalOutput(data) {
    this.terminalBuffer.push(data);
  }

  render() {
    if (!this.gl) {
      return; // Skip rendering if no OpenGL context
    }

    // Clear with theme background
    this.gl.clearColor(...this.theme.background);
    this.gl.clear(this.gl.COLOR_BUFFER_BIT);

    // Use shader program
    this.shaderProgram.use();

    // Render terminal content (simplified)
    this.renderTerminalContent();
  }

  renderTerminalContent() {
    if (!this.gl) return;

    // Simplified rendering - just draw a background for now
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.vertexBuffer);
    this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4);
  }

  resize(width, height) {
    if (this.gl) {
      this.gl.viewport(0, 0, width, height);
    }
  }

  getCharWidth() {
    return this.charWidth;
  }

  getCharHeight() {
    return this.charHeight;
  }
}

module.exports = { Terminal, TerminalRenderer };
