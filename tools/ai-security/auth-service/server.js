const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const AuthUtils = require('./simple-auth');
const db = require('./simple-database');
const redis = require('./simple-redis');

const app = express();
const PORT = process.env.PORT || 3001;

// Security middleware
app.use(helmet());
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://192.168.1.100:3003',
    credentials: true
}));

// Rate limiting removed for development

app.use(express.json());

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'OK', service: 'auth-service' });
});

// Test endpoint to create a demo user (remove in production)
app.post('/auth/create-demo-user', async (req, res) => {
    try {
        const passwordHash = await AuthUtils.hashPassword('demo123');
        
        const result = await db.query(
            'INSERT INTO auth.users (username, email, password_hash, role, is_active) VALUES ($1, $2, $3, $4, $5) RETURNING id, username, email, role',
            ['demo', 'demo@health.com', passwordHash, 'admin', true]
        );
        
        res.json({ 
            message: 'Demo user created successfully',
            user: result.rows[0]
        });
    } catch (error) {
        console.error('Create demo user error:', error);
        res.status(500).json({ error: 'Failed to create demo user' });
    }
});

// Test endpoint to verify password (remove in production)
app.post('/auth/test-password', async (req, res) => {
    try {
        const { password, hash } = req.body;
        const isValid = await AuthUtils.comparePassword(password, hash);
        
        res.json({ 
            password,
            hash,
            isValid
        });
    } catch (error) {
        console.error('Test password error:', error);
        res.status(500).json({ error: 'Failed to test password' });
    }
});

// Middleware to check if user is admin
const requireAdmin = (req, res, next) => {
    if (!req.user || req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
    }
    next();
};

