import https from 'https';
import fs from 'fs';

const file = fs.createWriteStream('public/logo.png');
https.get('https://www.agaramdhines.lk/wp-content/uploads/2025/07/cropped-cropped-DEF-2.png', function(response) {
  response.pipe(file);
  file.on('finish', function() {
    file.close();
    console.log('Logo downloaded successfully');
  });
}).on('error', function(err) {
  fs.unlink('public/logo.png');
  console.error('Error downloading logo:', err.message);
});
