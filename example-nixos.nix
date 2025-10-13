# Example NixOS configuration using Reanimation Terminal
{ config, lib, pkgs, ... }:

{
  # Import the Reanimation Terminal module
  imports = [
    ./reanimation.nix  # Or use the flake: inputs.reanimation.nixosModules.default
  ];

  # Enable and configure Kitty
  programs.kitty = {
    enable = true;

    # Choose theme
    theme = "dracula";  # Options: dracula, nord, solarized-dark

    # Font configuration
    font = {
      family = "JetBrains Mono Nerd Font";
      size = 12;
    };

    # Window settings
    window = {
      padding = {
        x = 15;
        y = 15;
      };
      hideDecorations = false;
    };

    # Scrollback
    scrollback.lines = 20000;

    # Custom keybindings
    keybindings = {
      "ctrl+shift+c" = "copy_to_clipboard";
      "ctrl+shift+v" = "paste_from_clipboard";
      "ctrl+shift+t" = "new_tab";
      "ctrl+shift+w" = "close_tab";
      "ctrl+shift+enter" = "new_window";
      "ctrl+shift+q" = "close_window";
      "ctrl+shift+l" = "next_tab";
      "ctrl+shift+h" = "previous_tab";
      "ctrl+shift+equal" = "increase_font_size";
      "ctrl+shift+minus" = "decrease_font_size";
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
