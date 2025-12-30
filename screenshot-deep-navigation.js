const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

/**
 * Advanced Puppeteer Script - Deep Website Navigation
 * This demonstrates how to:
 * - Click through multiple pages
 * - Fill out forms
 * - Handle authentication
 * - Extract data from multiple pages
 * - Navigate site structure
 */

(async () => {
    let browser;
    try {
        console.log('🚀 Starting deep navigation...\n');

        // Launch browser (set headless: false to watch it work)
        browser = await puppeteer.launch({
            args: ['--no-sandbox', '--disable-setuid-sandbox'],
            headless: true
        });

        const page = await browser.newPage();
        await page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 2 });

        // Create output directory
        const outputDir = path.join('deep-dive-results');
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }

        // ========================================
        // EXAMPLE 1: Navigate and Click Links
        // ========================================
        console.log('📍 Example 1: Navigating to homepage...');
        await page.goto('https://www.ideabrowser.com/', {
            waitUntil: 'networkidle2',
            timeout: 30000
        });

        // Take initial screenshot
        await page.screenshot({
            path: path.join(outputDir, '01-homepage.png'),
            fullPage: true
        });
        console.log('✅ Homepage screenshot saved\n');

        // Find all links on the page
        const links = await page.evaluate(() => {
            return Array.from(document.querySelectorAll('a[href]'))
                .map(a => ({
                    text: a.textContent.trim(),
                    href: a.href,
                    isInternal: a.href.includes(window.location.hostname)
                }))
                .filter(link => link.text && link.isInternal)
                .slice(0, 5); // First 5 internal links
        });

        console.log(`Found ${links.length} internal links to explore:`);
        links.forEach((link, i) => {
            console.log(`  ${i + 1}. ${link.text} -> ${link.href}`);
        });

        // ========================================
        // EXAMPLE 2: Click and Navigate to Subpages
        // ========================================
        console.log('\n📍 Example 2: Exploring subpages...');

        for (let i = 0; i < Math.min(links.length, 3); i++) {
            try {
                console.log(`\nNavigating to: ${links[i].text}`);
                await page.goto(links[i].href, {
                    waitUntil: 'networkidle2',
                    timeout: 15000
                });

                await new Promise(resolve => setTimeout(resolve, 1000));

                // Extract page info
                const pageData = await page.evaluate(() => ({
                    title: document.title,
                    url: window.location.href,
                    h1: document.querySelector('h1')?.textContent.trim() || 'N/A'
                }));

                console.log(`  Title: ${pageData.title}`);
                console.log(`  H1: ${pageData.h1}`);

                // Take screenshot
                await page.screenshot({
                    path: path.join(outputDir, `02-subpage-${i + 1}.png`),
                    fullPage: true
                });
                console.log(`  ✅ Screenshot saved`);

            } catch (e) {
                console.log(`  ⚠️  Could not navigate to ${links[i].href}: ${e.message}`);
            }
        }

        // ========================================
        // EXAMPLE 3: Click Specific Elements
        // ========================================
        console.log('\n📍 Example 3: Clicking specific elements...');
        await page.goto('https://www.ideabrowser.com/', { waitUntil: 'networkidle2' });

        // Try to find and click a button (example)
        try {
            const buttonExists = await page.$('button');
            if (buttonExists) {
                console.log('Found a button, clicking it...');
                await page.click('button');
                await new Promise(resolve => setTimeout(resolve, 2000));

                await page.screenshot({
                    path: path.join(outputDir, '03-after-button-click.png'),
                    fullPage: true
                });
                console.log('✅ Screenshot after button click saved');
            } else {
                console.log('No buttons found on page');
            }
        } catch (e) {
            console.log(`Could not click button: ${e.message}`);
        }

        // ========================================
        // EXAMPLE 4: Fill Out Forms
        // ========================================
        console.log('\n📍 Example 4: Form interaction...');

        // Check if there are any input fields
        const hasInputs = await page.evaluate(() => {
            return document.querySelectorAll('input[type="text"], input[type="email"], textarea').length > 0;
        });

        if (hasInputs) {
            console.log('Found input fields on page');

            // Example: Fill out a search or email field
            try {
                const inputSelector = 'input[type="text"], input[type="email"], input[type="search"]';
                const input = await page.$(inputSelector);

                if (input) {
                    await page.type(inputSelector, 'test query', { delay: 100 });
                    console.log('✅ Typed into input field');

                    await page.screenshot({
                        path: path.join(outputDir, '04-form-filled.png'),
                        fullPage: true
                    });
                }
            } catch (e) {
                console.log(`Could not interact with form: ${e.message}`);
            }
        } else {
            console.log('No input fields found on page');
        }

        // ========================================
        // EXAMPLE 5: Execute Custom JavaScript
        // ========================================
        console.log('\n📍 Example 5: Executing custom JavaScript...');

        await page.goto('https://www.ideabrowser.com/', { waitUntil: 'networkidle2' });

        // Inject custom styles or modify content
        await page.evaluate(() => {
            // Example: Highlight all links
            document.querySelectorAll('a').forEach(link => {
                link.style.border = '2px solid red';
            });

            // Example: Add a custom banner
            const banner = document.createElement('div');
            banner.textContent = 'PUPPETEER WAS HERE!';
            banner.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        background: #ff6b6b;
        color: white;
        padding: 20px;
        text-align: center;
        font-size: 24px;
        font-weight: bold;
        z-index: 999999;
      `;
            document.body.prepend(banner);
        });

        await new Promise(resolve => setTimeout(resolve, 1000));

        await page.screenshot({
            path: path.join(outputDir, '05-custom-js-executed.png'),
            fullPage: true
        });
        console.log('✅ Screenshot with custom modifications saved');

        // ========================================
        // EXAMPLE 6: Extract Structured Data
        // ========================================
        console.log('\n📍 Example 6: Extracting structured data...');

        await page.goto('https://www.ideabrowser.com/', { waitUntil: 'networkidle2' });

        const structuredData = await page.evaluate(() => {
            // Extract all text content organized by element type
            return {
                headings: {
                    h1: Array.from(document.querySelectorAll('h1')).map(h => h.textContent.trim()),
                    h2: Array.from(document.querySelectorAll('h2')).map(h => h.textContent.trim()),
                    h3: Array.from(document.querySelectorAll('h3')).map(h => h.textContent.trim())
                },
                paragraphs: Array.from(document.querySelectorAll('p'))
                    .map(p => p.textContent.trim())
                    .filter(text => text.length > 20)
                    .slice(0, 10),
                links: Array.from(document.querySelectorAll('a[href]'))
                    .map(a => ({
                        text: a.textContent.trim(),
                        href: a.href,
                        target: a.target
                    }))
                    .filter(link => link.text)
                    .slice(0, 20),
                images: Array.from(document.querySelectorAll('img'))
                    .map(img => ({
                        src: img.src,
                        alt: img.alt,
                        width: img.width,
                        height: img.height
                    }))
                    .slice(0, 10),
                metadata: {
                    title: document.title,
                    description: document.querySelector('meta[name="description"]')?.content,
                    keywords: document.querySelector('meta[name="keywords"]')?.content,
                    ogTitle: document.querySelector('meta[property="og:title"]')?.content,
                    ogDescription: document.querySelector('meta[property="og:description"]')?.content,
                    ogImage: document.querySelector('meta[property="og:image"]')?.content
                }
            };
        });

        // Save extracted data
        const dataPath = path.join(outputDir, 'extracted-data.json');
        fs.writeFileSync(dataPath, JSON.stringify(structuredData, null, 2));
        console.log(`✅ Structured data saved to: ${dataPath}`);

        console.log('\nExtracted data summary:');
        console.log(`  - H1 headings: ${structuredData.headings.h1.length}`);
        console.log(`  - H2 headings: ${structuredData.headings.h2.length}`);
        console.log(`  - Paragraphs: ${structuredData.paragraphs.length}`);
        console.log(`  - Links: ${structuredData.links.length}`);
        console.log(`  - Images: ${structuredData.images.length}`);

        // ========================================
        // EXAMPLE 7: Handle Cookies and Storage
        // ========================================
        console.log('\n📍 Example 7: Working with cookies and storage...');

        // Get all cookies
        const cookies = await page.cookies();
        console.log(`Found ${cookies.length} cookies`);

        // Set a custom cookie
        await page.setCookie({
            name: 'puppeteer_test',
            value: 'deep_dive_mode',
            domain: new URL(page.url()).hostname
        });
        console.log('✅ Custom cookie set');

        // Access localStorage and sessionStorage
        const storageData = await page.evaluate(() => ({
            localStorage: Object.keys(localStorage).length,
            sessionStorage: Object.keys(sessionStorage).length
        }));
        console.log(`LocalStorage items: ${storageData.localStorage}`);
        console.log(`SessionStorage items: ${storageData.sessionStorage}`);

        // ========================================
        // EXAMPLE 8: Monitor Network Requests
        // ========================================
        console.log('\n📍 Example 8: Monitoring network activity...');

        const requests = [];
        const responses = [];

        page.on('request', request => {
            requests.push({
                url: request.url(),
                method: request.method(),
                resourceType: request.resourceType()
            });
        });

        page.on('response', response => {
            responses.push({
                url: response.url(),
                status: response.status(),
                contentType: response.headers()['content-type']
            });
        });

        await page.goto('https://www.ideabrowser.com/', { waitUntil: 'networkidle2' });

        console.log(`Captured ${requests.length} requests`);
        console.log(`Captured ${responses.length} responses`);

        // Save network data
        const networkPath = path.join(outputDir, 'network-activity.json');
        fs.writeFileSync(networkPath, JSON.stringify({ requests, responses }, null, 2));
        console.log(`✅ Network activity saved to: ${networkPath}`);

        console.log('\n✨ Deep dive navigation complete!');
        console.log(`📁 All results saved to: ${outputDir}`);

    } catch (error) {
        console.error('❌ An error occurred:', error.message);
        console.error(error.stack);
    } finally {
        if (browser) {
            await browser.close();
        }
    }
})();
