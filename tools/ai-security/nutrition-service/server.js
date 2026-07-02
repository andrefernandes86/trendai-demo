const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const multer = require('multer');
const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');
const zlib = require('zlib');
const { pipeline } = require('stream/promises');
const cron = require('node-cron');
const puppeteer = require('puppeteer');
const AuthUtils = require('./simple-auth');
const db = require('./simple-database');
const redis = require('./simple-redis');

const app = express();
const PORT = process.env.PORT || 3002;

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

// Vision One API configuration
const V1_API_KEY = "eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJjaWQiOiJjYjM3YmU2Mi0zMzJjLTQ4NjctYWFkOC0xZDVkODE3NDYzMjYiLCJjcGlkIjoic3ZwIiwicHBpZCI6ImN1cyIsIml0IjoxNzU1Mjc3NjMzLCJldCI6MjIyODMxNzYzMiwiaWQiOiI2NjUyYmQyYS0xN2EzLTRmOGEtOGYwZC0xYWE1MWJjNWFhNTgiLCJ0b2tlblVzZSI6ImN1c3RvbWVyIn0.V8ZRet5D6xXJZyTl2p07QJFC4Fo03C_Z8wmxWk5Bm6Oajs8yq4wNv6RPJgnSCXmHJLzOFUEg6MSYne2bOrAHz2EIoZGuAhWFSyE0rW7Cpt0yHYhbpa1UqrZFPYWMNLOUdgd6h8hjYFQ8eD_v0CDrIHEjAa4dgItyPZlAXu7enc6uiycXLeVCrRHOA0SeVH2KeX52m-2Ds7SLeqMuCwG2tnF1LIgLpUMVuwASrRL2WZwsbio14FJF0JkdNkHLcCsZdJxKNVAU3vDYMhnSwfVj3B8_ae-zMUvQHhE458bI1FFXabLYCC7ftg7iwPxHfuOJm49sa2j2xXWG6dXl9QAiZvEQ2YSpoGvh7d8hduO7HCg2VKWWXHqxidyAlCyxshbJfKRdu0ugButJE48b5GeHPK4rXdnHz6r6cfPBI30t58hLJrP59hlZ1LfpsiS6T1pkktatYrNPaeRdIOlSV5lfzl7wn6Xwl0-ICexr6Xl9JFcj46Q718SQbeGya3FRrSc4mkoiINar2LteZSYtoErZ4npiEbF0lPZIsFIvAsLHD67RG0puow-EoL9lCHgFEjDCeSROJ6slt4cT4zKaOzY1_E0-EKoPZaJuGL_CVFZBv6syVS0MWFhJNS7MI4U5U-bkJ7jjclp2kJdA5UQgW3hhT2EGCOUe3MZU1t5qXxkGun4";
const V1_API_URL = "https://api.xdr.trendmicro.com/beta/aiSecurity/guard?detailedResponse=false";

// AI Security scanning function
async function scanAIContent(content) {
  if (!securityConfig.enabled) {
    // Mock security scan when disabled
    const mockThreats = [
      'api_key', 'password', 'secret', 'token', 'credential', 'private_key',
      'database_url', 'connection_string', 'aws_key', 'azure_key'
    ];
    
    const hasThreat = mockThreats.some(threat => 
      content.toLowerCase().includes(threat.toLowerCase())
    );
    
    if (hasThreat) {
      // Log the blocked content
      await addSecurityLog({
        type: 'blocked',
        reason: 'Mock security scan detected sensitive information',
        content: content,
        response: 'Content blocked by mock security scan'
      });
      
      return { 
        safe: false, 
        error: 'Content blocked by mock security scan',
        details: 'Mock security scan detected sensitive information'
      };
    }
    
    return { safe: true, result: { status: 'mock_scan_passed' } };
  }

  try {
    const headers = {
      "Authorization": `Bearer ${securityConfig.api_key}`,
      "Content-Type": "application/json"
    };

    const payload = {
      "guard": content
    };

    const response = await axios.post(securityConfig.api_url, payload, { headers });
    
    if (response.status === 200) {
      const result = response.data;
      
      // Check if content was blocked
      if (result && result.status === 'blocked') {
        // Log the blocked content
        await addSecurityLog({
          type: 'blocked',
          reason: result.reason || 'Vision One security scan blocked content',
          content: content,
          response: result,
          api_response: response.data
        });
        
        return { 
          safe: false, 
          error: result.reason || 'Content blocked by security scan',
          details: result
        };
      }
      
      return { safe: true, result: result };
    } else {
      console.error(`AI security scan failed: ${response.status} - ${response.data}`);
      return { safe: false, error: `Scan failed: ${response.status}` };
    }
  } catch (error) {
    console.error("AI security scan error:", error.message);
    return { safe: false, error: error.message };
  }
}

// Security middleware
app.use(helmet());
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://192.168.1.100:3003',
    credentials: true
}));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP'
});
app.use('/nutrition/', limiter);

app.use(express.json({ limit: '10mb' }));

// Configure multer for file uploads
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    },
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only image files are allowed'));
        }
    }
});

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
    res.json({ status: 'OK', service: 'nutrition-service' });
});

