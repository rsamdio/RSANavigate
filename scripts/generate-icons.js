import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const outDir = path.resolve(__dirname, '../packages/ext-tour/public/icons');

if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

// Minimal uncompressed/deflated pure PNG generator for node without external binary dependencies
function createPNG(width, height, drawFn) {
  const bytesPerPixel = 4;
  const rawData = Buffer.alloc(height * (1 + width * bytesPerPixel));

  for (let y = 0; y < height; y++) {
    const rowStart = y * (1 + width * bytesPerPixel);
    rawData[rowStart] = 0; // Filter type: None

    for (let x = 0; x < width; x++) {
      const pixelStart = rowStart + 1 + x * bytesPerPixel;
      const [r, g, b, a] = drawFn(x, y, width, height);
      rawData[pixelStart] = r;
      rawData[pixelStart + 1] = g;
      rawData[pixelStart + 2] = b;
      rawData[pixelStart + 3] = a;
    }
  }

  const deflated = zlib.deflateSync(rawData);

  // PNG Header
  const pngHeader = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  // IHDR Chunk
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type: RGBA
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace
  const ihdrChunk = createChunk('IHDR', ihdr);

  // IDAT Chunk
  const idatChunk = createChunk('IDAT', deflated);

  // IEND Chunk
  const iendChunk = createChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([pngHeader, ihdrChunk, idatChunk, iendChunk]);
}

function createChunk(type, data) {
  const len = data.length;
  const buf = Buffer.alloc(8 + len + 4);
  buf.writeUInt32BE(len, 0);
  buf.write(type, 4, 4, 'ascii');
  data.copy(buf, 8);

  const crc = crc32(buf.subarray(4, 8 + len));
  buf.writeInt32BE(crc, 8 + len);
  return buf;
}

// Standard CRC32 table
const crcTable = new Int32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    if (c & 1) c = 0xedb88320 ^ (c >>> 1);
    else c = c >>> 1;
  }
  crcTable[n] = c;
}

function crc32(buf) {
  let crc = -1;
  for (let i = 0; i < buf.length; i++) {
    crc = crcTable[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return crc ^ -1;
}

// Draw crisp RSA Navy Compass Icon
function drawCompassIcon(x, y, w, h) {
  const cx = w / 2;
  const cy = h / 2;
  const dx = x - cx + 0.5;
  const dy = y - cy + 0.5;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const maxRadius = w * 0.46;
  const innerRadius = w * 0.36;

  // Background rounded squircle / circle: RSA Navy (#0c3c60) with subtle gradient
  if (dist <= maxRadius) {
    const isEdge = dist >= maxRadius - 1.5;
    if (isEdge) {
      const alpha = Math.max(0, Math.min(255, Math.round((maxRadius - dist) * 170)));
      return [12, 60, 96, alpha];
    }

    // Outer Compass Ring (#ffffff / cyan-blue)
    const ringThickness = Math.max(1, w * 0.06);
    if (dist >= innerRadius - ringThickness && dist <= innerRadius) {
      return [255, 255, 255, 240];
    }

    // Compass Needle (rotated 45 deg)
    // Rotate coordinates by 45 degrees (-Math.PI / 4)
    const angle = -Math.PI / 4;
    const rx = dx * Math.cos(angle) - dy * Math.sin(angle);
    const ry = dx * Math.sin(angle) + dy * Math.cos(angle);

    const needleLength = innerRadius * 0.85;
    const needleWidth = Math.max(1.5, w * 0.18);

    // North Pointer (top diamond - Amber/Gold #f59e0b)
    if (ry < 0 && Math.abs(ry) <= needleLength) {
      const halfW = needleWidth * (1 - Math.abs(ry) / needleLength);
      if (Math.abs(rx) <= halfW) {
        if (rx < 0) return [245, 158, 11, 255]; // Amber
        return [251, 191, 36, 255]; // Light Amber highlight
      }
    }

    // South Pointer (bottom diamond - Crisp White/Slate)
    if (ry >= 0 && ry <= needleLength) {
      const halfW = needleWidth * (1 - ry / needleLength);
      if (Math.abs(rx) <= halfW) {
        if (rx < 0) return [226, 232, 240, 255]; // Slate light
        return [255, 255, 255, 255]; // White highlight
      }
    }

    // Pivot Center Circle
    if (dist <= Math.max(1.5, w * 0.08)) {
      return [12, 60, 96, 255];
    }

    // Dial background: Rich Navy gradient
    const gradient = Math.round(12 + (y / h) * 15);
    return [gradient, 60, 96, 255];
  }

  // Transparent outside
  return [0, 0, 0, 0];
}

// Generate 16x16, 48x48, 128x128
const sizes = [16, 48, 128];
for (const size of sizes) {
  const png = createPNG(size, size, drawCompassIcon);
  const outPath = path.join(outDir, `icon${size}.png`);
  fs.writeFileSync(outPath, png);
  console.log(`✅ Generated ${outPath} (${size}x${size})`);
}

console.log('🎉 All NAVIGATE extension icons generated successfully!');
