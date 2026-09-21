// Utility for watermarking lesson illustrations with Agaram Dhines Academy branding

export interface WatermarkOptions {
  watermarkText?: string;
  subText?: string;
  logoUrl?: string;
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'center';
  opacity?: number;
  showLogo?: boolean;
  includeText?: boolean;
}

/**
 * Loads an image from a source URL or data URL
 */
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = (err) => reject(err);
    img.src = src;
  });
}

/**
 * Applies a watermark overlay onto any image.
 * User requirement: "லோகோ மட்டும் போதும்... டெக்ஸ்ட் எதுவுமே தேவையில்லை. லோகோ மட்டும் ஒரு இடத்துல சின்னதா இருந்தா போதும்."
 * By default, renders exclusively the small, elegant circular Academy logo in the corner without any text.
 */
export async function applyWatermarkToImage(
  baseImageSrc: string,
  options: WatermarkOptions = {}
): Promise<string> {
  const {
    watermarkText = "",
    subText = "",
    logoUrl = "/logo.png",
    position = "bottom-right",
    opacity = 0.92,
    showLogo = true,
    includeText = false
  } = options;

  const baseImg = await loadImage(baseImageSrc);
  const canvas = document.createElement("canvas");
  canvas.width = baseImg.naturalWidth || baseImg.width || 1280;
  canvas.height = baseImg.naturalHeight || baseImg.height || 720;

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Canvas context could not be created");
  }

  // Draw original image
  ctx.drawImage(baseImg, 0, 0, canvas.width, canvas.height);

  if (!showLogo && !includeText) {
    return canvas.toDataURL("image/png");
  }

  // Try loading logo
  let logoImg: HTMLImageElement | null = null;
  if (showLogo && logoUrl) {
    try {
      logoImg = await loadImage(logoUrl);
    } catch (e) {
      console.warn("Could not load logo for watermark:", e);
    }
  }

  // Calculate proportional scaling based on canvas width
  const scale = Math.max(Math.min(canvas.width / 1200, 1.4), 0.7);
  const padding = 18 * scale;

  ctx.save();
  ctx.globalAlpha = opacity;

  // Case 1: Logo Only (User explicitly requested: only logo, small, no text)
  if (!includeText) {
    if (logoImg) {
      const logoRadius = Math.round(28 * scale); // ~56px diameter
      const circleCenterMargin = padding + logoRadius;

      let cx = canvas.width - circleCenterMargin;
      let cy = canvas.height - circleCenterMargin;

      if (position === "bottom-left") {
        cx = circleCenterMargin;
        cy = canvas.height - circleCenterMargin;
      } else if (position === "top-right") {
        cx = canvas.width - circleCenterMargin;
        cy = circleCenterMargin;
      } else if (position === "center") {
        cx = canvas.width / 2;
        cy = canvas.height / 2;
      }

      // Draw subtle dark circular glow/backdrop for pristine contrast on any background
      ctx.beginPath();
      ctx.arc(cx, cy, logoRadius + (4 * scale), 0, Math.PI * 2);
      ctx.fillStyle = "rgba(15, 23, 42, 0.78)";
      ctx.shadowColor = "rgba(0, 0, 0, 0.6)";
      ctx.shadowBlur = 8 * scale;
      ctx.fill();

      // Outer golden ring
      ctx.strokeStyle = "rgba(245, 158, 11, 0.9)";
      ctx.lineWidth = 2 * scale;
      ctx.stroke();

      // Draw Logo clipped in circle
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, logoRadius, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();
      ctx.drawImage(logoImg, cx - logoRadius, cy - logoRadius, logoRadius * 2, logoRadius * 2);
      ctx.restore();
    }
    ctx.restore();
    return canvas.toDataURL("image/png");
  }

  // Case 2: Logo + Text (Fallback if includeText is explicitly requested)
  const logoSize = 44 * scale;
  const mainFontSize = Math.round(16 * scale);
  const subFontSize = Math.round(12 * scale);

  ctx.font = `bold ${mainFontSize}px system-ui, -apple-system, sans-serif`;
  const mainTextWidth = watermarkText ? ctx.measureText(watermarkText).width : 0;

  ctx.font = `${subFontSize}px system-ui, -apple-system, sans-serif`;
  const subTextWidth = subText ? ctx.measureText(subText).width : 0;

  const textBlockWidth = Math.max(mainTextWidth, subTextWidth);
  const badgeWidth = (logoImg ? logoSize + padding : 0) + textBlockWidth + (padding * 2);
  const badgeHeight = Math.max(logoSize, mainFontSize + subFontSize + 8) + (padding * 1.5);

  let badgeX = canvas.width - badgeWidth - padding;
  let badgeY = canvas.height - badgeHeight - padding;

  if (position === "bottom-left") {
    badgeX = padding;
    badgeY = canvas.height - badgeHeight - padding;
  } else if (position === "top-right") {
    badgeX = canvas.width - badgeWidth - padding;
    badgeY = padding;
  } else if (position === "center") {
    badgeX = (canvas.width - badgeWidth) / 2;
    badgeY = (canvas.height - badgeHeight) / 2;
  }

  // Draw rounded container background
  const borderRadius = 12 * scale;
  ctx.beginPath();
  ctx.roundRect(badgeX, badgeY, badgeWidth, badgeHeight, borderRadius);
  ctx.fillStyle = "rgba(15, 23, 42, 0.82)";
  ctx.fill();

  ctx.strokeStyle = "rgba(251, 191, 36, 0.6)";
  ctx.lineWidth = 1.5 * scale;
  ctx.stroke();

  let contentStartX = badgeX + padding;
  if (logoImg) {
    const logoY = badgeY + (badgeHeight - logoSize) / 2;
    ctx.save();
    ctx.beginPath();
    ctx.arc(contentStartX + logoSize / 2, logoY + logoSize / 2, logoSize / 2, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(logoImg, contentStartX, logoY, logoSize, logoSize);
    ctx.restore();

    ctx.beginPath();
    ctx.arc(contentStartX + logoSize / 2, logoY + logoSize / 2, logoSize / 2, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(245, 158, 11, 0.8)";
    ctx.lineWidth = 2 * scale;
    ctx.stroke();

    contentStartX += logoSize + (10 * scale);
  }

  if (watermarkText) {
    const textBaselineY = badgeY + padding + mainFontSize;
    ctx.font = `bold ${mainFontSize}px system-ui, -apple-system, sans-serif`;
    ctx.fillStyle = "#FDE68A";
    ctx.fillText(watermarkText, contentStartX, textBaselineY);

    if (subText) {
      ctx.font = `${subFontSize}px system-ui, -apple-system, sans-serif`;
      ctx.fillStyle = "#E2E8F0";
      ctx.fillText(subText, contentStartX, textBaselineY + subFontSize + 6 * scale);
    }
  }

  ctx.restore();
  return canvas.toDataURL("image/png");
}

/**
 * Downloads a data URL as an image file
 */
export function downloadDataUrl(dataUrl: string, filename: string = "agaram-dhines-image.png") {
  const link = document.createElement("a");
  link.href = dataUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
