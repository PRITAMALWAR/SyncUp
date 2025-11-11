import { Router } from 'express'
import { upload } from '../middleware/upload.js'
import { uploadAvatar, uploadFile } from '../controllers/uploadController.js'
import { auth } from '../middleware/auth.js'

const router = Router()
upload.any()
router.post('/avatar', auth, upload.single('file'), uploadAvatar)
router.post('/file', auth, upload.single('file'), uploadFile)
export default router
