import { Router } from 'express'
import { listMyChats, createDirectChat, getChatDetails, deleteChat, createGroupChat, renameGroup, updateGroupAvatar, addGroupMembers, removeGroupMember } from '../controllers/chatController.js'
import { auth } from '../middleware/auth.js'

const router = Router()
router.get('/', auth, listMyChats)
router.get('/:chatId', auth, getChatDetails)
router.post('/', auth, createDirectChat)
router.post('/group', auth, createGroupChat)
router.patch('/:chatId/name', auth, renameGroup)
router.patch('/:chatId/avatar', auth, updateGroupAvatar)
router.post('/:chatId/members', auth, addGroupMembers)
router.delete('/:chatId/members/:userId', auth, removeGroupMember)
router.delete('/:chatId', auth, deleteChat)
export default router
