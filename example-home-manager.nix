# Example Home Manager configuration using Nixi Terminal
{ config, lib, pkgs, ... }:

{
  imports = [ ./reanimation.nix ];

  programs.nixi-terminal = {
    enable = true;
    config = ''
      # Nixi Terminal Configuration
      let
        themes = import ./themes.nixi;
      in
      themes.terminalConfig {
        theme = "nord";
        font = {
          family = "JetBrains Mono";
          size = 12;
        };
        window = {
          width = 1024;
          height = 768;
          padding = { x = 20; y = 20; };
        };
        gpuAcceleration = true;
      }
    '';
  };

# Home Manager specific settings
  home.packages = with pkgs; [
    (nerd-fonts.override { fonts = [ "JetBrainsMono" ]; })
  ];

  # Set environment variables
  home.sessionVariables = {
    TERMINAL = "nixi-terminal";
  };

  # Optional: Configure XDG directories
  xdg.configFile."kitty" = {
    source = config.lib.file.mkOutOfStoreSymlink "${config.home.homeDirectory}/.config/kitty";
    recursive = true;
  };
}
