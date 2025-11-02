# Auto Title Update System

This system automatically detects videos missing titles in `title.json` and can update them automatically.

## How It Works

Similar to [JavSP](https://github.com/Yuukiy/JavSP), the system:
1. **Scans** all video folders for each artist
2. **Compares** with existing `title.json` entries
3. **Detects** missing titles
4. **Auto-updates** `title.json` with placeholders (or you can fetch real titles)

## Automatic Updates

The UI **automatically checks and updates** missing titles when you view an artist's videos:
- When you click an artist, it scans for missing titles
- If found, it automatically adds placeholders to `title.json`
- Videos are reloaded to show the updated titles

## Manual API Endpoints

### 1. Check Missing Titles

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

### 2. Update Missing Titles

```bash
# Auto-update all missing titles with placeholder
POST /api/titles/update
Body: {
  "placeholder": "[Title Missing - Update Needed]"
}

# Update specific artist
POST /api/titles/update
Body: {
  "artist_name": "Artist Name",
  "placeholder": "[Title Missing - Update Needed]"
}
```

## Usage Examples

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
```

### From Command Line (on NAS)

```bash
# Run the title updater script
cd /volume1/docker/nas-player
python3 title_updater.py /volume1/Video_Server

# Or use curl
curl http://localhost:1699/api/titles/check
```

## Integration with JavSP

If you want to fetch **actual titles** instead of placeholders, you can:

1. **Use JavSP** to scrape titles first:
   ```bash
   # Run JavSP on your video library
   # It will create NFO files or metadata
   ```

2. **Extract from JavSP output**:
   - JavSP creates NFO files with titles
   - You can parse those and update `title.json`

3. **Manual entry**:
   - After auto-update creates placeholders
   - Edit `title.json` manually with real titles

## File Structure

After auto-update, `title.json` will look like:

```json
{
  "Artist Name": {
    "EXISTING_CODE": "Existing Title",
    "NEW_CODE_1": "[Title Missing - Update Needed]",
    "NEW_CODE_2": "[Title Missing - Update Needed]"
  }
}
```

You can then:
- Replace placeholders with real titles
- Or use JavSP to scrape actual metadata
- Or keep placeholders until you manually update

## Customization

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

## Benefits

✅ **No manual work** - New videos automatically get entries  
✅ **Never miss titles** - Always know which videos need titles  
✅ **Easy to update** - Placeholders mark what needs updating  
✅ **JavSP compatible** - Can integrate with JavSP's scraping  

## Future Enhancement

You could extend this to:
- Fetch titles from APIs automatically
- Integrate directly with JavSP's scraping
- Batch update from external metadata sources
- Auto-translate titles

