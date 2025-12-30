# First Section Crawler

This script crawls all links found in the `#first-section` div on ideabrowser.com and generates:

- Individual Markdown files for each linked page
- Full-page screenshots for each page
- An INDEX.md file with links to all pages
- Extracted and formatted content in Markdown format

## Usage

```bash
node screenshot-first-section-crawler.js
```

## What It Does

1. **Navigates to ideabrowser.com** and finds the `#first-section` element
2. **Extracts all links** within that section
3. **Visits each link** and:
   - Takes a full-page screenshot
   - Extracts the page content (title, headings, paragraphs, etc.)
   - Converts HTML content to clean Markdown format
   - Saves everything to a markdown file
4. **Creates an INDEX.md** file with:
   - Links to all generated markdown files
   - Preview screenshots
   - Metadata for each page

## Output Structure

```
first-section-crawl/
└── YYYY-MM-DD/
    ├── INDEX.md                    # Main index file
    ├── results.json                # Processing results
    ├── 01-link-name.md            # Individual page markdown
    ├── 02-another-link.md
    ├── ...
    └── images/
        ├── 01-link-name.png       # Screenshots
        ├── 02-another-link.png
        └── ...
```

## Features

- ✅ Targets specific section (`#first-section`)
- ✅ Full-page screenshots
- ✅ HTML to Markdown conversion
- ✅ Extracts page structure (headings, paragraphs)
- ✅ Removes navigation, headers, footers for clean content
- ✅ Creates organized output with index
- ✅ Error handling for failed pages
- ✅ Progress logging

## Requirements

- Node.js
- puppeteer (installed)
- turndown (installed)

## Example Output

Each markdown file will contain:

```markdown
# Page Title

**URL:** https://example.com/page
**Source Link:** Original Link Text
**Description:** Meta description if available

---

## Screenshot

![Link Text](images/01-screenshot.png)

---

## Main Heading

## Content

[Converted markdown content from the page]

---

## Page Structure

- Heading 1
  - Heading 2
    - Heading 3
```

## Notes

- The script scrolls each page to reveal lazy-loaded content
- Screenshots are full-page captures
- Content is cleaned (scripts, styles, navigation removed)
- If `#first-section` is not found, the script will list available sections
