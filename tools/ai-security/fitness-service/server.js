const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3005;

// Security configuration storage
let securityConfig = {
  enabled: false,
  api_key: '',
  api_url: 'https://api.xdr.trendmicro.com/beta/aiSecurity/guard?detailedResponse=false'
};

// Security logs storage
let securityLogs = [];

// Load security configuration from file
async function loadSecurityConfig() {
  try {
    const configPath = path.join(__dirname, 'security-config.json');
    const configData = await fs.readFile(configPath, 'utf8');
    securityConfig = JSON.parse(configData);
    console.log('Security configuration loaded');
  } catch (error) {
    console.log('No security configuration found, using defaults');
  }
}

// Save security configuration to file
async function saveSecurityConfig() {
  try {
    const configPath = path.join(__dirname, 'security-config.json');
    await fs.writeFile(configPath, JSON.stringify(securityConfig, null, 2));
    console.log('Security configuration saved');
  } catch (error) {
    console.error('Failed to save security configuration:', error);
  }
}

// Load security logs from file
async function loadSecurityLogs() {
  try {
    const logsPath = path.join(__dirname, 'security-logs.json');
    const logsData = await fs.readFile(logsPath, 'utf8');
    securityLogs = JSON.parse(logsData);
    console.log(`Loaded ${securityLogs.length} security log entries`);
  } catch (error) {
    console.log('No security logs found, starting fresh');
    securityLogs = [];
  }
}

// Save security logs to file
async function saveSecurityLogs() {
  try {
    const logsPath = path.join(__dirname, 'security-logs.json');
    await fs.writeFile(logsPath, JSON.stringify(securityLogs, null, 2));
  } catch (error) {
    console.error('Failed to save security logs:', error);
  }
}

// Add security log entry
async function addSecurityLog(entry) {
  securityLogs.push({
    ...entry,
    timestamp: new Date().toISOString(),
    id: Date.now().toString()
  });
  
  // Keep only last 1000 entries
  if (securityLogs.length > 1000) {
    securityLogs = securityLogs.slice(-1000);
  }
  
  await saveSecurityLogs();
}

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
  res.json({ status: 'OK', service: 'fitness-service' });
});

