export async function uploadAvatar(req, res, next) {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' })
    const urlPath = `/uploads/${req.file.filename}`
    res.status(201).json({ url: urlPath })
  } catch (e) { next(e) }
}

export async function uploadFile(req, res, next) {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' })
    const urlPath = `/uploads/${req.file.filename}`
    res.status(201).json({
      url: urlPath,
      name: req.file.originalname,
      size: req.file.size,
      mime: req.file.mimetype,
      type: (req.file.mimetype || '').startsWith('image/') ? 'image' : 'file',
    })
  } catch (e) { next(e) }
}
