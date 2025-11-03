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
    
    def extract_year(self, date_str: str) -> Optional[int]:
        """Extract year from date string (various formats)"""
        if not date_str:
            return None
        
        # Try common date patterns
        patterns = [
            r'(\d{4})-\d{2}-\d{2}',  # 2024-01-15
            r'(\d{4})年',             # 2024年
            r'(\d{4})/',              # 2024/01/15
            r'(\d{4})\.',             # 2024.01.15
            r'Release[:\s]+(\d{4})',  # Release: 2024
            r'発売日[:\s]+(\d{4})',   # 発売日: 2024
        ]
        
        for pattern in patterns:
            match = re.search(pattern, date_str)
            if match:
                year = int(match.group(1))
                # Sanity check: valid year range (1990-2030)
                if 1990 <= year <= 2030:
                    return year
        
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
            
            if not BEAUTIFULSOUP_AVAILABLE:
                # Fallback to regex if BeautifulSoup not available
                detail_match = re.search(r'href="(/v/\d+)"', response.text)
                if detail_match:
                    detail_url = urljoin('https://javdb.com', detail_match.group(1))
                    detail_response = self.session.get(detail_url, timeout=self.timeout)
                    if detail_response.status_code == 200:
                        title_match = re.search(r'<strong[^>]*>([^<]+)</strong>', detail_response.text)
                        if title_match:
                            title = title_match.group(1).strip()
                            # Try to extract year from page
                            year_match = re.search(r'(\d{4}[-\/年]\d{1,2}[-\/月]\d{1,2})', detail_response.text)
                            year = None
                            if year_match:
                                year = self.extract_year(year_match.group(1))
                            return {'title': title, 'year': year}
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
                        
                        title = None
                        for selector in title_selectors:
                            title_elem = detail_soup.select_one(selector)
                            if title_elem:
                                title = title_elem.get_text(strip=True)
                                if title and len(title) > 5:
                                    break
                        
                        if title:
                            # Extract year from detail page
                            year = None
                            # Look for date fields (JavDB format)
                            date_selectors = [
                                'div.info-item:contains("日期")',
                                'div.info-item:contains("發行")',
                                'div.info-item:contains("Release")',
                                'span.date',
                                'div.date'
                            ]
                            
                            # Try to find date text
                            date_text = None
                            for selector in date_selectors:
                                try:
                                    date_elem = detail_soup.select_one(selector)
                                    if date_elem:
                                        date_text = date_elem.get_text(strip=True)
                                        break
                                except:
                                    continue
                            
                            # If not found by selector, search in all text
                            if not date_text:
                                page_text = detail_soup.get_text()
                                date_match = re.search(r'(\d{4}[-\/年]\d{1,2}[-\/月]\d{1,2})', page_text)
                                if date_match:
                                    date_text = date_match.group(1)
                            
                            if date_text:
                                year = self.extract_year(date_text)
                            
                            return {'title': title, 'year': year}
                
                # Fallback: get title from search result directly
                title_elem = result_link.find_parent().find_next(['div', 'span', 'strong'])
                if title_elem:
                    title = title_elem.get_text(strip=True)
                    if title and len(title) > 5:
                        return {'title': title, 'year': None}
        
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
            
            if not BEAUTIFULSOUP_AVAILABLE:
                # Fallback to regex
                title_match = re.search(r'<div[^>]*class="video"[^>]*>.*?<a[^>]+>([^<]+)</a>', response.text, re.DOTALL)
                if title_match:
                    title = title_match.group(1).strip()
                    # Try to extract year
                    year_match = re.search(r'(\d{4})', response.text)
                    year = None
                    if year_match:
                        year = self.extract_year(year_match.group(1))
                    return {'title': title, 'year': year}
                return None
            
            soup = BeautifulSoup(response.text, 'html.parser')
            
            # Find video entries
            video_divs = soup.find_all('div', class_=re.compile(r'video', re.I))
            for video_div in video_divs[:3]:  # Check first 3 results
                title_link = video_div.find('a', href=re.compile(r'/vl\d+'))
                if title_link:
                    title = title_link.get_text(strip=True)
                    if title and len(title) > 5:
                        # Try to get year from video div
                        year = None
                        date_elem = video_div.find('div', class_=re.compile(r'date|year', re.I))
                        if date_elem:
                            year = self.extract_year(date_elem.get_text(strip=True))
                        return {'title': title, 'year': year}
                
                # Alternative: look for title attribute
                if title_link and title_link.get('title'):
                    title = title_link.get('title').strip()
                    if title and len(title) > 5:
                        return {'title': title, 'year': None}
        
        except Exception as e:
            print(f"Error scraping JavLibrary for {code}: {e}")
        
        return None
    
    def scrape_dmm(self, code: str) -> Optional[Dict[str, any]]:
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
                    
                    if BEAUTIFULSOUP_AVAILABLE:
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
                                    # Try to extract year from page
                                    year = None
                                    # DMM usually has date in format: 2024年1月15日
                                    year_match = re.search(r'(\d{4})年', response.text)
                                    if year_match:
                                        year = self.extract_year(year_match.group(1))
                                    return {'title': title, 'year': year}
                    
                    # Fallback: regex search in HTML (works with or without BeautifulSoup)
                    title_match = re.search(r'alt="([^"]{10,})"', response.text)
                    if title_match:
                        title = title_match.group(1).strip()
                        if title:
                            # Try to extract year
                            year_match = re.search(r'(\d{4})年', response.text)
                            year = None
                            if year_match:
                                year = self.extract_year(year_match.group(1))
                            return {'title': title, 'year': year}
                except:
                    continue
        
        except Exception as e:
            print(f"Error scraping DMM for {code}: {e}")
        
        return None
    
    def scrape_multiple_sources(self, code: str, max_retries: int = 3) -> Optional[Dict[str, any]]:
        """
        Try multiple sources, similar to JavSP's aggregation approach
        Returns dict with 'title' and 'year' from first successful scrape
        """
        sources = [
            ('DMM', self.scrape_dmm),
            ('JavDB', self.scrape_javdb),
            ('JavLibrary', self.scrape_javlibrary),
        ]
        
        for source_name, scraper_func in sources:
            for attempt in range(max_retries):
                try:
                    result = scraper_func(code)
                    if result and result.get('title'):
                        title_preview = result['title'][:50] + '...' if len(result['title']) > 50 else result['title']
                        year_info = f", Year: {result.get('year')}" if result.get('year') else ""
                        print(f"Found metadata for {code} from {source_name}: {title_preview}{year_info}")
                        return result
                    
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
        Returns dict mapping code -> {'title': str, 'year': int or None}
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
            print(f"Year: {result.get('year', 'Not found')}")
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
                print(f"Year: {result.get('year', 'Not found')}")
            else:
                print("No result")

