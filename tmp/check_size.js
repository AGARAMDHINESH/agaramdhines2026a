const fs = require('fs');

function getPngDimensions(filePath) {
  const buffer = fs.readFileSync(filePath);
  // PNG signature: 89 50 4E 47 0D 0A 1A 0A
  // IHDR chunk: Length (4 bytes), Chunk Type 'IHDR' (4 bytes), Width (4 bytes), Height (4 bytes)
  const width = buffer.readUInt32BE(16);
  const height = buffer.readUInt32BE(20);
  console.log(`Dimensions: ${width}x${height}`);
}

getPngDimensions('public/logo.png');
