const express = require('express');
const Review = require('../models/Review');
const Task = require('../models/Task');
const User = require('../models/User');

const router = express.Router();

const authMiddleware = (req, res, next) => {
  const userId = req.headers['x-user-id'];
  if (!userId) return res.status(401).json({ message: 'Unauthorized' });
  req.userId = userId;
  next();
};

// Post a review
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { taskId, revieweeId, rating, comment } = req.body;

    // Check if task is completed
    const task = await Task.findById(taskId);
    if (!task || task.status !== 'Completed') {
      return res.status(400).json({ message: 'Can only review completed tasks' });
    }

    // Check if user is part of the task
    const isParticipant = task.creator.toString() === req.userId || task.runner.toString() === req.userId;
    if (!isParticipant) return res.status(403).json({ message: 'Not authorized' });

    // Check if review already exists
    const existingReview = await Review.findOne({ task: taskId, reviewer: req.userId });
    if (existingReview) return res.status(400).json({ message: 'You have already reviewed this task' });

    const review = new Review({
      task: taskId,
      reviewer: req.userId,
      reviewee: revieweeId,
      rating,
      comment
    });

    await review.save();

    res.status(201).json(review);
  } catch (error) {
    console.error('Error posting review:', error);
    res.status(500).json({ message: 'Failed to post review' });
  }
});

// Get reviews for a user
router.get('/user/:userId', async (req, res) => {
  try {
    const reviews = await Review.find({ reviewee: req.params.userId })
      .populate('reviewer', 'name picture')
      .sort({ createdAt: -1 });
    res.json(reviews);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch reviews' });
  }
});

module.exports = router;
