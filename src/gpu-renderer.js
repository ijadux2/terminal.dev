const gl = require('gl');

class GPURenderer {
  constructor(glContext, config) {
    this.gl = glContext;
    this.config = config;
    this.initialized = false;
    this.shaders = {};
    this.buffers = {};
    this.textures = {};
    this.framebuffer = null;
  }

  async initialize() {
    if (!this.config.gpuAcceleration) {
      console.log('GPU acceleration disabled, using software rendering');
      return false;
    }

    try {
      console.log('Initializing GPU renderer...');
      
      // Check OpenGL capabilities
      if (!this.checkGLCapabilities()) {
        throw new Error('Insufficient OpenGL capabilities');
      }

      // Initialize shaders
      await this.initializeShaders();
      
      // Initialize buffers
      this.initializeBuffers();
      
      // Initialize textures
      await this.initializeTextures();
      
      // Setup framebuffer for offscreen rendering
      this.setupFramebuffer();
      
      this.initialized = true;
      console.log('GPU renderer initialized successfully');
      return true;
      
    } catch (error) {
      console.warn('GPU initialization failed, falling back to software rendering:', error.message);
      this.config.gpuAcceleration = false;
      return false;
    }
  }

  checkGLCapabilities() {
    const gl = this.gl;
    
    // Check required extensions
    const requiredExtensions = [
      'OES_texture_float',
      'WEBGL_depth_texture',
      'OES_element_index_uint'
    ];
    
    for (const ext of requiredExtensions) {
      if (!gl.getExtension(ext)) {
        console.warn(`Missing OpenGL extension: ${ext}`);
      }
    }
    
    // Check maximum texture size
    const maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE);
    if (maxTextureSize < 1024) {
      console.warn(`Small max texture size: ${maxTextureSize}`);
    }
    
    // Check maximum viewport dimensions
    const maxViewportDims = gl.getParameter(gl.MAX_VIEWPORT_DIMS);
    if (maxViewportDims[0] < 1920 || maxViewportDims[1] < 1080) {
      console.warn(`Small max viewport: ${maxViewportDims[0]}x${maxViewportDims[1]}`);
    }
    
