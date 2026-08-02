import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.error('PAGE ERROR LOG:', msg.text());
    }
  });

  page.on('pageerror', error => {
    console.error('PAGE UNCAUGHT EXCEPTION:', error.message);
  });
  
  try {
    await page.goto('http://localhost:5173/Bound/bookshelf', { waitUntil: 'networkidle0' });
    
    // Evaluate to find the PDF button and click it
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const pdfBtn = buttons.find(b => b.textContent.includes('PDF'));
      if (pdfBtn) {
        pdfBtn.click();
      } else {
        console.error('PAGE ERROR LOG: PDF Button not found');
      }
    });

    // Wait a bit to see if an error triggers
    await new Promise(r => setTimeout(r, 2000));
  } catch (err) {
    console.error('Failed to load page:', err);
  }
  
  await browser.close();
})();
