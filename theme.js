// ============================================
// LAVA LAMP - Dynamic Color Engine
// Extracts colors from album art and drives
// the lava blob animations in real-time
// ============================================

(async function lavaLamp() {
  // Wait for Spicetify APIs
  while (
    !Spicetify?.Player?.data ||
    !Spicetify?.colorExtractor
  ) {
    await new Promise((r) => setTimeout(r, 200));
  }

  const root = document.documentElement;
  let lastUri = "";

  // Vibrant color palettes to fall back on
  const FALLBACK_PALETTES = [
    ["#7b2ff7", "#ff2d95", "#00d4ff", "#ff6b2d"],
    ["#f72f8e", "#2ff7c0", "#f7c82f", "#2f6bf7"],
    ["#ff3860", "#23d160", "#209cee", "#ffdd57"],
  ];

  /**
   * Extract dominant colors from the current track's album art.
   * Returns an array of 4 hex color strings.
   */
  async function extractColors(uri) {
    try {
      const colors = await Spicetify.colorExtractor(uri);
      if (colors && typeof colors === "object") {
        // colorExtractor returns an object with color properties
        const vals = Object.values(colors).filter(
          (c) => typeof c === "string" && c.startsWith("#")
        );
        if (vals.length >= 4) return vals.slice(0, 4);
        if (vals.length >= 2) {
          // Pad with shifted hues if we got fewer than 4
          return padColors(vals, 4);
        }
      }
    } catch (e) {
      console.warn("[LavaLamp] Color extraction failed:", e);
    }
    // Return a random fallback palette
    return FALLBACK_PALETTES[
      Math.floor(Math.random() * FALLBACK_PALETTES.length)
    ];
  }

  /**
   * Pad an array of hex colors to the target count
   * by generating hue-shifted variants.
   */
  function padColors(colors, target) {
    const result = [...colors];
    let i = 0;
    while (result.length < target) {
      result.push(shiftHue(result[i % colors.length], 60 * (i + 1)));
      i++;
    }
    return result;
  }

  /**
   * Shift the hue of a hex color by the given degrees.
   */
  function shiftHue(hex, degrees) {
    const rgb = hexToRgb(hex);
    const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
    hsl.h = (hsl.h + degrees) % 360;
    const shifted = hslToRgb(hsl.h, hsl.s, hsl.l);
    return rgbToHex(shifted.r, shifted.g, shifted.b);
  }

  function hexToRgb(hex) {
    hex = hex.replace("#", "");
    return {
      r: parseInt(hex.substring(0, 2), 16),
      g: parseInt(hex.substring(2, 4), 16),
      b: parseInt(hex.substring(4, 6), 16),
    };
  }

  function rgbToHex(r, g, b) {
    return (
      "#" +
      [r, g, b].map((x) => Math.round(x).toString(16).padStart(2, "0")).join("")
    );
  }

  function rgbToHsl(r, g, b) {
    r /= 255;
    g /= 255;
    b /= 255;
    const max = Math.max(r, g, b),
      min = Math.min(r, g, b);
    let h,
      s,
      l = (max + min) / 2;
    if (max === min) {
      h = s = 0;
    } else {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r:
          h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
          break;
        case g:
          h = ((b - r) / d + 2) / 6;
          break;
        case b:
          h = ((r - g) / d + 4) / 6;
          break;
      }
      h *= 360;
    }
    return { h, s, l };
  }

  function hslToRgb(h, s, l) {
    h /= 360;
    let r, g, b;
    if (s === 0) {
      r = g = b = l;
    } else {
      const hue2rgb = (p, q, t) => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1 / 6) return p + (q - p) * 6 * t;
        if (t < 1 / 2) return q;
        if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
        return p;
      };
      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      r = hue2rgb(p, q, h + 1 / 3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1 / 3);
    }
    return { r: r * 255, g: g * 255, b: b * 255 };
  }

  /**
   * Boost saturation and brightness so lava colors stay vivid
   * even when album art is muted/dark.
   */
  function vivify(hex, minSat = 0.5, minLight = 0.35) {
    const rgb = hexToRgb(hex);
    const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
    hsl.s = Math.max(hsl.s, minSat);
    hsl.l = Math.max(Math.min(hsl.l, 0.65), minLight);
    const out = hslToRgb(hsl.h, hsl.s, hsl.l);
    return rgbToHex(out.r, out.g, out.b);
  }

  /**
   * Convert hex to "r, g, b" string for use in rgba().
   */
  function hexToRgbString(hex) {
    const { r, g, b } = hexToRgb(hex);
    return `${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)}`;
  }

  /**
   * Apply extracted colors to the CSS custom properties
   * that drive the lava lamp animation and panel glow.
   */
  function applyColors(colors) {
    const vivid = colors.map((c) => vivify(c));
    root.style.setProperty("--lava-color-1", vivid[0]);
    root.style.setProperty("--lava-color-2", vivid[1]);
    root.style.setProperty("--lava-color-3", vivid[2]);
    root.style.setProperty("--lava-color-4", vivid[3]);
    // Drive panel glow with primary + secondary colors
    root.style.setProperty("--glow-color", vivid[0]);
    root.style.setProperty("--glow-color-2", vivid[1]);
    // Also set rgb variants for glow rgba() usage in box-shadow
    root.style.setProperty("--glow-rgb-1", hexToRgbString(vivid[0]));
    root.style.setProperty("--glow-rgb-2", hexToRgbString(vivid[1]));
  }

  /**
   * Main update: called on song change.
   */
  async function onSongChange() {
    const data = Spicetify.Player.data;
    if (!data?.item) return;

    const uri = data.item.uri;
    if (uri === lastUri) return;
    lastUri = uri;

    const imageUri =
      data.item.metadata?.image_xlarge_url ||
      data.item.metadata?.image_large_url ||
      data.item.metadata?.image_url;

    if (imageUri) {
      const colors = await extractColors(imageUri);
      applyColors(colors);
    }
  }

  // Listen for song changes
  Spicetify.Player.addEventListener("songchange", onSongChange);

  // Apply on initial load
  onSongChange();

  console.log("[LavaLamp] Theme engine initialized");
})();
