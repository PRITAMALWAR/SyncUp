import { Router } from 'express'
import { listMessages, sendMessage, markRead, clearChatMessages, clearAllMessagesForUser, deleteMessage, clearChatForMe } from '../controllers/messageController.js'
import { auth } from '../middleware/auth.js'

const router = Router()
router.get('/:chatId', auth, listMessages)
router.post('/:chatId', auth, sendMessage)
router.post('/:chatId/read', auth, markRead)
router.delete('/:chatId/clear', auth, clearChatMessages)
router.post('/:chatId/clear/me', auth, clearChatForMe)
router.delete('/clear/all', auth, clearAllMessagesForUser)
router.delete('/item/:messageId', auth, deleteMessage)
export default router