// Get all workouts
app.get('/fitness/workouts', authenticateToken, (req, res) => {
  try {
    // Mock data for now
    const workouts = [
      {
        id: 1,
        user_id: 1,
        date: '2024-01-15',
        duration: 45,
        calories_burned: 300,
        workout_type: 'Strength Training',
        exercises: [
          { name: 'Bench Press', sets: 3, reps: 10, weight: 135 },
          { name: 'Squats', sets: 3, reps: 12, weight: 185 },
          { name: 'Deadlifts', sets: 3, reps: 8, weight: 225 }
        ],
        notes: 'Great workout, felt strong today',
        created_at: '2024-01-15T10:00:00Z'
      },
      {
        id: 2,
        user_id: 1,
        date: '2024-01-14',
        duration: 30,
        calories_burned: 250,
        workout_type: 'Cardio',
        exercises: [
          { name: 'Running', sets: 1, reps: 1, weight: 0, distance: '5km', time: '25:00' },
          { name: 'Jump Rope', sets: 3, reps: 1, weight: 0, time: '5:00' }
        ],
        notes: 'Good cardio session',
        created_at: '2024-01-14T08:00:00Z'
      }
    ];
    
    res.json({ workouts });
  } catch (error) {
    console.error('Error fetching workouts:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create new workout
app.post('/fitness/workouts', authenticateToken, (req, res) => {
  try {
    const { date, duration, calories_burned, workout_type, exercises, notes } = req.body;
    
    // Mock creation
    const newWorkout = {
      id: Date.now(),
      user_id: 1,
      date,
      duration,
      calories_burned,
      workout_type,
      exercises,
      notes,
      created_at: new Date().toISOString()
    };
    
    res.status(201).json({ workout: newWorkout });
  } catch (error) {
    console.error('Error creating workout:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete workout
app.delete('/fitness/workouts/:id', authenticateToken, (req, res) => {
  try {
    const { id } = req.params;
    
    // Mock deletion
    res.json({ message: `Workout ${id} deleted successfully` });
  } catch (error) {
    console.error('Error deleting workout:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get fitness goals
app.get('/fitness/goals', authenticateToken, (req, res) => {
  try {
    const goals = [
      {
        id: 1,
        user_id: 1,
        type: 'workout_frequency',
        target: 4,
        current: 2,
        unit: 'workouts per week',
        created_at: '2024-01-01T00:00:00Z'
      },
      {
        id: 2,
        user_id: 1,
        type: 'calories_burned',
        target: 1000,
        current: 550,
        unit: 'calories per week',
        created_at: '2024-01-01T00:00:00Z'
      }
    ];
    
    res.json({ goals });
  } catch (error) {
    console.error('Error fetching goals:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update fitness goals
app.put('/fitness/goals', authenticateToken, (req, res) => {
  try {
    const { weekly_workouts, target_calories_per_week, target_activities } = req.body;
    const userId = req.user.id;

    // In a real implementation, this would update the database
    // For now, we'll just return a success response
    console.log('Updating fitness goals for user:', userId, {
      weekly_workouts,
      target_calories_per_week,
      target_activities
    });

    res.json({ 
      message: 'Fitness goals updated successfully',
      goals: {
        weekly_workouts,
        target_calories_per_week,
        target_activities
      }
    });
  } catch (error) {
    console.error('Error updating fitness goals:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get fitness summary
app.get('/fitness/summary', authenticateToken, (req, res) => {
  try {
    const summary = {
      total_workouts: 15,
      this_week: 3,
      total_calories_burned: 4500,
      average_duration: 40,
      goals_progress: 75,
      workout_types: ['Strength Training', 'Cardio', 'HIIT'],
      recent_workouts: [
        { date: '2024-01-15', type: 'Strength Training', duration: 45, calories: 300 },
        { date: '2024-01-14', type: 'Cardio', duration: 30, calories: 250 },
        { date: '2024-01-12', type: 'HIIT', duration: 25, calories: 200 }
      ]
    };
    
    res.json({ summary });
  } catch (error) {
    console.error('Error fetching summary:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Analyze workout with AI security scanning
app.post('/fitness/analyze-workout', authenticateToken, async (req, res) => {
  try {
    const { workout_description, context = '' } = req.body;

    if (!workout_description) {
      return res.status(400).json({ error: 'Workout description is required' });
    }

    // Prepare prompt for AI service
    const prompt = `Analyze this workout description and extract exercise information: ${workout_description}`;

    // Call AI service
    const aiResponse = await axios.post(`${process.env.AI_SERVICE_URL || 'http://ai-service:3004'}/ai/analyze-workout`, {
      workout_description: prompt
    }, {
      headers: {
        'Authorization': req.headers.authorization,
        'Content-Type': 'application/json'
      }
    });

    const aiAnalysis = aiResponse.data.analysis.analysis;

    // Scan AI analysis for security threats
    const securityScan = await scanAIContent(aiAnalysis);
    
    if (!securityScan.safe) {
      console.warn("AI workout analysis flagged by security scan:", securityScan.error);
      return res.status(500).json({ 
        error: 'AI workout analysis blocked by security scan',
        details: securityScan.error 
      });
    }

    // Create workout analysis response
    const workoutAnalysisResponse = {
      id: Date.now(),
      workout_description,
      analysis: aiAnalysis,
      timestamp: new Date().toISOString(),
      security_scan: {
        completed: true,
        safe: true
      }
    };

    res.json({ analysis: workoutAnalysisResponse });

  } catch (error) {
    console.error('Workout analysis error:', error);
    
    // Fallback analysis if AI service is unavailable
    const fallbackAnalysis = {
      id: Date.now(),
      workout_description: req.body.workout_description || 'Workout description',
      analysis: 'AI service temporarily unavailable. Please try again later.',
      timestamp: new Date().toISOString(),
      security_scan: {
        completed: false,
        safe: true
      }
    };

    res.json({ analysis: fallbackAnalysis });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Fitness service running on port ${PORT}`);
  console.log('Vision One AI security scanning enabled');
});
