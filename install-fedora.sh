#!/bin/bash

# Nixi Terminal Installation Script for Fedora 43
# This script installs all dependencies and builds Nixi Terminal

set -e

echo "🚀 Installing Nixi Terminal on Fedora 43..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running as root
if [[ $EUID -eq 0 ]]; then
   print_error "This script should not be run as root for user installation"
   print_warning "Run as regular user. It will use sudo when needed."
   exit 1
fi

# Update system packages
print_status "Updating system packages..."
sudo dnf update -y

# Install development tools
print_status "Installing development tools..."
sudo dnf groupinstall -y "Development Tools"
sudo dnf install -y \
    gcc \
    gcc-c++ \
    make \
    cmake \
    git \
    curl \
    wget \
    python3 \
    python3-pip

# Install Node.js (latest LTS)
print_status "Installing Node.js..."
if ! command -v node &> /dev/null; then
    curl -fsSL https://rpm.nodesource.com/setup_lts.x | sudo bash -
    sudo dnf install -y nodejs
else
    print_success "Node.js already installed: $(node --version)"
fi

# Install OpenGL and graphics libraries
print_status "Installing OpenGL and graphics libraries..."
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

# Install font libraries
print_status "Installing font libraries..."
sudo dnf install -y \
    fontconfig-devel \
    freetype-devel \
    harfbuzz-devel

# Install Nerd Fonts
print_status "Installing Nerd Fonts..."
sudo dnf install -y \
    jetbrains-mono-fonts \
    fira-code-fonts

# Clone the repository (assuming it's in the current directory)
REPO_DIR="$(pwd)"
if [[ ! -f "$REPO_DIR/flake.nix" ]]; then
    print_error "flake.nix not found. Make sure you're in the terminal.dev directory."
    exit 1
fi

print_status "Found repository in: $REPO_DIR"

# Install Node.js dependencies
print_status "Installing Node.js dependencies..."
cd "$REPO_DIR"
npm install

# Check if Nixi submodule exists
if [[ -d "../nixi" ]]; then
    print_status "Found Nixi submodule, installing dependencies..."
    cd "../nixi"
    npm install
    cd "$REPO_DIR"
else
    print_warning "Nixi submodule not found. Some features may not work."
    print_status "You can clone Nixi separately: git clone https://github.com/ijadux2/nixi.git ../nixi"
fi

# Build the terminal
print_status "Building Nixi Terminal..."
npm run build

# Create desktop entry
print_status "Creating desktop entry..."
cat > ~/.local/share/applications/nixi-terminal.desktop << EOF
[Desktop Entry]
Version=1.0
Type=Application
Name=Nixi Terminal
Comment=Advanced terminal emulator with Nixi scripting support
Exec=$REPO_DIR/src/index.js
Icon=terminal
Terminal=false
Categories=System;TerminalEmulator;
StartupNotify=true
EOF

# Create wrapper script for easier execution
print_status "Creating wrapper script..."
cat > ~/.local/bin/nixi-terminal << 'EOF'
#!/bin/bash
SCRIPT_DIR="$(dirname "$(readlink -f "$0")")"
REPO_DIR="$SCRIPT_DIR/../terminal.dev"

if [[ -f "$REPO_DIR/src/index.js" ]]; then
    cd "$REPO_DIR"
    node src/index.js "$@"
else
    echo "Error: Nixi Terminal not found at $REPO_DIR"
    echo "Please ensure the terminal.dev directory exists and is built."
    exit 1
fi
EOF

chmod +x ~/.local/bin/nixi-terminal

# Ensure ~/.local/bin is in PATH
if [[ ":$PATH:" != *":$HOME/.local/bin:"* ]]; then
    echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.bashrc
    echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.zshrc 2>/dev/null || true
    print_status "Added ~/.local/bin to PATH. Restart your shell or run:"
    echo "export PATH=\"\$HOME/.local/bin:\$PATH\""
fi

# Create configuration directory
print_status "Creating configuration directory..."
mkdir -p ~/.config/nixi-terminal

# Test the installation
print_status "Testing installation..."
if node -e "console.log('Node.js test passed')" 2>/dev/null; then
    print_success "Node.js is working correctly"
else
    print_error "Node.js test failed"
    exit 1
fi

# Check OpenGL support
print_status "Checking OpenGL support..."
if glxinfo | grep -q "OpenGL renderer"; then
    print_success "OpenGL support detected"
    GPU_ACCEL="true"
else
    print_warning "OpenGL support not detected. Terminal will use software rendering."
    GPU_ACCEL="false"
fi

# Create default configuration
print_status "Creating default configuration..."
cat > ~/.config/nixi-terminal/config.nixi << EOF
# Nixi Terminal Configuration
let
  themes = import "$REPO_DIR/themes.nixi";
in
themes.terminalConfig {
  theme = "dark";
  font = {
    family = "JetBrains Mono";
    size = 12;
  };
  window = {
    width = 1024;
    height = 768;
    padding = { x = 20; y = 20; };
  };
  gpuAcceleration = $GPU_ACCEL;
}
EOF

print_success "Installation completed successfully!"
echo ""
print_status "To run Nixi Terminal:"
echo "  1. Restart your shell or run: source ~/.bashrc"
echo "  2. Run: nixi-terminal"
echo ""
print_status "Or run directly:"
echo "  cd $REPO_DIR && npm start"
echo ""
print_status "Configuration file: ~/.config/nixi-terminal/config.nixi"
print_status "For help and documentation, see: $REPO_DIR/README.md"

# Optional: Add to alternatives system
read -p "Do you want to set Nixi Terminal as your default terminal? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    print_status "Setting Nixi Terminal as default..."
    sudo update-alternatives --install /usr/bin/x-terminal-emulator x-terminal-emulator "$REPO_DIR/src/index.js" 100
    print_success "Nixi Terminal is now the default terminal emulator"
fi

print_success "Enjoy your Nixi Terminal experience! 🚀"