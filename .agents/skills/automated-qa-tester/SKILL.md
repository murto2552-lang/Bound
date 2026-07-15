---
name: Automated QA Tester
description: Explains how to test the React frontend for runtime crashes using Puppeteer before pushing code. Activate this skill when making major UI or logic changes to ensure no "White Screen of Death" occurs.
---

# Automated QA Tester (Pre-Push Runtime Checks)

When you make significant changes to the React frontend (e.g., renaming variables, modifying state logic, or adding new libraries), there is a risk that the code compiles successfully but crashes at runtime in the browser (resulting in a blank white screen).

Before committing and pushing code to GitHub, follow this Automated QA Tester protocol:

## 1. Prepare the Environment
Ensure `puppeteer` is available in the project to run headless browser tests. If it is not installed, install it temporarily or permanently depending on user preference (e.g., `npm i puppeteer --no-save`).

## 2. Start the Local Server
Run the local development server in the background:
```powershell
npm run dev
```
Wait a few seconds for the server to start on the expected port (usually `http://localhost:5173` or `http://localhost:5173/Bound/` depending on the `base` Vite config).

## 3. Run the Puppeteer Test Script
Create a temporary script (e.g., `qa_test.js`) in the root directory:

```javascript
import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  let hasError = false;

  // Listen for console errors
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.error('PAGE ERROR LOG:', msg.text());
      hasError = true;
    }
  });

  // Listen for uncaught page exceptions
  page.on('pageerror', error => {
    console.error('PAGE UNCAUGHT EXCEPTION:', error.message);
    hasError = true;
  });
  
  try {
    // Update the URL to match the local dev server
    await page.goto('http://localhost:5173/Bound/', { waitUntil: 'networkidle0' });
  } catch (err) {
    console.error('Failed to load page:', err);
    hasError = true;
  }
  
  await browser.close();

  if (hasError) {
    console.error('QA TEST FAILED: Runtime errors detected.');
    process.exit(1);
  } else {
    console.log('QA TEST PASSED: No runtime errors detected.');
    process.exit(0);
  }
})();
```

Run the script using Node:
```powershell
node qa_test.js
```

## 4. Analyze and Act
- If the script outputs `QA TEST PASSED`, you are clear to commit and push your changes.
- If the script outputs `QA TEST FAILED`, review the logged errors, fix the code, and repeat the test. **DO NOT PUSH BROKEN CODE.**

## 5. Cleanup
Terminate the background `npm run dev` task using your `manage_task` tool, and optionally delete the temporary `qa_test.js` file.
