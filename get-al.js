import https from 'https';

https.get('https://www.agaramdhines.lk', (res) => {
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  res.on('end', () => {
    const links = data.match(/<a[^>]+href="([^">]+)"[^>]*>(.*?)<\/a>/gi);
    if (links) {
      const gradeLinks = links.filter(link => link.toLowerCase().includes('a/l') || link.toLowerCase().includes('al') || link.includes('12') || link.includes('13'));
      console.log('Grade Links:', gradeLinks.slice(0, 20));
    }
  });
}).on('error', (err) => {
  console.log('Error:', err.message);
});
