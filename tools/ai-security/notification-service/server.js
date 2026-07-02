const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

const app = express();
const PORT = process.env.PORT || 3007;

// Middleware
app.use(cors());
app.use(express.json());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// Simple authentication middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  // For now, accept any token (in production, verify JWT)
  next();
};

// Routes
app.get('/health', (req, res) => {
  res.json({ status: 'OK', service: 'notification-service' });
});

// Get user notifications
app.get('/notifications', authenticateToken, (req, res) => {
  try {
    const { limit = 10, offset = 0 } = req.query;
    
    // Mock notifications data
    const notifications = [
      {
        id: 1,
        user_id: 1,
        type: 'reminder',
        title: 'Time to log your meal',
        message: 'Don\'t forget to track your lunch!',
        read: false,
        created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
      },
      {
        id: 2,
        user_id: 1,
        type: 'achievement',
        title: 'Goal reached!',
        message: 'Congratulations! You\'ve completed your weekly workout goal.',
        read: false,
        created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: 3,
        user_id: 1,
        type: 'tip',
        title: 'Nutrition tip',
        message: 'Try adding more protein to your breakfast for better satiety.',
        read: true,
        created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
      }
    ];
    
    res.json({ 
      notifications: notifications.slice(offset, offset + parseInt(limit)),
      total: notifications.length,
      unread_count: notifications.filter(n => !n.read).length
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Mark notification as read
app.put('/notifications/:id/read', authenticateToken, (req, res) => {
  try {
    const { id } = req.params;
    
    // Mock update
    res.json({ message: `Notification ${id} marked as read` });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Mark all notifications as read
app.put('/notifications/read-all', authenticateToken, (req, res) => {
  try {
    // Mock update
    res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete notification
app.delete('/notifications/:id', authenticateToken, (req, res) => {
  try {
    const { id } = req.params;
    
    // Mock deletion
    res.json({ message: `Notification ${id} deleted successfully` });
  } catch (error) {
    console.error('Error deleting notification:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Send notification
app.post('/notifications/send', authenticateToken, (req, res) => {
  try {
    const { user_id, type, title, message } = req.body;
    
    if (!user_id || !type || !title || !message) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Mock notification creation
    const notification = {
      id: Date.now(),
      user_id,
      type,
      title,
      message,
      read: false,
      created_at: new Date().toISOString()
    };
    
    res.status(201).json({ notification });
  } catch (error) {
    console.error('Error sending notification:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get notification settings
app.get('/notifications/settings', authenticateToken, (req, res) => {
  try {
    const settings = {
      email_notifications: true,
      push_notifications: true,
      meal_reminders: true,
      workout_reminders: true,
      goal_achievements: true,
      nutrition_tips: true,
      weekly_reports: true
    };
    
    res.json({ settings });
  } catch (error) {
    console.error('Error fetching notification settings:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update notification settings
app.put('/notifications/settings', authenticateToken, (req, res) => {
  try {
    const settings = req.body;
    
    // Mock update
    res.json({ message: 'Notification settings updated successfully', settings });
  } catch (error) {
    console.error('Error updating notification settings:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Notification service running on port ${PORT}`);
});
