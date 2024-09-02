import express from 'express';
import ImageKit from 'imagekit';
import cors from 'cors';
import mongoose from 'mongoose';
import Chat from './BEaiChat/models/chat.js';
import UserChats from './BEaiChat/models/userChats.js';
import { ClerkExpressRequireAuth } from '@clerk/clerk-sdk-node';

const port = process.env.PORT || 3001;

const app = express();

console.log(
  'Clerk Publishable Key:',
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
);
console.log('Clerk Secret Key:', process.env.CLERK_SECRET_KEY);

const connect = async () => {
  try {
    await mongoose.connect(process.env.MONGO, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Connected to MongoDB');
  } catch (error) {
    console.error('Error connecting to MongoDB:', error.message);
  }
};
// app.use(
//   cors({
//     origin: 'http://localhost:5173',
//     // origin: process.env.CLIENT_URL,
//     // credentials: true,
//   })
// );
app.use(
  cors({
    origin: '*', // Allow all origins (for development purposes only)
  })
);

app.use(express.json());
const imagekit = new ImageKit({
  urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT,
  publicKey: process.env.IMAGEKIT_PUBLIC_KEY,
  privateKey: process.env.IMAGEKIT_PRIVATE_KEY,
});

app.get('/', (req, res) => {
  res.send('Hello');
});

app.get('/api/upload', (req, res) => {
  const result = imagekit.getAuthenticationParameters();

  res.send(result);
});

app.post('/api/chats', ClerkExpressRequireAuth(), async (req, res) => {
  const userId = req.auth.userId;

  const { text } = req.body;
  try {
    if (!text || !userId) {
      return res.status(400).send('Missing text or userId');
    }
    // CREATING A NEW CHAT
    const newChat = new Chat({
      userId: userId,
      history: [{ role: 'user', parts: [{ text }] }],
    });
    const savedChat = await newChat.save();

    // CHECKING IF THE CHAT WAS CREATED
    const userChats = await UserChats.find({ userId: userId });
    // If not created
    if (!userChats.length) {
      const newUserChats = new UserChats({
        userId: userId,
        chats: [
          {
            _id: savedChat._id,
            title: text.substring(0, 20),
          },
        ],
      });
      await newUserChats.save();
    }
    // If  created
    else {
      await UserChats.updateOne(
        { userId: userId },
        {
          $push: {
            chats: {
              _id: savedChat._id,
              title: text.substring(0, 20),
            },
          },
        }
      );
      res.status(201).send(newChat._id);
    }
  } catch (err) {
    console.error('Error:', err);
    res.status(500).send('There was an error creating chat');
  }
  console.log('Text:', text); // Log the text specifically
  // res.status(200).send({ success: true }); // Send a response back to the client
});
// Getting LIST OF CHATS
app.get('/api/userchats', ClerkExpressRequireAuth(), async (req, res) => {
  const userId = req.auth.userId;
  try {
    const userChats = await UserChats.find({ userId: userId });
    res.status(200).send(userChats[0].chats);
  } catch (err) {
    console.error('Error:', err);
    res.status(500).send('There was an error fetching chats');
  }
});
// GETTING A CHAT BY ID
app.get('/api/chats/:id', ClerkExpressRequireAuth(), async (req, res) => {
  const userId = req.auth.userId;
  try {
    const chat = await Chat.findOne({ _id: req.params.id, userId: userId });
    res.status(200).send(chat);
  } catch (err) {
    console.error('Error:', err);
    res.status(500).send('There was an error getting messages for the  chats');
  }
});

app.put('/api/chats/:id', ClerkExpressRequireAuth(), async (req, res) => {
  const userId = req.auth.userId;

  const { question, answer, img } = req.body;
  console.log('Received img:', img);

  const newItems = [
    ...(question
      ? [
          {
            role: 'user',
            parts: [{ text: question }],
            ...(img && { img }),
          },
        ]
      : []),
    { role: 'model', parts: [{ text: answer }] },
  ];

  try {
    const updatedChat = await Chat.updateOne(
      { _id: req.params.id, userId },
      {
        $push: { history: { $each: newItems } },
      }
    );
    res.status(200).send(updatedChat);
  } catch (err) {
    console.log('Error:', err);
    res.status(500).send('There was an error getting messages for the  chats');
  }
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(401).send('Unauthenticated!');
});

app.listen(port, () => {
  connect();
  console.log(`Server is running on port ${port}`);
});
