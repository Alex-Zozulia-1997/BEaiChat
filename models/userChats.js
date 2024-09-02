import { create } from 'domain';
import mongoose from 'mongoose';

const userChatsSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
    },
    chats: [
      {
        _id: { type: String, required: true },
        title: { type: String, required: true },
        createdAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timeStamps: true }
);

export default mongoose.model.chat ||
  mongoose.model('userchats', userChatsSchema);
