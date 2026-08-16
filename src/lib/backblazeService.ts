import { supabase } from './supabase'

const REF_PREFIX = 'b2://'

export function isBackblazeRef(value: string | null | undefined): boolean {
  return typeof value === 'string' && value.startsWith(REF_PREFIX)
}

export async function uploadToBackblaze(
  file: File,
  fileName: string,
  onProgress?: (percent: number) => void,
): Promise<string> {
  const safeName = fileName
    .replace(/^\/+/, '')
    .replace(/[^a-zA-Z0-9_./-]/g, '-')

  // B2 upload authorizations are short-lived and upload URLs can become
  // unusable after a transient network/CORS interruption. Get a fresh upload
  // URL for every attempt instead of reusing a stale one.
  let lastError: Error | null = null

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const { data, error } = await supabase.functions.invoke('backblaze-storage', {
        body: { action: 'get-upload-url', fileName: safeName },
      })

      if (error) {
        throw new Error(`Backblaze setup failed: ${error.message}`)
      }

      if (!data?.uploadUrl || !data?.authorizationToken || !data?.ref) {
        throw new Error(data?.error || 'Backblaze did not return an upload URL')
      }

      const uploadResponse = await new Promise<{ ok: boolean; status: number; body: string }>((resolve, reject) => {
        const xhr = new XMLHttpRequest()
        xhr.open('POST', data.uploadUrl, true)
        xhr.setRequestHeader('Authorization', data.authorizationToken)
        xhr.setRequestHeader('X-Bz-File-Name', encodeURIComponent(data.fileName))
        xhr.setRequestHeader('Content-Type', file.type || 'b2/x-auto')
        xhr.setRequestHeader('X-Bz-Content-Sha1', 'do_not_verify')
        xhr.timeout = 10 * 60 * 1000

        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable && onProgress) {
            onProgress(Math.min(100, Math.round((event.loaded / event.total) * 100)))
          }
        }

        xhr.onload = () => {
          resolve({
            ok: xhr.status >= 200 && xhr.status < 300,
            status: xhr.status,
            body: xhr.responseText || '',
          })
        }

        xhr.onerror = () => {
          reject(new Error(
            'Network error while uploading to Backblaze. Check the B2 bucket CORS rule for your exact website origin and try again.',
          ))
        }
        xhr.ontimeout = () => reject(new Error('Backblaze upload timed out. Check your network connection and try again.'))
        xhr.onabort = () => reject(new Error('Backblaze upload was cancelled'))
        xhr.send(file)
      })

      if (!uploadResponse.ok) {
        throw new Error(
          `Backblaze upload failed (${uploadResponse.status})${uploadResponse.body ? `: ${uploadResponse.body}` : ''}`,
        )
      }

      onProgress?.(100)
      return data.ref as string
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Backblaze upload failed')
      if (attempt < 3) {
        await new Promise((resolve) => setTimeout(resolve, 700 * attempt))
        continue
      }
    }
  }

  throw lastError ?? new Error('Backblaze upload failed')
}

export async function getBackblazeVideoUrl(ref: string): Promise<string> {
  if (!isBackblazeRef(ref)) return ref
  const { data, error } = await supabase.functions.invoke('backblaze-storage', {
    body: { action: 'get-download-url', ref },
  })
  if (error) throw new Error(`Backblaze playback authorization failed: ${error.message}`)
  if (!data?.url) throw new Error(data?.error || 'Backblaze did not return a download URL')
  return data.url as string
}

export async function resolveBackblazeVideoUrls<T extends { videoUrl?: string | null }>(items: T[]): Promise<T[]> {
  return Promise.all(items.map(async (item) => ({
    ...item,
    videoUrl: item.videoUrl && isBackblazeRef(item.videoUrl)
      ? await getBackblazeVideoUrl(item.videoUrl)
      : item.videoUrl,
  })))
}


export async function deleteBackblazeFile(ref: string): Promise<void> {
  if (!isBackblazeRef(ref)) return
  const { data, error } = await supabase.functions.invoke('backblaze-storage', {
    body: { action: 'delete-file', ref },
  })
  if (error) throw new Error(`Backblaze delete failed: ${error.message}`)
  if (!data?.success) throw new Error(data?.error || 'Backblaze file could not be deleted')
}
