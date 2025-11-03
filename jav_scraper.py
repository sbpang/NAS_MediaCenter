#!/usr/bin/env python3
"""
JavSP-style Scraper - Fetches video titles from multiple metadata sources
Inspired by JavSP (https://github.com/Yuukiy/JavSP)
"""
import re
import time
import requests
from typing import Optional, Dict, List, Tuple
from urllib.parse import quote, urljoin
import json
from datetime import datetime

try:
    from bs4 import BeautifulSoup
    BEAUTIFULSOUP_AVAILABLE = True
except ImportError:
    BEAUTIFULSOUP_AVAILABLE = False
    print("Warning: beautifulsoup4 not installed. HTML parsing will be limited.")

class JavMetadataScraper:
    """
    Scraper that fetches video metadata from multiple sources
    Similar to JavSP's multi-site scraping approach
    """
    
    def __init__(self, timeout: int = 10):
        self.timeout = timeout
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Accept-Charset': 'UTF-8',
        })
    
    def _get_text(self, response):
        """Get properly decoded text from response"""
        # Try to detect encoding from response
        if response.encoding is None or response.encoding == 'ISO-8859-1':
            # Use apparent_encoding if encoding is not properly set
            response.encoding = response.apparent_encoding or 'utf-8'
        
        # Ensure UTF-8 encoding
        if response.encoding.lower() not in ['utf-8', 'utf8']:
            try:
                # Try to decode as UTF-8 first
                text = response.content.decode('utf-8')
            except UnicodeDecodeError:
                # Fall back to detected encoding
                text = response.text
        else:
            text = response.text
        
        return text
    
    def normalize_code(self, code: str) -> str:
        """Normalize video code format (uppercase, remove spaces)"""
        return code.strip().upper().replace(' ', '')
    
    def extract_code_pattern(self, code: str) -> Optional[Dict[str, str]]:
        """
        Extract code pattern similar to JavSP's code recognition
        Returns dict with 'series' and 'number' if pattern matches
        """
        code = self.normalize_code(code)
        
        # Common patterns: ABC-123, SSIS-123, EBVR-018, etc.
        pattern = r'^([A-Z]+)-?(\d+)([A-Z]*)$'
        match = re.match(pattern, code)
        
        if match:
            series = match.group(1)
            number = match.group(2)
            suffix = match.group(3) if match.lastindex >= 3 else ''
            return {
                'series': series,
                'number': number,
                'suffix': suffix,
                'full_code': code
            }
        
        return None
    
    def extract_date(self, date_str: str) -> Optional[Dict[str, int]]:
        """
        Extract full date (year, month, day) from date string (various formats)
        Returns dict with 'year', 'month', 'day' or None
        """
        if not date_str:
            return None
        
        # Try common date patterns with full date
        patterns = [
            # Full date patterns: YYYY-MM-DD, YYYY/MM/DD, YYYY.MM.DD
            (r'(\d{4})[-\/\.](\d{1,2})[-\/\.](\d{1,2})', ['year', 'month', 'day']),
            # Japanese format: YYYY年MM月DD日
            (r'(\d{4})年(\d{1,2})月(\d{1,2})日', ['year', 'month', 'day']),
            # Japanese format: YYYY年MM月
            (r'(\d{4})年(\d{1,2})月', ['year', 'month']),
            # Year only patterns
            (r'(\d{4})年', ['year']),
            (r'Release[:\s]+(\d{4})', ['year']),
            (r'発売日[:\s]+(\d{4})', ['year']),
            (r'(\d{4})/', ['year']),
            (r'(\d{4})\.', ['year']),
        ]
        
        for pattern, fields in patterns:
            match = re.search(pattern, date_str)
            if match:
                result = {}
                for i, field in enumerate(fields, 1):
                    value = int(match.group(i))
                    result[field] = value
                
                # Sanity check: valid year range (1990-2030)
                year = result.get('year')
                if year and 1990 <= year <= 2030:
                    # Default month and day to 1 if not present
                    if 'month' not in result:
                        result['month'] = 1
                    if 'day' not in result:
                        result['day'] = 1
                    
                    # Validate month and day
                    if 1 <= result['month'] <= 12 and 1 <= result['day'] <= 31:
                        return result
        
        return None
    
    def scrape_javdb(self, code: str) -> Optional[Dict[str, any]]:
        """
        Scrape from javdb.com (popular metadata site)
        Uses BeautifulSoup like JavSP for robust HTML parsing
        """
        try:
            code_info = self.extract_code_pattern(code)
            if not code_info:
                return None
            
            # JavDB search URL
            search_url = f"https://javdb.com/search?q={quote(code)}"
            
            response = self.session.get(search_url, timeout=self.timeout)
            if response.status_code != 200:
                return None
            
            response_text = self._get_text(response)
            
            if not BEAUTIFULSOUP_AVAILABLE:
                # Fallback to regex if BeautifulSoup not available
                detail_match = re.search(r'href="(/v/\d+)"', response_text)
                if detail_match:
                    detail_url = urljoin('https://javdb.com', detail_match.group(1))
                    detail_response = self.session.get(detail_url, timeout=self.timeout)
                    if detail_response.status_code == 200:
                        detail_response_text = self._get_text(detail_response)
                        title_match = re.search(r'<strong[^>]*>([^<]+)</strong>', detail_response_text)
                        if title_match:
                            title = title_match.group(1).strip()
                            # Validate title before returning
                            if self._is_valid_title(title):
                                # Try to extract date from page
                                date_match = re.search(r'(\d{4}[-\/年]\d{1,2}[-\/月]\d{1,2})', detail_response_text)
                                date_info = None
                                if date_match:
                                    date_info = self.extract_date(date_match.group(1))
                                return {
                                    'title': title,
                                    'year': date_info.get('year') if date_info else None,
                                    'month': date_info.get('month') if date_info else None,
                                    'day': date_info.get('day') if date_info else None,
                                    'date': date_info
                                }
                return None
            
            soup = BeautifulSoup(response_text, 'html.parser')
            
            # Find first result link
            result_link = soup.find('a', href=re.compile(r'/v/\d+'))
            if result_link:
                detail_path = result_link.get('href')
                if detail_path:
                    detail_url = urljoin('https://javdb.com', detail_path)
                    detail_response = self.session.get(detail_url, timeout=self.timeout)
                    if detail_response.status_code == 200:
                        detail_response_text = self._get_text(detail_response)
                        detail_soup = BeautifulSoup(detail_response_text, 'html.parser')
                        
                        # Try multiple selectors (JavSP-style multiple attempts)
                        title_selectors = [
                            'strong.video-title',
                            'h2',
                            'div.video-title',
                            'strong'
                        ]
                        
                        title = None
                        for selector in title_selectors:
                            title_elem = detail_soup.select_one(selector)
                            if title_elem:
                                title = title_elem.get_text(strip=True)
                                if title and self._is_valid_title(title):
                                    break
                        
                        if title and self._is_valid_title(title):
                            # Extract year from detail page
                            year = None
                            # Look for date fields (JavDB format)
                            # Note: Using text search instead of :contains (deprecated)
                            date_selectors = [
                                'span.date',
                                'div.date',
                                'div.info-item',
                                '[class*="date"]'
                            ]
                            
                            # Try to find date text
                            date_text = None
                            for selector in date_selectors:
                                try:
                                    date_elems = detail_soup.select(selector)
                                    for date_elem in date_elems:
                                        elem_text = date_elem.get_text(strip=True)
                                        # Check if element contains date-related keywords
                                        if any(keyword in elem_text for keyword in ['日期', '發行', 'Release', '年', '月', '日']):
                                            date_text = elem_text
                                            break
                                    if date_text:
                                        break
                                except:
                                    continue
                            
                            # If not found by selector, search in all text
                            if not date_text:
                                page_text = detail_soup.get_text()
                                # Ensure proper encoding
                                if isinstance(page_text, bytes):
                                    page_text = page_text.decode('utf-8')
                                date_match = re.search(r'(\d{4}[-\/年]\d{1,2}[-\/月]\d{1,2})', page_text)
                                if date_match:
                                    date_text = date_match.group(1)
                            
                            if date_text:
                                date_info = self.extract_date(date_text)
                                return {
                                    'title': title,
                                    'year': date_info.get('year') if date_info else None,
                                    'month': date_info.get('month') if date_info else None,
                                    'day': date_info.get('day') if date_info else None,
                                    'date': date_info
                                }
                            
                            return {'title': title, 'year': None, 'month': None, 'day': None, 'date': None}
                
                # Fallback: get title from search result directly
                title_elem = result_link.find_parent().find_next(['div', 'span', 'strong'])
                if title_elem:
                    title = title_elem.get_text(strip=True)
                    if title and self._is_valid_title(title):
                        return {'title': title, 'year': None, 'month': None, 'day': None, 'date': None}
        
        except Exception as e:
            print(f"Error scraping JavDB for {code}: {e}")
        
        return None
    
    def scrape_javlibrary(self, code: str) -> Optional[Dict[str, any]]:
        """Scrape from javlibrary.com (another popular source) - using BeautifulSoup like JavSP"""
        try:
            code_info = self.extract_code_pattern(code)
            if not code_info:
                return None
            
            # JavLibrary search
            search_url = f"https://www.javlibrary.com/en/vl_searchbyid.php?keyword={quote(code)}"
            
            response = self.session.get(search_url, timeout=self.timeout)
            if response.status_code != 200:
                return None
            
            response_text = self._get_text(response)
            
            if not BEAUTIFULSOUP_AVAILABLE:
                # Fallback to regex
                title_match = re.search(r'<div[^>]*class="video"[^>]*>.*?<a[^>]+>([^<]+)</a>', response_text, re.DOTALL)
                if title_match:
                    title = title_match.group(1).strip()
                    # Try to extract date
                    date_match = re.search(r'(\d{4}[-\/年]\d{1,2}[-\/月]\d{1,2})', response_text)
                    if not date_match:
                        date_match = re.search(r'(\d{4})', response_text)
                    date_info = None
                    if date_match:
                        date_info = self.extract_date(date_match.group(1))
                    return {
                        'title': title,
                        'year': date_info.get('year') if date_info else None,
                        'month': date_info.get('month') if date_info else None,
                        'day': date_info.get('day') if date_info else None,
                        'date': date_info
                    }
                return None
            
            soup = BeautifulSoup(response_text, 'html.parser')
            
            # Find video entries
            video_divs = soup.find_all('div', class_=re.compile(r'video', re.I))
            for video_div in video_divs[:3]:  # Check first 3 results
                title_link = video_div.find('a', href=re.compile(r'/vl\d+'))
                if title_link:
                    title = title_link.get_text(strip=True)
                    if title and self._is_valid_title(title):
                        # Try to get date from video div
                        date_info = None
                        date_elem = video_div.find('div', class_=re.compile(r'date|year', re.I))
                        if date_elem:
                            date_info = self.extract_date(date_elem.get_text(strip=True))
                        return {
                            'title': title,
                            'year': date_info.get('year') if date_info else None,
                            'month': date_info.get('month') if date_info else None,
                            'day': date_info.get('day') if date_info else None,
                            'date': date_info
                        }
                
                # Alternative: look for title attribute
                if title_link and title_link.get('title'):
                    title = title_link.get('title').strip()
                    if title and self._is_valid_title(title):
                        return {'title': title, 'year': None, 'month': None, 'day': None, 'date': None}
        
        except Exception as e:
            print(f"Error scraping JavLibrary for {code}: {e}")
        
        return None
    
    def scrape_dmm(self, code: str) -> Optional[Dict[str, any]]:
        """Scrape from DMM - DISABLED: DMM blocks scrapers and returns error pages"""
        # DMM actively blocks scrapers and returns "ご利用可能なサービス一覧Available contents" error page
        # This source is disabled to prevent false results
        return None
    
    def _is_valid_title(self, title: str) -> bool:
        """Check if title is valid (not an error message or blocked page)"""
        if not title or len(title) < 5:
            return False
        
        # Common error/blocked page messages to filter out
        invalid_patterns = [
            'ご利用可能なサービス一覧',
            'Available contents',
            'ご利用可能なサービス一覧Available contents',
            'Access Denied',
            'Forbidden',
            'Blocked',
            'Service Unavailable',
            'Error',
            'Not Found',
            '404',
            '403',
        ]
        
        title_lower = title.lower()
        for pattern in invalid_patterns:
            if pattern.lower() in title_lower:
                return False
        
        return True
    
    def scrape_multiple_sources(self, code: str, max_retries: int = 3) -> Optional[Dict[str, any]]:
        """
        Try multiple sources, similar to JavSP's aggregation approach
        Returns dict with 'title' and 'year' from first successful scrape
        """
        # DMM removed - it blocks scrapers and returns error pages
        sources = [
            ('JavDB', self.scrape_javdb),
            ('JavLibrary', self.scrape_javlibrary),
        ]
        
        for source_name, scraper_func in sources:
            for attempt in range(max_retries):
                try:
                    result = scraper_func(code)
                    if result and result.get('title'):
                        # Validate title is not an error message
                        if self._is_valid_title(result['title']):
                            title_preview = result['title'][:50] + '...' if len(result['title']) > 50 else result['title']
                            date_info = ""
                            if result.get('year'):
                                if result.get('month') and result.get('day'):
                                    date_info = f", Date: {result['year']}-{result['month']:02d}-{result['day']:02d}"
                                elif result.get('month'):
                                    date_info = f", Date: {result['year']}-{result['month']:02d}"
                                else:
                                    date_info = f", Year: {result['year']}"
                            print(f"Found metadata for {code} from {source_name}: {title_preview}{date_info}")
                            return result
                        else:
                            print(f"Invalid title from {source_name} for {code}: {result['title']} (skipping)")
                    
                    # Rate limiting - be respectful
                    if attempt < max_retries - 1:
                        time.sleep(1)
                
                except Exception as e:
                    print(f"Error scraping {source_name} for {code} (attempt {attempt+1}): {e}")
                    if attempt < max_retries - 1:
                        time.sleep(2)
            
            # Small delay between sources
            time.sleep(0.5)
        
        return None
    
    def batch_scrape(self, codes: List[str], delay: float = 1.0) -> Dict[str, Optional[Dict[str, any]]]:
        """
        Scrape multiple codes with rate limiting
        Returns dict mapping code -> {'title': str, 'year': int, 'month': int, 'day': int, 'date': dict}
        """
        results = {}
        
        for i, code in enumerate(codes):
            print(f"Scraping {code} ({i+1}/{len(codes)})...")
            metadata = self.scrape_multiple_sources(code)
            results[code] = metadata
            
            # Rate limiting between requests
            if i < len(codes) - 1:
                time.sleep(delay)
        
        return results

