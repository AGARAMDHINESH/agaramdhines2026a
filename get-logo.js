import https from 'https';

https.get('https://www.agaramdhines.lk', (res) => {
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  res.on('end', () => {
    const match = data.match(/<img[^>]+src="([^">]+)"[^>]*class="[^"]*logo[^"]*"[^>]*>/i) || data.match(/<img[^>]+class="[^"]*logo[^"]*"[^>]*src="([^">]+)"[^>]*>/i);
    if (match) {
      console.log('Logo URL:', match[1]);
    } else {
      const allImages = data.match(/<img[^>]+src="([^">]+)"/g);
      console.log('All images:', allImages ? allImages.slice(0, 5) : 'None');
    }
  });
}).on('error', (err) => {
  console.log('Error:', err.message);
});
