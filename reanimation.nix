{ config, lib, pkgs, ... }:

with lib;

let
  cfg = config.programs.nixi-terminal;

  # Define custom themes for Nixi Terminal
  themes = {
    dark = {
      background = "#1a1a1a";
      foreground = "#ffffff";
      cursor = "#00ff00";
      selection = "#333333";
    };
    
    light = {
      background = "#ffffff";
      foreground = "#000000";
      cursor = "#0000ff";
      selection = "#cccccc";
    };
    
    dracula = {
      background = "#282a36";
      foreground = "#f8f8f2";
      cursor = "#bd93f9";
      selection = "#44475a";
    };
    
    nord = {
      background = "#2e3440";
      foreground = "#d8dee9";
      cursor = "#88c0d0";
      selection = "#4c566a";
    };
  };

  # Generate Nixi terminal config
  terminalConfig = {
    theme = cfg.theme;
    font = cfg.font;
    gpuAcceleration = cfg.gpuAcceleration;
    width = cfg.width;
    height = cfg.height;
  };

in {
  options.programs.nixi-terminal = {
    enable = mkEnableOption "Nixi Terminal - advanced terminal emulator with Nixi scripting support";

    theme = mkOption {
      type = types.enum [ "dark" "light" "dracula" "nord" ];
      default = "dark";
      description = "Color theme for Nixi Terminal";
    };

    font = {
      family = mkOption {
        type = types.str;
        default = "JetBrains Mono";
        description = "Font family";
      };
      
      size = mkOption {
        type = types.int;
        default = 12;
        description = "Font size";
      };
    };

    gpuAcceleration = mkOption {
      type = types.bool;
      default = true;
      description = "Enable GPU acceleration for rendering";
    };

    width = mkOption {
      type = types.int;
      default = 800;
      description = "Initial window width";
    };

    height = mkOption {
      type = types.int;
      default = 600;
      description = "Initial window height";
    };
  };

  config = mkIf cfg.enable {
    home.packages = with pkgs; [
      nodejs
      nodePackages.npm
      # Add system dependencies for native modules
      mesa.drivers
      xorg.libX11
      xorg.libXrandr
      xorg.libXinerama
      xorg.libXcursor
      xorg.libXi
      glfw
      # Fonts
      jetbrains-mono
      (nerdfonts.override { fonts = [ "JetBrainsMono" ]; })
    ];

    # Create config directory and file
    home.file.".config/nixi-terminal/config.nixi".text = builtins.toJSON terminalConfig;

    # Add to PATH
    home.sessionVariables.TERMINAL = mkDefault "nixi-terminal";

    # Optional: Create a desktop entry
    home.file.".local/share/applications/nixi-terminal.desktop".text = ''
      [Desktop Entry]
      Name=Nixi Terminal
      Comment=Advanced terminal emulator with Nixi scripting support
      Exec=nixi-terminal
      Icon=utilities-terminal
      Terminal=false
      Type=Application
      Categories=System;TerminalEmulator;
    '';
  };
}
