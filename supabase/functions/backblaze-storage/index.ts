import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

type Auth = {
  apiUrl: string
  downloadUrl: string
  authToken: string
  bucketId: string
  bucketName: string
}

type BackblazeAllowedBucket = {
  id: string
  name: string | null
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  })

/**
 * Authorize against Backblaze and resolve the application-key bucket.
 *
 * Important:
 * Backblaze's current authorization response stores Native API information
 * under:
 *
 * data.apiInfo.storageApi
 *
 * For restricted application keys, the allowed buckets are under:
 *
 * data.apiInfo.storageApi.allowed.buckets
 */
async function authorize(): Promise<Auth> {
  const keyId = Deno.env.get('BACKBLAZE_KEY_ID')
  const applicationKey = Deno.env.get('BACKBLAZE_APPLICATION_KEY')
  const bucketName = Deno.env.get('BACKBLAZE_BUCKET')

  if (!keyId || !applicationKey || !bucketName) {
    throw new Error(
      'Missing Backblaze secrets: BACKBLAZE_KEY_ID, BACKBLAZE_APPLICATION_KEY, BACKBLAZE_BUCKET',
    )
  }

  const credentials = btoa(`${keyId}:${applicationKey}`)

  /**
   * Use v4 authorization.
   *
   * Current Backblaze documentation recommends v4 for the current
   * authorization response structure and multi-bucket application keys.
   */
  const response = await fetch(
    'https://api.backblazeb2.com/b2api/v4/b2_authorize_account',
    {
      method: 'GET',
      headers: {
        Authorization: `Basic ${credentials}`,
      },
    },
  )

  if (!response.ok) {
    const errorText = await response.text().catch(() => '')

    throw new Error(
      `Backblaze authorization failed (${response.status})${
        errorText ? `: ${errorText}` : ''
      }`,
    )
  }

  const data = await response.json()

  const storageApi = data?.apiInfo?.storageApi

  if (!storageApi) {
    throw new Error(
      'Backblaze authorization response did not contain apiInfo.storageApi',
    )
  }

  const apiUrl = storageApi.apiUrl
  const downloadUrl = storageApi.downloadUrl

  if (!apiUrl) {
    throw new Error(
      'Backblaze authorization response did not contain storageApi.apiUrl',
    )
  }

  if (!downloadUrl) {
    throw new Error(
      'Backblaze authorization response did not contain storageApi.downloadUrl',
    )
  }

  if (!data?.authorizationToken) {
    throw new Error(
      'Backblaze authorization response did not contain authorizationToken',
    )
  }

  /**
   * Current v4 response:
   *
   * storageApi.allowed.buckets = [
   *   { id: '...', name: '...' }
   * ]
   */
  const allowedBuckets: BackblazeAllowedBucket[] =
    Array.isArray(storageApi?.allowed?.buckets)
      ? storageApi.allowed.buckets
      : []

  let bucket: { bucketId: string; bucketName: string } | null = null

  const allowedBucket = allowedBuckets.find(
    (item) => item?.name === bucketName && item?.id,
  )

  if (allowedBucket) {
    bucket = {
      bucketId: allowedBucket.id,
      bucketName: allowedBucket.name as string,
    }
  }

  /**
   * Compatibility with older single-bucket authorization responses.
   */
  if (!bucket && storageApi?.bucketId && storageApi?.bucketName) {
    bucket = {
      bucketId: storageApi.bucketId,
      bucketName: storageApi.bucketName,
    }
  }

  /**
   * Final fallback:
   * explicitly look up the configured bucket.
   */
  if (!bucket) {
    bucket = await findBucket(
      apiUrl,
      data.authorizationToken,
      bucketName,
      data.accountId,
    )
  }

  if (!bucket?.bucketId || !bucket?.bucketName) {
    throw new Error(
      `Unable to resolve Backblaze bucket ${bucketName}`,
    )
  }

  if (bucket.bucketName !== bucketName) {
    throw new Error(
      `Backblaze key is not scoped to bucket ${bucketName}`,
    )
  }

  return {
    apiUrl,
    downloadUrl,
    authToken: data.authorizationToken,
    bucketId: bucket.bucketId,
    bucketName: bucket.bucketName,
  }
}

