export async function uploadAvatar(req, res, next) {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' })
    
    // Extract URL from Cloudinary or local storage
    // Cloudinary returns the URL in req.file.path (secure HTTPS URL)
    // Local storage returns filename in req.file.filename
    let url
    if (req.file.path) {
      // Cloudinary URL (already HTTPS)
      url = req.file.path
    } else if (req.file.filename) {
      // Local storage path
      url = `/uploads/${req.file.filename}`
    } else {
      return res.status(500).json({ error: 'Failed to get file URL' })
    }
    
    res.status(201).json({ url })
  } catch (e) { next(e) }
}

export async function uploadFile(req, res, next) {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' })
    
    // Extract URL from Cloudinary or local storage
    // Cloudinary returns the URL in req.file.path (secure HTTPS URL)
    // Local storage returns filename in req.file.filename
    let url
    if (req.file.path) {
      // Cloudinary URL (already HTTPS)
      url = req.file.path
    } else if (req.file.filename) {
      // Local storage path
      url = `/uploads/${req.file.filename}`
    } else {
      return res.status(500).json({ error: 'Failed to get file URL' })
    }
    
    res.status(201).json({
      url,
      name: req.file.originalname,
      size: req.file.size,
      mime: req.file.mimetype,
      type: (req.file.mimetype || '').startsWith('image/') ? 'image' : 'file',
    })
  } catch (e) { next(e) }
}