// Login endpoint
app.post('/auth/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password are required' });
        }

        // Get user from database
        const userResult = await db.query(
            'SELECT id, username, email, password_hash, role, is_active FROM auth.users WHERE username = $1 OR email = $1',
            [username]
        );

        if (userResult.rows.length === 0) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const user = userResult.rows[0];

        if (!user.is_active) {
            return res.status(401).json({ error: 'Account is deactivated' });
        }

        // Verify password
        const isValidPassword = await AuthUtils.comparePassword(password, user.password_hash);
        if (!isValidPassword) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Generate tokens
        const tokenPayload = {
            id: user.id,
            username: user.username,
            email: user.email,
            role: user.role
        };

        const accessToken = AuthUtils.generateToken(tokenPayload);
        const refreshToken = AuthUtils.generateRefreshToken(tokenPayload);

        // Store refresh token in Redis
        await redis.set(`refresh_token:${user.id}`, refreshToken, 7 * 24 * 60 * 60); // 7 days

        // Store session in database
        await db.query(
            'INSERT INTO auth.user_sessions (user_id, token, refresh_token, expires_at) VALUES ($1, $2, $3, NOW() + INTERVAL \'7 days\')',
            [user.id, accessToken, refreshToken]
        );

        res.json({
            message: 'Login successful',
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                role: user.role
            },
            accessToken,
            refreshToken
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Register endpoint (only admins can create new users)
app.post('/auth/register', AuthUtils.authenticateUser, requireAdmin, async (req, res) => {
    try {
        const { username, email, password, role = 'user' } = req.body;

        if (!username || !email || !password) {
            return res.status(400).json({ error: 'Username, email, and password are required' });
        }

        // Validate role
        if (!['admin', 'user'].includes(role)) {
            return res.status(400).json({ error: 'Invalid role. Must be "admin" or "user"' });
        }

        // Validate password strength
        if (password.length < 8) {
            return res.status(400).json({ error: 'Password must be at least 8 characters long' });
        }

        // Check if user already exists
        const existingUser = await db.query(
            'SELECT id FROM auth.users WHERE username = $1 OR email = $2',
            [username, email]
        );

        if (existingUser.rows.length > 0) {
            return res.status(409).json({ error: 'Username or email already exists' });
        }

        // Hash password
        const passwordHash = await AuthUtils.hashPassword(password);

        // Create user
        const newUser = await db.query(
            'INSERT INTO auth.users (username, email, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING id, username, email, role',
            [username, email, passwordHash, role]
        );

        const user = newUser.rows[0];

        // Create default nutrition goals
        await db.query(
            'INSERT INTO nutrition.nutrition_goals (user_id, daily_calories, carbs_ratio, protein_ratio, fat_ratio, daily_water_goal) VALUES ($1, 2000, 45.0, 25.0, 30.0, 2000.0)',
            [user.id]
        );

        // Create default fitness goals
        await db.query(
            'INSERT INTO fitness.fitness_goals (user_id, weekly_workouts, target_calories_per_week, target_activities) VALUES ($1, 3, 1000, $2)',
            [user.id, 'cardio,strength,flexibility']
        );

        res.status(201).json({
            message: 'User created successfully',
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                role: user.role
            }
        });

    } catch (error) {
        console.error('User creation error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Public registration endpoint (for initial admin creation)
app.post('/auth/register/public', async (req, res) => {
    try {
        const { username, email, password } = req.body;

        if (!username || !email || !password) {
            return res.status(400).json({ error: 'Username, email, and password are required' });
        }

        // Validate password strength
        if (password.length < 8) {
            return res.status(400).json({ error: 'Password must be at least 8 characters long' });
        }

        // Check if any admin exists
        const adminExists = await db.query('SELECT id FROM auth.users WHERE role = $1', ['admin']);
        if (adminExists.rows.length > 0) {
            return res.status(403).json({ error: 'Admin already exists. Please contact an administrator to create new accounts.' });
        }

        // Check if user already exists
        const existingUser = await db.query(
            'SELECT id FROM auth.users WHERE username = $1 OR email = $2',
            [username, email]
        );

        if (existingUser.rows.length > 0) {
            return res.status(409).json({ error: 'Username or email already exists' });
        }

        // Hash password
        const passwordHash = await AuthUtils.hashPassword(password);

        // Create admin user
        const newUser = await db.query(
            'INSERT INTO auth.users (username, email, password_hash, role, email_verified) VALUES ($1, $2, $3, $4, $5) RETURNING id, username, email, role',
            [username, email, passwordHash, 'admin', true]
        );

        const user = newUser.rows[0];

        // Create default nutrition goals
        await db.query(
            'INSERT INTO nutrition.nutrition_goals (user_id, daily_calories, carbs_ratio, protein_ratio, fat_ratio, daily_water_goal) VALUES ($1, 2000, 45.0, 25.0, 30.0, 2000.0)',
            [user.id]
        );

        // Create default fitness goals
        await db.query(
            'INSERT INTO fitness.fitness_goals (user_id, weekly_workouts, target_calories_per_week, target_activities) VALUES ($1, 3, 1000, $2)',
            [user.id, 'cardio,strength,flexibility']
        );

        // Create default LLM configuration
        await db.query(
            'INSERT INTO ai.llm_configurations (user_id, provider, model_name, host_url, is_active) VALUES ($1, $2, $3, $4, $5)',
            [user.id, 'ollama', 'llama3.1:8b', '192.168.1.100:11434', true]
        );

        res.status(201).json({
            message: 'Admin account created successfully',
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                role: user.role
            }
        });

    } catch (error) {
        console.error('Public registration error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Admin endpoints for user management
app.get('/auth/users', AuthUtils.authenticateUser, requireAdmin, async (req, res) => {
    try {
        const usersResult = await db.query(
            'SELECT id, username, email, role, is_active, created_at FROM auth.users ORDER BY created_at DESC'
        );

        res.json({ users: usersResult.rows });
    } catch (error) {
        console.error('Get users error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.put('/auth/users/:userId', AuthUtils.authenticateUser, requireAdmin, async (req, res) => {
    try {
        const { userId } = req.params;
        const { role, is_active } = req.body;

        // Validate role
        if (role && !['admin', 'user'].includes(role)) {
            return res.status(400).json({ error: 'Invalid role. Must be "admin" or "user"' });
        }

        const updateFields = [];
        const updateValues = [];
        let paramCount = 1;

        if (role !== undefined) {
            updateFields.push(`role = $${paramCount++}`);
            updateValues.push(role);
        }

        if (is_active !== undefined) {
            updateFields.push(`is_active = $${paramCount++}`);
            updateValues.push(is_active);
        }

        if (updateFields.length === 0) {
            return res.status(400).json({ error: 'No fields to update' });
        }

        updateValues.push(userId);
        updateFields.push(`updated_at = CURRENT_TIMESTAMP`);

        const query = `UPDATE auth.users SET ${updateFields.join(', ')} WHERE id = $${paramCount} RETURNING id, username, email, role, is_active`;

        const result = await db.query(query, updateValues);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({ 
            message: 'User updated successfully',
            user: result.rows[0]
        });

    } catch (error) {
        console.error('Update user error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.delete('/auth/users/:userId', AuthUtils.authenticateUser, requireAdmin, async (req, res) => {
    try {
        const { userId } = req.params;

        // Prevent admin from deleting themselves
        if (parseInt(userId) === req.user.id) {
            return res.status(400).json({ error: 'Cannot delete your own account' });
        }

        const result = await db.query('DELETE FROM auth.users WHERE id = $1 RETURNING id', [userId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({ message: 'User deleted successfully' });

    } catch (error) {
        console.error('Delete user error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Refresh token endpoint
app.post('/auth/refresh', async (req, res) => {
    try {
        const { refreshToken } = req.body;

        if (!refreshToken) {
            return res.status(400).json({ error: 'Refresh token is required' });
        }

        // Verify refresh token
        const decoded = AuthUtils.verifyToken(refreshToken);

        // Check if refresh token exists in Redis
        const storedToken = await redis.get(`refresh_token:${decoded.id}`);
        if (!storedToken || storedToken !== refreshToken) {
            return res.status(401).json({ error: 'Invalid refresh token' });
        }

        // Get user from database
        const userResult = await db.query(
            'SELECT id, username, email, role, is_active FROM auth.users WHERE id = $1',
            [decoded.id]
        );

        if (userResult.rows.length === 0 || !userResult.rows[0].is_active) {
            return res.status(401).json({ error: 'User not found or inactive' });
        }

        const user = userResult.rows[0];

        // Generate new tokens
        const tokenPayload = {
            id: user.id,
            username: user.username,
            email: user.email,
            role: user.role
        };

        const newAccessToken = AuthUtils.generateToken(tokenPayload);
        const newRefreshToken = AuthUtils.generateRefreshToken(tokenPayload);

        // Update refresh token in Redis
        await redis.set(`refresh_token:${user.id}`, newRefreshToken, 7 * 24 * 60 * 60);

        res.json({
            accessToken: newAccessToken,
            refreshToken: newRefreshToken
        });

    } catch (error) {
        console.error('Token refresh error:', error);
        res.status(401).json({ error: 'Invalid refresh token' });
    }
});

// Logout endpoint
app.post('/auth/logout', AuthUtils.authenticateUser, async (req, res) => {
    try {
        const userId = req.user.id;

        // Remove refresh token from Redis
        await redis.del(`refresh_token:${userId}`);

        // Invalidate session in database
        await db.query(
            'DELETE FROM auth.user_sessions WHERE user_id = $1',
            [userId]
        );

        res.json({ message: 'Logout successful' });

    } catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get user profile
app.get('/auth/profile', AuthUtils.authenticateUser, async (req, res) => {
    try {
        const userId = req.user.id;

        const userResult = await db.query(
            `SELECT u.id, u.username, u.email, u.role, u.created_at, 
                    up.height, up.weight, up.age, up.gender, up.activity_level, up.goals
             FROM auth.users u
             LEFT JOIN auth.user_profiles up ON u.id = up.user_id
             WHERE u.id = $1`,
            [userId]
        );

        if (userResult.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({ user: userResult.rows[0] });

    } catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Update user profile
app.put('/auth/profile', AuthUtils.authenticateUser, async (req, res) => {
    try {
        const userId = req.user.id;
        const { height, weight, age, gender, activity_level, goals } = req.body;

        // Update or insert user profile
        await db.query(
            `INSERT INTO auth.user_profiles (user_id, height, weight, age, gender, activity_level, goals)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             ON CONFLICT (user_id) 
             DO UPDATE SET 
                height = EXCLUDED.height,
                weight = EXCLUDED.weight,
                age = EXCLUDED.age,
                gender = EXCLUDED.gender,
                activity_level = EXCLUDED.activity_level,
                goals = EXCLUDED.goals,
                updated_at = CURRENT_TIMESTAMP`,
            [userId, height, weight, age, gender, activity_level, goals]
        );

        res.json({ message: 'Profile updated successfully' });

    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Verify token endpoint
app.post('/auth/verify', async (req, res) => {
    try {
        const { token } = req.body;

        if (!token) {
            return res.status(400).json({ error: 'Token is required' });
        }

        const decoded = AuthUtils.verifyToken(token);
        
        // Get user from database
        const userResult = await db.query(
            'SELECT id, username, email, role, is_active FROM auth.users WHERE id = $1',
            [decoded.id]
        );

        if (userResult.rows.length === 0 || !userResult.rows[0].is_active) {
            return res.status(401).json({ error: 'User not found or inactive' });
        }

        res.json({ 
            valid: true, 
            user: userResult.rows[0] 
        });

    } catch (error) {
        res.json({ valid: false });
    }
});

// Dashboard stats endpoint
app.get('/dashboard/stats', AuthUtils.authenticateUser, async (req, res) => {
    try {
        const userId = req.user.id;

        // For now, provide mock data since nutrition and fitness tables don't exist yet
        // In a real implementation, these would be actual database queries
        const stats = {
            nutrition: {
                totalMeals: 12,
                thisWeek: 3,
                averageCalories: 1850,
                goalsProgress: 75,
                topFoods: ['Chicken Breast', 'Brown Rice', 'Broccoli', 'Salmon', 'Sweet Potato'],
                macros: {
                    protein: 85,
                    carbs: 180,
                    fat: 45,
                    fiber: 25
                }
            },
            fitness: {
                totalWorkouts: 8,
                thisWeek: 2,
                totalCaloriesBurned: 2400,
                averageDuration: 45,
                goalsProgress: 60,
                workoutTypes: ['Cardio', 'Strength Training', 'Yoga', 'Running', 'Swimming']
            },
            overall: {
                streakDays: 5,
                healthScore: 78,
                weeklyTrend: 'up',
                nextGoal: 'Complete 5 workouts this week'
            }
        };

        res.json({ stats });

    } catch (error) {
        console.error('Dashboard stats error:', error);
        res.status(500).json({ error: 'Failed to load dashboard stats' });
    }
});

app.listen(PORT, () => {
    console.log(`Auth service running on port ${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
    console.log('SIGTERM received, shutting down gracefully');
    await db.close();
    await redis.close();
    process.exit(0);
});
