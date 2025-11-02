#!/usr/bin/env python3
"""
Auto Title Updater - Detects missing titles and updates title.json
Similar to JavSP's metadata detection, but simpler and integrated
"""
import json
import os
from pathlib import Path
from typing import Dict, List, Tuple

class TitleUpdater:
    def __init__(self, video_server_path: str):
        self.video_server_path = Path(video_server_path)
        self.artists_path = self.video_server_path / 'static' / 'artists'
    
    def load_title_mapping(self, artist_name: str) -> Dict[str, str]:
        """Load existing title mapping from title.json"""
        title_file = self.artists_path / artist_name / 'title.json'
        
        if not title_file.exists():
            return {}
        
        try:
            with open(title_file, 'r', encoding='utf-8') as f:
                data = json.load(f)
                if artist_name in data:
                    return data[artist_name]
                return data
        except (json.JSONDecodeError, KeyError, IOError):
            return {}
    
    def scan_videos(self, artist_name: str) -> List[str]:
        """Scan artist folder and return list of video codes"""
        artist_path = self.artists_path / artist_name
        if not artist_path.exists():
            return []
        
        video_codes = []
        media_extensions = ['.mp4', '.mkv', '.avi', '.mov', '.wav', '.mp3', '.flac', '.m4a', '.webm']
        
        for item in artist_path.iterdir():
            if item.is_dir() and item.name != '__pycache__':
                # Check if folder contains media files
                has_media = any(
                    file.suffix.lower() in media_extensions
                    for file in item.iterdir()
                    if file.is_file()
                )
                if has_media:
                    video_codes.append(item.name)
        
        return video_codes
    
    def find_missing_titles(self, artist_name: str) -> List[str]:
        """Find video codes that don't have titles in title.json"""
        existing_titles = self.load_title_mapping(artist_name)
        all_videos = self.scan_videos(artist_name)
        
        missing = [code for code in all_videos if code not in existing_titles]
        return missing
    
    def update_title_json(self, artist_name: str, updates: Dict[str, str], create_if_missing: bool = True) -> bool:
        """
        Update title.json with new entries
        updates: Dict mapping video_code -> title
        """
        title_file = self.artists_path / artist_name / 'title.json'
        
        # Load existing data
        if title_file.exists():
            try:
                with open(title_file, 'r', encoding='utf-8') as f:
                    data = json.load(f)
            except (json.JSONDecodeError, IOError):
                data = {}
        else:
            data = {}
        
        # Ensure nested structure: {"ArtistName": {"CODE": "Title"}}
        if artist_name not in data:
            data[artist_name] = {}
        
        # Update with new titles
        data[artist_name].update(updates)
        
        # Save back to file
        try:
            with open(title_file, 'w', encoding='utf-8') as f:
                json.dump(data, f, ensure_ascii=False, indent=4)
            return True
        except IOError as e:
            print(f"Error writing title.json: {e}")
            return False
    
    def auto_update_all_artists(self, placeholder_title: str = None) -> Dict[str, List[str]]:
        """
        Scan all artists and find missing titles
        If placeholder_title is provided, auto-add missing entries with placeholder
        Returns: Dict mapping artist_name -> list of missing codes
        """
        results = {}
        
        if not self.artists_path.exists():
            return results
        
        for artist_folder in self.artists_path.iterdir():
            if artist_folder.is_dir():
                artist_name = artist_folder.name
                missing = self.find_missing_titles(artist_name)
                
                if missing:
                    results[artist_name] = missing
                    
                    # Auto-update with placeholder if provided
                    if placeholder_title:
                        updates = {code: placeholder_title for code in missing}
                        self.update_title_json(artist_name, updates)
        
        return results
    
    def get_all_missing_summary(self) -> Dict[str, Dict]:
        """Get summary of all missing titles across all artists"""
        summary = {}
        
        if not self.artists_path.exists():
            return summary
        
        for artist_folder in self.artists_path.iterdir():
            if artist_folder.is_dir():
                artist_name = artist_folder.name
                missing = self.find_missing_titles(artist_name)
                existing_titles = self.load_title_mapping(artist_name)
                all_videos = self.scan_videos(artist_name)
                
                if missing:
                    summary[artist_name] = {
                        'missing_count': len(missing),
                        'missing_codes': missing,
                        'total_videos': len(all_videos),
                        'titled_videos': len(existing_titles)
                    }
        
        return summary

if __name__ == '__main__':
    # Example usage
    import sys
    
    video_path = sys.argv[1] if len(sys.argv) > 1 else '/volume1/Video_Server'
    updater = TitleUpdater(video_path)
    
    # Find all missing titles
    print("Scanning for missing titles...")
    summary = updater.get_all_missing_summary()
    
    if summary:
        print(f"\nFound missing titles in {len(summary)} artist(s):\n")
        for artist, info in summary.items():
            print(f"{artist}:")
            print(f"  Missing: {info['missing_count']} / Total: {info['total_videos']}")
            print(f"  Missing codes: {', '.join(info['missing_codes'][:5])}")
            if len(info['missing_codes']) > 5:
                print(f"  ... and {len(info['missing_codes']) - 5} more")
            print()
    else:
        print("No missing titles found!")

