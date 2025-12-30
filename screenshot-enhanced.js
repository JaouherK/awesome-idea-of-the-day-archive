const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

(async () => {
    let browser;
    try {
        // Create date-based folder structure (year/month only)
        const now = new Date();
        const year = now.getFullYear();
        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'];
        const monthName = monthNames[now.getMonth()];
        const day = now.getDate();

        const archiveDir = path.join('archives', String(year), monthName);

        // Create directory if it doesn't exist
        if (!fs.existsSync(archiveDir)) {
            fs.mkdirSync(archiveDir, { recursive: true });
        }

        // Generate filename in format "14 July 2025.png"
        const filename = `${day} ${monthName} ${year}.png`;
        const filePath = path.join(archiveDir, filename);

        console.log(`Capturing Idea of the Day to: ${filePath}`);

        // Launch browser with required settings
        browser = await puppeteer.launch({
            args: ['--no-sandbox', '--disable-setuid-sandbox'],
            headless: true // Set to false to see the browser in action
        });

        const page = await browser.newPage();

        // Configure viewport settings
        await page.setViewport({
            width: 1920,
            height: 1080,
            deviceScaleFactor: 2
        });

        // Navigate to ideabrowser.com
        console.log('Navigating to ideabrowser.com...');
        await page.goto('https://www.ideabrowser.com/', {
            waitUntil: 'networkidle2',
            timeout: 30000
        });

        // Wait a moment for everything to load
        console.log('Waiting for page to fully load...');
        await new Promise(resolve => setTimeout(resolve, 3000));

        // ========================================
        // ENHANCED CAPABILITIES - DEEP DIVE
        // ========================================

        // 1. Extract page metadata
        console.log('\n📊 Extracting page information...');
        const pageInfo = await page.evaluate(() => {
            return {
                title: document.title,
                url: window.location.href,
                description: document.querySelector('meta[name="description"]')?.content || 'N/A',
                headings: Array.from(document.querySelectorAll('h1, h2, h3')).map(h => ({
                    tag: h.tagName,
                    text: h.textContent.trim()
                })).slice(0, 10), // First 10 headings
                links: Array.from(document.querySelectorAll('a[href]')).length,
                images: Array.from(document.querySelectorAll('img')).length
            };
        });
        console.log('Page Title:', pageInfo.title);
        console.log('Total Links:', pageInfo.links);
        console.log('Total Images:', pageInfo.images);
        console.log('Headings found:', pageInfo.headings.length);

        // 2. Check for interactive elements
        console.log('\n🔍 Analyzing interactive elements...');
        const interactiveElements = await page.evaluate(() => {
            return {
                buttons: document.querySelectorAll('button').length,
                inputs: document.querySelectorAll('input').length,
                forms: document.querySelectorAll('form').length,
                clickableElements: document.querySelectorAll('[onclick], .clickable, [role="button"]').length
            };
        });
        console.log('Buttons:', interactiveElements.buttons);
        console.log('Input fields:', interactiveElements.inputs);
        console.log('Forms:', interactiveElements.forms);

        // 3. Try to find and click specific elements (example: navigation menu)
        console.log('\n🖱️  Looking for clickable elements...');
        try {
            // Example: Look for common navigation patterns
            const navLinks = await page.$$eval('nav a, header a, .menu a', links =>
                links.map(link => ({
                    text: link.textContent.trim(),
                    href: link.href
                })).slice(0, 5) // First 5 nav links
            );

            if (navLinks.length > 0) {
                console.log('Navigation links found:');
                navLinks.forEach((link, i) => {
                    console.log(`  ${i + 1}. ${link.text} -> ${link.href}`);
                });
            }
        } catch (e) {
            console.log('No standard navigation found');
        }

        // 4. Scroll through the page to trigger lazy-loaded content
        console.log('\n📜 Scrolling to reveal lazy-loaded content...');
        await autoScroll(page);

        // 5. Check for modals, popups, or cookie banners
        console.log('\n🍪 Checking for popups/modals...');
        try {
            const modalSelectors = [
                '[class*="modal"]',
                '[class*="popup"]',
                '[class*="cookie"]',
                '[class*="banner"]',
                '[role="dialog"]'
            ];

            for (const selector of modalSelectors) {
                const element = await page.$(selector);
                if (element) {
                    const isVisible = await element.isVisible();
                    if (isVisible) {
                        console.log(`Found visible element: ${selector}`);
                        // Could click "Accept" or "Close" buttons here
                    }
                }
            }
        } catch (e) {
            console.log('No popups detected');
        }

        // 6. Extract specific content (example: main content area)
        console.log('\n📝 Extracting main content...');
        const mainContent = await page.evaluate(() => {
            const selectors = ['main', 'article', '[role="main"]', '.content', '#content'];
            for (const selector of selectors) {
                const element = document.querySelector(selector);
                if (element) {
                    return {
                        found: true,
                        selector: selector,
                        textLength: element.textContent.trim().length,
                        preview: element.textContent.trim().substring(0, 200) + '...'
                    };
                }
            }
            return { found: false };
        });

        if (mainContent.found) {
            console.log(`Main content found in: ${mainContent.selector}`);
            console.log(`Content length: ${mainContent.textLength} characters`);
        }

        // 7. Take multiple screenshots at different scroll positions
        console.log('\n📸 Taking screenshots...');

        // Scroll to top first
        await page.evaluate(() => window.scrollTo(0, 0));
        await new Promise(resolve => setTimeout(resolve, 500));

        // Take the main screenshot
        await page.screenshot({
            path: filePath,
            fullPage: true,
            type: 'png'
        });
        console.log(`✅ Main screenshot saved: ${filePath}`);

        // Optional: Take a viewport-only screenshot (what's visible without scrolling)
        const viewportFilePath = filePath.replace('.png', '-viewport.png');
        await page.screenshot({
            path: viewportFilePath,
            fullPage: false,
            type: 'png'
        });
        console.log(`✅ Viewport screenshot saved: ${viewportFilePath}`);

        // 8. Save extracted data to JSON
        const dataFilePath = filePath.replace('.png', '-data.json');
        const extractedData = {
            captureDate: now.toISOString(),
            pageInfo,
            interactiveElements,
            mainContent
        };
        fs.writeFileSync(dataFilePath, JSON.stringify(extractedData, null, 2));
        console.log(`✅ Page data saved: ${dataFilePath}`);

        console.log('\n✨ Deep dive complete!');

    } catch (error) {
        console.error('❌ An error occurred:', error.message);
        throw error;
    } finally {
        if (browser) {
            await browser.close();
        }
    }
})().catch(error => {
    console.error('❌ Script failed:', error);
    process.exit(1);
});

// Helper function to auto-scroll the page
async function autoScroll(page) {
    await page.evaluate(async () => {
        await new Promise((resolve) => {
            let totalHeight = 0;
            const distance = 100;
            const timer = setInterval(() => {
                const scrollHeight = document.body.scrollHeight;
                window.scrollBy(0, distance);
                totalHeight += distance;

                if (totalHeight >= scrollHeight) {
                    clearInterval(timer);
                    resolve();
                }
            }, 100);
        });
    });
}