async function findBucket(
  apiUrl: string,
  authToken: string,
  bucketName: string,
  accountId: string,
) {
  if (!apiUrl) {
    throw new Error('Backblaze API URL is missing')
  }

  const response = await fetch(
    `${apiUrl}/b2api/v3/b2_list_buckets`,
    {
      method: 'POST',
      headers: {
        Authorization: authToken,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        accountId,
        bucketName,
      }),
    },
  )

  if (!response.ok) {
    const errorText = await response.text().catch(() => '')

    throw new Error(
      `Unable to find Backblaze bucket (${response.status})${
        errorText ? `: ${errorText}` : ''
      }`,
    )
  }

  const data = await response.json()

  const bucket = (data.buckets ?? []).find(
    (item: { bucketName: string }) =>
      item.bucketName === bucketName,
  )

  if (!bucket) {
    throw new Error(
      `Backblaze bucket ${bucketName} was not found`,
    )
  }

  return bucket as {
    bucketId: string
    bucketName: string
  }
}

function safeFileName(value: string) {
  return value
    .replace(/^\/+/, '')
    .split('/')
    .map((part) =>
      part.replace(/[\\?&#%]+/g, '-'),
    )
    .join('/')
}

async function getUploadUrl(auth: Auth) {
  const response = await fetch(
    `${auth.apiUrl}/b2api/v3/b2_get_upload_url`,
    {
      method: 'POST',
      headers: {
        Authorization: auth.authToken,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        bucketId: auth.bucketId,
      }),
    },
  )

  if (!response.ok) {
    const errorText = await response.text().catch(() => '')

    throw new Error(
      `Could not get Backblaze upload URL (${response.status})${
        errorText ? `: ${errorText}` : ''
      }`,
    )
  }

  const data = await response.json()

  if (!data?.uploadUrl || !data?.authorizationToken) {
    throw new Error(
      'Backblaze did not return a valid upload URL or authorization token',
    )
  }

  return {
    uploadUrl: data.uploadUrl,
    authorizationToken: data.authorizationToken,
  }
}

async function findFileVersion(
  auth: Auth,
  fileName: string,
) {
  const response = await fetch(
    `${auth.apiUrl}/b2api/v3/b2_list_file_versions`,
    {
      method: 'POST',
      headers: {
        Authorization: auth.authToken,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        bucketId: auth.bucketId,
        prefix: fileName,
        maxFileCount: 100,
      }),
    },
  )

  if (!response.ok) {
    const errorText = await response.text().catch(() => '')

    throw new Error(
      `Could not find Backblaze file (${response.status})${
        errorText ? `: ${errorText}` : ''
      }`,
    )
  }

  const data = await response.json()

  const version = (data.files ?? []).find(
    (item: { fileName: string }) =>
      item.fileName === fileName,
  )

  if (!version) {
    throw new Error(
      `Backblaze file not found: ${fileName}`,
    )
  }

  return version as {
    fileId: string
    fileName: string
    action: string
  }
}

async function deleteFile(
  auth: Auth,
  fileName: string,
) {
  const version = await findFileVersion(
    auth,
    fileName,
  )

  const response = await fetch(
    `${auth.apiUrl}/b2api/v3/b2_delete_file_version`,
    {
      method: 'POST',
      headers: {
        Authorization: auth.authToken,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fileId: version.fileId,
        fileName: version.fileName,
      }),
    },
  )

  if (!response.ok) {
    const errorText = await response.text().catch(() => '')

    throw new Error(
      `Could not delete Backblaze file (${response.status})${
        errorText ? `: ${errorText}` : ''
      }`,
    )
  }

  return {
    success: true,
    fileId: version.fileId,
    fileName: version.fileName,
  }
}

