import { gotScraping } from 'got-scraping';
import fs from 'fs';

(async () => {
  try {
    const url = 'https://encompass.com/model/MAYMEDC465HW0';
    const res = await gotScraping({ url, headerGeneratorOptions: { browsers: [{ name: 'chrome', minVersion: 110 }] } });
    fs.writeFileSync('encompass-test.html', res.body);
    console.log('Saved encompass-test.html');
  } catch (err) {
    console.error('Error:', err.message, err.response?.statusCode);
  }
})();
