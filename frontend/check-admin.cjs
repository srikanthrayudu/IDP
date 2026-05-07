const puppeteer = require('puppeteer');
(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.evaluateOnNewDocument(() => {
    localStorage.setItem('token', 'fake-token');
    localStorage.setItem('role', 'ROLE_ADMIN');
  });
  page.on('console', msg => console.log('LOG:', msg.text()));
  page.on('pageerror', err => console.log('ERR:', err.message));
  await page.goto('http://localhost:5173/admin');
  await new Promise(r => setTimeout(r, 2000));
  const html = await page.content();
  console.log(html);
  await browser.close();
})();
