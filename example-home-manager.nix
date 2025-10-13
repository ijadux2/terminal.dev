# Example Home Manager configuration using Reanimation Terminal
{ config, lib, pkgs, ... }:

{
  # Import the Reanimation Terminal module
  imports = [
    ./reanimation.nix  # Or use the flake: inputs.reanimation.homeManagerModules.default
  ];

  # Enable and configure Kitty
  programs.kitty = {
    enable = true;

    # Choose theme
    theme = "nord";  # Options: dracula, nord, solarized-dark

    # Font configuration
    font = {
      family = "JetBrains Mono Nerd Font";
      size = 11;
    };

    # Window settings
    window = {
      padding = {
        x = 12;
        y = 12;
      };
      hideDecorations = true;  # Hide decorations for a cleaner look
    };

    # Scrollback
    scrollback.lines = 15000;

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
      "ctrl+shift+0" = "reset_font_size";
    };
  };

  # Home Manager specific settings
  home.packages = with pkgs; [
    # Additional fonts
    fira-code
    (nerdfonts.override { fonts = [ "FiraCode" ]; })

    # Utilities
    wl-clipboard  # For Wayland
    xclip         # For X11
  ];

  # Set environment variables
  home.sessionVariables = {
    TERMINAL = "kitty";
  };

  # Optional: Configure XDG directories
  xdg.configFile."kitty" = {
    source = config.lib.file.mkOutOfStoreSymlink "${config.home.homeDirectory}/.config/kitty";
    recursive = true;
  };
}
