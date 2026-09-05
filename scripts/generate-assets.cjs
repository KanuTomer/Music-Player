const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

async function run() {
  const emblemPath = path.resolve(__dirname, '../public/sanikdhaba favicon.png');
  const bgPath = path.resolve(__dirname, '../src/assets/finallsanikdhaba.png');
  const publicDir = path.resolve(__dirname, '../public');

  console.log('Generating favicons from sanikdhaba favicon.png...');

  // 1. Favicons
  const png16 = await sharp(emblemPath).resize(16, 16).png().toBuffer();
  const png32 = await sharp(emblemPath).resize(32, 32).png().toBuffer();
  const png48 = await sharp(emblemPath).resize(48, 48).png().toBuffer();
  const png180 = await sharp(emblemPath).resize(180, 180).png().toBuffer();
  const png192 = await sharp(emblemPath).resize(192, 192).png().toBuffer();

  fs.writeFileSync(path.join(publicDir, 'favicon-16x16.png'), png16);
  fs.writeFileSync(path.join(publicDir, 'favicon-32x32.png'), png32);
  fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), png180);
  fs.writeFileSync(path.join(publicDir, 'favicon.png'), png192);

  // Generate multi-resolution ICO file
  const icoImages = [
    { size: 16, buf: png16 },
    { size: 32, buf: png32 },
    { size: 48, buf: png48 }
  ];

  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type: 1 = ICO
  header.writeUInt16LE(icoImages.length, 4);

  let offset = 6 + (icoImages.length * 16);
  const entries = [];
  const imgBuffers = [];

  for (const img of icoImages) {
    const entry = Buffer.alloc(16);
    entry.writeUInt8(img.size, 0);
    entry.writeUInt8(img.size, 1);
    entry.writeUInt8(0, 2);
    entry.writeUInt8(0, 3);
    entry.writeUInt16LE(1, 4);
    entry.writeUInt16LE(32, 6);
    entry.writeUInt32LE(img.buf.length, 8);
    entry.writeUInt32LE(offset, 12);
    entries.push(entry);
    imgBuffers.push(img.buf);
    offset += img.buf.length;
  }

  const icoBuffer = Buffer.concat([header, ...entries, ...imgBuffers]);
  fs.writeFileSync(path.join(publicDir, 'favicon.ico'), icoBuffer);
  console.log(`✓ favicon.ico created (${icoBuffer.length} bytes)`);
  console.log('✓ favicon.png & apple-touch-icon.png created');

  // 2. Link Share / Open Graph image featuring the emblem
  console.log('Generating link share OG image with emblem...');
  const bgBlurred = await sharp(bgPath)
    .extract({ left: 0, top: 80, width: 1445, height: 760 })
    .resize(1200, 630)
    .blur(10)
    .modulate({ brightness: 0.42 })
    .toBuffer();

  const resizedEmblem = await sharp(emblemPath)
    .resize(null, 510)
    .toBuffer();

  const outJpg = path.join(publicDir, 'sainik-dhaba-og.jpg');
  const outJpgAlias = path.join(publicDir, 'og-image.jpg');
  const outPng = path.join(publicDir, 'sainik-dhaba-og.png');

  await sharp(bgBlurred)
    .composite([{
      input: resizedEmblem,
      gravity: 'center'
    }])
    .jpeg({ quality: 90, mozjpeg: true })
    .toFile(outJpg);

  fs.copyFileSync(outJpg, outJpgAlias);

  await sharp(bgBlurred)
    .composite([{
      input: resizedEmblem,
      gravity: 'center'
    }])
    .png({ quality: 90, compressionLevel: 8 })
    .toFile(outPng);

  const statJpg = fs.statSync(outJpg);
  console.log(`✓ Link share image created: 1200x630 (${(statJpg.size / 1024).toFixed(1)} KB)`);

  // Clean up temporary test files if they exist
  ['test-card-a.jpg', 'test-card-b.jpg', 'test-card-square.jpg'].forEach(f => {
    const fp = path.join(publicDir, f);
    if (fs.existsSync(fp)) fs.unlinkSync(fp);
  });
}

run().catch(console.error);
