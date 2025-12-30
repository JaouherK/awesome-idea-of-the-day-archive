# Puppeteer Deep Dive Capabilities

This document explains how Puppeteer can dive much deeper into websites beyond simple screenshots.

## 📚 Overview

The original[`screenshot.js`](screenshot.js) script only navigates to a page and takes a screenshot.Puppeteer can do much more:

## 🎯 Core Capabilities

### 1. ** Navigation & Page Interaction **
    ```javascript
// Navigate to pages
await page.goto('https://example.com', { waitUntil: 'networkidle2' });

// Click elements
await page.click('button.submit');
await page.click('#menu-item');

// Click by text content
await page.evaluate(() => {
  const button = Array.from(document.querySelectorAll('button'))
    .find(btn => btn.textContent.includes('Click Me'));
  button?.click();
});

// Hover over elements
await page.hover('.dropdown-menu');

// Navigate back/forward
await page.goBack();
await page.goForward();
```

### 2. ** Form Filling & Input **
    ```javascript
// Type into input fields
await page.type('#email', 'user@example.com');
await page.type('#password', 'secretpassword', { delay: 100 });

// Select from dropdown
await page.select('#country', 'USA');

// Check/uncheck checkboxes
await page.click('input[type="checkbox"]');

// Upload files
const fileInput = await page.$('input[type="file"]');
await fileInput.uploadFile('/path/to/file.pdf');

// Submit forms
await page.click('button[type="submit"]');
```

### 3. ** Data Extraction(Web Scraping) **
    ```javascript
// Extract text content
const title = await page.$eval('h1', el => el.textContent);

// Extract multiple elements
const links = await page.$$eval('a', anchors => 
  anchors.map(a => ({
    text: a.textContent,
    href: a.href
  }))
);

// Complex data extraction
const data = await page.evaluate(() => {
  return {
    title: document.title,
    headings: Array.from(document.querySelectorAll('h1, h2, h3'))
      .map(h => h.textContent.trim()),
    images: Array.from(document.querySelectorAll('img'))
      .map(img => ({ src: img.src, alt: img.alt })),
    metadata: {
      description: document.querySelector('meta[name="description"]')?.content,
      keywords: document.querySelector('meta[name="keywords"]')?.content
    }
  };
});
```

### 4. ** Waiting for Elements & Content **
    ```javascript
// Wait for selector
await page.waitForSelector('.dynamic-content', { timeout: 5000 });

// Wait for navigation
await page.waitForNavigation({ waitUntil: 'networkidle2' });

// Wait for function
await page.waitForFunction(() => document.querySelector('.loaded'));

// Wait for timeout
await new Promise(resolve => setTimeout(resolve, 3000));

// Wait for element to be visible
await page.waitForSelector('.modal', { visible: true });
```

### 5. ** Scrolling & Viewport Control **
    ```javascript
// Scroll to bottom
await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));

// Scroll to specific element
await page.evaluate(() => {
  document.querySelector('#target').scrollIntoView();
});

// Auto-scroll to load lazy content
async function autoScroll(page) {
  await page.evaluate(async () => {
    await new Promise((resolve) => {
      let totalHeight = 0;
      const distance = 100;
      const timer = setInterval(() => {
        window.scrollBy(0, distance);
        totalHeight += distance;
        if (totalHeight >= document.body.scrollHeight) {
          clearInterval(timer);
          resolve();
        }
      }, 100);
    });
  });
}

// Change viewport size
await page.setViewport({ width: 1920, height: 1080 });
```

### 6. ** Authentication & Sessions **
    ```javascript
// Login to a website
await page.goto('https://example.com/login');
await page.type('#username', 'myuser');
await page.type('#password', 'mypass');
await page.click('button[type="submit"]');
await page.waitForNavigation();

// Set cookies
await page.setCookie({
  name: 'session_id',
  value: 'abc123',
  domain: 'example.com'
});

// Get cookies
const cookies = await page.cookies();

// Save session for reuse
const cookies = await page.cookies();
fs.writeFileSync('session.json', JSON.stringify(cookies));

// Restore session
const savedCookies = JSON.parse(fs.readFileSync('session.json'));
await page.setCookie(...savedCookies);
```

### 7. ** Handling Popups & Modals **
    ```javascript
// Handle dialogs (alert, confirm, prompt)
page.on('dialog', async dialog => {
  console.log(dialog.message());
  await dialog.accept(); // or dialog.dismiss()
});

// Close cookie banners
try {
  await page.click('.cookie-accept', { timeout: 3000 });
} catch (e) {
  // No cookie banner found
}

// Handle new tabs/windows
const newPagePromise = new Promise(resolve => 
  browser.once('targetcreated', target => resolve(target.page()))
);
await page.click('a[target="_blank"]');
const newPage = await newPagePromise;
```

### 8. ** JavaScript Execution **
    ```javascript
// Execute custom JavaScript
await page.evaluate(() => {
  // Modify page content
  document.body.style.backgroundColor = 'red';
  
  // Trigger events
  document.querySelector('button').click();
  
  // Access window objects
  console.log(window.location.href);
});

// Pass arguments to evaluate
const result = await page.evaluate((x, y) => {
  return x + y;
}, 5, 10); // result = 15

// Return complex data
const pageData = await page.evaluate(() => ({
  url: window.location.href,
  title: document.title,
  userAgent: navigator.userAgent
}));
```

