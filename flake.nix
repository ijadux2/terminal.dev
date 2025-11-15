{
  description = "Nixi Terminal - Advanced terminal emulator with Nixi scripting support";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, flake-utils }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = nixpkgs.legacyPackages.${system};
        
        # Nixi terminal package
        nixi-terminal = pkgs.buildNodePackage {
          pname = "nixi-terminal";
          version = "1.0.0";
          
          src = ./.;
          
          packageJson = ./package.json;
          npmFlags = [ "--legacy-peer-deps" ];
          
          buildInputs = with pkgs; [
            nodejs
            mesa
            libGL
            xorg.libX11
            xorg.libXcursor
            xorg.libXi
            xorg.libXrandr
            xorg.libXinerama
            xorg.libXxf86vm
          ];
          
          meta = with pkgs.lib; {
            description = "Advanced terminal emulator with Nixi scripting support";
            license = licenses.mit;
            platforms = platforms.linux;
          };
        };
        
      in
      {
        # NixOS module
        nixosModules.default = { config, lib, pkgs, ... }:
          with lib;
          let
            cfg = config.programs.nixi-terminal;
          in
          {
            options.programs.nixi-terminal = {
              enable = mkEnableOption "Nixi Terminal";
              
              theme = mkOption {
                type = types.str;
                default = "dark";
                description = "Terminal theme";
              };
              
              font = mkOption {
                type = types.submodule {
                  options = {
                    family = mkOption {
                      type = types.str;
                      default = "JetBrains Mono";
                    };
                    size = mkOption {
                      type = types.int;
                      default = 12;
                    };
                  };
                };
                default = {};
                description = "Font configuration";
              };
              
              gpuAcceleration = mkOption {
                type = types.bool;
                default = true;
                description = "Enable GPU acceleration";
              };
              
              scripts = mkOption {
                type = types.attrsOf types.lines;
                default = {};
                description = "Nixi scripts for terminal automation";
              };
            };
            
            config = mkIf cfg.enable {
              environment.systemPackages = [ nixi-terminal ];
              
              # OpenGL for GPU acceleration
              hardware.graphics = mkIf cfg.gpuAcceleration {
                enable = true;
              };
              
              # Font configuration
              fonts.packages = with pkgs; [
                (nerd-fonts.override { fonts = [ "JetBrainsMono" ]; })
              ];
              
              # System-wide Nixi scripts
              environment.etc."nixi-terminal/scripts".source = 
                pkgs.writeTextDir "scripts" (builtins.concatStringsSep "\n" 
                  (mapAttrsToList (name: script: ''
                    # ${name}
                    ${script}
                  '') cfg.scripts));
            };
          };

        # Home Manager module
        homeManagerModules.default = { config, lib, pkgs, ... }:
          with lib;
          let
            cfg = config.programs.nixi-terminal;
          in
          {
            options.programs.nixi-terminal = {
              enable = mkEnableOption "Nixi Terminal";
              
              config = mkOption {
                type = types.lines;
                default = "";
                description = "Nixi terminal configuration";
              };
            };
            
            config = mkIf cfg.enable {
              home.packages = [ nixi-terminal ];
              
              home.file.".config/nixi-terminal/config.nixi".text = cfg.config;
            };
          };

        # Development shell
        devShells.default = pkgs.mkShell {
          buildInputs = with pkgs; [
            nodejs
            nodePackages.npm
            mesa
            libGL
            xorg.libX11
            xorg.libXcursor
            xorg.libXi
            xorg.libXrandr
            xorg.libXinerama
            xorg.libXxf86vm
            jetbrains-mono
            (nerd-fonts.jetbrains-mono)
          ];

          shellHook = ''
            echo "🚀 Nixi Terminal Development Environment"
            echo "Building terminal emulator with Nixi scripting support..."
            npm install
            echo "Run 'npm start' to launch the terminal"
            echo "Run 'npm run dev' for development mode"
          '';
        };

        # Package
        packages.default = nixi-terminal;
        
        # App definition
        apps.default = {
          type = "app";
          program = "${nixi-terminal}/bin/nixi-terminal";
        };
      }
    );
}