if __name__ == '__main__':
    # Example usage
    import sys
    
    scraper = JavMetadataScraper()
    
    if len(sys.argv) > 1:
        code = sys.argv[1]
        print(f"Scraping metadata for code: {code}")
        result = scraper.scrape_multiple_sources(code)
        if result:
            print(f"Title: {result.get('title')}")
            date_info = result.get('date')
            if date_info:
                if date_info.get('day'):
                    print(f"Date: {date_info['year']}-{date_info['month']:02d}-{date_info['day']:02d}")
                elif date_info.get('month'):
                    print(f"Date: {date_info['year']}-{date_info['month']:02d}")
                else:
                    print(f"Year: {date_info['year']}")
            else:
                print("Date: Not found")
        else:
            print("No metadata found")
    else:
        # Test with example codes
        test_codes = ['EBVR-018', 'HHKL-066']
        for code in test_codes:
            print(f"\nTesting {code}:")
            result = scraper.scrape_multiple_sources(code)
            if result:
                print(f"Title: {result.get('title')}")
                date_info = result.get('date')
                if date_info:
                    if date_info.get('day'):
                        print(f"Date: {date_info['year']}-{date_info['month']:02d}-{date_info['day']:02d}")
                    elif date_info.get('month'):
                        print(f"Date: {date_info['year']}-{date_info['month']:02d}")
                    else:
                        print(f"Year: {date_info['year']}")
                else:
                    print("Date: Not found")
            else:
                print("No result")

