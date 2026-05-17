/**
 * Send deposit proof image as bytes with a proper Content-Type.
 * Redirecting to a data: URL is blocked by Chrome (ERR_UNSAFE_REDIRECT).
 */

function sniffImageType(buf) {
  if (!buf || buf.length < 3) return 'application/octet-stream'
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return 'image/png'
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'image/jpeg'
  if (buf.length >= 6) {
    const h = buf.slice(0, 6).toString('ascii')
    if (h === 'GIF87a' || h === 'GIF89a') return 'image/gif'
  }
  if (buf.length >= 12 && buf.toString('ascii', 8, 12) === 'WEBP') return 'image/webp'
  return 'image/png'
}

/**
 * @param {import('express').Response} res
 * @param {string|null|undefined} screenshot — data URL or raw base64
 */
function sendDepositScreenshot(res, screenshot) {
  if (typeof screenshot !== 'string' || !screenshot.length) {
    return res.status(404).json({ error: 'Screenshot not found' })
  }

  const s = screenshot.trim()
  let buffer
  let contentType = null

  if (s.startsWith('data:')) {
    const comma = s.indexOf(',')
    if (comma === -1) {
      return res.status(400).json({ error: 'Malformed data URL' })
    }
    const header = s.slice(5, comma)
    const payload = s.slice(comma + 1)
    const parts = header.split(';').map((p) => p.trim().toLowerCase())
    if (!parts.includes('base64')) {
      return res.status(400).json({ error: 'Screenshot must be base64-encoded' })
    }
    const typePart = header.split(';')[0].trim()
    contentType = typePart || null
    try {
      buffer = Buffer.from(payload, 'base64')
    } catch (_) {
      return res.status(500).json({ error: 'Invalid base64 in data URL' })
    }
  } else {
    try {
      buffer = Buffer.from(s, 'base64')
    } catch (_) {
      return res.status(400).json({ error: 'Invalid screenshot encoding' })
    }
  }

  if (!buffer || !buffer.length) {
    return res.status(404).json({ error: 'Screenshot not found' })
  }

  const ct = (contentType || '').toLowerCase()
  if (!ct || ct === 'application/octet-stream') {
    contentType = sniffImageType(buffer)
  } else {
    contentType = ct.split(';')[0].trim()
  }

  res.setHeader('Content-Type', contentType)
  res.setHeader('Cache-Control', 'private, max-age=300')
  res.setHeader('X-Content-Type-Options', 'nosniff')
  return res.send(buffer)
}

module.exports = { sendDepositScreenshot, sniffImageType }
