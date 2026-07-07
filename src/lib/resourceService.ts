import { supabase } from './supabase'
import type { Resource, ResourceType, ResourceCategory } from '../store/contentStore'

// ─── Database Row Type ──────────────────────────────────────────────────────
interface ResourceRow {
  id: string
  title: string
  description: string
  type: string
  category: string
  author: string
  last_updated: string
  downloads: number
  is_premium: boolean
  price: number | null
  file_url: string | null
  status: string
  created_at: string
}

// ─── Map DB Row → Frontend Resource ─────────────────────────────────────────
function mapRowToResource(row: ResourceRow): Resource {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    type: row.type as ResourceType,
    category: row.category as ResourceCategory,
    author: row.author,
    lastUpdated: row.last_updated,
    isPremium: row.is_premium,
    price: row.price ?? undefined,
    downloadUrl: row.file_url ?? undefined,
    status: row.status as 'Published' | 'Draft',
    downloads: row.downloads,
    bookmarks: 0,
    createdAt: row.created_at,
  }
}

// ─── Fetch Published Resources ──────────────────────────────────────────────
export async function fetchPublishedResources(): Promise<Resource[]> {
  const { data, error } = await supabase
    .from("resources")
    .select("*")
    .eq("status", "Published");

  console.log("DATA:", data);
  console.log("ERROR:", error);

  if (error) {
    throw new Error(error.message);
  }

  return (data as ResourceRow[]).map(mapRowToResource);
}

// ─── Increment Download Count ───────────────────────────────────────────────
export async function incrementDownloadCount(resourceId: string, currentDownloads: number): Promise<void> {
  const { error } = await supabase
    .from('resources')
    .update({ downloads: currentDownloads + 1 })
    .eq('id', resourceId)

  if (error) {
    throw new Error(`Failed to update download count: ${error.message}`)
  }
}

// ─── Trigger File Download ──────────────────────────────────────────────────
// Detects Supabase Storage URLs and uses the download() API for them;
// falls back to window.open() for external URLs.
export async function triggerResourceDownload(fileUrl: string, fileName: string): Promise<void> {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string

  // Check if this is a Supabase Storage URL
  const isSupabaseStorage =
    fileUrl.includes('/storage/v1/object/') ||
    (supabaseUrl && fileUrl.startsWith(supabaseUrl))

  if (isSupabaseStorage) {
    // Extract bucket and path from the URL
    // URL format: https://<project>.supabase.co/storage/v1/object/public/<bucket>/<path>
    const storageMatch = fileUrl.match(/\/storage\/v1\/object\/(?:public|sign)\/([^/]+)\/(.+)/)

    if (storageMatch) {
      const [, bucket, path] = storageMatch
      console.log(`[Download] Using Supabase Storage API — bucket: ${bucket}, path: ${path}`)

      const { data, error } = await supabase.storage.from(bucket).download(path)

      if (error) {
        console.error('[Download] Supabase Storage download failed:', error)
        throw new Error(`Storage download failed: ${error.message}`)
      }

      // Create a blob URL and trigger browser download
      const blobUrl = URL.createObjectURL(data)
      const anchor = document.createElement('a')
      anchor.href = blobUrl
      anchor.download = fileName
      document.body.appendChild(anchor)
      anchor.click()
      document.body.removeChild(anchor)
      URL.revokeObjectURL(blobUrl)

      console.log(`[Download] Successfully downloaded via Storage API: ${fileName}`)
      return
    }
  }

  // Fallback: open in a new tab for non-Storage URLs
  console.log(`[Download] Opening URL in new tab: ${fileUrl}`)
  window.open(fileUrl, '_blank', 'noopener,noreferrer')
}
