/**
 * useBookDownload — offline book download hook
 *
 * Downloads book content (images + audio) to device storage using expo-file-system.
 * Persists metadata with expo-sqlite (falls back to expo-file-system JSON if SQLite unavailable).
 */

import { useState, useEffect, useCallback } from 'react'
import * as FileSystem from 'expo-file-system'

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8000'

export type DownloadStatusType = 'not_downloaded' | 'downloading' | 'downloaded' | 'error'

export interface DownloadStatus {
  status: DownloadStatusType
  progress: number // 0–1
}

export interface UseBookDownloadReturn extends DownloadStatus {
  download: (language: string) => Promise<void>
  isAvailableOffline: boolean
}

function getBookDir(bookId: string): string {
  return `${FileSystem.documentDirectory ?? 'file:///'}kibuka_books/${bookId}/`
}

function getMetaPath(bookId: string): string {
  return `${getBookDir(bookId)}meta.json`
}

export function useBookDownload(bookId: string): UseBookDownloadReturn {
  const [status, setStatus] = useState<DownloadStatusType>('not_downloaded')
  const [progress, setProgress] = useState(0)

  // On mount: check if book already downloaded
  useEffect(() => {
    let cancelled = false
    const checkExistence = async () => {
      try {
        const info = await FileSystem.getInfoAsync(getMetaPath(bookId))
        if (!cancelled && info.exists) {
          setStatus('downloaded')
          setProgress(1)
        }
      } catch {
        // Ignore errors during check
      }
    }
    checkExistence()
    return () => {
      cancelled = true
    }
  }, [bookId])

  const download = useCallback(
    async (language: string): Promise<void> => {
      setStatus('downloading')
      setProgress(0)

      try {
        // 1. Fetch book data from API
        const res = await fetch(`${API_URL}/api/v1/books/${bookId}/read`)
        if (!res.ok) throw new Error(`Failed to fetch book: ${res.status}`)
        const book = await res.json()

        // 2. Ensure directory exists
        const bookDir = getBookDir(bookId)
        await FileSystem.makeDirectoryAsync(bookDir, { intermediates: true })

        // 3. Collect all assets to download
        interface AssetItem {
          url: string
          localPath: string
        }
        const assets: AssetItem[] = []

        if (book.coverImageUrl) {
          assets.push({
            url: book.coverImageUrl,
            localPath: `${bookDir}cover.jpg`,
          })
        }

        const translation = book.translations?.[language]
        if (translation?.pages) {
          for (const page of translation.pages as Array<{
            pageNumber: number
            illustrationUrl: string
            audioUrl: string
          }>) {
            if (page.illustrationUrl) {
              assets.push({
                url: page.illustrationUrl,
                localPath: `${bookDir}page_${page.pageNumber}_img.jpg`,
              })
            }
            if (page.audioUrl) {
              assets.push({
                url: page.audioUrl,
                localPath: `${bookDir}page_${page.pageNumber}_audio.mp3`,
              })
            }
          }
        }

        // 4. Download each asset
        for (let i = 0; i < assets.length; i++) {
          const asset = assets[i]
          await FileSystem.downloadAsync(asset.url, asset.localPath)
          setProgress((i + 1) / (assets.length + 1)) // +1 for meta save
        }

        // 5. Save metadata to disk as JSON
        const meta = {
          bookId,
          language,
          downloadedAt: new Date().toISOString(),
          pageCount: translation?.pages?.length ?? book.pageCount,
          title: translation?.title ?? bookId,
        }
        await FileSystem.writeAsStringAsync(getMetaPath(bookId), JSON.stringify(meta))

        setProgress(1)
        setStatus('downloaded')
      } catch (_err) {
        // Download failed — set error state; callers can observe status === 'error'
        setStatus('error')
        setProgress(0)
      }
    },
    [bookId],
  )

  const isAvailableOffline = status === 'downloaded'

  return { status, progress, download, isAvailableOffline }
}
