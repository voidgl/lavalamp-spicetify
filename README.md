# LavaLamp - Spicetify Theme

A hi-def lava lamp theme for Spotify via Spicetify. Animated morphing color blobs react to your album art in real-time.

![preview](preview.png)

## Features

- **Animated lava blobs** — CSS-driven morphing gradients with blur effects
- **Album-reactive colors** — Extracts dominant colors from current track art and shifts the lava palette in real-time
- **Glass UI** — Translucent panels with backdrop blur so the lava bleeds through the interface
- **Multiple color schemes** — Base (purple), Nebula (pink), DeepOcean (cyan)
- **Glow effects** — Playback bar and buttons emit a subtle glow matching the accent color

## Install

### Manual

1. Copy the `LavaLamp` folder to your Spicetify Themes directory:
   - **Windows:** `%LOCALAPPDATA%\spicetify\Themes\`
   - **Linux:** `~/.config/spicetify/Themes/`
   - **macOS:** `~/.config/spicetify/Themes/`

2. Apply the theme:
   ```bash
   spicetify config current_theme LavaLamp
   spicetify config inject_theme_js 1
   spicetify apply
   ```

3. (Optional) Switch color scheme:
   ```bash
   spicetify config color_scheme Nebula
   spicetify apply
   ```

### Spicetify Marketplace

Coming soon.

## Color Schemes

| Scheme    | Accent  | Vibe                     |
|-----------|---------|--------------------------|
| Base      | Purple  | Classic neon lava         |
| Nebula    | Pink    | Hot pink cosmic           |
| DeepOcean | Cyan    | Underwater bioluminescent |

## Customization

Edit `user.css` variables to tweak the lava:

```css
:root {
  --lava-speed: 20s;       /* Animation cycle duration */
  --lava-opacity: 0.35;    /* Blob visibility (0-1) */
  --lava-blur: 80px;       /* Blob softness */
  --lava-blob-size: 40vw;  /* Blob radius */
}
```

## License

MIT
