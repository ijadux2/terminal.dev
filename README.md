# 🐱 Reanimation Terminal

A GPU-accelerated Linux terminal emulator built with Nix, featuring custom themes and declarative configuration.

## Features

- 🚀 **GPU Acceleration**: Powered by Kitty's OpenGL rendering for smooth performance
- 🎨 **Custom Themes**: Pre-configured themes (Dracula, Nord, Solarized Dark) with easy switching
- 📦 **Nix Integration**: Declarative configuration using Nix syntax
- 🏠 **Home Manager Support**: Per-user configuration
- 🖥️ **NixOS Support**: System-wide installation
- ⌨️ **Custom Keybindings**: Fully customizable shortcuts
- 🔧 **Modular Design**: Enable/disable features as needed

## Quick Start

### Using Nix Flakes

Add Reanimation Terminal to your `flake.nix`:

```nix
{
  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    reanimation.url = "path:./terminal.dev";  # Or use a Git URL
  };

  outputs = { self, nixpkgs, reanimation, ... }: {
    nixosConfigurations.yourhost = nixpkgs.lib.nixosSystem {
      system = "x86_64-linux";
      modules = [
        reanimation.nixosModules.default
        {
          programs.kitty = {
            enable = true;
            theme = "dracula";
          };
        }
      ];
    };
  };
}
```

### NixOS Configuration

```nix
{ config, lib, pkgs, ... }:

{
  imports = [ ./reanimation.nix ];

  programs.kitty = {
    enable = true;
    theme = "dracula";
    font = {
      family = "JetBrains Mono Nerd Font";
      size = 12;
    };
  };
}
```

### Home Manager Configuration

```nix
{ config, lib, pkgs, ... }:

{
  imports = [ ./reanimation.nix ];

  programs.kitty = {
    enable = true;
    theme = "nord";
    window.hideDecorations = true;
  };
}
```

## Configuration Options

### Themes

Available themes:
- `dracula` (default): Dark theme with vibrant colors
- `nord`: Arctic-inspired color palette
- `solarized-dark`: Low-contrast dark theme

### Font Settings

```nix
programs.kitty.font = {
  family = "JetBrains Mono Nerd Font";
  size = 12;
};
```

### Window Customization

```nix
programs.kitty.window = {
  padding = {
    x = 15;
    y = 15;
  };
  hideDecorations = false;
};
```

### Keybindings

```nix
programs.kitty.keybindings = {
  "ctrl+shift+c" = "copy_to_clipboard";
  "ctrl+shift+v" = "paste_from_clipboard";
  "ctrl+shift+t" = "new_tab";
};
```

## GPU Acceleration

Reanimation Terminal uses Kitty's GPU-accelerated rendering by default. Ensure your system has proper OpenGL drivers:

- **NixOS**: `hardware.graphics.enable = true;`
- **GPU Drivers**: Mesa is included automatically

To verify GPU acceleration:
```bash
kitty --debug-config | grep OpenGL
```

## Theme Switching

Use the included theme switcher script:

```bash
./theme-switcher.sh dracula
./theme-switcher.sh nord
./theme-switcher.sh solarized-dark
```

## Development

### Development Environment

```bash
cd terminal.dev
nix develop
kitty  # Test the terminal
```

### Building

```bash
# Build with Nix
nix build

# Run tests (if any)
nix flake check
```

## Examples

See the `example-*.nix` files for complete configuration examples.

## Dependencies

- Nix (flakes enabled)
- Kitty terminal emulator
- Mesa (for GPU acceleration)
- Nerd Fonts (for icons)

## Troubleshooting

### GPU Issues

If GPU acceleration isn't working:
1. Check OpenGL drivers: `glxinfo | grep renderer`
2. Ensure Mesa is installed
3. Try running with `LIBGL_ALWAYS_SOFTWARE=1 kitty` to force software rendering

### Theme Not Applying

1. Restart Kitty after configuration changes
2. Check Kitty config: `kitty --debug-config`
3. Verify NixOS/Home Manager rebuild

### Font Issues

1. Install Nerd Fonts: `nerdfonts.override { fonts = [ "JetBrainsMono" ]; }`
2. Check font availability: `fc-list | grep "JetBrains"`

## License

MIT License - see LICENSE for details.

## Acknowledgments

- Built on top of [Kitty](https://sw.kovidgoyal.net/kitty/)
- Inspired by modern terminal emulators
- Powered by Nix for reproducible builds