// Get meals
app.get('/nutrition/meals', AuthUtils.authenticateUser, async (req, res) => {
    try {
        const userId = req.user.id;
        const { start_date, end_date, meal_type } = req.query;

        let query = `
            SELECT m.id, m.name, m.meal_type, m.date_time, m.total_calories, m.total_carbs, m.total_protein, m.total_fat, m.total_fiber, m.total_sugar, m.confirmed, m.comments,
                   json_agg(json_build_object(
                       'id', mi.id,
                       'food_name', mi.food_name,
                       'quantity', mi.quantity,
                       'unit', mi.unit,
                       'calories', mi.calories,
                       'carbs', mi.carbs,
                       'protein', mi.protein,
                       'fat', mi.fat,
                       'fiber', mi.fiber,
                       'sugar', mi.sugar
                   )) as items
            FROM nutrition.meals m
            LEFT JOIN nutrition.meal_items mi ON m.id = mi.meal_id
            WHERE m.user_id = $1
        `;
        
        const params = [userId];
        let paramIndex = 2;

        if (start_date) {
            query += ` AND m.date_time >= $${paramIndex}`;
            params.push(start_date);
            paramIndex++;
        }

        if (end_date) {
            query += ` AND m.date_time <= $${paramIndex}`;
            params.push(end_date);
            paramIndex++;
        }

        if (meal_type) {
            query += ` AND m.meal_type = $${paramIndex}`;
            params.push(meal_type);
        }

        query += ` GROUP BY m.id ORDER BY m.date_time DESC`;

        const result = await db.query(query, params);
        
        res.json({ meals: result.rows });

    } catch (error) {
        console.error('Get meals error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Create meal
app.post('/nutrition/meals', AuthUtils.authenticateUser, async (req, res) => {
    try {
        const userId = req.user.id;
        const { name, meal_type, date_time, items, confirmed = false, comments } = req.body;

        if (!name || !meal_type || !date_time || !items || !Array.isArray(items)) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        // Calculate totals
        const totals = items.reduce((acc, item) => {
            acc.calories += parseFloat(item.calories || 0);
            acc.carbs += parseFloat(item.carbs || 0);
            acc.protein += parseFloat(item.protein || 0);
            acc.fat += parseFloat(item.fat || 0);
            acc.fiber += parseFloat(item.fiber || 0);
            acc.sugar += parseFloat(item.sugar || 0);
            return acc;
        }, { calories: 0, carbs: 0, protein: 0, fat: 0, fiber: 0, sugar: 0 });

        // Insert meal
        const mealResult = await db.query(
            `INSERT INTO nutrition.meals (user_id, name, meal_type, date_time, total_calories, total_carbs, total_protein, total_fat, total_fiber, total_sugar, confirmed, comments)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
             RETURNING id`,
            [userId, name, meal_type, date_time, totals.calories, totals.carbs, totals.protein, totals.fat, totals.fiber, totals.sugar, confirmed, comments || null]
        );

        const mealId = mealResult.rows[0].id;

        // Insert meal items
        for (const item of items) {
            await db.query(
                `INSERT INTO nutrition.meal_items (meal_id, food_name, quantity, unit, calories, carbs, protein, fat, fiber, sugar)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
                [mealId, item.food_name, item.quantity, item.unit, item.calories, item.carbs, item.protein, item.fat, item.fiber, item.sugar]
            );
        }

        res.status(201).json({ 
            message: 'Meal created successfully',
            meal_id: mealId
        });

    } catch (error) {
        console.error('Create meal error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Update meal
app.put('/nutrition/meals/:id', AuthUtils.authenticateUser, async (req, res) => {
    try {
        const userId = req.user.id;
        const mealId = req.params.id;
        const { name, meal_type, date_time, items, confirmed } = req.body;

        // Check if meal belongs to user
        const mealCheck = await db.query(
            'SELECT id FROM nutrition.meals WHERE id = $1 AND user_id = $2',
            [mealId, userId]
        );

        if (mealCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Meal not found' });
        }

        // Calculate totals if items provided
        let totals = { calories: 0, carbs: 0, protein: 0, fat: 0, fiber: 0, sugar: 0 };
        if (items && Array.isArray(items)) {
            totals = items.reduce((acc, item) => {
                acc.calories += parseFloat(item.calories || 0);
                acc.carbs += parseFloat(item.carbs || 0);
                acc.protein += parseFloat(item.protein || 0);
                acc.fat += parseFloat(item.fat || 0);
                acc.fiber += parseFloat(item.fiber || 0);
                acc.sugar += parseFloat(item.sugar || 0);
                return acc;
            }, { calories: 0, carbs: 0, protein: 0, fat: 0, fiber: 0, sugar: 0 });
        }

        // Update meal
        const updateFields = [];
        const updateParams = [mealId, userId];
        let paramIndex = 3;

        if (name !== undefined) {
            updateFields.push(`name = $${paramIndex}`);
            updateParams.push(name);
            paramIndex++;
        }

        if (meal_type !== undefined) {
            updateFields.push(`meal_type = $${paramIndex}`);
            updateParams.push(meal_type);
            paramIndex++;
        }

        if (date_time !== undefined) {
            updateFields.push(`date_time = $${paramIndex}`);
            updateParams.push(date_time);
            paramIndex++;
        }

        if (confirmed !== undefined) {
            updateFields.push(`confirmed = $${paramIndex}`);
            updateParams.push(confirmed);
            paramIndex++;
        }

        if (items && Array.isArray(items)) {
            updateFields.push(`total_calories = $${paramIndex}`);
            updateParams.push(totals.calories);
            paramIndex++;

            updateFields.push(`total_carbs = $${paramIndex}`);
            updateParams.push(totals.carbs);
            paramIndex++;

            updateFields.push(`total_protein = $${paramIndex}`);
            updateParams.push(totals.protein);
            paramIndex++;

            updateFields.push(`total_fat = $${paramIndex}`);
            updateParams.push(totals.fat);
            paramIndex++;

            updateFields.push(`total_fiber = $${paramIndex}`);
            updateParams.push(totals.fiber);
            paramIndex++;

            updateFields.push(`total_sugar = $${paramIndex}`);
            updateParams.push(totals.sugar);
            paramIndex++;
        }

        if (updateFields.length > 0) {
            await db.query(
                `UPDATE nutrition.meals SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = $1 AND user_id = $2`,
                updateParams
            );
        }

        // Update meal items if provided
        if (items && Array.isArray(items)) {
            // Delete existing items
            await db.query('DELETE FROM nutrition.meal_items WHERE meal_id = $1', [mealId]);

            // Insert new items
            for (const item of items) {
                await db.query(
                    `INSERT INTO nutrition.meal_items (meal_id, food_name, quantity, unit, calories, carbs, protein, fat, fiber, sugar)
                     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
                    [mealId, item.food_name, item.quantity, item.unit, item.calories, item.carbs, item.protein, item.fat, item.fiber, item.sugar]
                );
            }
        }

        res.json({ message: 'Meal updated successfully' });

    } catch (error) {
        console.error('Update meal error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Delete meal
app.delete('/nutrition/meals/:id', AuthUtils.authenticateUser, async (req, res) => {
    try {
        const userId = req.user.id;
        const mealId = req.params.id;

        // Check if meal belongs to user
        const mealCheck = await db.query(
            'SELECT id FROM nutrition.meals WHERE id = $1 AND user_id = $2',
            [mealId, userId]
        );

        if (mealCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Meal not found' });
        }

        // Delete meal (cascade will delete meal items)
        await db.query('DELETE FROM nutrition.meals WHERE id = $1 AND user_id = $2', [mealId, userId]);

        res.json({ message: 'Meal deleted successfully' });

    } catch (error) {
        console.error('Delete meal error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Analyze meal with AI
app.post('/nutrition/analyze-text', AuthUtils.authenticateUser, async (req, res) => {
    try {
        const userId = req.user.id;
        const { text, meal_type, date_time } = req.body;

        if (!text) {
            return res.status(400).json({ error: 'Text is required' });
        }

        // Call AI service
        const aiResponse = await axios.post(`${process.env.AI_SERVICE_URL}/ai/chat`, {
            message: `Analyze this meal description and extract nutritional information: ${text}. Please provide the information in a structured format with food items, quantities, and nutritional values.`,
            assistant_type: 'nutrition',
            context: `Meal type: ${meal_type || 'not specified'}, Date: ${date_time || 'not specified'}`
        }, {
            headers: {
                'Authorization': req.headers.authorization,
                'Content-Type': 'application/json'
            }
        });

        res.json(aiResponse.data);

    } catch (error) {
        console.error('Analyze text error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Analyze meal image with AI
app.post('/nutrition/analyze-image', AuthUtils.authenticateUser, upload.single('image'), async (req, res) => {
    try {
        const userId = req.user.id;
        const { meal_type, date_time } = req.body;

        if (!req.file) {
            return res.status(400).json({ error: 'Image file is required' });
        }

        // Convert image to base64
        const imageBase64 = req.file.buffer.toString('base64');

        // Call AI service
        const aiResponse = await axios.post(`${process.env.AI_SERVICE_URL}/ai/analyze-image`, {
            image: imageBase64,
            prompt: `Analyze this food image and extract nutritional information. Please provide the information in a structured format with food items, quantities, and nutritional values.`,
            assistant_type: 'nutrition'
        }, {
            headers: {
                'Authorization': req.headers.authorization,
                'Content-Type': 'application/json'
            }
        });

        res.json(aiResponse.data);

    } catch (error) {
        console.error('Analyze image error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get nutrition goals
app.get('/nutrition/goals', AuthUtils.authenticateUser, async (req, res) => {
    try {
        const userId = req.user.id;

        const result = await db.query(
            'SELECT * FROM nutrition.nutrition_goals WHERE user_id = $1',
            [userId]
        );

        if (result.rows.length === 0) {
            // Create default goals
            const defaultGoals = await db.query(
                `INSERT INTO nutrition.nutrition_goals (user_id, daily_calories, carbs_ratio, protein_ratio, fat_ratio, daily_water_goal)
                 VALUES ($1, 2000, 45.0, 25.0, 30.0, 2000.0)
                 RETURNING *`,
                [userId]
            );
            res.json({ goals: defaultGoals.rows[0] });
        } else {
            res.json({ goals: result.rows[0] });
        }

    } catch (error) {
        console.error('Get nutrition goals error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Update nutrition goals
app.put('/nutrition/goals', AuthUtils.authenticateUser, async (req, res) => {
    try {
        const userId = req.user.id;
        const { daily_calories, carbs_ratio, protein_ratio, fat_ratio, daily_water_goal } = req.body;

        await db.query(
            `INSERT INTO nutrition.nutrition_goals (user_id, daily_calories, carbs_ratio, protein_ratio, fat_ratio, daily_water_goal)
             VALUES ($1, $2, $3, $4, $5, $6)
             ON CONFLICT (user_id) 
             DO UPDATE SET 
                daily_calories = EXCLUDED.daily_calories,
                carbs_ratio = EXCLUDED.carbs_ratio,
                protein_ratio = EXCLUDED.protein_ratio,
                fat_ratio = EXCLUDED.fat_ratio,
                daily_water_goal = EXCLUDED.daily_water_goal,
                updated_at = CURRENT_TIMESTAMP`,
            [userId, daily_calories, carbs_ratio, protein_ratio, fat_ratio, daily_water_goal]
        );

        res.json({ message: 'Nutrition goals updated successfully' });

    } catch (error) {
        console.error('Update nutrition goals error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get nutrition summary
app.get('/nutrition/summary', AuthUtils.authenticateUser, async (req, res) => {
    try {
        const userId = req.user.id;
        const { start_date, end_date } = req.query;

        let query = `
            SELECT 
                COUNT(*) as total_meals,
                SUM(total_calories) as total_calories,
                SUM(total_carbs) as total_carbs,
                SUM(total_protein) as total_protein,
                SUM(total_fat) as total_fat,
                SUM(total_fiber) as total_fiber,
                SUM(total_sugar) as total_sugar,
                AVG(total_calories) as avg_calories_per_meal
            FROM nutrition.meals 
            WHERE user_id = $1 AND confirmed = true
        `;
        
        const params = [userId];
        let paramIndex = 2;

        if (start_date) {
            query += ` AND date_time >= $${paramIndex}`;
            params.push(start_date);
            paramIndex++;
        }

        if (end_date) {
            query += ` AND date_time <= $${paramIndex}`;
            params.push(end_date);
        }

        const result = await db.query(query, params);
        
        res.json({ summary: result.rows[0] });

    } catch (error) {
        console.error('Get nutrition summary error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// OpenFoodFacts data management
const OPENFOODFACTS_DATA_DIR = path.join(__dirname, 'data');
const OPENFOODFACTS_FILE = path.join(OPENFOODFACTS_DATA_DIR, 'openfoodfacts-products.csv');
const DOWNLOAD_STATUS_KEY = 'openfoodfacts_download_status';

// Global download status
let downloadStatus = {
  isDownloading: false,
  progress: 0,
  status: 'idle',
  lastUpdate: null,
  error: null
};

// Initialize automatic downloads
async function initializeAutomaticDownloads() {
  console.log('Initializing automatic OpenFoodFacts downloads...');
  
  // Download on startup
  await updateOpenFoodFactsData();
  
  // Schedule daily download at 1 AM
  cron.schedule('0 1 * * *', async () => {
    console.log('Scheduled OpenFoodFacts download starting...');
    await updateOpenFoodFactsData();
  });
  
  console.log('Automatic downloads scheduled - daily at 1 AM');
}

// Ensure data directory exists
async function ensureDataDirectory() {
    try {
        await fs.mkdir(OPENFOODFACTS_DATA_DIR, { recursive: true });
    } catch (error) {
        console.error('Error creating data directory:', error);
    }
}

// Check if OpenFoodFacts data needs update
app.get('/nutrition/openfoodfacts/status', AuthUtils.authenticateUser, async (req, res) => {
    try {
        await ensureDataDirectory();
        
        const fileExists = await fs.access(OPENFOODFACTS_FILE).then(() => true).catch(() => false);
        
        if (!fileExists) {
            return res.json({ 
                needsUpdate: true, 
                lastUpdate: null,
                downloadStatus: downloadStatus
            });
        }

        const stats = await fs.stat(OPENFOODFACTS_FILE);
        const lastUpdate = stats.mtime;
        const hoursSinceUpdate = (Date.now() - lastUpdate.getTime()) / (1000 * 60 * 60);
        
        // Update if more than 24 hours old
        const needsUpdate = hoursSinceUpdate > 24;
        
        res.json({ 
            needsUpdate, 
            lastUpdate: lastUpdate.toISOString(),
            hoursSinceUpdate: Math.round(hoursSinceUpdate),
            downloadStatus: downloadStatus
        });
    } catch (error) {
        console.error('Error checking OpenFoodFacts status:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get download progress
app.get('/nutrition/openfoodfacts/progress', AuthUtils.authenticateUser, async (req, res) => {
    res.json({ downloadStatus });
});

// Update OpenFoodFacts data with progress tracking
app.post('/nutrition/openfoodfacts/update', AuthUtils.authenticateUser, async (req, res) => {
    if (downloadStatus.isDownloading) {
        return res.status(409).json({ error: 'Download already in progress' });
    }

    // Start download in background
    updateOpenFoodFactsData().catch(error => {
        console.error('Background download error:', error);
    });

    res.json({ 
        success: true, 
        message: 'Download started',
        downloadStatus: downloadStatus
    });
});

// Enhanced update function with progress tracking
async function updateOpenFoodFactsData() {
    if (downloadStatus.isDownloading) {
        console.log('Download already in progress, skipping...');
        return;
    }

    try {
        downloadStatus = {
            isDownloading: true,
            progress: 0,
            status: 'starting',
            lastUpdate: null,
            error: null
        };

        await ensureDataDirectory();
        
        const url = 'https://static.openfoodfacts.org/data/en.openfoodfacts.org.products.csv.gz';
        const tempFile = path.join(OPENFOODFACTS_DATA_DIR, 'temp-products.csv.gz');
        
        console.log('Starting OpenFoodFacts download...');
        downloadStatus.status = 'downloading';
        downloadStatus.progress = 10;
        
        // Download with progress tracking
        const response = await axios({
            method: 'GET',
            url: url,
            responseType: 'stream',
            timeout: 600000, // 10 minutes
            onDownloadProgress: (progressEvent) => {
                if (progressEvent.total) {
                    const progress = Math.round((progressEvent.loaded / progressEvent.total) * 80) + 10;
                    downloadStatus.progress = progress;
                }
            }
        });

        const writeStream = require('fs').createWriteStream(tempFile);
        await pipeline(response.data, writeStream);
        
        console.log('Decompressing OpenFoodFacts data...');
        downloadStatus.status = 'decompressing';
        downloadStatus.progress = 85;
        
        // Decompress the file
        const gunzip = zlib.createGunzip();
        const readStream = require('fs').createReadStream(tempFile);
        const writeStream2 = require('fs').createWriteStream(OPENFOODFACTS_FILE);
        
        await pipeline(readStream, gunzip, writeStream2);
        
        // Clean up temp file
        await fs.unlink(tempFile);
        
        downloadStatus.status = 'completed';
        downloadStatus.progress = 100;
        downloadStatus.lastUpdate = new Date().toISOString();
        downloadStatus.isDownloading = false;
        
        console.log('OpenFoodFacts data updated successfully');
        
    } catch (error) {
        console.error('Error updating OpenFoodFacts data:', error);
        downloadStatus.status = 'error';
        downloadStatus.error = error.message;
        downloadStatus.isDownloading = false;
        throw error;
    }
}

// Analyze meal with AI and OpenFoodFacts
app.post('/nutrition/analyze-meal', AuthUtils.authenticateUser, async (req, res) => {
    try {
        const { description, includeOpenFoodFacts = true } = req.body;
        
        if (!description) {
            return res.status(400).json({ error: 'Meal description is required' });
        }

        // Try to call AI service for initial analysis, with fallback
        let analysis;
        try {
            console.log('Calling AI service with user message:', description);
            console.log('AI Service URL:', process.env.AI_SERVICE_URL);
            console.log('Authorization header present:', !!req.headers.authorization);
            
            const aiResponse = await axios.post(`${process.env.AI_SERVICE_URL}/ai/chat`, {
                                message: `Extract foods, portions, and estimate calories, protein, carbs, fat, and sugar from here: ${description}
                     
                     IMPORTANT: Extract GENERIC, SEARCHABLE food names that match database patterns.
                     
                     Examples of good generic names:
                     - "pizza" (not "calabrese pizza" or "margherita pizza")
                     - "beef burger" (not "Big Mac" or "Whopper")
                     - "french fries" (not "McDonald's fries")
                     - "cola" (not "Coca-Cola" or "Pepsi")
                     - "pasta" (not "spaghetti carbonara")
                     
                     IMPORTANT: Pay attention to qualifiers like "just", "only", "without", "no fries", etc.
                     If user says "big mac just the burger", analyze only the burger component.
                     If user says "big mac meal", analyze the full meal with all components.
                     
                     Provide a detailed breakdown with:
                     1. Confidence level (0-100)
                     2. User information (what they actually said)
                     3. Identified meal (generic meal name)
                     4. Individual components with GENERIC, searchable names
                     5. Specific quantities and descriptions for each item
                     6. Search terms that match database patterns
                     7. Use "Generic" as brand unless specific brand is essential
                     8. Food categories
                     
                     Format as JSON with:
                     {
                       "confidence": number,
                       "userInformation": "User said: \"[exact user input]\"",
                       "identifiedMeal": "generic meal name",
                       "understoodItems": [array of understanding points],
                       "mealBreakdown": "description of meal structure",
                       "searchTerms": [array of generic search terms for the whole meal],
                       "suggestedItems": [
                         {
                           "name": "generic food name",
                           "quantity": number,
                           "unit": "serving unit",
                           "description": "detailed description",
                           "quantityDescription": "specific quantity description with weights/measurements",
                           "searchTerms": [array of generic search terms for this item],
                           "brand": "Generic",
                           "category": "food category"
                         }
                       ]
                     }
                     
                     Focus on GENERIC terms that will match the OpenFoodFacts database patterns.`,
                assistant_type: 'nutrition',
                context: 'Meal analysis for nutritional tracking'
            }, {
                headers: {
                    'Authorization': req.headers.authorization,
                    'Content-Type': 'application/json'
                },
                timeout: 30000 // 30 second timeout
            });

            console.log('AI service response received:', aiResponse.status);
            analysis = aiResponse.data.response;
        } catch (aiError) {
            console.log('AI service unavailable, using fallback analysis');
            console.log('AI Error details:', aiError.message);
            if (aiError.response) {
                console.log('AI Error status:', aiError.response.status);
                console.log('AI Error data:', aiError.response.data);
            }
                                // Enhanced fallback analysis with searchable terms
                    analysis = {
                        confidence: 85,
                        userInformation: `User said: "${description}"`,
                        identifiedMeal: description,
                        understoodItems: [
                            'Using fallback analysis due to AI service unavailability',
                            'Ready for nutritional analysis'
                        ],
                        mealBreakdown: `${description} appears to be a complete meal:`,
                        searchTerms: [description, `${description} nutrition`, `${description} calories`],
                        suggestedItems: [{
                            name: description,
                            quantity: 1,
                            unit: 'serving',
                            description: 'Complete meal serving, details to be determined from nutritional database',
                            quantityDescription: '1 standard serving (quantity to be determined)',
                            searchTerms: [description, `${description} nutrition facts`, `${description} ingredients`],
                            brand: 'Generic',
                            category: 'Meal'
                        }]
                    };
        }
        
        // Parse AI response
        try {
            if (typeof analysis === 'string') {
                analysis = JSON.parse(analysis);
            }
        } catch (parseError) {
            console.error('Error parsing AI response:', parseError);
            analysis = {
                confidence: 70,
                understoodItems: ['Unable to parse AI response'],
                suggestedItems: []
            };
        }

        // If OpenFoodFacts is enabled, enhance with nutritional data using searchable terms
        if (includeOpenFoodFacts && analysis.suggestedItems) {
            analysis.suggestedItems = await enhanceWithOpenFoodFacts(analysis.suggestedItems);
        }

        // Calculate totals
        const totals = analysis.suggestedItems.reduce((acc, item) => {
            acc.calories += parseFloat(item.calories || 0);
            acc.carbs += parseFloat(item.carbs || 0);
            acc.protein += parseFloat(item.protein || 0);
            acc.fat += parseFloat(item.fat || 0);
            acc.fiber += parseFloat(item.fiber || 0);
            acc.sugar += parseFloat(item.sugar || 0);
            return acc;
        }, { calories: 0, carbs: 0, protein: 0, fat: 0, fiber: 0, sugar: 0 });

        analysis.totalCalories = Math.round(totals.calories);
        analysis.totalCarbs = Math.round(totals.carbs);
        analysis.totalProtein = Math.round(totals.protein);
        analysis.totalFat = Math.round(totals.fat);
        analysis.totalFiber = Math.round(totals.fiber);
        analysis.totalSugar = Math.round(totals.sugar);

        // Add nutrition score and levels
        analysis.nutritionScore = calculateNutritionScore(totals);
        analysis.nutritionLevels = calculateNutritionLevels(totals);

        res.json({ 
            success: true, 
            analysis 
        });

    } catch (error) {
        console.error('Meal analysis error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Generate final meal report
app.post('/nutrition/generate-report', AuthUtils.authenticateUser, async (req, res) => {
    try {
        const { analysis, confirmed } = req.body;
        
        if (!analysis || !confirmed) {
            return res.status(400).json({ error: 'Invalid request' });
        }

        // Generate comprehensive report
        const meal = {
            name: `Meal - ${new Date().toLocaleDateString()}`,
            meal_type: 'lunch', // Default, can be enhanced
            date_time: new Date().toISOString(),
            items: analysis.suggestedItems.map(item => ({
                food_name: item.name,
                quantity: item.quantity,
                unit: item.unit,
                calories: item.calories || 0,
                carbs: item.carbs || 0,
                protein: item.protein || 0,
                fat: item.fat || 0,
                fiber: item.fiber || 0,
                sugar: item.sugar || 0,
                nutriScore: item.nutriScore,
                foodType: item.foodType,
                ingredients: item.ingredients,
                allergens: item.allergens,
                additives: item.additives
            })),
            total_calories: analysis.totalCalories,
            total_carbs: analysis.totalCarbs,
            total_protein: analysis.totalProtein,
            total_fat: analysis.totalFat,
            total_fiber: analysis.totalFiber,
            total_sugar: analysis.totalSugar,
            confirmed: true
        };

        res.json({ 
            success: true, 
            meal 
        });

    } catch (error) {
        console.error('Report generation error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Helper function to enhance items with OpenFoodFacts data and internet fallback
async function enhanceWithOpenFoodFacts(items) {
    try {
        const fileExists = await fs.access(OPENFOODFACTS_FILE).then(() => true).catch(() => false);
        
        if (!fileExists) {
            console.log('OpenFoodFacts data not available, using internet fallback');
            return await enhanceWithInternetSearch(items);
        }

        const enhancedItems = [];
        
        for (const item of items) {
            try {
                // Use search terms for better matching with multilingual support
                const searchTerms = item.searchTerms || [item.name];
                let match = null;
                let source = 'fallback';
                
                // Try each search term to find the best match (including translated terms)
                for (const searchTerm of searchTerms) {
                    // Try original term
                    match = await searchInCSV(searchTerm.toLowerCase());
                    if (match) {
                        source = 'openfoodfacts';
                        break;
                    }
                    
                    // Try translated term
                    const translatedTerm = translateFoodToEnglish(searchTerm);
                    if (translatedTerm !== searchTerm) {
                        match = await searchInCSV(translatedTerm.toLowerCase());
                        if (match) {
                            source = 'openfoodfacts';
                            break;
                        }
                    }
                }
                
                if (match) {
                    enhancedItems.push({
                        ...item,
                        calories: match.energy_100g || item.calories || 100,
                        carbs: match.carbohydrates_100g || item.carbs || 20,
                        protein: match.proteins_100g || item.protein || 5,
                        fat: match.fat_100g || item.fat || 2,
                        fiber: match.fiber_100g || item.fiber || 2,
                        sugar: match.sugars_100g || item.sugar || 5,
                        nutriScore: match.nutriscore_grade,
                        foodType: match.nova_group,
                        ingredients: match.ingredients_text ? match.ingredients_text.split(',').map(i => i.trim()) : [],
                        allergens: match.allergens_tags ? match.allergens_tags.split(',').map(a => a.trim()) : [],
                        additives: match.additives_tags ? match.additives_tags.split(',').map(a => a.trim()) : [],
                        source: source
                    });
                } else {
                    // Try internet search with the best search term
                    console.log(`No OpenFoodFacts match for "${item.name}", trying internet search...`);
                    const bestSearchTerm = searchTerms[0] || item.name;
                    const internetData = await searchFoodOnInternet(bestSearchTerm);
                    enhancedItems.push({
                        ...item,
                        ...internetData,
                        source: 'internet'
                    });
                }
            } catch (itemError) {
                console.error('Error enhancing item:', item.name, itemError);
                // Fallback to predefined nutritional data for common items
                const fallbackData = getFallbackNutritionData(item.name);
                enhancedItems.push({
                    ...item,
                    ...fallbackData,
                    source: 'fallback'
                });
            }
        }
        
        return enhancedItems;
    } catch (error) {
        console.error('Error enhancing with OpenFoodFacts:', error);
        return await enhanceWithInternetSearch(items);
    }
}

// Multilingual food translation function
function translateFoodToEnglish(foodName) {
    const lowerName = foodName.toLowerCase();
    
    // Portuguese to English food mappings
    const portugueseFoodMap = {
        'arroz': 'rice', 'feijão': 'beans', 'feijao': 'beans', 'frango': 'chicken', 'carne': 'beef',
        'porco': 'pork', 'peixe': 'fish', 'camarão': 'shrimp', 'camarao': 'shrimp', 'batata': 'potato',
        'batatas': 'potatoes', 'batata frita': 'french fries', 'batatas fritas': 'french fries',
        'salada': 'salad', 'pão': 'bread', 'pao': 'bread', 'queijo': 'cheese', 'leite': 'milk',
        'ovos': 'eggs', 'ovo': 'egg', 'macarrão': 'pasta', 'macarrao': 'pasta', 'espaguete': 'spaghetti',
        'lasanha': 'lasagna', 'sopa': 'soup', 'suco': 'juice', 'refrigerante': 'soda', 'coca': 'coke',
        'cerveja': 'beer', 'vinho': 'wine', 'água': 'water', 'agua': 'water', 'café': 'coffee',
        'cafe': 'coffee', 'chá': 'tea', 'cha': 'tea', 'maçã': 'apple', 'maca': 'apple',
        'banana': 'banana', 'laranja': 'orange', 'uva': 'grape', 'morango': 'strawberry',
        'morangos': 'strawberries', 'abacaxi': 'pineapple', 'manga': 'mango', 'abacate': 'avocado',
        'tomate': 'tomato', 'cebola': 'onion', 'alho': 'garlic', 'cenoura': 'carrot',
        'cenouras': 'carrots', 'brócolis': 'broccoli', 'brocolis': 'broccoli', 'espinafre': 'spinach',
        'alface': 'lettuce', 'pepino': 'cucumber', 'azeite': 'olive oil', 'manteiga': 'butter',
        'creme': 'cream', 'iogurte': 'yogurt', 'presunto': 'ham', 'salsicha': 'sausage',
        'linguiça': 'sausage', 'linguica': 'sausage', 'bacon': 'bacon', 'mortadela': 'bologna',
        'salame': 'salami', 'pepperoni': 'pepperoni', 'calabresa': 'calabrese', 'mussarela': 'mozzarella',
        'parmesão': 'parmesan', 'parmesao': 'parmesan', 'gorgonzola': 'gorgonzola', 'provolone': 'provolone',
        'ricota': 'ricotta', 'cottage': 'cottage cheese', 'farofa': 'cassava flour', 'mandioca': 'cassava',
        'aipim': 'cassava', 'inhame': 'yam', 'batata doce': 'sweet potato', 'batata-doce': 'sweet potato',
        'milho': 'corn', 'ervilha': 'pea', 'ervilhas': 'peas', 'lentilha': 'lentil', 'lentilhas': 'lentils',
        'grão de bico': 'chickpea', 'grao de bico': 'chickpea', 'grãos de bico': 'chickpeas',
        'graos de bico': 'chickpeas', 'quinoa': 'quinoa', 'aveia': 'oatmeal', 'granola': 'granola',
        'cereal': 'cereal', 'pão de queijo': 'cheese bread', 'pao de queijo': 'cheese bread',
        'coxinha': 'chicken croquette', 'pastel': 'pastry', 'empada': 'pie', 'esfiha': 'meat pie',
        'kibe': 'kibbeh', 'quibe': 'kibbeh', 'acarajé': 'black eyed pea fritter', 'acaraje': 'black eyed pea fritter',
        'moqueca': 'fish stew', 'vatapá': 'shrimp stew', 'vatapa': 'shrimp stew', 'caruru': 'okra stew',
        'bobó': 'cassava stew', 'bobo': 'cassava stew', 'feijoada': 'black bean stew', 'churrasco': 'barbecue',
        'churrascaria': 'barbecue restaurant', 'rodízio': 'all you can eat', 'rodizio': 'all you can eat',
        'self service': 'buffet', 'self-service': 'buffet', 'prato feito': 'plate lunch', 'prato-feito': 'plate lunch',
        'marmita': 'packed lunch', 'quentinha': 'packed lunch', 'lanche': 'snack', 'sobremesa': 'dessert',
        'doce': 'sweet', 'bolo': 'cake', 'torta': 'pie', 'pudim': 'pudding', 'sorvete': 'ice cream',
        'chocolate': 'chocolate', 'bombom': 'chocolate bonbon', 'brigadeiro': 'chocolate truffle',
        'beijinho': 'coconut truffle', 'quindim': 'coconut custard', 'cocada': 'coconut candy',
        'paçoca': 'peanut candy', 'pacoca': 'peanut candy', 'rapadura': 'brown sugar', 'açúcar': 'sugar',
        'acucar': 'sugar', 'mel': 'honey', 'geleia': 'jam', 'geleia de morango': 'strawberry jam',
        'geleia de morangos': 'strawberry jam', 'manteiga de amendoim': 'peanut butter',
        'pasta de amendoim': 'peanut butter', 'creme de avelã': 'hazelnut spread', 'creme de avela': 'hazelnut spread',
        'nutella': 'nutella', 'goiabada': 'guava paste', 'doce de leite': 'dulce de leche',
        'doce de leite condensado': 'condensed milk', 'leite condensado': 'condensed milk',
        'creme de leite': 'heavy cream', 'nata': 'cream', 'queijo ralado': 'grated cheese',
        'queijo parmesão': 'parmesan cheese', 'queijo parmesao': 'parmesan cheese', 'queijo mussarela': 'mozzarella cheese',
        'queijo gorgonzola': 'gorgonzola cheese', 'queijo provolone': 'provolone cheese', 'queijo ricota': 'ricotta cheese',
        'queijo cottage': 'cottage cheese', 'queijo minas': 'minas cheese', 'queijo coalho': 'coalho cheese',
        'queijo canastra': 'canastra cheese', 'queijo do reino': 'king cheese', 'queijo prato': 'prato cheese',
        'queijo branco': 'white cheese', 'queijo amarelo': 'yellow cheese', 'queijo fresco': 'fresh cheese',
        'queijo curado': 'aged cheese', 'queijo maturado': 'aged cheese', 'queijo defumado': 'smoked cheese',
        'queijo fundido': 'melted cheese', 'queijo derretido': 'melted cheese', 'queijo em pedaços': 'cheese chunks',
        'queijo em pedacos': 'cheese chunks', 'queijo em fatias': 'sliced cheese', 'queijo em cubos': 'cubed cheese',
        'queijo em tiras': 'cheese strips', 'queijo em pó': 'powdered cheese', 'queijo em po': 'powdered cheese',
        'queijo em creme': 'cream cheese', 'queijo em pasta': 'cheese spread', 'queijo em barra': 'cheese bar',
        'queijo em rolo': 'cheese roll', 'queijo em bola': 'cheese ball', 'queijo em cone': 'cheese cone',
        'queijo em tubo': 'cheese tube', 'queijo em lata': 'canned cheese', 'queijo em vidro': 'jarred cheese',
        'queijo em sachê': 'cheese packet', 'queijo em sache': 'cheese packet', 'queijo em envelope': 'cheese envelope',
        'queijo em blister': 'cheese blister', 'queijo em bandeja': 'cheese tray', 'queijo em caixa': 'cheese box',
        'queijo em saco': 'cheese bag', 'queijo em pote': 'cheese pot', 'queijo em copo': 'cheese cup',
        'queijo em tigela': 'cheese bowl', 'queijo em prato': 'cheese plate', 'queijo em taça': 'cheese glass',
        'queijo em xícara': 'cheese cup', 'queijo em xicara': 'cheese cup', 'queijo em colher': 'cheese spoon',
        'queijo em garfo': 'cheese fork', 'queijo em faca': 'cheese knife', 'queijo em palito': 'cheese stick',
        'queijo em cubinho': 'cheese cube', 'queijo em fatia': 'cheese slice', 'queijo em pedaço': 'cheese piece',
        'queijo em pedaco': 'cheese piece', 'queijo em tira': 'cheese strip', 'pizza': 'pizza',
        'pizza calabresa': 'calabrese pizza', 'pizza margherita': 'margherita pizza', 'pizza pepperoni': 'pepperoni pizza',
        'pizza 4 queijos': '4 cheese pizza', 'pizza 4 queijo': '4 cheese pizza', 'pizza quatro queijos': '4 cheese pizza',
        'pizza quatro queijo': '4 cheese pizza', 'pizza de calabresa': 'calabrese pizza', 'pizza de margherita': 'margherita pizza',
        'pizza de pepperoni': 'pepperoni pizza', 'pizza de 4 queijos': '4 cheese pizza', 'pizza de 4 queijo': '4 cheese pizza',
        'pizza de quatro queijos': '4 cheese pizza', 'pizza de quatro queijo': '4 cheese pizza'
    };

    // Check for exact matches first
    for (const [portuguese, english] of Object.entries(portugueseFoodMap)) {
        if (lowerName.includes(portuguese)) {
            return english;
        }
    }

    // Check for partial matches
    for (const [portuguese, english] of Object.entries(portugueseFoodMap)) {
        if (portuguese.includes(lowerName) || lowerName.includes(portuguese)) {
            return english;
        }
    }

    // If no translation found, return original
    return foodName;
}

// Efficient CSV search function with multilingual support
async function searchInCSV(searchTerm) {
    try {
        const readline = require('readline');
        const fs = require('fs');
        
        const fileStream = fs.createReadStream(OPENFOODFACTS_FILE);
        const rl = readline.createInterface({
            input: fileStream,
            crlfDelay: Infinity
        });
        
        let headers = null;
        let bestMatch = null;
        let bestScore = 0;
        let lineCount = 0;
        const maxLines = 50000; // Increased limit for better search coverage
        
        // Translate search term to English for better database matching
        const translatedSearchTerm = translateFoodToEnglish(searchTerm);
        const searchTerms = [searchTerm.toLowerCase(), translatedSearchTerm.toLowerCase()];
        
        for await (const line of rl) {
            lineCount++;
            if (lineCount > maxLines) break;
            
            if (!headers) {
                headers = line.split(',').map(h => h.trim().replace(/"/g, ''));
                continue;
            }
            
            const values = parseCSVLine(line);
            if (values.length !== headers.length) continue;
            
            const product = {};
            headers.forEach((header, index) => {
                product[header] = values[index];
            });
            
            const productName = (product.product_name || '').toLowerCase();
            const categories = (product.categories || '').toLowerCase();
            const brands = (product.brands || '').toLowerCase();
            
            // Check multiple fields for better matching with multiple search terms
            const searchFields = [productName, categories, brands];
            let found = false;
            
            for (const term of searchTerms) {
                for (const field of searchFields) {
                    if (field.includes(term) || term.includes(field)) {
                        found = true;
                        break;
                    }
                }
                if (found) break;
            }
            
            if (found) {
                // Improved scoring: prioritize exact matches and shorter names
                let score = 0;
                
                for (const term of searchTerms) {
                    if (productName.includes(term)) score += 0.5;
                    if (term.includes(productName)) score += 0.3;
                    if (productName === term) score += 0.2;
                }
                
                // Bonus for having nutritional data
                if (product.energy_100g && product.energy_100g > 0) score += 0.1;
                if (product.proteins_100g && product.proteins_100g > 0) score += 0.1;
                
                if (score > bestScore) {
                    bestScore = score;
                    bestMatch = product;
                }
            }
        }
        
        return bestScore > 0.3 ? bestMatch : null;
        
    } catch (error) {
        console.error('Error searching CSV:', error);
        return null;
    }
}

// Parse CSV line handling quoted values
function parseCSVLine(line) {
    const values = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        
        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            values.push(current.trim());
            current = '';
        } else {
            current += char;
        }
    }
    
    values.push(current.trim());
    return values;
}

// Calculate nutrition score (A-E scale)
function calculateNutritionScore(totals) {
    const calories = totals.calories;
    const fat = totals.fat;
    const saturatedFat = totals.fat * 0.3; // Estimate
    const sugar = totals.sugar;
    const salt = totals.salt || 0;
    
    let score = 0;
    
    // Energy (calories)
    if (calories <= 335) score += 0;
    else if (calories <= 670) score += 1;
    else if (calories <= 1005) score += 2;
    else if (calories <= 1340) score += 3;
    else if (calories <= 1675) score += 4;
    else score += 5;
    
    // Saturated fat
    if (saturatedFat <= 1) score += 0;
    else if (saturatedFat <= 2) score += 1;
    else if (saturatedFat <= 3) score += 2;
    else if (saturatedFat <= 4) score += 3;
    else if (saturatedFat <= 5) score += 4;
    else score += 5;
    
    // Sugar
    if (sugar <= 4.5) score += 0;
    else if (sugar <= 9) score += 1;
    else if (sugar <= 13.5) score += 2;
    else if (sugar <= 18) score += 3;
    else if (sugar <= 22.5) score += 4;
    else score += 5;
    
    // Salt
    if (salt <= 0.3) score += 0;
    else if (salt <= 0.6) score += 1;
    else if (salt <= 0.9) score += 2;
    else if (salt <= 1.2) score += 3;
    else if (salt <= 1.5) score += 4;
    else score += 5;
    
    // Convert to letter grade
    if (score <= 2) return 'A';
    else if (score <= 10) return 'B';
    else if (score <= 18) return 'C';
    else if (score <= 26) return 'D';
    else return 'E';
}

// Calculate nutrition levels
function calculateNutritionLevels(totals) {
    const levels = {};
    
    // Fat levels
    if (totals.fat <= 3) levels.fat = 'low';
    else if (totals.fat <= 17.5) levels.fat = 'medium';
    else levels.fat = 'high';
    
    // Saturated fat levels
    const saturatedFat = totals.fat * 0.3;
    if (saturatedFat <= 1.5) levels.saturatedFat = 'low';
    else if (saturatedFat <= 5) levels.saturatedFat = 'medium';
    else levels.saturatedFat = 'high';
    
    // Sugar levels
    if (totals.sugar <= 5) levels.sugar = 'low';
    else if (totals.sugar <= 22.5) levels.sugar = 'medium';
    else levels.sugar = 'high';
    
    // Salt levels
    const salt = totals.salt || 0;
    if (salt <= 0.3) levels.salt = 'low';
    else if (salt <= 1.5) levels.salt = 'medium';
    else levels.salt = 'high';
    
    return levels;
}

// Get fallback nutrition data for common food items
function getFallbackNutritionData(foodName) {
    const lowerName = foodName.toLowerCase();
    
    // Big Mac components
    if (lowerName.includes('big mac') || lowerName.includes('burger')) {
        return {
            calories: 550,
            carbs: 45,
            protein: 25,
            fat: 30,
            fiber: 3,
            sugar: 9,
            nutriScore: 'D',
            foodType: 'Ultra-processed',
            ingredients: ['beef', 'bun', 'lettuce', 'cheese', 'pickles', 'onions', 'special sauce'],
            allergens: ['gluten', 'dairy'],
            additives: ['preservatives', 'flavor enhancers']
        };
    }
    
    if (lowerName.includes('fries') || lowerName.includes('french fries')) {
        return {
            calories: 365,
            carbs: 63,
            protein: 4,
            fat: 17,
            fiber: 4,
            sugar: 0,
            nutriScore: 'C',
            foodType: 'Processed',
            ingredients: ['potatoes', 'vegetable oil', 'salt'],
            allergens: [],
            additives: ['preservatives']
        };
    }
    
    if (lowerName.includes('coca-cola') || lowerName.includes('cola') || lowerName.includes('soda')) {
        return {
            calories: 140,
            carbs: 39,
            protein: 0,
            fat: 0,
            fiber: 0,
            sugar: 39,
            nutriScore: 'E',
            foodType: 'Ultra-processed',
            ingredients: ['carbonated water', 'high fructose corn syrup', 'caramel color', 'phosphoric acid', 'natural flavors', 'caffeine'],
            allergens: [],
            additives: ['artificial colors', 'preservatives']
        };
    }
    
    // Chicken breast
    if (lowerName.includes('chicken breast') || lowerName.includes('grilled chicken')) {
        return {
            calories: 165,
            carbs: 0,
            protein: 31,
            fat: 3.6,
            fiber: 0,
            sugar: 0,
            nutriScore: 'A',
            foodType: 'Unprocessed',
            ingredients: ['chicken breast'],
            allergens: [],
            additives: []
        };
    }
    
    // Broccoli
    if (lowerName.includes('broccoli')) {
        return {
            calories: 55,
            carbs: 11,
            protein: 3.7,
            fat: 0.6,
            fiber: 5.2,
            sugar: 2.6,
            nutriScore: 'A',
            foodType: 'Unprocessed',
            ingredients: ['broccoli'],
            allergens: [],
            additives: []
        };
    }
    
    // Brown rice
    if (lowerName.includes('brown rice')) {
        return {
            calories: 216,
            carbs: 45,
            protein: 4.5,
            fat: 1.8,
            fiber: 3.5,
            sugar: 0.8,
            nutriScore: 'B',
            foodType: 'Minimally processed',
            ingredients: ['brown rice'],
            allergens: [],
            additives: []
        };
    }
    
    // Salad components
    if (lowerName.includes('mixed greens') || lowerName.includes('lettuce')) {
        return {
            calories: 15,
            carbs: 3,
            protein: 1.5,
            fat: 0.2,
            fiber: 1.2,
            sugar: 1.2,
            nutriScore: 'A',
            foodType: 'Unprocessed',
            ingredients: ['mixed greens'],
            allergens: [],
            additives: []
        };
    }
    
    if (lowerName.includes('tomato') || lowerName.includes('cherry tomato')) {
        return {
            calories: 22,
            carbs: 4.8,
            protein: 1.1,
            fat: 0.2,
            fiber: 1.2,
            sugar: 3.2,
            nutriScore: 'A',
            foodType: 'Unprocessed',
            ingredients: ['tomatoes'],
            allergens: [],
            additives: []
        };
    }
    
    if (lowerName.includes('cucumber')) {
        return {
            calories: 16,
            carbs: 3.6,
            protein: 0.7,
            fat: 0.1,
            fiber: 0.5,
            sugar: 1.7,
            nutriScore: 'A',
            foodType: 'Unprocessed',
            ingredients: ['cucumber'],
            allergens: [],
            additives: []
        };
    }
    
    if (lowerName.includes('olive oil')) {
        return {
            calories: 120,
            carbs: 0,
            protein: 0,
            fat: 14,
            fiber: 0,
            sugar: 0,
            nutriScore: 'B',
            foodType: 'Minimally processed',
            ingredients: ['olive oil'],
            allergens: [],
            additives: []
        };
    }
    
    // Default fallback
    return {
        calories: 100,
        carbs: 20,
        protein: 5,
        fat: 2,
        fiber: 2,
        sugar: 5,
        nutriScore: 'C',
        foodType: 'Unknown',
        ingredients: ['unknown'],
        allergens: [],
        additives: []
    };
}

// Internet search fallback function with multilingual support
async function searchFoodOnInternet(foodName) {
  try {
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    
    // Set user agent to simulate Chrome on MacBook
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    
    const translatedFood = translateFoodToEnglish(foodName);
    const searchQuery = `${translatedFood} nutrition facts calories protein carbs fat`;
    
    await page.goto(`https://www.google.com/search?q=${encodeURIComponent(searchQuery)}`, {
      waitUntil: 'networkidle2',
      timeout: 30000
    });
    
    // Add random delay to simulate human behavior
    await page.waitForTimeout(Math.random() * 2000 + 1000);
    
    const results = await page.evaluate(() => {
      const nutritionElements = document.querySelectorAll('div[data-attrid*="nutrition"], div[data-attrid*="calories"]');
      const nutritionData = [];
      
      nutritionElements.forEach(element => {
        const text = element.textContent;
        if (text.includes('calories') || text.includes('protein') || text.includes('carbs') || text.includes('fat')) {
          nutritionData.push(text);
        }
      });
      
      return nutritionData;
    });
    
    await browser.close();
    
    return results.length > 0 ? results[0] : null;
  } catch (error) {
    console.error('Error searching food on internet:', error);
    return null;
  }
}

// Enhanced function for internet-only search
async function enhanceWithInternetSearch(items) {
    const enhancedItems = [];
    
    for (const item of items) {
        try {
            const internetData = await searchFoodOnInternet(item.name);
            enhancedItems.push({
                ...item,
                ...internetData,
                source: 'internet'
            });
        } catch (error) {
            console.error('Internet search failed for:', item.name, error);
            enhancedItems.push({
                ...item,
                calories: item.calories || 100,
                carbs: item.carbs || 20,
                protein: item.protein || 5,
                fat: item.fat || 2,
                fiber: item.fiber || 2,
                sugar: item.sugar || 5,
                source: 'default'
            });
        }
    }
    
    return enhancedItems;
}

app.listen(PORT, () => {
    console.log(`Nutrition service running on port ${PORT}`);
    // Initialize automatic downloads
    initializeAutomaticDownloads().catch(error => {
        console.error('Failed to initialize automatic downloads:', error);
    });
});

// Graceful shutdown
process.on('SIGTERM', async () => {
    console.log('SIGTERM received, shutting down gracefully');
    await db.close();
    await redis.close();
    process.exit(0);
});
