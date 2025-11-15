# Example NixOS configuration using Nixi Terminal
{ config, lib, pkgs, ... }:

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
        echo "🚀 Welcome to Nixi Terminal on NixOS!"
        echo "System: $(uname -a)"
        echo "Theme: dracula"
        echo "GPU Acceleration: enabled"
        echo ""
        echo "Type '.nixi help' for scripting commands"
      '';
      
      gitStatus = ''
        if git rev-parse --git-dir > /dev/null 2>&1; then
          echo "📁 Git Repository: $(git config --get remote.origin.url || 'local')"
          echo "🌿 Branch: $(git branch --show-current)"
          echo "📊 Status: $(git status --porcelain | wc -l) modified files"
        else
          echo "Not a git repository"
        fi
      '';
      
      systemInfo = ''
        echo "💻 System Information:"
        echo "  Kernel: $(uname -r)"
        echo "  Uptime: $(uptime -p)"
        echo "  Memory: $(free -h | grep '^Mem:' | awk '{print $3 "/" $2}')"
        echo "  Disk: $(df -h / | tail -1 | awk '{print $3 "/" $2 " (" $5 ")"}')"
      '';
    };
  };

  # Additional system packages (optional)
  environment.systemPackages = with pkgs; [
    # Additional fonts
    fira-code
    (nerdfonts.override { fonts = [ "FiraCode" ]; })

    # Utilities
    wl-clipboard  # For Wayland clipboard support
    xclip         # For X11 clipboard support
  ];

  # GPU acceleration (ensure Mesa is available)
  hardware.graphics = {
    enable = true;
    enable32Bit = true;  # For 32-bit applications if needed
  };

  # Optional: Set Kitty as default terminal for all users
  environment.variables.TERMINAL = "kitty";
}
