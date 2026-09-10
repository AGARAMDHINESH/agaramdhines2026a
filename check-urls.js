import https from 'https';

const checkUrl = (url) => {
  https.get(url, (res) => {
    console.log(`${url} - Status: ${res.statusCode}`);
  }).on('error', (err) => {
    console.log(`Error checking ${url}: ${err.message}`);
  });
};

checkUrl('https://www.agaramdhines.lk/category/%e0%ae%a4%e0%ae%b0%e0%ae%ae%e0%af%8d-12/');
checkUrl('https://www.agaramdhines.lk/category/%e0%ae%a4%e0%ae%b0%e0%ae%ae%e0%af%8d-13/');
