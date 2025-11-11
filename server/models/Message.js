import mongoose from 'mongoose'

const messageSchema = new mongoose.Schema({
  chat: { type: mongoose.Schema.Types.ObjectId, ref: 'Chat', required: true },
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  content: { type: String, default: '' },
  seenBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  attachments: [
    {
      url: String,
      type: { type: String },
      name: String,
      size: Number,
      mime: String,
    }
  ],
  reactions: [
    {
      user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      type: String, // e.g., 'like', 'heart', 'laugh'
    }
  ],
  isDeleted: { type: Boolean, default: false },
  deletedByAdmin: { type: Boolean, default: false },
  deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  hiddenFor: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
}, { timestamps: true })

export const Message = mongoose.model('Message', messageSchema)
