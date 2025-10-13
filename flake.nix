{
  description = "Reanimation Terminal - Kitty-based terminal with GPU acceleration and custom themes";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, flake-utils }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = nixpkgs.legacyPackages.${system};
      in
      {
        # NixOS module
        nixosModules.default = import ./reanimation.nix;

        # Home Manager module

        # Development shell
        devShells.default = pkgs.mkShell {
          buildInputs = with pkgs; [
            kitty
            jetbrains-mono
            (nerd-fonts.jetbrains-mono)
            mesa
          ];

          shellHook = ''
            echo "🐱 Reanimation Terminal Development Environment"
            echo "Run 'kitty' to test the terminal"
            echo "Themes available: dracula, nord, solarized-dark"
          '';
        };

        # Package (for standalone use)
        packages.default = pkgs.kitty.overrideAttrs (oldAttrs: {
          # Custom build with GPU optimizations
          buildInputs = oldAttrs.buildInputs ++ [ pkgs.mesa ];
          meta = oldAttrs.meta // {
            description = "Kitty terminal with GPU acceleration and custom themes";
          };
        });
      }
    );
}
