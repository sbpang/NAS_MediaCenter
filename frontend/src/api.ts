/** API client for backend communication. */

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:1699'

export interface Artist {
  id: number
  name: string
  cover_path: string | null
  item_count: number | null
  created_at: string
}

export interface Item {
  id: number
  artist_id: number
  artist_name: string | null
  video_code: string
  title: string | null
  abs_path: string
  poster_path: string | null
  fanart_path: string | null
  duration_sec: number | null
  vcodec: string | null
  acodec: string | null
  width: number | null
  height: number | null
  mtime: string | null
  created_at: string
  updated_at: string
}

export interface ScanResponse {
  status: string
  scan_id: number
  added: number
  updated: number
  errors: string[] | null
}

export async function getArtists(): Promise<Artist[]> {
  const response = await fetch(`${API_BASE}/api/artists`)
  if (!response.ok) throw new Error('Failed to fetch artists')
  return response.json()
}

export async function getArtist(id: number): Promise<Artist> {
  const response = await fetch(`${API_BASE}/api/artist/${id}`)
  if (!response.ok) throw new Error('Failed to fetch artist')
  return response.json()
}

export async function getArtistItems(artistId: number): Promise<Item[]> {
  const response = await fetch(`${API_BASE}/api/artist/${artistId}/items`)
  if (!response.ok) throw new Error('Failed to fetch artist items')
  return response.json()
}

export async function getItem(id: number): Promise<Item> {
  const response = await fetch(`${API_BASE}/api/item/${id}`)
  if (!response.ok) throw new Error('Failed to fetch item')
  return response.json()
}

export async function triggerScan(): Promise<ScanResponse> {
  const response = await fetch(`${API_BASE}/api/scan`, { method: 'POST' })
  if (!response.ok) throw new Error('Failed to trigger scan')
  return response.json()
}

export function getStreamUrl(itemId: number): string {
  return `${API_BASE}/stream/original?item_id=${itemId}`
}

export function getPosterUrl(itemId: number): string {
  return `${API_BASE}/stream/poster/${itemId}`
}

export function getFanartUrl(itemId: number): string {
  return `${API_BASE}/stream/fanart/${itemId}`
}

export function getCoverUrl(artistId: number): string {
  return `${API_BASE}/stream/cover/${artistId}`
}

// Continue Watching utilities
const STORAGE_KEY = 'media_center_watch_progress'

export interface WatchProgress {
  itemId: number
  time: number
  updated: string
}

export function getWatchProgress(): Record<number, WatchProgress> {
  const data = localStorage.getItem(STORAGE_KEY)
  return data ? JSON.parse(data) : {}
}

export function saveWatchProgress(itemId: number, time: number): void {
  const progress = getWatchProgress()
  progress[itemId] = {
    itemId,
    time,
    updated: new Date().toISOString(),
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(progress))
}

export function getItemProgress(itemId: number): number {
  const progress = getWatchProgress()
  return progress[itemId]?.time || 0
}

