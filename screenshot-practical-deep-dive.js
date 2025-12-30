const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

/**
 * Practical Example: Deep Dive into ideabrowser.com
 * This script demonstrates real-world deep navigation capabilities
 */

(async () => {
    let browser;
    try {
        console.log('🚀 Starting deep dive into ideabrowser.com...\n');

        browser = await puppeteer.launch({
            args: ['--no-sandbox', '--disable-setuid-sandbox'],
            headless: true, // Set to false to watch the browser
            defaultViewport: { width: 1920, height: 1080 }
        });

        const page = await browser.newPage();

        // Create output directory
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const outputDir = path.join('deep-dive-output', timestamp);
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }

        console.log(`📁 Output directory: ${outputDir}\n`);

        // ========================================
        // STEP 1: Initial Page Load & Analysis
        // ========================================
        console.log('📍 STEP 1: Loading homepage and analyzing structure...');
        await page.goto('https://www.ideabrowser.com/', {
            waitUntil: 'networkidle2',
            timeout: 30000
        });

        // Extract comprehensive page data
        const pageAnalysis = await page.evaluate(() => {
            const getElementInfo = (selector) => {
                const elements = document.querySelectorAll(selector);
                return {
                    count: elements.length,
                    samples: Array.from(elements).slice(0, 3).map(el => ({
                        text: el.textContent?.trim().substring(0, 50),
                        classes: el.className,
                        id: el.id
                    }))
                };
            };

            return {
                url: window.location.href,
                title: document.title,
                structure: {
                    headings: {
                        h1: getElementInfo('h1'),
                        h2: getElementInfo('h2'),
                        h3: getElementInfo('h3')
                    },
                    interactive: {
                        buttons: getElementInfo('button'),
                        links: getElementInfo('a[href]'),
                        inputs: getElementInfo('input'),
                        forms: getElementInfo('form')
                    },
                    media: {
                        images: document.querySelectorAll('img').length,
                        videos: document.querySelectorAll('video').length
                    }
                },
                metadata: {
                    description: document.querySelector('meta[name="description"]')?.content,
                    viewport: document.querySelector('meta[name="viewport"]')?.content,
                    ogTitle: document.querySelector('meta[property="og:title"]')?.content,
                    ogImage: document.querySelector('meta[property="og:image"]')?.content
                }
            };
        });

        console.log('✅ Page Analysis Complete:');
        console.log(`   Title: ${pageAnalysis.title}`);
        console.log(`   H1 headings: ${pageAnalysis.structure.headings.h1.count}`);
        console.log(`   Buttons: ${pageAnalysis.structure.interactive.buttons.count}`);
        console.log(`   Links: ${pageAnalysis.structure.interactive.links.count}`);
        console.log(`   Images: ${pageAnalysis.structure.media.images}`);

        // Save analysis
        fs.writeFileSync(
            path.join(outputDir, '01-page-analysis.json'),
            JSON.stringify(pageAnalysis, null, 2)
        );

        // Take initial screenshot
        await page.screenshot({
            path: path.join(outputDir, '01-homepage-initial.png'),
            fullPage: true
        });
        console.log('✅ Initial screenshot saved\n');

        // ========================================
        // STEP 2: Scroll and Reveal Content
        // ========================================
        console.log('📍 STEP 2: Scrolling to reveal lazy-loaded content...');

        // Scroll to bottom gradually
        await page.evaluate(async () => {
            await new Promise((resolve) => {
                let totalHeight = 0;
                const distance = 200;
                const timer = setInterval(() => {
                    const scrollHeight = document.body.scrollHeight;
                    window.scrollBy(0, distance);
                    totalHeight += distance;

                    if (totalHeight >= scrollHeight) {
                        clearInterval(timer);
                        // Scroll back to top
                        window.scrollTo(0, 0);
                        resolve();
                    }
                }, 100);
            });
        });

        await new Promise(resolve => setTimeout(resolve, 1000));

        await page.screenshot({
            path: path.join(outputDir, '02-after-scroll.png'),
            fullPage: true
        });
        console.log('✅ Post-scroll screenshot saved\n');

        // ========================================
        // STEP 3: Extract All Links
        // ========================================
        console.log('📍 STEP 3: Extracting and categorizing all links...');

        const links = await page.evaluate(() => {
            return Array.from(document.querySelectorAll('a[href]')).map(a => {
                const url = new URL(a.href, window.location.href);
                return {
                    text: a.textContent.trim(),
                    href: a.href,
                    isInternal: url.hostname === window.location.hostname,
                    isExternal: url.hostname !== window.location.hostname,
                    target: a.target,
                    hasImage: a.querySelector('img') !== null
                };
            });
        });

        const internalLinks = links.filter(l => l.isInternal && l.text);
        const externalLinks = links.filter(l => l.isExternal && l.text);

        console.log(`✅ Found ${links.length} total links:`);
        console.log(`   Internal: ${internalLinks.length}`);
        console.log(`   External: ${externalLinks.length}`);

        // Save links
        fs.writeFileSync(
            path.join(outputDir, '03-links.json'),
            JSON.stringify({ internal: internalLinks, external: externalLinks }, null, 2)
        );

        // ========================================
        // STEP 4: Try Clicking Interactive Elements
        // ========================================
        console.log('\n📍 STEP 4: Testing interactive elements...');

        // Look for clickable elements
        const clickableElements = await page.evaluate(() => {
            const elements = [];

            // Find buttons
            document.querySelectorAll('button').forEach((btn, i) => {
                if (i < 3) { // First 3 buttons
                    elements.push({
                        type: 'button',
                        text: btn.textContent.trim(),
                        selector: `button:nth-of-type(${i + 1})`,
                        classes: btn.className
                    });
                }
            });

            // Find clickable divs/spans
            document.querySelectorAll('[onclick], [role="button"]').forEach((el, i) => {
                if (i < 3) {
                    elements.push({
                        type: 'clickable',
                        text: el.textContent.trim().substring(0, 50),
                        classes: el.className
                    });
                }
            });

            return elements;
        });

        console.log(`Found ${clickableElements.length} clickable elements`);

        // Try clicking the first button if it exists
        if (clickableElements.length > 0) {
            try {
                const firstButton = clickableElements[0];
                console.log(`Attempting to click: "${firstButton.text}"`);

                await page.click(firstButton.selector || 'button');
                await new Promise(resolve => setTimeout(resolve, 2000));

                await page.screenshot({
                    path: path.join(outputDir, '04-after-click.png'),
                    fullPage: true
                });
                console.log('✅ Screenshot after click saved');
            } catch (e) {
                console.log(`⚠️  Could not click element: ${e.message}`);
            }
        }

        // ========================================
        // STEP 5: Navigate to Subpages
        // ========================================
        console.log('\n📍 STEP 5: Exploring subpages...');

        const subpagesToVisit = internalLinks
            .filter(link => link.href !== page.url())
            .slice(0, 3); // Visit first 3 subpages

        for (let i = 0; i < subpagesToVisit.length; i++) {
            const link = subpagesToVisit[i];
            try {
                console.log(`\n  Visiting: ${link.text || 'Unnamed link'}`);
                console.log(`  URL: ${link.href}`);

                await page.goto(link.href, {
                    waitUntil: 'networkidle2',
                    timeout: 15000
                });

                await new Promise(resolve => setTimeout(resolve, 1000));

                // Extract subpage info
                const subpageInfo = await page.evaluate(() => ({
                    title: document.title,
                    url: window.location.href,
                    h1: document.querySelector('h1')?.textContent.trim(),
                    mainContent: document.querySelector('main, article, .content')?.textContent.trim().substring(0, 200)
                }));

                console.log(`  Title: ${subpageInfo.title}`);
                console.log(`  H1: ${subpageInfo.h1 || 'N/A'}`);

                // Take screenshot
                await page.screenshot({
                    path: path.join(outputDir, `05-subpage-${i + 1}.png`),
                    fullPage: true
                });

                // Save subpage data
                fs.writeFileSync(
                    path.join(outputDir, `05-subpage-${i + 1}-data.json`),
                    JSON.stringify(subpageInfo, null, 2)
                );

                console.log(`  ✅ Subpage ${i + 1} captured`);

            } catch (e) {
                console.log(`  ⚠️  Could not visit subpage: ${e.message}`);
            }
        }

        // ========================================
        // STEP 6: Extract Structured Content
        // ========================================
        console.log('\n📍 STEP 6: Extracting structured content from main page...');

        await page.goto('https://www.ideabrowser.com/', { waitUntil: 'networkidle2' });

        const structuredContent = await page.evaluate(() => {
            // Try to find the main idea/content
            const mainSelectors = [
                '.idea',
                '.main-content',
                'main',
                'article',
                '[role="main"]'
            ];

            let mainContent = null;
            for (const selector of mainSelectors) {
                const el = document.querySelector(selector);
                if (el) {
                    mainContent = {
                        selector,
                        text: el.textContent.trim(),
                        html: el.innerHTML.substring(0, 500)
                    };
                    break;
                }
            }

            return {
                mainContent,
                allText: document.body.textContent.trim().substring(0, 1000),
                paragraphs: Array.from(document.querySelectorAll('p'))
                    .map(p => p.textContent.trim())
                    .filter(text => text.length > 20)
                    .slice(0, 10)
            };
        });

        fs.writeFileSync(
            path.join(outputDir, '06-structured-content.json'),
            JSON.stringify(structuredContent, null, 2)
        );
        console.log('✅ Structured content extracted\n');

        // ========================================
        // STEP 7: Performance & Network Analysis
        // ========================================
        console.log('📍 STEP 7: Analyzing performance...');

        const metrics = await page.metrics();
        const performanceData = {
            metrics,
            timing: await page.evaluate(() => {
                const timing = performance.timing;
                return {
                    loadTime: timing.loadEventEnd - timing.navigationStart,
                    domContentLoaded: timing.domContentLoadedEventEnd - timing.navigationStart,
                    responseTime: timing.responseEnd - timing.requestStart
                };
            })
        };

        fs.writeFileSync(
            path.join(outputDir, '07-performance.json'),
            JSON.stringify(performanceData, null, 2)
        );
        console.log(`✅ Page load time: ${performanceData.timing.loadTime}ms\n`);

        // ========================================
        // Summary
        // ========================================
        console.log('═══════════════════════════════════════');
        console.log('✨ DEEP DIVE COMPLETE!');
        console.log('═══════════════════════════════════════');
        console.log(`📁 All results saved to: ${outputDir}`);
        console.log('\nFiles created:');
        console.log('  • 01-page-analysis.json - Complete page structure');
        console.log('  • 01-homepage-initial.png - Initial screenshot');
        console.log('  • 02-after-scroll.png - After scrolling');
        console.log('  • 03-links.json - All extracted links');
        console.log('  • 04-after-click.png - After interaction');
        console.log('  • 05-subpage-*.png - Subpage screenshots');
        console.log('  • 06-structured-content.json - Extracted content');
        console.log('  • 07-performance.json - Performance metrics');
        console.log('\n🎯 This demonstrates how Puppeteer can:');
        console.log('  ✓ Analyze page structure');
        console.log('  ✓ Scroll and reveal content');
        console.log('  ✓ Extract all links and data');
        console.log('  ✓ Click interactive elements');
        console.log('  ✓ Navigate to multiple pages');
        console.log('  ✓ Extract structured content');
        console.log('  ✓ Measure performance');
        console.log('═══════════════════════════════════════\n');

    } catch (error) {
        console.error('❌ An error occurred:', error.message);
        console.error(error.stack);
    } finally {
        if (browser) {
            await browser.close();
        }
    }
})();
