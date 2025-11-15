# 🚀 Nixi Terminal

An advanced terminal emulator built with Nix and Nixi scripting support, featuring GPU acceleration and declarative configuration.

## ✨ Features

- 🎯 **Nixi Scripting**: Full Nixi language integration for terminal automation
- 🚀 **GPU Acceleration**: Hardware-accelerated rendering with OpenGL
- 🎨 **Advanced Theming**: Declarative themes with Nixi styling system
- ⚡ **High Performance**: Optimized rendering pipeline with fallback support
- 📦 **Nix Integration**: First-class NixOS and Home Manager support
- 🔧 **Modular Design**: Extensible architecture with plugin system
- 🖥️ **Cross-Platform**: Linux support with Wayland/X11 compatibility

## 🚀 Quick Start

### NixOS Configuration

```nix
{ config, pkgs, ... }:
{
  imports = [ ./reanimation.nix ];
  
  programs.nixi-terminal = {
    enable = true;
    theme = "dracula";
    font = {
      family = "JetBrains Mono Nerd Font";
      size = 14;
    };
    gpuAcceleration = true;
    
    scripts = {
      startup = ''
        echo "🚀 Welcome to Nixi Terminal!"
        echo "Type '.nixi help' for scripting commands"
      '';
    };
  };
  
  hardware.graphics.enable = true;  # For GPU acceleration
}
```

### Home Manager Configuration

```nix
{ config, pkgs, ... }:
{
  imports = [ ./reanimation.nix ];
  
  programs.nixi-terminal = {
    enable = true;
    config = ''
      let themes = import ./themes.nixi;
      in themes.terminalConfig {
        theme = "nord";
        font = { family = "JetBrains Mono"; size = 12; };
        gpuAcceleration = true;
      }
    '';
  };
}
```

## 🎨 Themes

Built-in themes:
- **dark**: Classic dark theme
- **light**: Clean light theme  
- **dracula**: Vibrant Dracula colors
- **nord**: Arctic-inspired palette

### Custom Themes with Nixi

```nixi
let
  customTheme = {
    background = "#1e1e2e";
    foreground = "#cdd6f4";
    cursor = "#f38ba8";
    colors = [
      "#45475a" "#f38ba8" "#a6e3a1" "#f9e2af"
      "#89b4fa" "#f5c2e7" "#94e2d5" "#bac2de"
    ];
  };
in
{
  appearance = customTheme;
  font = { family = "JetBrains Mono"; size = 14; };
}
```

## 🔧 Nixi Scripting

Nixi Terminal integrates the Nixi programming language for powerful terminal automation:

### Basic Commands

```bash
# Execute Nixi scripts in terminal
.nixi echo "Hello from Nixi!"
.nixi theme dracula
.nixi clear

# System information
.nixi systemInfo
.nixi gitStatus
```

### Advanced Scripting

```nixi
# Custom startup script
let
  greet = name: "Hello, " + name + "!";
  currentTime = __builtin_time();
in
{
  startup = ''
    echo "🚀 Nixi Terminal started at " + currentTime
    echo greet "User"
    echo "System: " + __builtin_uname()
  '';
  
  # Git integration
  preCommand = ''
    if __builtin_git_status() != "" then
      echo "🌿 Git: " + __builtin_git_branch()
    fi
  '';
}
```

## 🖥️ Development

### Development Environment

```bash
# Clone and setup
git clone <repository>
cd terminal.dev
nix develop

# Install dependencies
npm install

# Run in development mode
npm run dev

# Build for production
npm run build
```

### Project Structure

```
terminal.dev/
├── src/
│   ├── index.js           # Main entry point
│   ├── terminal.js        # Terminal core
│   ├── nixi-engine.js     # Nixi scripting engine
│   └── gpu-renderer.js    # GPU acceleration
├── themes.nixi            # Theme definitions
├── flake.nix              # Nix flake configuration
├── package.json           # Node.js dependencies
└── examples/              # Configuration examples
```

## ⚡ Performance

### GPU Acceleration

Nixi Terminal uses OpenGL for hardware-accelerated rendering:

- **Vertex Shaders**: Efficient character rendering
- **Fragment Shaders**: Advanced text effects and animations
- **Frame Buffers**: Offscreen rendering for smooth scrolling
- **Texture Management**: Optimized font and background rendering

### Fallback Support

If GPU acceleration isn't available, the terminal automatically falls back to software rendering while maintaining full functionality.

## 🔌 Configuration Options

### Terminal Settings

```nix
{
  # Window configuration
  window = {
    width = 1024;
    height = 768;
    padding = { x = 20; y = 20; };
    opacity = 0.95;
    decorations = true;
  };
  
  # Performance settings
  performance = {
    gpu = true;
    vsync = true;
    maxFPS = 60;
  };
  
  # Shell integration
  shell = {
    program = "${pkgs.bash}/bin/bash";
    args = ["--login"];
    env = { EDITOR = "nvim"; };
  };
}
```

### Keybindings

```nix
{
  keybindings = {
    "ctrl+shift+c" = "copy_to_clipboard";
    "ctrl+shift+v" = "paste_from_clipboard";
    "ctrl+shift+t" = "new_tab";
    "ctrl+shift+w" = "close_tab";
    "ctrl+shift+enter" = "fullscreen";
    "f11" = "toggle_fullscreen";
  };
}
```

## 🧪 Testing

```bash
# Run tests
npm test

# Lint code
npm run lint

# Format code
npm run format
```

## 📚 Documentation

- **[Nixi Language Guide](../nixi/README.md)** - Complete Nixi language reference
- **[Theme Development](themes.nixi)** - Creating custom themes
- **[Scripting API](src/nixi-engine.js)** - Terminal scripting interface
- **[GPU Rendering](src/gpu-renderer.js)** - Graphics acceleration details

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.

## 🔗 Links

- **Nixi Language**: [../nixi/](../nixi/)
- **Issues**: Report bugs and feature requests
- **Discussions**: Community discussions and Q&A

---

*Nixi Terminal - Where functional programming meets terminal emulation* 🚀