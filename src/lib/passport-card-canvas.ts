// Composites a real, high-resolution shareable Passport card image entirely
// client-side (Canvas 2D, zero new dependencies - matches this project's
// near-zero-dependency posture). Verified against a real passport-photos
// storage object that Supabase Storage's public buckets send permissive
// CORS headers, so drawImage/toBlob works without a "tainted canvas" error.
//
// Deliberately NOT persisted anywhere - regenerated on demand from whatever
// the holder's current photo/name/region are, so there's no cache to
// invalidate and no new storage bucket/RLS needed.

export interface PassportCardData {
  holderFirstName: string;
  title: string; // "{Area} Passport" or "Local Perks Passport"
  photoUrl: string | null;
  heroImageUrl: string | null; // only ever passed for a published region
  primaryColor: string;
  primaryDarkColor: string;
  accentColor: string;
}

const WIDTH = 1080;
const HEIGHT = 1350;

const PLACEHOLDER_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#9aa7ad" stroke-width="1.5">' +
  '<circle cx="12" cy="8" r="4" stroke-linecap="round"/>' +
  '<path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const PLACEHOLDER_SVG_URL = `data:image/svg+xml,${encodeURIComponent(PLACEHOLDER_SVG)}`;

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Couldn't load an image for your Passport card."));
    img.src = src;
  });
}

// next/font/google hashes its generated font-family name at build time -
// read the REAL resolved string off a probe element carrying the same
// class the rest of the app uses, rather than guessing it.
function resolveFontFamily(className: string): string {
  const probe = document.createElement("span");
  probe.className = className;
  probe.style.position = "fixed";
  probe.style.visibility = "hidden";
  probe.textContent = "x";
  document.body.appendChild(probe);
  const family = getComputedStyle(probe).fontFamily;
  document.body.removeChild(probe);
  return family;
}

