-- Create schemas for different services
CREATE SCHEMA IF NOT EXISTS auth;
CREATE SCHEMA IF NOT EXISTS nutrition;
CREATE SCHEMA IF NOT EXISTS fitness;
CREATE SCHEMA IF NOT EXISTS ai;
CREATE SCHEMA IF NOT EXISTS reports;
CREATE SCHEMA IF NOT EXISTS notifications;

-- Users and Authentication Schema
CREATE TABLE IF NOT EXISTS auth.users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('admin', 'user')),
    is_active BOOLEAN DEFAULT true,
    email_verified BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS auth.user_profiles (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES auth.users(id) ON DELETE CASCADE,
    height DECIMAL(5,2), -- in cm
    weight DECIMAL(5,2), -- in kg
    age INTEGER,
    gender VARCHAR(10) CHECK (gender IN ('male', 'female', 'other')),
    activity_level VARCHAR(20) DEFAULT 'moderate',
    goals TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS auth.user_sessions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES auth.users(id) ON DELETE CASCADE,
    token VARCHAR(500) NOT NULL,
    refresh_token VARCHAR(500) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Nutrition Schema
CREATE TABLE IF NOT EXISTS nutrition.meals (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    meal_type VARCHAR(20) CHECK (meal_type IN ('breakfast', 'lunch', 'dinner', 'snack')),
    date_time TIMESTAMP NOT NULL,
    total_calories DECIMAL(8,2) DEFAULT 0,
    total_carbs DECIMAL(8,2) DEFAULT 0,
    total_protein DECIMAL(8,2) DEFAULT 0,
    total_fat DECIMAL(8,2) DEFAULT 0,
    total_fiber DECIMAL(8,2) DEFAULT 0,
    total_sugar DECIMAL(8,2) DEFAULT 0,
    confirmed BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS nutrition.meal_items (
    id SERIAL PRIMARY KEY,
    meal_id INTEGER REFERENCES nutrition.meals(id) ON DELETE CASCADE,
    food_name VARCHAR(255) NOT NULL,
    quantity DECIMAL(8,2) NOT NULL,
    unit VARCHAR(20) NOT NULL,
    calories DECIMAL(8,2) DEFAULT 0,
    carbs DECIMAL(8,2) DEFAULT 0,
    protein DECIMAL(8,2) DEFAULT 0,
    fat DECIMAL(8,2) DEFAULT 0,
    fiber DECIMAL(8,2) DEFAULT 0,
    sugar DECIMAL(8,2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS nutrition.nutrition_goals (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES auth.users(id) ON DELETE CASCADE,
    daily_calories INTEGER DEFAULT 2000,
    carbs_ratio DECIMAL(3,1) DEFAULT 45.0,
    protein_ratio DECIMAL(3,1) DEFAULT 25.0,
    fat_ratio DECIMAL(3,1) DEFAULT 30.0,
    daily_water_goal DECIMAL(6,2) DEFAULT 2000.0, -- in ml
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Fitness Schema
CREATE TABLE IF NOT EXISTS fitness.workouts (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    workout_type VARCHAR(50) CHECK (workout_type IN ('cardio', 'strength', 'flexibility', 'sports', 'mixed')),
    date_time TIMESTAMP NOT NULL,
    duration INTEGER NOT NULL, -- in minutes
    calories_burned INTEGER DEFAULT 0,
    heart_rate_avg INTEGER,
    heart_rate_max INTEGER,
    intensity_level INTEGER CHECK (intensity_level BETWEEN 1 AND 10),
    notes TEXT,
    confirmed BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS fitness.exercises (
    id SERIAL PRIMARY KEY,
    workout_id INTEGER REFERENCES fitness.workouts(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    exercise_type VARCHAR(50),
    sets INTEGER DEFAULT 1,
    reps INTEGER,
    weight DECIMAL(6,2), -- in kg
    duration INTEGER, -- in seconds
    distance DECIMAL(8,2), -- in meters
    calories_burned INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS fitness.fitness_goals (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES auth.users(id) ON DELETE CASCADE,
    weekly_workouts INTEGER DEFAULT 3,
    target_calories_per_week INTEGER DEFAULT 1000,
    target_activities TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- AI Schema
CREATE TABLE IF NOT EXISTS ai.conversations (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES auth.users(id) ON DELETE CASCADE,
    assistant_type VARCHAR(50) NOT NULL CHECK (assistant_type IN ('nutrition', 'fitness', 'general', 'reports')),
    conversation_data JSONB NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ai.llm_configurations (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES auth.users(id) ON DELETE CASCADE,
    provider VARCHAR(20) NOT NULL CHECK (provider IN ('ollama', 'gemini')),
    model_name VARCHAR(100) NOT NULL,
    api_key VARCHAR(500),
    host_url VARCHAR(255),
    is_active BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Reports Schema
CREATE TABLE IF NOT EXISTS reports.report_templates (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    report_type VARCHAR(50) NOT NULL,
    template_data JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS reports.generated_reports (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES auth.users(id) ON DELETE CASCADE,
    report_type VARCHAR(50) NOT NULL,
    report_data JSONB NOT NULL,
    date_range_start DATE,
    date_range_end DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Notifications Schema
CREATE TABLE IF NOT EXISTS notifications.notifications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES auth.users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_email ON auth.users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON auth.users(username);
CREATE INDEX IF NOT EXISTS idx_meals_user_date ON nutrition.meals(user_id, date_time);
CREATE INDEX IF NOT EXISTS idx_workouts_user_date ON fitness.workouts(user_id, date_time);
CREATE INDEX IF NOT EXISTS idx_conversations_user_type ON ai.conversations(user_id, assistant_type);
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications.notifications(user_id, is_read);
