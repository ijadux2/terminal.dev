# Installation Guide for Fedora 43

## 🚀 Quick Install (Recommended)

Run the automated installation script:

```bash
# Make sure you're in the terminal.dev directory
cd /path/to/terminal.dev

# Run the installation script
./install-fedora.sh
```

## 📋 Manual Installation

If you prefer manual installation or want to understand each step:

### 1. System Dependencies

```bash
# Update system
sudo dnf update -y

# Install development tools
sudo dnf groupinstall -y "Development Tools"
sudo dnf install -y gcc gcc-c++ make cmake git curl wget python3 python3-pip

# Install Node.js (latest LTS)
curl -fsSL https://rpm.nodesource.com/setup_lts.x | sudo bash -
sudo dnf install -y nodejs
```

### 2. Graphics Libraries

```bash
# OpenGL and graphics libraries
sudo dnf install -y \
    mesa-libGL-devel \
    mesa-libGLU-devel \
    libX11-devel \
    libXcursor-devel \
    libXi-devel \
    libXrandr-devel \
    libXinerama-devel \
    libXxf86vm-devel \
    glfw-devel \
    glew-devel

# Font libraries
sudo dnf install -y \
    fontconfig-devel \
    freetype-devel \
    harfbuzz-devel
```

### 3. Fonts

```bash
# Install Nerd Fonts
sudo dnf install -y \
    jetbrains-mono-fonts \
    fira-code-fonts
```

### 4. Build Nixi Terminal

```bash
# Clone and build
cd terminal.dev
npm install

# If you have Nixi in the parent directory
cd ../nixi && npm install && cd ../terminal.dev

# Build the terminal
npm run build
```

### 5. Create Desktop Entry

```bash
# Create desktop entry
cat > ~/.local/share/applications/nixi-terminal.desktop << 'EOF'
[Desktop Entry]
Version=1.0
Type=Application
Name=Nixi Terminal
Comment=Advanced terminal emulator with Nixi scripting support
Exec=/path/to/terminal.dev/src/index.js
Icon=terminal
Terminal=false
Categories=System;TerminalEmulator;
EOF
```

### 6. Create Wrapper Script

```bash
# Create executable wrapper
cat > ~/.local/bin/nixi-terminal << 'EOF'
#!/bin/bash
REPO_DIR="/path/to/terminal.dev"
cd "$REPO_DIR"
node src/index.js "$@"
EOF

chmod +x ~/.local/bin/nixi-terminal

# Add to PATH (add to ~/.bashrc)
echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.bashrc
source ~/.bashrc
```

## 🔧 Post-Installation Setup

### Configuration

Create your configuration file:

```bash
mkdir -p ~/.config/nixi-terminal
cat > ~/.config/nixi-terminal/config.nixi << 'EOF'
let
  themes = import "/path/to/terminal.dev/themes.nixi";
in
themes.terminalConfig {
  theme = "dracula";
  font = {
    family = "JetBrains Mono";
    size = 12;
  };
  gpuAcceleration = true;
}
EOF
```

### Test Installation

```bash
# Test Node.js
node --version

# Test OpenGL support
glxinfo | grep "OpenGL renderer"

# Run terminal
nixi-terminal
```

## 🐛 Troubleshooting

### Common Issues

#### 1. Node.js Not Found
```bash
# Install Node.js properly
curl -fsSL https://rpm.nodesource.com/setup_lts.x | sudo bash -
sudo dnf install -y nodejs
```

#### 2. OpenGL Issues
```bash
# Check OpenGL support
glxinfo | grep "OpenGL renderer"

# Install Mesa drivers
sudo dnf install -y mesa-dri-drivers
```

#### 3. Permission Denied
```bash
# Make scripts executable
chmod +x ~/.local/bin/nixi-terminal
chmod +x install-fedora.sh
```

#### 4. Missing Libraries
```bash
# Install missing development libraries
sudo dnf install -y libX11-devel libXcursor-devel libXi-devel
```

#### 5. GPU Acceleration Not Working
```bash
# Check if GPU acceleration is available
glxinfo | grep "direct rendering"

# Force software rendering if needed
export LIBGL_ALWAYS_SOFTWARE=1
nixi-terminal
```

### Debug Mode

Run with debug output:

```bash
# Enable debug logging
DEBUG=* nixi-terminal

# Or check the logs
journalctl -f | grep nixi
```

## 🎯 Verification

After installation, verify everything works:

```bash
# Check if terminal runs
nixi-terminal --help

# Check Nixi scripting
nixi-terminal -c "echo 'Hello from Nixi!'"

# Check themes
nixi-terminal -c "theme dracula"
```

## 🔄 Updates

To update Nixi Terminal:

```bash
cd /path/to/terminal.dev
git pull
npm install
npm run build
```

## 🗑️ Uninstallation

To completely remove Nixi Terminal:

```bash
# Remove files
rm -rf ~/.local/bin/nixi-terminal
rm -rf ~/.local/share/applications/nixi-terminal.desktop
rm -rf ~/.config/nixi-terminal

# Remove from alternatives (if set as default)
sudo update-alternatives --remove x-terminal-emulator /path/to/terminal.dev/src/index.js
```

## 📚 Next Steps

- Read the [README.md](README.md) for full documentation
- Check [themes.nixi](themes.nixi) for theme customization
- Explore Nixi scripting capabilities
- Join the community for support and contributions