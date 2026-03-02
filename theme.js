// LAVA LAMP v6

(async function lavaLamp() {
  while (!Spicetify?.Player?.data) {
    await new Promise(r => setTimeout(r, 300));
  }

  const NUM_BLOBS = 8;
  const root = document.documentElement;
  let lastUri = "";
  let blobs = [];
  let currentBrightness = 0.2;
  let isBWMode = false;
  // Neutral cool defaults — NOT purple
  let colors = ["#3a4a7a", "#4a3a6a", "#2a5a7a", "#5a3a5a", "#3a5a6a", "#4a4a6a", "#3a4a5a", "#5a4a7a"];

  // ---- Utils ----

  function hexToRgb(hex) {
    hex = hex.replace("#", "");
    if (hex.length !== 6) return { r: 60, g: 70, b: 120 };
    return { r: parseInt(hex.slice(0, 2), 16), g: parseInt(hex.slice(2, 4), 16), b: parseInt(hex.slice(4, 6), 16) };
  }

  function rgbToHex(r, g, b) {
    return "#" + [r, g, b].map(x => Math.round(Math.min(255, Math.max(0, x))).toString(16).padStart(2, "0")).join("");
  }

  function rgbToHsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;
    if (max === min) { h = s = 0; }
    else {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
        case g: h = ((b - r) / d + 2) / 6; break;
        case b: h = ((r - g) / d + 4) / 6; break;
      }
      h *= 360;
    }
    return { h, s, l };
  }

  function hslToRgb(h, s, l) {
    h /= 360;
    let r, g, b;
    if (s === 0) { r = g = b = l; }
    else {
      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      const hue2rgb = (p, q, t) => {
        if (t < 0) t += 1; if (t > 1) t -= 1;
        if (t < 1 / 6) return p + (q - p) * 6 * t;
        if (t < 1 / 2) return q;
        if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
        return p;
      };
      r = hue2rgb(p, q, h + 1 / 3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1 / 3);
    }
    return { r: r * 255, g: g * 255, b: b * 255 };
  }

  function isSkinTone(r, g, b) {
    const hsl = rgbToHsl(r, g, b);
    if (hsl.h > 5 && hsl.h < 50 && hsl.s > 0.1 && hsl.s < 0.75 && hsl.l > 0.2 && hsl.l < 0.85) return true;
    if (hsl.h > 25 && hsl.h < 45 && hsl.l > 0.3 && hsl.l < 0.8) return true;
    return false;
  }

  function vivify(hex) {
    const { r, g, b } = hexToRgb(hex);
    const hsl = rgbToHsl(r, g, b);
    // Gentle nudge — preserve original character
    if (hsl.s < 0.25) hsl.s = 0.3;
    else if (hsl.s < 0.5) hsl.s = Math.min(hsl.s * 1.15, 0.7);
    else hsl.s = Math.min(hsl.s * 1.05, 0.85);
    if (hsl.l < 0.25) hsl.l = 0.3;
    if (hsl.l > 0.7) hsl.l = 0.65;
    const out = hslToRgb(hsl.h, hsl.s, hsl.l);
    return rgbToHex(out.r, out.g, out.b);
  }

  // Frequency-weighted: colors with higher counts get more blob slots
  function padColors(rawColors, counts) {
    const unique = [...new Set(rawColors)];
    const vivified = unique.map(vivify);

    // If we have frequency counts, assign blob slots proportionally
    if (counts && counts.length === rawColors.length) {
      // Merge counts for duplicate colors
      const colorCounts = {};
      for (let i = 0; i < rawColors.length; i++) {
        colorCounts[rawColors[i]] = (colorCounts[rawColors[i]] || 0) + counts[i];
      }
      const total = Object.values(colorCounts).reduce((a, b) => a + b, 0);

      // Cap any single color at 3 slots so secondaries always get room
      const maxSlots = Math.min(3, NUM_BLOBS - Math.min(unique.length - 1, NUM_BLOBS - 1));
      // Guarantee every extracted color gets at least 1 slot
      const result = [];
      for (let ci = 0; ci < unique.length && result.length < NUM_BLOBS; ci++) {
        const ratio = (colorCounts[unique[ci]] || 1) / total;
        const slots = Math.max(1, Math.min(maxSlots, Math.round(ratio * NUM_BLOBS)));
        for (let s = 0; s < slots && result.length < NUM_BLOBS; s++) {
          if (s === 0) {
            result.push(vivified[ci]);
          } else {
            const src = hexToRgb(vivified[ci]);
            const hsl = rgbToHsl(src.r, src.g, src.b);
            const dir = s % 2 === 0 ? 1 : -1;
            hsl.h = ((hsl.h + dir * 5) % 360 + 360) % 360;
            hsl.l = Math.max(0.2, Math.min(0.7, hsl.l + dir * 0.04));
            const out = hslToRgb(hsl.h, hsl.s, hsl.l);
            result.push(rgbToHex(out.r, out.g, out.b));
          }
        }
      }
      // Fill remaining by cycling through all colors (not just dominant)
      let fi = 0;
      while (result.length < NUM_BLOBS) {
        const src = hexToRgb(vivified[fi % vivified.length]);
        const hsl = rgbToHsl(src.r, src.g, src.b);
        hsl.h = ((hsl.h + (fi + 1) * 6) % 360 + 360) % 360;
        hsl.l = Math.max(0.2, Math.min(0.7, hsl.l + (fi % 2 ? 0.03 : -0.03)));
        const out = hslToRgb(hsl.h, hsl.s, hsl.l);
        result.push(rgbToHex(out.r, out.g, out.b));
        fi++;
      }
      return result.slice(0, NUM_BLOBS);
    }

    // Fallback: no counts, spread evenly with small shifts
    const result = [...vivified];
    let i = 0;
    while (result.length < NUM_BLOBS) {
      const src = hexToRgb(vivified[i % vivified.length]);
      const hsl = rgbToHsl(src.r, src.g, src.b);
      const dir = i % 2 === 0 ? 1 : -1;
      hsl.h = ((hsl.h + dir * 6) % 360 + 360) % 360;
      hsl.l = Math.max(0.2, Math.min(0.7, hsl.l + dir * 0.04));
      const out = hslToRgb(hsl.h, hsl.s, hsl.l);
      result.push(rgbToHex(out.r, out.g, out.b));
      i++;
    }
    return result.slice(0, NUM_BLOBS);
  }

  // True grayscale palette for B&W albums
  function generateBWPalette() {
    isBWMode = true;
    const result = [];
    // Spread of grays from light to mid — blobs with screen blend = soft white glow
    const baseLightness = currentBrightness > 0.5 ? 0.55 : 0.45;
    for (let j = 0; j < NUM_BLOBS; j++) {
      const l = baseLightness + (j * 0.04) - 0.12;
      const v = Math.round(Math.max(60, Math.min(200, l * 255)));
      result.push(rgbToHex(v, v, v));
    }
    return result;
  }

  // Check if raw extracted colors are mostly gray (before vivify)
  function rawColorsAreGray(hexes) {
    let grayCount = 0;
    for (const hex of hexes) {
      const { r, g, b } = hexToRgb(hex);
      const max = Math.max(r, g, b), min = Math.min(r, g, b);
      if (max - min < 30) grayCount++;
    }
    return grayCount / hexes.length > 0.6;
  }

  function colorsAreTooGray(arr) {
    let totalSat = 0;
    for (const hex of arr) {
      const { r, g, b } = hexToRgb(hex);
      totalSat += rgbToHsl(r, g, b).s;
    }
    return (totalSat / arr.length) < 0.15;
  }

  function makeBg(hex) {
    const { r, g, b } = hexToRgb(hex);
    const hsl = rgbToHsl(r, g, b);
    hsl.l = 0.05 + currentBrightness * 0.12;
    hsl.l = Math.max(0.04, Math.min(0.16, hsl.l));
    hsl.s = Math.min(hsl.s * 1.2, 0.6);
    const out = hslToRgb(hsl.h, hsl.s, hsl.l);
    return rgbToHex(out.r, out.g, out.b);
  }

  // ---- Blobs ----

  function createBlobs() {
    const old = document.getElementById("lavalamp-canvas");
    if (old) old.remove();
    const canvas = document.createElement("div");
    canvas.id = "lavalamp-canvas";
    document.body.appendChild(canvas);
    blobs = [];
    const sizes = [380, 320, 280, 240, 220, 180, 160, 140];
    const zones = [
      { x: 5, y: 5 }, { x: 55, y: 5 }, { x: 25, y: 30 }, { x: 70, y: 30 },
      { x: 10, y: 55 }, { x: 50, y: 55 }, { x: 30, y: 75 }, { x: 65, y: 75 },
    ];
    for (let i = 0; i < NUM_BLOBS; i++) {
      const el = document.createElement("div");
      el.className = "blob";
      const s = sizes[i] || 200;
      el.style.width = el.style.height = s + "px";
      el.style.backgroundColor = colors[i];
      const z = zones[i] || { x: 40, y: 40 };
      el.style.left = (z.x + Math.random() * 15) + "%";
      el.style.top = (z.y + Math.random() * 15) + "%";
      canvas.appendChild(el);
      blobs.push(el);
    }
  }

  function animateBlobs() {
    blobs.forEach(blob => {
      function move() {
        const dur = 12 + Math.random() * 14;
        blob.style.transition = `left ${dur}s ease-in-out, top ${dur}s ease-in-out, transform ${dur * 0.6}s ease-in-out, border-radius ${dur * 0.8}s ease-in-out, background-color 2s ease`;
        blob.style.left = Math.random() * 80 + 5 + "%";
        blob.style.top = Math.random() * 80 + 5 + "%";
        blob.style.transform = `scale(${0.7 + Math.random() * 0.6})`;
        blob.style.borderRadius = `${30 + Math.random() * 40}% ${30 + Math.random() * 40}% ${30 + Math.random() * 40}% ${30 + Math.random() * 40}%`;
        setTimeout(move, dur * 1000);
      }
      setTimeout(move, Math.random() * 3000);
    });
  }

  // ---- Color Extraction ----

  function getImageUrl() {
    const meta = Spicetify.Player.data?.item?.metadata;
    if (!meta) return null;
    const raw = meta.image_xlarge_url || meta.image_large_url || meta.image_url || "";
    if (raw.startsWith("spotify:image:"))
      return "https://i.scdn.co/image/" + raw.replace("spotify:image:", "");
    if (raw.startsWith("https://")) return raw;
    return null;
  }

  const cache = new Map();

  async function extractColors() {
    const uri = Spicetify.Player.data?.item?.uri;
    const url = getImageUrl();
    const cacheKey = uri || url;
    isBWMode = false; // reset — generateBWPalette sets it true if needed
    if (!cacheKey) return generateBWPalette();
    if (cache.has(cacheKey)) {
      const cached = cache.get(cacheKey);
      // Check if cached result is grayscale
      const { r, g, b } = hexToRgb(cached[0]);
      if (Math.max(r, g, b) - Math.min(r, g, b) < 10) isBWMode = true;
      return cached;
    }

    // Method 1: Spicetify.colorExtractor
    try {
      if (Spicetify.colorExtractor && uri) {
        const raw = await Spicetify.colorExtractor(uri);
        if (raw) {
          const hexes = Object.values(raw)
            .filter(v => typeof v === "string" && /^#[0-9a-f]{6}$/i.test(v))
            .filter(h => { const c = hexToRgb(h); return !isSkinTone(c.r, c.g, c.b); });
          if (hexes.length > 0) {
            // If raw colors are mostly gray, skip to BW palette
            if (rawColorsAreGray(hexes)) {
              console.log("[LavaLamp] colorExtractor returned grays, using BW palette");
              const bw = generateBWPalette();
              cache.set(cacheKey, bw);
              return bw;
            }
            const result = padColors(hexes, null);
            if (!colorsAreTooGray(result)) {
              cache.set(cacheKey, result);
              console.log("[LavaLamp] colorExtractor:", result);
              return result;
            }
          }
        }
      }
    } catch (e) {
      console.log("[LavaLamp] colorExtractor err:", e);
    }

    // Method 2: Canvas
    if (url) {
      try {
        const img = new Image();
        img.crossOrigin = "anonymous";
        await new Promise((ok, fail) => { img.onload = ok; img.onerror = fail; img.src = url; });
        const c = document.createElement("canvas");
        c.width = c.height = 80;
        const ctx = c.getContext("2d");
        ctx.drawImage(img, 0, 0, 80, 80);
        const px = ctx.getImageData(0, 0, 80, 80).data;

        let totalBright = 0;
        const totalPx = px.length / 4;
        const buckets = {};
        for (let i = 0; i < px.length; i += 4) {
          const r = px[i], g = px[i + 1], b = px[i + 2];
          totalBright += (r + g + b) / 3 / 255;
          const brightness = (r + g + b) / 3;
          if (brightness < 15 || brightness > 240) continue;
          const max = Math.max(r, g, b), min = Math.min(r, g, b);
          if (max - min < 12) continue;
          // Finer quantization — 8-value buckets instead of 16
          const qr = (r >> 3) << 3, qg = (g >> 3) << 3, qb = (b >> 3) << 3;
          buckets[`${qr},${qg},${qb}`] = (buckets[`${qr},${qg},${qb}`] || 0) + 1;
        }
        currentBrightness = totalBright / totalPx;

        const sorted = Object.entries(buckets).sort((a, b) => b[1] - a[1]);
        const picked = [];
        const pickedCounts = [];
        for (const [key, count] of sorted) {
          if (picked.length >= 8) break;
          const [r, g, b] = key.split(",").map(Number);
          if (isSkinTone(r, g, b)) continue;
          const hsl = rgbToHsl(r, g, b);
          if (hsl.h > 80 && hsl.h < 165 && hsl.s > 0.3 && hsl.l < 0.4) continue;
          // Lower uniqueness threshold — allow more similar shades
          let unique = true;
          for (const p of picked) {
            const pr = hexToRgb(p);
            if (Math.abs(r - pr.r) + Math.abs(g - pr.g) + Math.abs(b - pr.b) < 50) { unique = false; break; }
          }
          if (unique) {
            picked.push(rgbToHex(r, g, b));
            pickedCounts.push(count);
          }
        }

        if (picked.length > 0) {
          if (rawColorsAreGray(picked)) {
            console.log("[LavaLamp] canvas found only grays, using BW palette, bright:", currentBrightness.toFixed(2));
            const bw = generateBWPalette();
            cache.set(cacheKey, bw);
            return bw;
          }
          const result = padColors(picked, pickedCounts);
          if (!colorsAreTooGray(result)) {
            cache.set(cacheKey, result);
            console.log("[LavaLamp] canvas:", result, "counts:", pickedCounts, "bright:", currentBrightness.toFixed(2));
            return result;
          }
        }

        // B&W fallback
        const bw = generateBWPalette();
        cache.set(cacheKey, bw);
        console.log("[LavaLamp] B&W fallback, bright:", currentBrightness.toFixed(2));
        return bw;
      } catch (e) {
        console.log("[LavaLamp] canvas err:", e.message);
      }
    }

    return generateBWPalette();
  }

  // ---- Apply ----

  function applyColors(newColors) {
    colors = newColors;
    blobs.forEach((blob, i) => { blob.style.backgroundColor = colors[i % colors.length]; });

    let primary, secondary;

    if (isBWMode) {
      // True monochrome — silver accents, no color injection
      primary = "#b0b0b0";
      secondary = "#909090";
    } else {
      primary = vivify(colors[0]);
      // Find first color that's meaningfully different from primary for secondary
      secondary = vivify(colors[0]);
      for (let ci = 1; ci < colors.length; ci++) {
        const p = hexToRgb(primary), s = hexToRgb(colors[ci]);
        if (Math.abs(p.r - s.r) + Math.abs(p.g - s.g) + Math.abs(p.b - s.b) > 60) {
          secondary = vivify(colors[ci]);
          break;
        }
      }
    }

    const { r, g, b } = hexToRgb(primary);
    const rgb2 = hexToRgb(secondary);

    // Accent vars
    root.style.setProperty("--spice-button", primary, "important");
    root.style.setProperty("--spice-button-active", secondary, "important");
    root.style.setProperty("--spice-tab-active", primary, "important");
    root.style.setProperty("--spice-playback-bar", primary, "important");
    root.style.setProperty("--spice-notification", primary, "important");
    root.style.setProperty("--spice-rgb-button", `${r}, ${g}, ${b}`, "important");

    // Glow vars
    root.style.setProperty("--lava-rgb-1", `${r}, ${g}, ${b}`);
    root.style.setProperty("--lava-rgb-2", `${Math.round(rgb2.r)}, ${Math.round(rgb2.g)}, ${Math.round(rgb2.b)}`);
    root.style.setProperty("--lava-color-1", primary);
    root.style.setProperty("--lava-color-2", secondary);

    // Background
    let bg;
    if (isBWMode) {
      // True neutral dark gray — no color tint
      const lum = Math.round(Math.max(8, Math.min(30, currentBrightness * 35)));
      bg = rgbToHex(lum, lum, lum);
    } else {
      bg = makeBg(colors[0]);
    }
    const bgRgb = hexToRgb(bg);
    const bgStr = `${Math.round(bgRgb.r)}, ${Math.round(bgRgb.g)}, ${Math.round(bgRgb.b)}`;
    root.style.setProperty("--spice-main", bg, "important");
    root.style.setProperty("--spice-sidebar", bg, "important");
    root.style.setProperty("--spice-player", bg, "important");
    root.style.setProperty("--spice-card", bg, "important");
    root.style.setProperty("--spice-rgb-main", bgStr, "important");
    root.style.setProperty("--spice-rgb-sidebar", bgStr, "important");
    root.style.setProperty("--spice-rgb-card", bgStr, "important");
  }

  // Lightweight gradient cleanup — 1x/sec, named selectors only
  // CSS !important handles most cases; this catches stragglers
  const gradientSelectors = [
    ".main-entityHeader-backgroundColor",
    ".main-actionBarBackground-background",
    ".under-main-view",
    ".main-entityHeader-overlay",
    ".main-entityHeader-background",
  ];
  function cleanupGradients() {
    const bg = root.style.getPropertyValue("--spice-main") || "#0a0a12";
    for (const sel of gradientSelectors) {
      document.querySelectorAll(sel).forEach(el => {
        el.style.setProperty("background", bg, "important");
        el.style.setProperty("background-image", "none", "important");
      });
    }
  }
  setInterval(cleanupGradients, 1000);

  // ---- Song Change ----

  async function onSongChange() {
    const uri = Spicetify.Player.data?.item?.uri;
    if (!uri || uri === lastUri) return;
    lastUri = uri;
    let c = await extractColors();
    if (colorsAreTooGray(c)) c = generateBWPalette();
    applyColors(c);
  }

  // ---- Init ----

  createBlobs();
  animateBlobs();
  Spicetify.Player.addEventListener("songchange", onSongChange);
  setInterval(() => { const u = Spicetify.Player.data?.item?.uri; if (u && u !== lastUri) onSongChange(); }, 3000);
  setInterval(() => { if (!document.getElementById("lavalamp-canvas")) { createBlobs(); animateBlobs(); applyColors(colors); } }, 2000);

  // Init with retries
  const initDefault = colors[0];
  for (let i = 0; i < 5; i++) {
    let c = await extractColors();
    if (colorsAreTooGray(c)) c = generateBWPalette();
    applyColors(c);
    if (c[0] !== initDefault) break;
    await new Promise(r => setTimeout(r, 2000));
  }

  console.log("[LavaLamp] v6 ready");
})();
