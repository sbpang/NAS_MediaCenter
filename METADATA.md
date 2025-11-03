# Metadata Management & Title Scraping

This document covers the automatic title detection, scraping, and update system for the NAS Media Center.

## Overview

The system automatically detects videos missing titles in `title.json` and can update them with:
- **Placeholders** - Quick markers for videos needing titles
- **Real Titles** - Scraped from multiple metadata sources (JavSP-style)

## How It Works

Similar to [JavSP](https://github.com/Yuukiy/JavSP), the system:

1. **Scans** all video folders for each artist
2. **Compares** with existing `title.json` entries
3. **Detects** missing titles
4. **Auto-updates** `title.json` with placeholders or scraped real titles

## Automatic Updates

The UI **automatically checks and updates** missing titles when you view an artist's videos:
- When you click an artist, it scans for missing titles
- If found, it automatically scrapes real titles (if enabled) or adds placeholders
- Videos are reloaded to show the updated titles

## Title Scraping (JavSP-Style)

### How It Works

The scraper uses a multi-source approach similar to JavSP:

1. **Extract Video Code** - Normalizes codes like `EBVR-018`, `HHKL-066`
2. **Multi-Source Scraping** - Tries multiple metadata sites in order:
   - **DMM** (official, most reliable)
   - **JavDB** (popular community site)
   - **JavLibrary** (alternative source)
3. **HTML Parsing** - Uses BeautifulSoup for robust parsing
4. **Fallback System** - If scraping fails, uses placeholder
5. **Date Extraction** - Extracts release dates (year, month, day) when available

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

Respectful scraping with delays:
- 1.5 seconds between codes
- 0.5 seconds between sources
- Retries with exponential backoff

## Usage

### Automatic (When Viewing Artists)

The UI automatically detects missing titles. You can enable real scraping:

**In `static/app.js`:**
```javascript
await autoUpdateMissingTitles(artistName, true); // true = scrape real titles
```

By default, real scraping is enabled when viewing an artist.

### Manual API Calls

#### Check Missing Titles

```bash
# Check all artists
GET /api/titles/check

# Response:
{
  "status": "success",
  "artists_checked": 5,
  "total_missing": 12,
  "details": {
    "Artist1": {
      "missing_count": 3,
      "missing_codes": ["CODE1", "CODE2", "CODE3"],
      "total_videos": 10,
      "titled_videos": 7
    }
  }
}

# Check specific artist
GET /api/titles/{artist_name}/missing
```

#### Update Missing Titles

```bash
# Auto-update all missing titles with placeholder
POST /api/titles/update
Body: {
  "placeholder": "[Title Missing - Update Needed]"
}

# Update specific artist with placeholder
POST /api/titles/update
Body: {
  "artist_name": "Artist Name",
  "placeholder": "[Title Missing - Update Needed]"
}

# Scrape real titles for specific artist
POST /api/titles/update
Body: {
  "artist_name": "Artist Name",
  "scrape_real_titles": true,
  "placeholder": "[Title Missing]"  # Fallback for failed scrapes
}
```

#### Scrape Specific Codes

```bash
POST /api/titles/{artist_name}/scrape
Body: {
  "codes": ["EBVR-018", "HHKL-066"]
}
```

### From Browser Console

```javascript
// Check all missing titles
fetch('/api/titles/check').then(r => r.json()).then(console.log)

// Update all missing with placeholder
fetch('/api/titles/update', {
  method: 'POST',
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({placeholder: '[Needs Title]'})
}).then(r => r.json()).then(console.log)

// Scrape real titles for an artist
fetch('/api/titles/update', {
  method: 'POST',
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({
    artist_name: 'Artist Name',
    scrape_real_titles: true
  })
}).then(r => r.json()).then(console.log)
```

### From Command Line (on NAS)

```bash
# Run the title updater script
cd /volume1/docker/nas-player
python3 title_updater.py /volume1/Video_Server

# Or use curl
curl http://localhost:1699/api/titles/check
```

### Standalone Scraper

```bash
cd /volume1/docker/nas-player
python3 -c "
from jav_scraper import JavMetadataScraper
scraper = JavMetadataScraper()
result = scraper.scrape_multiple_sources('EBVR-018')
if result:
    print(f\"Title: {result.get('title')}\")
    if result.get('date'):
        print(f\"Date: {result['date']}\")
"
```

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

Adjust delays in `title_updater.py`:
```python
scraped_metadata = scraper.batch_scrape(codes, delay=1.5)  # Seconds between requests
```

### Change Placeholder Text

Edit in `static/app.js`:
```javascript
placeholder: '[Title Missing - Update Needed]'
```

Or via API:
```javascript
fetch('/api/titles/update', {
  method: 'POST',
  body: JSON.stringify({
    placeholder: 'Your Custom Placeholder'
  })
})
```

### Disable Auto-Update

Comment out in `static/app.js`:
```javascript
// await autoUpdateMissingTitles(artistName);
```

## File Structure

After auto-update, `title.json` will look like:

```json
{
  "Artist Name": {
    "EXISTING_CODE": {
      "title": "Existing Title",
      "year": 2024,
      "month": 1,
      "day": 15,
      "date": {"year": 2024, "month": 1, "day": 15}
    },
    "NEW_CODE_1": {
      "title": "Scraped Title",
      "year": 2024,
      "month": 2,
      "day": null,
      "date": {"year": 2024, "month": 2}
    },
    "NEW_CODE_2": {
      "title": "[Title Missing - Update Needed]",
      "year": null,
      "month": null,
      "day": null,
      "date": null
    }
  }
}
```

The system supports both old format (code -> title string) and new format (code -> dict with title and date info).

## Comparison with JavSP

| Feature | JavSP | This Implementation |
|---------|-------|-------------------|
| Multi-site scraping | ✅ Yes | ✅ Yes (3 sites) |
| BeautifulSoup parsing | ✅ Yes | ✅ Yes |
| Code pattern extraction | ✅ Yes | ✅ Yes |
| Rate limiting | ✅ Yes | ✅ Yes |
| Batch processing | ✅ Yes | ✅ Yes |
| Date extraction | ✅ Yes | ✅ Yes |
| NFO file generation | ✅ Yes | ❌ No (not needed) |
| Full metadata (actors, etc.) | ✅ Yes | ❌ Title only |
| Translation | ✅ Yes | ❌ No |

## Extending the Scraper

### Add New Sources

Follow the pattern in `jav_scraper.py`:

```python
def scrape_new_site(self, code: str) -> Optional[Dict[str, any]]:
    try:
        search_url = f"https://newsite.com/search?q={quote(code)}"
        response = self.session.get(search_url, timeout=self.timeout)
        soup = BeautifulSoup(response.text, 'html.parser')
        
        # Parse title
        title_elem = soup.select_one('your-selector')
        if title_elem:
            title = title_elem.get_text(strip=True)
            # Extract date if available
            date_info = self.extract_date(date_text)
            return {
                'title': title,
                'year': date_info.get('year') if date_info else None,
                'month': date_info.get('month') if date_info else None,
                'day': date_info.get('day') if date_info else None,
                'date': date_info
            }
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
   result = scraper.scrape_multiple_sources('YOUR-CODE')
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

### Auto-Update Not Working

1. Check browser console for errors
2. Verify API endpoints are accessible
3. Check file permissions on `title.json`
4. Ensure video code folders match expected structure

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
- Batch update from external metadata sources
- Auto-translate titles

## Benefits

✅ **No manual work** - New videos automatically get entries  
✅ **Never miss titles** - Always know which videos need titles  
✅ **Easy to update** - Placeholders mark what needs updating  
✅ **JavSP compatible** - Can integrate with JavSP's scraping  
✅ **Date support** - Automatically extracts and stores release dates  

---

**Based on:** [JavSP by Yuukiy](https://github.com/Yuukiy/JavSP) - GPL-3.0 License

