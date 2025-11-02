#!/usr/bin/env python3
"""
JavSP-style Scraper - Fetches video titles from multiple metadata sources
Inspired by JavSP (https://github.com/Yuukiy/JavSP)
"""
import re
import time
import requests
from typing import Optional, Dict, List
from urllib.parse import quote, urljoin
import json
from bs4 import BeautifulSoup

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
        })
    
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
    
    def scrape_javdb(self, code: str) -> Optional[str]:
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
            
            soup = BeautifulSoup(response.text, 'html.parser')
            
            # Find first result link
            result_link = soup.find('a', href=re.compile(r'/v/\d+'))
            if result_link:
                detail_path = result_link.get('href')
                if detail_path:
                    detail_url = urljoin('https://javdb.com', detail_path)
                    detail_response = self.session.get(detail_url, timeout=self.timeout)
                    if detail_response.status_code == 200:
                        detail_soup = BeautifulSoup(detail_response.text, 'html.parser')
                        
                        # Try multiple selectors (JavSP-style multiple attempts)
                        title_selectors = [
                            'strong.video-title',
                            'h2',
                            'div.video-title',
                            'strong'
                        ]
                        
                        for selector in title_selectors:
                            title_elem = detail_soup.select_one(selector)
                            if title_elem:
                                title = title_elem.get_text(strip=True)
                                if title and len(title) > 5:
                                    return title
                
                # Fallback: get title from search result directly
                title_elem = result_link.find_parent().find_next(['div', 'span', 'strong'])
                if title_elem:
                    title = title_elem.get_text(strip=True)
                    if title and len(title) > 5:
                        return title
        
        except Exception as e:
            print(f"Error scraping JavDB for {code}: {e}")
        
        return None
    
    def scrape_javlibrary(self, code: str) -> Optional[str]:
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
            
            soup = BeautifulSoup(response.text, 'html.parser')
            
            # Find video entries
            video_divs = soup.find_all('div', class_=re.compile(r'video', re.I))
            for video_div in video_divs[:3]:  # Check first 3 results
                title_link = video_div.find('a', href=re.compile(r'/vl\d+'))
                if title_link:
                    title = title_link.get_text(strip=True)
                    if title and len(title) > 5:
                        return title
                
                # Alternative: look for title attribute
                if title_link and title_link.get('title'):
                    title = title_link.get('title').strip()
                    if title and len(title) > 5:
                        return title
        
        except Exception as e:
            print(f"Error scraping JavLibrary for {code}: {e}")
        
        return None
    
    def scrape_dmm(self, code: str) -> Optional[str]:
        """Scrape from DMM (official site, more reliable) - using BeautifulSoup"""
        try:
            code_info = self.extract_code_pattern(code)
            if not code_info:
                return None
            
            # DMM search - try both English and Japanese versions
            search_urls = [
                f"https://www.dmm.co.jp/search/=/searchstr={quote(code)}",
                f"https://www.dmm.co.jp/mono/dvd/-/search/=/searchstr={quote(code)}",
            ]
            
            for search_url in search_urls:
                try:
                    response = self.session.get(search_url, timeout=self.timeout)
                    if response.status_code != 200:
                        continue
                    
                    soup = BeautifulSoup(response.text, 'html.parser')
                    
                    # Find product titles (multiple selectors like JavSP)
                    title_selectors = [
                        'p.tmb img[alt]',
                        'div.m-box dl dt a',
                        'h3 a',
                        'a[href*="/detail/"]',
                    ]
                    
                    for selector in title_selectors:
                        title_elem = soup.select_one(selector)
                        if title_elem:
                            title = title_elem.get('alt') or title_elem.get_text(strip=True)
                            if title and len(title) > 5:
                                return title
                    
                    # Fallback: regex search in HTML
                    title_match = re.search(r'alt="([^"]{10,})"', response.text)
                    if title_match:
                        title = title_match.group(1).strip()
                        if title:
                            return title
                except:
                    continue
        
        except Exception as e:
            print(f"Error scraping DMM for {code}: {e}")
        
        return None
    
    def scrape_multiple_sources(self, code: str, max_retries: int = 3) -> Optional[str]:
        """
        Try multiple sources, similar to JavSP's aggregation approach
        Returns title from first successful scrape
        """
        sources = [
            ('DMM', self.scrape_dmm),
            ('JavDB', self.scrape_javdb),
            ('JavLibrary', self.scrape_javlibrary),
        ]
        
        for source_name, scraper_func in sources:
            for attempt in range(max_retries):
                try:
                    title = scraper_func(code)
                    if title:
                        print(f"Found title for {code} from {source_name}: {title[:50]}...")
                        return title
                    
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
    
    def batch_scrape(self, codes: List[str], delay: float = 1.0) -> Dict[str, Optional[str]]:
        """
        Scrape multiple codes with rate limiting
        Returns dict mapping code -> title
        """
        results = {}
        
        for i, code in enumerate(codes):
            print(f"Scraping {code} ({i+1}/{len(codes)})...")
            title = self.scrape_multiple_sources(code)
            results[code] = title
            
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
        print(f"Scraping title for code: {code}")
        title = scraper.scrape_multiple_sources(code)
        if title:
            print(f"Title: {title}")
        else:
            print("No title found")
    else:
        # Test with example codes
        test_codes = ['EBVR-018', 'HHKL-066']
        for code in test_codes:
            print(f"\nTesting {code}:")
            title = scraper.scrape_multiple_sources(code)
            print(f"Result: {title}")