async function getDownloadUrl(
  auth: Auth,
  fileName: string,
) {
  const response = await fetch(
    `${auth.apiUrl}/b2api/v3/b2_get_download_authorization`,
    {
      method: 'POST',
      headers: {
        Authorization: auth.authToken,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        bucketId: auth.bucketId,
        fileNamePrefix: fileName,
        validDurationInSeconds: 3600,
      }),
    },
  )

  if (!response.ok) {
    const errorText = await response.text().catch(() => '')

    throw new Error(
      `Could not authorize Backblaze download (${response.status})${
        errorText ? `: ${errorText}` : ''
      }`,
    )
  }

  const data = await response.json()

  if (!data?.authorizationToken) {
    throw new Error(
      'Backblaze did not return a download authorization token',
    )
  }

  const url =
    `${auth.downloadUrl}/file/${encodeURIComponent(auth.bucketName)}/${fileName
      .split('/')
      .map(encodeURIComponent)
      .join('/')}?Authorization=${encodeURIComponent(
        data.authorizationToken,
      )}`

  return url
}

serve(async (request) => {
  /**
   * CORS preflight
   */
  if (request.method === 'OPTIONS') {
    return new Response('ok', {
      headers: corsHeaders,
    })
  }

  if (request.method !== 'POST') {
    return json(
      {
        error: 'Method not allowed',
      },
      405,
    )
  }

  try {
    const body = await request.json()
    const action = body?.action

    if (!action) {
      return json(
        {
          error: 'action is required',
        },
        400,
      )
    }

    /**
     * Authorize only after validating the request.
     */
    const auth = await authorize()

    /**
     * ------------------------------------------------------------
     * GET UPLOAD URL
     * ------------------------------------------------------------
     */
    if (action === 'get-upload-url') {
      const fileName = safeFileName(
        String(body?.fileName || ''),
      )

      if (!fileName) {
        return json(
          {
            error: 'fileName is required',
          },
          400,
        )
      }

      const upload = await getUploadUrl(auth)

      return json({
        ...upload,
        bucketName: auth.bucketName,
        fileName,
        ref: `b2://${auth.bucketName}/${fileName}`,
      })
    }

    /**
     * ------------------------------------------------------------
     * GET DOWNLOAD URL
     * ------------------------------------------------------------
     */
    if (action === 'get-download-url') {
      const ref = String(body?.ref || '')

      const prefix = `b2://${auth.bucketName}/`

      if (!ref.startsWith(prefix)) {
        return json(
          {
            error: 'Invalid Backblaze file reference',
          },
          400,
        )
      }

      const fileName = safeFileName(
        ref.slice(prefix.length),
      )

      if (!fileName) {
        return json(
          {
            error: 'Invalid file reference',
          },
          400,
        )
      }

      const url = await getDownloadUrl(
        auth,
        fileName,
      )

      return json({
        url,
      })
    }

    /**
     * ------------------------------------------------------------
     * DELETE FILE
     * ------------------------------------------------------------
     */
    if (action === 'delete-file') {
      const ref = String(body?.ref || '')

      const prefix = `b2://${auth.bucketName}/`

      if (!ref.startsWith(prefix)) {
        return json(
          {
            error: 'Invalid Backblaze file reference',
          },
          400,
        )
      }

      const fileName = safeFileName(
        ref.slice(prefix.length),
      )

      if (!fileName) {
        return json(
          {
            error: 'Invalid file reference',
          },
          400,
        )
      }

      /**
       * Only application-owned namespaces can be deleted.
       *
       * Existing application behavior preserved:
       * - webinars/
       * - courses/
       * - resources/
       */
      const allowed =
        fileName.startsWith('webinars/') ||
        fileName.startsWith('courses/') ||
        fileName.startsWith('resources/')

      if (!allowed) {
        return json(
          {
            error:
              'This file type cannot be deleted here',
          },
          403,
        )
      }

      return json(
        await deleteFile(auth, fileName),
      )
    }

    return json(
      {
        error: 'Unknown action',
      },
      400,
    )
  } catch (error) {
    console.error('backblaze-storage error:', error)

    return json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Backblaze operation failed',
      },
      500,
    )
  }
})