function hexWithAlpha(hex: string, alpha: number): string {
  const clean = hex.replace("#", "");
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function drawCoverImage(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  w: number,
  h: number
) {
  const scale = Math.max(w / img.naturalWidth, h / img.naturalHeight);
  const sw = w / scale;
  const sh = h / scale;
  const sx = (img.naturalWidth - sw) / 2;
  const sy = (img.naturalHeight - sh) / 2;
  ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
}

// Canvas fillText has no reliable cross-browser letter-spacing - draw each
// character by hand, centered as a block around centerX.
function drawLetterSpaced(ctx: CanvasRenderingContext2D, text: string, centerX: number, y: number, spacing: number) {
  const chars = text.split("");
  const widths = chars.map((c) => ctx.measureText(c).width);
  const totalWidth = widths.reduce((a, b) => a + b, 0) + spacing * Math.max(0, chars.length - 1);
  let x = centerX - totalWidth / 2;
  const prevAlign = ctx.textAlign;
  ctx.textAlign = "left";
  chars.forEach((c, i) => {
    ctx.fillText(c, x, y);
    x += widths[i] + spacing;
  });
  ctx.textAlign = prevAlign;
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const test = current ? `${current} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = test;
    }
  }
  if (current) lines.push(current);
  return lines;
}

export async function renderPassportCardToBlob(data: PassportCardData): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Your browser doesn't support generating an image here.");

  const fraunces = resolveFontFamily("font-display");
  const dmSans = resolveFontFamily("font-sans");

  // Canvas text doesn't participate in the normal browser FOUT/FOIT swap -
  // drawing before the exact weight/size has actually loaded permanently
  // bakes the fallback system font into the exported image with no later
  // correction, so every weight/size used below must be pre-loaded first.
  await Promise.all([
    document.fonts.load(`700 72px ${fraunces}`),
    document.fonts.load(`600 48px ${fraunces}`),
    document.fonts.load(`600 26px ${dmSans}`),
    document.fonts.load(`400 22px ${dmSans}`),
    document.fonts.load(`600 20px ${dmSans}`),
  ]);
  await document.fonts.ready;

  // 1. Background
  if (data.heroImageUrl) {
    const hero = await loadImage(data.heroImageUrl);
    drawCoverImage(ctx, hero, 0, 0, WIDTH, HEIGHT);
    ctx.fillStyle = hexWithAlpha(data.primaryDarkColor, 0.4);
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    const footerGrad = ctx.createLinearGradient(0, HEIGHT * 0.55, 0, HEIGHT);
    footerGrad.addColorStop(0, hexWithAlpha(data.primaryDarkColor, 0));
    footerGrad.addColorStop(1, hexWithAlpha(data.primaryDarkColor, 0.85));
    ctx.fillStyle = footerGrad;
    ctx.fillRect(0, HEIGHT * 0.55, WIDTH, HEIGHT * 0.45);
  } else {
    const grad = ctx.createLinearGradient(0, 0, WIDTH, HEIGHT);
    grad.addColorStop(0, data.primaryColor);
    grad.addColorStop(1, data.primaryDarkColor);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
  }

  ctx.textAlign = "center";

  // 2. Eyebrow wordmark - identical on every card, the one fixed brand
  // element regardless of region.
  ctx.fillStyle = "#ffffff";
  ctx.font = `600 26px ${dmSans}`;
  drawLetterSpaced(ctx, "LOCAL PERKS PASSPORT", WIDTH / 2, 100, 3);
  ctx.fillStyle = data.accentColor;
  ctx.fillRect(WIDTH / 2 - 20, 125, 40, 3);

  // 3. Photo frame - fixed circle regardless of the source photo's own
  // dimensions (already cropped square by ImageCropper before upload).
  const circleX = WIDTH / 2;
  const circleY = 420;
  const circleR = 200;

  ctx.beginPath();
  ctx.arc(circleX, circleY, circleR + 10, 0, Math.PI * 2);
  ctx.fillStyle = "#ffffff";
  ctx.fill();

  ctx.save();
  ctx.beginPath();
  ctx.arc(circleX, circleY, circleR, 0, Math.PI * 2);
  ctx.closePath();
  ctx.clip();
  if (data.photoUrl) {
    const photo = await loadImage(data.photoUrl);
    drawCoverImage(ctx, photo, circleX - circleR, circleY - circleR, circleR * 2, circleR * 2);
  } else {
    ctx.fillStyle = "#f3f0e8";
    ctx.fillRect(circleX - circleR, circleY - circleR, circleR * 2, circleR * 2);
    const icon = await loadImage(PLACEHOLDER_SVG_URL);
    const iconSize = circleR;
    ctx.drawImage(icon, circleX - iconSize / 2, circleY - iconSize / 2, iconSize, iconSize);
  }
  ctx.restore();

  // 4. Title - "{Area} Passport" or the national "Local Perks Passport"
  // fallback.
  ctx.fillStyle = "#ffffff";
  ctx.font = `700 72px ${fraunces}`;
  const titleLines = wrapText(ctx, data.title, WIDTH - 160);
  let y = 700;
  for (const line of titleLines) {
    ctx.fillText(line, WIDTH / 2, y);
    y += 82;
  }

  // 5. Holder identity - first name only, never surname/email/ID.
  y += 20;
  ctx.font = `600 26px ${dmSans}`;
  ctx.fillStyle = "rgba(255, 255, 255, 0.75)";
  drawLetterSpaced(ctx, "PASSPORT HOLDER", WIDTH / 2, y, 2);
  y += 60;
  ctx.font = `600 48px ${fraunces}`;
  ctx.fillStyle = "#ffffff";
  ctx.fillText(data.holderFirstName, WIDTH / 2, y);

  // 6. Footer - a short tagline + the site domain. Nothing from here down
  // (or anywhere above) is a QR code, claim code, business code, email,
  // account ID, or expiration date - the functional passport/claim flow is
  // entirely separate from this promotional image.
  ctx.font = `400 22px ${dmSans}`;
  ctx.fillStyle = "rgba(255, 255, 255, 0.85)";
  ctx.fillText("Nationwide savings at local restaurants, attractions & shops", WIDTH / 2, HEIGHT - 80);
  ctx.font = `600 20px ${dmSans}`;
  ctx.fillText("localperkspassport.com", WIDTH / 2, HEIGHT - 48);

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("Couldn't generate the image."));
    }, "image/png");
  });
}