### 9. ** Network Monitoring **
    ```javascript
// Intercept requests
await page.setRequestInterception(true);
page.on('request', request => {
  if (request.resourceType() === 'image') {
    request.abort(); // Block images
  } else {
    request.continue();
  }
});

// Monitor responses
page.on('response', response => {
  console.log(`${ response.status() } ${ response.url() } `);
});

// Wait for specific request
await page.waitForResponse(response => 
  response.url().includes('/api/data') && response.status() === 200
);
```

### 10. ** Screenshots & PDFs **
    ```javascript
// Full page screenshot
await page.screenshot({ 
  path: 'fullpage.png', 
  fullPage: true 
});

// Viewport screenshot
await page.screenshot({ 
  path: 'viewport.png', 
  fullPage: false 
});

// Element screenshot
const element = await page.$('.specific-element');
await element.screenshot({ path: 'element.png' });

// Generate PDF
await page.pdf({ 
  path: 'page.pdf', 
  format: 'A4',
  printBackground: true 
});

// Screenshot with clip (specific area)
await page.screenshot({
  path: 'clip.png',
  clip: { x: 0, y: 0, width: 500, height: 500 }
});
```

### 11. ** Mobile Emulation **
    ```javascript
// Emulate mobile device
const iPhone = puppeteer.devices['iPhone 12'];
await page.emulate(iPhone);

// Custom mobile viewport
await page.setViewport({
  width: 375,
  height: 812,
  isMobile: true,
  hasTouch: true
});

// Set user agent
await page.setUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)...');
```

### 12. ** Performance Monitoring **
    ```javascript
// Measure page load time
const startTime = Date.now();
await page.goto('https://example.com');
const loadTime = Date.now() - startTime;
console.log(`Page loaded in ${ loadTime } ms`);

// Get performance metrics
const metrics = await page.metrics();
console.log(metrics); // JSHeapUsedSize, Nodes, etc.

// Trace performance
await page.tracing.start({ path: 'trace.json' });
await page.goto('https://example.com');
await page.tracing.stop();
```

## 🚀 Advanced Use Cases

### Multi - Page Crawling
    ```javascript
const visitedUrls = new Set();
const toVisit = ['https://example.com'];

while (toVisit.length > 0) {
  const url = toVisit.pop();
  if (visitedUrls.has(url)) continue;
  
  await page.goto(url);
  visitedUrls.add(url);
  
  // Extract links
  const links = await page.$$eval('a[href]', anchors =>
    anchors.map(a => a.href)
  );
  
  // Add new links to visit
  links.forEach(link => {
    if (!visitedUrls.has(link) && link.startsWith('https://example.com')) {
      toVisit.push(link);
    }
  });
}
```

### Automated Testing
    ```javascript
// Test form submission
await page.goto('https://example.com/form');
await page.type('#name', 'Test User');
await page.type('#email', 'test@example.com');
await page.click('button[type="submit"]');

// Verify success message
const successMessage = await page.$eval('.success', el => el.textContent);
console.assert(successMessage.includes('Success'), 'Form submission failed');
```

### Data Mining
    ```javascript
// Scrape product information
const products = await page.evaluate(() => {
  return Array.from(document.querySelectorAll('.product')).map(product => ({
    name: product.querySelector('.name')?.textContent,
    price: product.querySelector('.price')?.textContent,
    image: product.querySelector('img')?.src,
    rating: product.querySelector('.rating')?.textContent
  }));
});

fs.writeFileSync('products.json', JSON.stringify(products, null, 2));
```

## 📝 Examples in This Repository

1. ** [`screenshot.js`](screenshot.js) ** - Original simple screenshot script
2. ** [`screenshot-enhanced.js`](screenshot - enhanced.js) ** - Enhanced version with data extraction
3. ** [`screenshot-deep-navigation.js`](screenshot - deep - navigation.js) ** - Advanced multi - page navigation

## 🎓 Running the Examples

    ```bash
# Original screenshot
node screenshot.js

# Enhanced with data extraction
node screenshot-enhanced.js

# Deep navigation demo
node screenshot-deep-navigation.js
```

## 💡 Tips & Best Practices

1. ** Always use`waitUntil: 'networkidle2'` ** for dynamic content
2. ** Add delays ** after clicks to let content load
3. ** Use try-catch blocks ** for element interactions that might fail
4. ** Set timeouts ** to prevent hanging on slow pages
5. ** Handle popups and modals ** before interacting with page content
6. ** Use headless: false ** during development to see what's happening
7. ** Respect robots.txt ** and rate limits when scraping
8. ** Save cookies / sessions ** to avoid repeated logins
9. ** Use selectors wisely ** - prefer IDs, then classes, then attributes
10. ** Monitor network requests ** to understand what data the page loads

## 🔗 Resources

    - [Puppeteer Documentation](https://pptr.dev/)
        -[Puppeteer API Reference](https://pptr.dev/api)
            -[Puppeteer Examples](https://github.com/puppeteer/puppeteer/tree/main/examples)

## ⚠️ Legal & Ethical Considerations

            - Always check a website's Terms of Service before scraping
            - Respect robots.txt files
            - Don't overload servers with too many requests
            - Be mindful of copyright and data privacy laws
            - Use rate limiting and delays between requests
            - Consider using official APIs when available
