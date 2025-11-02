# JavSP-Style Title Scraping Integration

This project now includes core scraping functionality inspired by [JavSP](https://github.com/Yuukiy/JavSP) to automatically fetch real video titles.

## How It Works

Similar to JavSP's approach:

1. **Extract Video Code** - Normalizes codes like `EBVR-018`, `HHKL-066`
2. **Multi-Source Scraping** - Tries multiple metadata sites in order:
   - DMM (official, most reliable)
   - JavDB (popular community site)
   - JavLibrary (alternative source)
3. **HTML Parsing** - Uses BeautifulSoup (like JavSP) for robust parsing
4. **Fallback System** - If scraping fails, uses placeholder

## Usage

### Automatic (When Viewing Artists)

The UI automatically detects missing titles. You can enable real scraping:

```javascript
// In browser console, enable real scraping
// Then browse an artist - it will scrape titles automatically
```

Or modify `static/app.js` to enable by default:
```javascript
await autoUpdateMissingTitles(artistName, true); // true = scrape real titles
```

### Manual API Calls

**Scrape Real Titles for Specific Artist:**
```bash
POST /api/titles/update
{
  "artist_name": "三原穗香",
  "scrape_real_titles": true,
  "placeholder": "[Title Missing]"
}
```

**Scrape Specific Codes:**
```bash
POST /api/titles/{artist_name}/scrape
{
  "codes": ["EBVR-018", "HHKL-066"]
}
```

### Standalone Script

```bash
cd /volume1/docker/nas-player
python3 -c "
from jav_scraper import JavMetadataScraper
scraper = JavMetadataScraper()
title = scraper.scrape_multiple_sources('EBVR-018')
print(title)
"
```

## Scraper Architecture (JavSP-Inspired)

### Code Pattern Recognition

Similar to JavSP's code extraction:
```python
extract_code_pattern("EBVR-018")
# Returns: {"series": "EBVR", "number": "018", "suffix": "", "full_code": "EBVR-018"}
```

### Multi-Source Aggregation

Like JavSP, tries sources in order until success:
1. **DMM** - Official source (most reliable)
2. **JavDB** - Community database
3. **JavLibrary** - Alternative source

### Rate Limiting

Respectful scraping with delays (like JavSP):
- 1.5 seconds between codes
- 0.5 seconds between sources
- Retries with exponential backoff

## Comparison with JavSP

| Feature | JavSP | This Implementation |
|---------|-------|-------------------|
| Multi-site scraping | ✅ Yes | ✅ Yes (3 sites) |
| BeautifulSoup parsing | ✅ Yes | ✅ Yes |
| Code pattern extraction | ✅ Yes | ✅ Yes |
| Rate limiting | ✅ Yes | ✅ Yes |
| Batch processing | ✅ Yes | ✅ Yes |
| NFO file generation | ✅ Yes | ❌ No (not needed) |
| Full metadata (actors, etc.) | ✅ Yes | ❌ Title only |
| Translation | ✅ Yes | ❌ No |

## Configuration

### Adjust Scraping Settings

Edit `jav_scraper.py`:
```python
class JavMetadataScraper:
    def __init__(self, timeout: int = 10):  # Request timeout
        self.timeout = timeout
        # ...
```

### Change Scraping Order

Modify source priority in `scrape_multiple_sources()`:
```python
sources = [
    ('DMM', self.scrape_dmm),           # Most reliable
    ('JavDB', self.scrape_javdb),       # Popular
    ('JavLibrary', self.scrape_javlibrary),  # Fallback
]
```

### Rate Limiting

Adjust delays in `batch_scrape()`:
```python
scraped_titles = scraper.batch_scrape(codes, delay=1.5)  # Seconds between requests
```

## Example Workflow

1. **Add new video folder:** `EBVR-020/`
2. **Browse artist in UI:**
   - System detects missing title
   - Option 1: Auto-adds placeholder
   - Option 2: Scrapes real title (if enabled)
3. **Title appears in UI** - Real title or placeholder
4. **You can manually verify/edit** in `title.json`

## Extending the Scraper

### Add New Sources

Follow the pattern in `jav_scraper.py`:

```python
def scrape_new_site(self, code: str) -> Optional[str]:
    try:
        search_url = f"https://newsite.com/search?q={quote(code)}"
        response = self.session.get(search_url, timeout=self.timeout)
        soup = BeautifulSoup(response.text, 'html.parser')
        
        # Parse title
        title_elem = soup.select_one('your-selector')
        if title_elem:
            return title_elem.get_text(strip=True)
    except:
        pass
    return None

# Add to sources list
sources = [
    ...
    ('NewSite', self.scrape_new_site),
]
```

## Troubleshooting

### Scraper Not Finding Titles

1. **Check code format** - Must match pattern (e.g., `ABC-123`)
2. **Check network** - Sites may be blocked or rate-limited
3. **Check logs** - See console output for errors
4. **Try manually** - Test with single code:
   ```python
   from jav_scraper import JavMetadataScraper
   scraper = JavMetadataScraper()
   title = scraper.scrape_multiple_sources('YOUR-CODE')
   ```

### Rate Limiting Issues

If you get blocked:
- Increase delays in `batch_scrape()`
- Use fewer sources
- Scrape in smaller batches

### Sites Changed Structure

If sites update their HTML:
- Update selectors in scraper functions
- Use BeautifulSoup's flexible selectors
- Add fallback patterns

## Security & Ethics

⚠️ **Important:**
- Respect website terms of service
- Use reasonable rate limiting
- Don't overload servers
- This is for personal use only

## Future Enhancements

Possible improvements (like JavSP):
- Add more metadata (actors, release date, etc.)
- Cache scraped results
- Support translation
- Parse NFO files from JavSP output
- Add more scraping sources

---

**Based on:** [JavSP by Yuukiy](https://github.com/Yuukiy/JavSP) - GPL-3.0 License

