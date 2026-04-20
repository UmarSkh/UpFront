const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    methods: ['GET', 'POST', 'PATCH']
  }
});
app.set('io', io);

app.use(cors());
app.use(express.json({ limit: '10mb' }));

const authRoutes = require('./routes/auth');
const taskRoutes = require('./routes/tasks');
const messageRoutes = require('./routes/messages');
const reviewRoutes = require('./routes/reviews');
const userRoutes = require('./routes/users');

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/upfront';
mongoose.connect(MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/users', userRoutes);

app.get('/', (req, res) => {
  res.send('UpFront API is running. Use /api/health to check status.');
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'UpFront API is running' });
});

// Socket.io — real-time chat
const Message = require('./models/Message');

io.on('connection', (socket) => {
  // Join a task room for isolated chat
  socket.on('joinRoom', (taskId) => {
    socket.join(`task_${taskId}`);
  });

  socket.on('leaveRoom', (taskId) => {
    socket.leave(`task_${taskId}`);
  });

  // Handle incoming chat messages
  socket.on('sendMessage', async ({ taskId, senderId, content }) => {
    try {
      const message = new Message({
        task: taskId,
        sender: senderId,
        content
      });
      await message.save();
      const populated = await message.populate('sender', 'name picture');
      io.to(`task_${taskId}`).emit('newMessage', populated);
    } catch (err) {
      console.error('Socket message error:', err);
    }
  });

  socket.on('disconnect', () => {});
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