    return true;
  }

  async initializeShaders() {
    // Terminal vertex shader
    const vertexShaderSource = `
      attribute vec2 a_position;
      attribute vec2 a_texCoord;
      attribute vec4 a_color;
      
      uniform mat4 u_projection;
      uniform vec2 u_resolution;
      
      varying vec2 v_texCoord;
      varying vec4 v_color;
      
      void main() {
        vec2 clipSpace = ((a_position / u_resolution) * 2.0) - 1.0;
        gl_Position = u_projection * vec4(clipSpace * vec2(1, -1), 0, 1);
        v_texCoord = a_texCoord;
        v_color = a_color;
      }
    `;

    // Terminal fragment shader
    const fragmentShaderSource = `
      precision mediump float;
      
      varying vec2 v_texCoord;
      varying vec4 v_color;
      
      uniform sampler2D u_fontTexture;
      uniform sampler2D u_backgroundTexture;
      uniform float u_time;
      uniform vec2 u_cursorPosition;
      uniform bool u_cursorVisible;
      
      void main() {
        // Sample background
        vec4 backgroundColor = texture2D(u_backgroundTexture, v_texCoord);
        
        // Sample font
        vec4 fontColor = texture2D(u_fontTexture, v_texCoord);
        
        // Combine colors
        vec4 finalColor = mix(backgroundColor, v_color, fontColor.a);
        
        // Add cursor effect
        if (u_cursorVisible && distance(v_texCoord, u_cursorPosition) < 0.01) {
          finalColor = mix(finalColor, vec4(1.0, 1.0, 1.0, 1.0), 0.8);
        }
        
        // Add subtle animation
        finalColor.rgb += sin(u_time * 0.001) * 0.02;
        
        gl_FragColor = finalColor;
      }
    `;

    // Compile shaders
    this.shaders.terminal = this.createShaderProgram(vertexShaderSource, fragmentShaderSource);
    
    // Performance monitoring shader
    const perfVertexShader = `
      attribute vec2 a_position;
      void main() {
        gl_Position = vec4(a_position, 0.0, 1.0);
      }
    `;
    
    const perfFragmentShader = `
      precision mediump float;
      uniform vec4 u_color;
      void main() {
        gl_FragColor = u_color;
      }
    `;
    
    this.shaders.performance = this.createShaderProgram(perfVertexShader, perfFragmentShader);
  }

  createShaderProgram(vertexSource, fragmentSource) {
    const gl = this.gl;
    
    // Create and compile vertex shader
    const vertexShader = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vertexShader, vertexSource);
    gl.compileShader(vertexShader);
    
    if (!gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS)) {
      const error = gl.getShaderInfoLog(vertexShader);
      gl.deleteShader(vertexShader);
      throw new Error(`Vertex shader compilation failed: ${error}`);
    }
    
    // Create and compile fragment shader
    const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fragmentShader, fragmentSource);
    gl.compileShader(fragmentShader);
    
    if (!gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS)) {
      const error = gl.getShaderInfoLog(fragmentShader);
      gl.deleteShader(vertexShader);
      gl.deleteShader(fragmentShader);
      throw new Error(`Fragment shader compilation failed: ${error}`);
    }
    
    // Create shader program
    const program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      const error = gl.getProgramInfoLog(program);
      gl.deleteProgram(program);
      gl.deleteShader(vertexShader);
      gl.deleteShader(fragmentShader);
      throw new Error(`Shader program linking failed: ${error}`);
    }
    
    // Clean up shaders
    gl.deleteShader(vertexShader);
    gl.deleteShader(fragmentShader);
    
    return {
      program,
      uniforms: this.getUniformLocations(program),
      attributes: this.getAttributeLocations(program)
    };
  }

  getUniformLocations(program) {
    const gl = this.gl;
    const uniforms = {};
    const uniformCount = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);
    
    for (let i = 0; i < uniformCount; i++) {
      const name = gl.getActiveUniform(program, i).name;
      uniforms[name] = gl.getUniformLocation(program, name);
    }
    
    return uniforms;
  }

  getAttributeLocations(program) {
    const gl = this.gl;
    const attributes = {};
    const attributeCount = gl.getProgramParameter(program, gl.ACTIVE_ATTRIBUTES);
    
    for (let i = 0; i < attributeCount; i++) {
      const name = gl.getActiveAttrib(program, i).name;
      attributes[name] = gl.getAttribLocation(program, name);
    }
    
    return attributes;
  }

  initializeBuffers() {
    const gl = this.gl;
    
    // Quad buffer for terminal rendering
    const quadVertices = new Float32Array([
      0.0, 0.0,  0.0, 0.0,  1.0, 1.0, 1.0, 1.0,
      1.0, 0.0,  1.0, 0.0,  1.0, 1.0, 1.0, 1.0,
      0.0, 1.0,  0.0, 1.0,  1.0, 1.0, 1.0, 1.0,
      1.0, 1.0,  1.0, 1.0,  1.0, 1.0, 1.0, 1.0
    ]);
    
    this.buffers.quad = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.quad);
    gl.bufferData(gl.ARRAY_BUFFER, quadVertices, gl.STATIC_DRAW);
    
    // Index buffer for quad
    const quadIndices = new Uint16Array([0, 1, 2, 1, 2, 3]);
    
    this.buffers.quadIndices = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.buffers.quadIndices);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, quadIndices, gl.STATIC_DRAW);
  }

  async initializeTextures() {
    const gl = this.gl;
    
    // Font texture (placeholder - should be generated from actual font)
    this.textures.font = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this.textures.font);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    
    // Create a simple 1x1 white texture for now
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      1,
      1,
      0,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      new Uint8Array([255, 255, 255, 255])
    );
    
    // Background texture
    this.textures.background = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this.textures.background);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    
    // Create gradient background
    const gradientSize = 256;
    const gradientData = new Uint8Array(gradientSize * gradientSize * 4);
    for (let y = 0; y < gradientSize; y++) {
      for (let x = 0; x < gradientSize; x++) {
        const i = (y * gradientSize + x) * 4;
        const value = Math.floor((x + y) / (gradientSize * 2) * 50);
        gradientData[i] = value;     // R
        gradientData[i + 1] = value; // G
        gradientData[i + 2] = value; // B
        gradientData[i + 3] = 255;   // A
      }
    }
    
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      gradientSize,
      gradientSize,
      0,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      gradientData
    );
  }

  setupFramebuffer() {
    const gl = this.gl;
    
    // Create framebuffer for offscreen rendering
    this.framebuffer = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffer);
    
    // Create color buffer
    const colorBuffer = gl.createRenderbuffer();
    gl.bindRenderbuffer(gl.RENDERBUFFER, colorBuffer);
    gl.renderbufferStorage(gl.RENDERBUFFER, gl.RGBA565, this.config.width, this.config.height);
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.RENDERBUFFER, colorBuffer);
    
    // Create depth buffer
    const depthBuffer = gl.createRenderbuffer();
    gl.bindRenderbuffer(gl.RENDERBUFFER, depthBuffer);
    gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, this.config.width, this.config.height);
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, depthBuffer);
    
    // Check framebuffer completeness
    const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
    if (status !== gl.FRAMEBUFFER_COMPLETE) {
      throw new Error(`Framebuffer incomplete: ${status}`);
    }
    
    // Unbind framebuffer
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }

  render(terminalData) {
    if (!this.initialized) {
      return this.softwareRender(terminalData);
    }
    
    const gl = this.gl;
    const shader = this.shaders.terminal;
    
    // Use shader program
    gl.useProgram(shader.program);
    
    // Set uniforms
    gl.uniformMatrix4fv(shader.uniforms.u_projection, false, this.getProjectionMatrix());
    gl.uniform2f(shader.uniforms.u_resolution, this.config.width, this.config.height);
    gl.uniform1f(shader.uniforms.u_time, performance.now());
    
    // Bind textures
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.textures.font);
    gl.uniform1i(shader.uniforms.u_fontTexture, 0);
    
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, this.textures.background);
    gl.uniform1i(shader.uniforms.u_backgroundTexture, 1);
    
    // Bind buffers and set attributes
    this.bindVertexBuffers(shader);
    
    // Draw terminal content
    this.drawTerminalContent(terminalData);
    
    // Performance monitoring
    this.renderPerformanceOverlay();
  }

  bindVertexBuffers(shader) {
    const gl = this.gl;
    
    // Bind quad buffer
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.quad);
    
    // Set up attributes
    gl.enableVertexAttribArray(shader.attributes.a_position);
    gl.vertexAttribPointer(shader.attributes.a_position, 2, gl.FLOAT, false, 32, 0);
    
    gl.enableVertexAttribArray(shader.attributes.a_texCoord);
    gl.vertexAttribPointer(shader.attributes.a_texCoord, 2, gl.FLOAT, false, 32, 8);
    
    gl.enableVertexAttribArray(shader.attributes.a_color);
    gl.vertexAttribPointer(shader.attributes.a_color, 4, gl.FLOAT, false, 32, 16);
    
    // Bind index buffer
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.buffers.quadIndices);
  }

  drawTerminalContent(terminalData) {
    const gl = this.gl;
    
    // This would render the actual terminal content
    // For now, just draw a placeholder quad
    gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);
  }

  renderPerformanceOverlay() {
    // Simple FPS counter overlay
    const gl = this.gl;
    const shader = this.shaders.performance;
    
    gl.useProgram(shader.program);
    gl.uniform4f(shader.uniforms.u_color, 0.0, 1.0, 0.0, 0.5);
    
    // Draw small overlay in corner
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }

  softwareRender(terminalData) {
    // Fallback software rendering
    const gl = this.gl;
    gl.clearColor(0.1, 0.1, 0.1, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);
  }

  getProjectionMatrix() {
    // Simple orthographic projection
    return new Float32Array([
      2.0 / this.config.width, 0, 0, 0,
      0, 2.0 / this.config.height, 0, 0,
      0, 0, -1, 0,
      -1, -1, 0, 1
    ]);
  }

  resize(width, height) {
    this.config.width = width;
    this.config.height = height;
    
    if (this.initialized) {
      // Update framebuffer
      const gl = this.gl;
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffer);
      
      // Resize color buffer
      const colorBuffer = gl.createRenderbuffer();
      gl.bindRenderbuffer(gl.RENDERBUFFER, colorBuffer);
      gl.renderbufferStorage(gl.RENDERBUFFER, gl.RGBA565, width, height);
      gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.RENDERBUFFER, colorBuffer);
      
      // Resize depth buffer
      const depthBuffer = gl.createRenderbuffer();
      gl.bindRenderbuffer(gl.RENDERBUFFER, depthBuffer);
      gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, width, height);
      gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, depthBuffer);
      
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    }
  }

  cleanup() {
    const gl = this.gl;
    
    // Delete shaders
    Object.values(this.shaders).forEach(shader => {
      gl.deleteProgram(shader.program);
    });
    
    // Delete buffers
    Object.values(this.buffers).forEach(buffer => {
      gl.deleteBuffer(buffer);
    });
    
    // Delete textures
    Object.values(this.textures).forEach(texture => {
      gl.deleteTexture(texture);
    });
    
    // Delete framebuffer
    if (this.framebuffer) {
      gl.deleteFramebuffer(this.framebuffer);
    }
  }
}

module.exports = { GPURenderer };