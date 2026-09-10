import https from 'https';

https.get('https://www.agaramdhines.lk', (res) => {
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  res.on('end', () => {
    const links = data.match(/<a[^>]+href="([^">]+)"[^>]*>(.*?)<\/a>/gi);
    if (links) {
      const gradeLinks = links.filter(link => link.includes('12') || link.includes('13') || link.includes('A/L') || link.includes('a/l'));
      console.log('Grade Links:', gradeLinks);
    }
  });
}).on('error', (err) => {
  console.log('Error:', err.message);
});
