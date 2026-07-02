const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

const app = express();
const PORT = process.env.PORT || 3006;

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
  res.json({ status: 'OK', service: 'report-service' });
});

// Get combined reports
app.get('/reports/combined', authenticateToken, (req, res) => {
  try {
    const { range = 'week' } = req.query;
    
    // Mock combined report data
    const report = {
      period: range,
      nutrition: {
        total_meals: 21,
        average_calories: 1850,
        macros: {
          protein: 120,
          carbs: 200,
          fat: 65,
          fiber: 25
        },
        top_foods: ['Chicken Breast', 'Brown Rice', 'Broccoli', 'Salmon', 'Sweet Potato'],
        goals_progress: 85
      },
      fitness: {
        total_workouts: 4,
        average_duration: 45,
        total_calories_burned: 1200,
        workout_types: ['Strength Training', 'Cardio', 'HIIT'],
        goals_progress: 75
      },
      overall: {
        health_score: 82,
        streak_days: 7,
        weekly_trend: 'up',
        recommendations: [
          'Increase protein intake by 10g daily',
          'Add 1 more cardio session this week',
          'Consider adding flexibility training'
        ]
      }
    };
    
    res.json({ report });
  } catch (error) {
    console.error('Error generating combined report:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Export report
app.get('/reports/export', authenticateToken, (req, res) => {
  try {
    const { range = 'week' } = req.query;
    
    // Mock PDF export
    const exportData = {
      filename: `health_report_${range}_${new Date().toISOString().split('T')[0]}.pdf`,
      url: `/exports/health_report_${range}_${new Date().toISOString().split('T')[0]}.pdf`,
      generated_at: new Date().toISOString()
    };
    
    res.json({ export: exportData });
  } catch (error) {
    console.error('Error exporting report:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get nutrition report
app.get('/reports/nutrition', authenticateToken, (req, res) => {
  try {
    const { range = 'week' } = req.query;
    
    const nutritionReport = {
      period: range,
      total_meals: 21,
      average_calories: 1850,
      macros: {
        protein: 120,
        carbs: 200,
        fat: 65,
        fiber: 25,
        sugar: 45,
        sodium: 2300
      },
      top_foods: ['Chicken Breast', 'Brown Rice', 'Broccoli', 'Salmon', 'Sweet Potato'],
      goals_progress: 85,
      trends: {
        calories: 'stable',
        protein: 'increasing',
        carbs: 'stable',
        fat: 'decreasing'
      }
    };
    
    res.json({ report: nutritionReport });
  } catch (error) {
    console.error('Error generating nutrition report:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get fitness report
app.get('/reports/fitness', authenticateToken, (req, res) => {
  try {
    const { range = 'week' } = req.query;
    
    const fitnessReport = {
      period: range,
      total_workouts: 4,
      average_duration: 45,
      total_calories_burned: 1200,
      workout_types: ['Strength Training', 'Cardio', 'HIIT'],
      goals_progress: 75,
      trends: {
        frequency: 'increasing',
        duration: 'stable',
        intensity: 'increasing'
      },
      top_exercises: ['Bench Press', 'Squats', 'Running', 'Deadlifts', 'Pull-ups']
    };
    
    res.json({ report: fitnessReport });
  } catch (error) {
    console.error('Error generating fitness report:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Report service running on port ${PORT}`);
});
