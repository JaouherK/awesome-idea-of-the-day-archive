const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const TurndownService = require('turndown');

/**
 * Crawl all links in #first-section and generate MD files with screenshots
 */

(async () => {
    let browser;
    try {
        console.log('🚀 Starting first-section crawler...\n');

        // Initialize Turndown for HTML to Markdown conversion
        const turndownService = new TurndownService({
            headingStyle: 'atx',
            codeBlockStyle: 'fenced'
        });

        browser = await puppeteer.launch({
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-blink-features=AutomationControlled',
                '--disable-features=IsolateOrigins,site-per-process'
            ],
            headless: true,
            defaultViewport: { width: 1920, height: 1080 }
        });

        const page = await browser.newPage();

        // Set realistic user agent
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

        // Set extra HTTP headers to mimic a real browser
        await page.setExtraHTTPHeaders({
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
            'Accept-Encoding': 'gzip, deflate, br',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
            'Sec-Fetch-Dest': 'document',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Site': 'none',
            'Sec-Fetch-User': '?1',
            'Cache-Control': 'max-age=0'
        });

        // Remove webdriver flag and other automation indicators
        await page.evaluateOnNewDocument(() => {
            // Overwrite the `navigator.webdriver` property
            Object.defineProperty(navigator, 'webdriver', {
                get: () => false,
            });

            // Overwrite the `plugins` property to add fake plugins
            Object.defineProperty(navigator, 'plugins', {
                get: () => [1, 2, 3, 4, 5],
            });

            // Overwrite the `languages` property
            Object.defineProperty(navigator, 'languages', {
                get: () => ['en-US', 'en'],
            });

            // Add chrome object
            window.chrome = {
                runtime: {},
            };

            // Mock permissions
            const originalQuery = window.navigator.permissions.query;
            window.navigator.permissions.query = (parameters) => (
                parameters.name === 'notifications' ?
                    Promise.resolve({ state: Notification.permission }) :
                    originalQuery(parameters)
            );
        });

        // Create output directory
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
        const outputDir = path.join('first-section-crawl', timestamp);
        const imagesDir = path.join(outputDir, 'images');

        if (!fs.existsSync(imagesDir)) {
            fs.mkdirSync(imagesDir, { recursive: true });
        }

        console.log(`📁 Output directory: ${outputDir}\n`);

        // ========================================
        // STEP 1: Navigate to homepage
        // ========================================
        console.log('📍 Loading homepage...');
        await page.goto('https://www.ideabrowser.com/', {
            waitUntil: 'networkidle2',
            timeout: 30000
        });

        // Wait for content to load
        await new Promise(resolve => setTimeout(resolve, 2000));

        // ========================================
        // STEP 2: Extract links from #main-wrapper
        // ========================================
        console.log('📍 Extracting links from #main-wrapper...\n');

        const mainWrapperData = await page.evaluate(() => {
            const mainWrapper = document.querySelector('#main-wrapper');

            if (!mainWrapper) {
                return { error: 'Could not find #main-wrapper element' };
            }

            const links = Array.from(mainWrapper.querySelectorAll('a[href]'))
                .map(a => ({
                    text: a.textContent.trim(),
                    href: a.href,
                    title: a.title || a.textContent.trim()
                }))
                .filter(link => link.href && link.text);

            // Clone main-wrapper and remove all class attributes
            const clone = mainWrapper.cloneNode(true);
            // Remove all class attributes from all elements
            clone.querySelectorAll('*').forEach(el => {
                el.removeAttribute('class');
            });
            const mainWrapperHTML = clone.innerHTML;

            return {
                links,
                mainWrapperHTML: mainWrapperHTML
            };
        });

        if (mainWrapperData.error) {
            console.error(`❌ ${mainWrapperData.error}`);
            console.log('\nAvailable sections on page:');
            const sections = await page.evaluate(() => {
                return Array.from(document.querySelectorAll('[id]'))
                    .map(el => ({ id: el.id, tag: el.tagName }))
                    .slice(0, 20);
            });
            console.log(sections);
            return;
        }

        const links = mainWrapperData.links;
        const mainWrapperHTML = mainWrapperData.mainWrapperHTML;

        // ========================================
        // Save all HTML from #main-wrapper to file
        // ========================================
        if (mainWrapperHTML) {
            const htmlFilePath = path.join(outputDir, 'main-wrapper.html');
            fs.writeFileSync(htmlFilePath, mainWrapperHTML);
            console.log(`✅ Saved #main-wrapper HTML to: ${htmlFilePath}\n`);
        } else {
            console.log(`⚠️  Could not find #main-wrapper element\n`);
        }

        console.log(`✅ Found ${links.length} links in #main-wrapper:\n`);

        links.forEach((link, i) => {
            console.log(`  ${i + 1}. ${link.text}`);
            console.log(`     ${link.href}\n`);
        });

        if (links.length === 0) {
            console.log('⚠️  No links found in #main-wrapper');
            return;
        }

        // ========================================
        // STEP 3: Create index markdown file
        // ========================================
        let indexMd = `# Main Wrapper Links Crawl\n\n`;
        indexMd += `**Date:** ${new Date().toISOString()}\n\n`;
        indexMd += `**Source:** https://www.ideabrowser.com/\n\n`;
        indexMd += `**Total Links Found:** ${links.length}\n\n`;
        indexMd += `---\n\n`;
        indexMd += `## Links\n\n`;

        // ========================================
        // STEP 4: Visit each link and create MD file
        // ========================================
        const results = [];

        for (let i = 0; i < links.length; i++) {
            const link = links[i];
            const linkNum = i + 1;
            const safeFilename = link.text
                .replace(/[^a-z0-9]/gi, '-')
                .replace(/-+/g, '-')
                .toLowerCase()
                .substring(0, 50);

            console.log(`\n${'='.repeat(60)}`);
            console.log(`📄 Processing ${linkNum}/${links.length}: ${link.text}`);
            console.log(`${'='.repeat(60)}`);

            try {
                // Navigate to the link
                console.log(`  🌐 Navigating to: ${link.href}`);
                await page.goto(link.href, {
                    waitUntil: 'networkidle2',
                    timeout: 30000
                });

                // Wait for content to load
                await new Promise(resolve => setTimeout(resolve, 2000));

                // Scroll to reveal all content
                console.log(`  📜 Scrolling to reveal content...`);
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
                                window.scrollTo(0, 0); // Scroll back to top
                                resolve();
                            }
                        }, 50);
                    });
                });

                await new Promise(resolve => setTimeout(resolve, 1000));

                // Take screenshot
                const screenshotFilename = `${String(linkNum).padStart(2, '0')}-${safeFilename}.png`;
                const screenshotPath = path.join(imagesDir, screenshotFilename);

                console.log(`  📸 Taking screenshot...`);
                await page.screenshot({
                    path: screenshotPath,
                    fullPage: true
                });

                // Extract page content
                console.log(`  📝 Extracting content...`);
                const pageData = await page.evaluate(() => {
                    // Remove script, style, and nav elements for cleaner content
                    const clone = document.body.cloneNode(true);
                    clone.querySelectorAll('script, style, nav, header, footer, .nav, .menu, .sidebar').forEach(el => el.remove());

                    return {
                        title: document.title,
                        url: window.location.href,
                        h1: document.querySelector('h1')?.textContent.trim() || '',
                        metaDescription: document.querySelector('meta[name="description"]')?.content || '',
                        bodyHTML: clone.innerHTML,
                        mainContent: document.querySelector('main, article, .content, .main, #content')?.innerHTML || clone.innerHTML,
                        headings: Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6'))
                            .map(h => ({
                                level: h.tagName,
                                text: h.textContent.trim()
                            })),
                        paragraphs: Array.from(document.querySelectorAll('p'))
                            .map(p => p.textContent.trim())
                            .filter(text => text.length > 20)
                    };
                });

                // Convert HTML to Markdown
                console.log(`  🔄 Converting to Markdown...`);
                const contentMarkdown = turndownService.turndown(pageData.mainContent);

                // Create markdown file
                const mdFilename = `${String(linkNum).padStart(2, '0')}-${safeFilename}.md`;
                const mdPath = path.join(outputDir, mdFilename);

                let markdown = `# ${pageData.title || link.text}\n\n`;
                markdown += `**URL:** ${pageData.url}\n\n`;
                markdown += `**Source Link:** ${link.text}\n\n`;

                if (pageData.metaDescription) {
                    markdown += `**Description:** ${pageData.metaDescription}\n\n`;
                }

                markdown += `---\n\n`;

                // Add screenshot
                markdown += `## Screenshot\n\n`;
                markdown += `![${link.text}](images/${screenshotFilename})\n\n`;
                markdown += `---\n\n`;

                // Add main heading if available
                if (pageData.h1) {
                    markdown += `## ${pageData.h1}\n\n`;
                }

                // Add content
                markdown += `## Content\n\n`;
                markdown += contentMarkdown;
                markdown += `\n\n---\n\n`;

                // Add headings outline
                if (pageData.headings.length > 0) {
                    markdown += `## Page Structure\n\n`;
                    pageData.headings.forEach(heading => {
                        const indent = '  '.repeat(parseInt(heading.level.charAt(1)) - 1);
                        markdown += `${indent}- ${heading.text}\n`;
                    });
                    markdown += `\n`;
                }

                // Save markdown file
                fs.writeFileSync(mdPath, markdown);
                console.log(`  ✅ Saved: ${mdFilename}`);

                // Add to index
                indexMd += `### ${linkNum}. [${link.text}](${mdFilename})\n\n`;
                indexMd += `- **URL:** ${pageData.url}\n`;
                indexMd += `- **Title:** ${pageData.title}\n`;
                if (pageData.metaDescription) {
                    indexMd += `- **Description:** ${pageData.metaDescription}\n`;
                }
                indexMd += `\n![Preview](images/${screenshotFilename})\n\n`;
                indexMd += `---\n\n`;

                results.push({
                    success: true,
                    link: link.text,
                    url: pageData.url,
                    filename: mdFilename
                });

            } catch (error) {
                console.error(`  ❌ Error processing link: ${error.message}`);

                // Add error to index
                indexMd += `### ${linkNum}. ${link.text} ⚠️ ERROR\n\n`;
                indexMd += `- **URL:** ${link.href}\n`;
                indexMd += `- **Error:** ${error.message}\n\n`;
                indexMd += `---\n\n`;

                results.push({
                    success: false,
                    link: link.text,
                    url: link.href,
                    error: error.message
                });
            }
        }

        // ========================================
        // STEP 5: Save index file
        // ========================================
        const indexPath = path.join(outputDir, 'INDEX.md');
        fs.writeFileSync(indexPath, indexMd);
        console.log(`\n✅ Index file saved: ${indexPath}`);

        // Save results JSON
        const resultsPath = path.join(outputDir, 'results.json');
        fs.writeFileSync(resultsPath, JSON.stringify(results, null, 2));

        // ========================================
        // Summary
        // ========================================
        console.log('\n' + '='.repeat(60));
        console.log('✨ CRAWL COMPLETE!');
        console.log('='.repeat(60));
        console.log(`\n📁 Output directory: ${outputDir}\n`);
        console.log(`📊 Results:`);
        console.log(`   Total links: ${links.length}`);
        console.log(`   Successful: ${results.filter(r => r.success).length}`);
        console.log(`   Failed: ${results.filter(r => !r.success).length}`);
        console.log(`\n📄 Files created:`);
        console.log(`   • INDEX.md - Main index with all links`);
        console.log(`   • ${results.filter(r => r.success).length} individual markdown files`);
        console.log(`   • ${results.filter(r => r.success).length} screenshots in images/`);
        console.log(`   • results.json - Processing results\n`);
        console.log('='.repeat(60) + '\n');

    } catch (error) {
        console.error('❌ Fatal error:', error.message);
        console.error(error.stack);
    } finally {
        if (browser) {
            await browser.close();
        }
    }
})();
