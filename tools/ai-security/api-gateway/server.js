const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const app = express();

// Increase body parser limits
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
const PORT = process.env.PORT || 8080;

// Security middleware
app.use(helmet());
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://192.168.1.100:3003',
    credentials: true
}));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000, // limit each IP to 1000 requests per windowMs
    message: 'Too many requests from this IP'
});
app.use(limiter);

app.use(express.json());

// Health check
app.get('/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        service: 'api-gateway',
        timestamp: new Date().toISOString()
    });
});

// Version endpoint
app.get('/version', (req, res) => {
    res.json({
        version: '1.4.0',
        buildDate: '2025-08-27T18:46:00Z',
        releaseNotes: 'Model Security Scanner Integration - Trend Micro Vision One',
        features: [
            'Fixed mobile formatting issues',
            'Added responsive sidebar with hamburger menu',
            'Improved error message display',
            'Enhanced mobile navigation',
            'Better touch-friendly UI elements',
            'Responsive grid layouts',
            'Mobile-optimized text sizing',
            'Fixed login functionality',
            'Added proper error boundaries',
            'Fixed login redirect after successful authentication',
            'Added dashboard stats endpoint with mock data',
            'Fixed save meal functionality by adding missing database column',
            'Fixed frontend save meal API call to use correct service and token',
            'Added sidebar layout to Nutrition and MealOverview pages',
            'Fixed missing left menu after saving meals',
            'Added delete functionality for meals',
            'Improved navigation consistency across pages',
            'Optimized content spacing for mobile devices',
            'Reduced padding and margins for better mobile viewing',
            'Added sidebar layout to Fitness page',
            'Improved content positioning closer to sidebar',
            'Added sidebar layout to Security Reports and Settings pages',
            'Fixed AI Guard toggle functionality with auto-save',
            'Improved content auto-adjustment for all pages',
            'Fixed content alignment - content now aligns to the left',
            'Removed empty space between sidebar and content',
            'Optimized layout for all pages (Dashboard, Nutrition, Security Reports, Settings)',
            'Reduced padding and margins for better space utilization',
            'Removed max-width constraints from MealOverview page',
            'Content now uses full available width without centering',
            'Completely rebuilt Profile and Reports pages with sidebar layout',
            'Fixed all JSX syntax errors and layout issues',
            'All pages now use consistent sidebar layout and full width content',
            'Integrated Chat page with proper sidebar layout',
            'Removed max-width constraints from Chat page content',
            'Fixed Chat page layout inconsistencies',
            'Added comprehensive Goals Management system',
            'Created GoalsManager component with nutrition and fitness tabs',
            'Integrated Set Goals button in Profile page',
            'Added PUT endpoint for fitness goals',
            'Enhanced Profile page with goals management functionality',
            'Fixed Dashboard error state layout constraints',
            'Reduced main content padding across all pages',
            'Removed max-width constraints from Nutrition goals modal',
            'Optimized content spacing for better space utilization',
            'Completely restructured layout using absolute positioning',
            'Removed flex constraints that were causing spacing issues',
            'Content now starts immediately next to sidebar with minimal padding',
            'Reduced all grid gaps and card padding for maximum space utilization',
            'Eliminated all width constraints and centering issues',
            'Applied absolute positioning to Nutrition, Security Reports, and Settings pages',
            'All pages now use consistent layout structure with minimal spacing',
            'Optimized grid gaps and padding across all application pages',
            'Complete layout consistency achieved across entire application',
            'Fixed AI Guard block logic inconsistency between input and output scans',
            'Added false positive detection for nutrition-related content',
            'Improved security scanning to avoid blocking legitimate meal analysis',
            'Enhanced AI Guard logic to handle input/output scan discrepancies',
            'Enhanced security logic to prioritize malicious pattern detection',
            'Fixed false positive detection to not override legitimate security blocks',
            'Improved AI Guard to properly block content with malicious patterns',
            'Enhanced security scanning to handle mixed content (nutrition + malicious)',
            'Applied absolute positioning layout fix to Meal Overview page',
            'Complete layout consistency achieved across all application pages',
            'All pages now use optimized sidebar layout with minimal spacing',
            'Final layout optimization for maximum content utilization',
            'Enhanced LLM prompt to identify only explicitly mentioned foods',
            'Improved AI analysis to prevent guessing or assumptions',
            'Updated frontend to process structured AI responses',
            'Eliminated false food identification in meal analysis',
            'Fixed frontend JSON parsing to access correct AI response field',
            'Corrected response structure mapping for meal analysis',
            'Added debug logging for AI response processing',
            'Ensured structured AI responses are properly parsed and displayed',
            'Added new Security Scanner microservice for model scanning',
            'Integrated Trend Micro Vision One AI Scanner functionality',
            'Added Scan Model button to Settings page with real-time status',
            'Implemented security scanning with attack objectives and techniques',
            'Added progress tracking and status updates for model scans',
            'Integrated real Trend Micro Vision One TMAS CLI with config-based scanning',
            'Fixed API gateway proxy configuration for security scanner',
            'Added proper request body handling for scan requests'
        ]
    });
});

// Proxy to Auth Service
app.use('/auth', createProxyMiddleware({
    target: process.env.AUTH_SERVICE_URL || 'http://auth-service:3001',
    changeOrigin: true,
    pathRewrite: {
        '^/auth': '/auth'
    },
    timeout: 30000, // 30 seconds timeout
    proxyTimeout: 30000, // 30 seconds proxy timeout
    onError: (err, req, res) => {
        console.error('Auth service proxy error:', err);
        res.status(503).json({ error: 'Auth service unavailable' });
    }
}));

// Proxy to Nutrition Service
app.use('/nutrition', createProxyMiddleware({
    target: process.env.NUTRITION_SERVICE_URL || 'http://nutrition-service:3002',
    changeOrigin: true,
    pathRewrite: {
        '^/nutrition': '/nutrition'
    },
    onError: (err, req, res) => {
        console.error('Nutrition service proxy error:', err);
        res.status(503).json({ error: 'Nutrition service unavailable' });
    }
}));

// Proxy to Fitness Service
app.use('/fitness', createProxyMiddleware({
    target: process.env.FITNESS_SERVICE_URL || 'http://fitness-service:3003',
    changeOrigin: true,
    pathRewrite: {
        '^/fitness': '/fitness'
    },
    onError: (err, req, res) => {
        console.error('Fitness service proxy error:', err);
        res.status(503).json({ error: 'Fitness service unavailable' });
    }
}));

// Proxy to AI Service
app.use('/ai', createProxyMiddleware({
    target: process.env.AI_SERVICE_URL || 'http://ai-service:3004',
    changeOrigin: true,
    pathRewrite: {
        '^/ai': '/ai'
    },
    timeout: 30000, // 30 seconds timeout
    proxyTimeout: 30000, // 30 seconds proxy timeout
    onError: (err, req, res) => {
        console.error('AI service proxy error:', err);
        res.status(503).json({ error: 'AI service unavailable' });
    }
}));

// Proxy to Report Service
app.use('/reports', createProxyMiddleware({
    target: process.env.REPORT_SERVICE_URL || 'http://report-service:3005',
    changeOrigin: true,
    pathRewrite: {
        '^/reports': '/reports'
    },
    onError: (err, req, res) => {
        console.error('Report service proxy error:', err);
        res.status(503).json({ error: 'Report service unavailable' });
    }
}));

// Proxy to Notification Service
app.use('/notifications', createProxyMiddleware({
    target: process.env.NOTIFICATION_SERVICE_URL || 'http://notification-service:3006',
    changeOrigin: true,
    pathRewrite: {
        '^/notifications': '/notifications'
    },
    onError: (err, req, res) => {
        console.error('Notification service proxy error:', err);
        res.status(503).json({ error: 'Notification service unavailable' });
    }
}));

// Proxy to Security Scanner Service
app.use('/security-scanner', createProxyMiddleware({
    target: process.env.SECURITY_SCANNER_URL || 'http://security-scanner:3008',
    changeOrigin: true,
    pathRewrite: {
        '^/security-scanner': ''
    },
    timeout: 300000, // 5 minutes timeout for long-running scans
    proxyTimeout: 300000, // 5 minutes proxy timeout
    onProxyReq: (proxyReq, req, res) => {
        console.log('Proxying to security scanner:', req.method, req.path);
        // Ensure request body is properly handled
        if (req.body && Object.keys(req.body).length > 0) {
            const bodyData = JSON.stringify(req.body);
            proxyReq.setHeader('Content-Type', 'application/json');
            proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData));
            proxyReq.write(bodyData);
        }
    },
    onError: (err, req, res) => {
        console.error('Security scanner proxy error:', err);
        res.status(503).json({ error: 'Security scanner service unavailable' });
    }
}));

// Proxy to Security Scanner Service via /api route
app.use('/api/security-scanner', createProxyMiddleware({
    target: process.env.SECURITY_SCANNER_URL || 'http://security-scanner:3008',
    changeOrigin: true,
    pathRewrite: {
        '^/api/security-scanner': ''
    },
    timeout: 300000, // 5 minutes timeout for long-running scans
    proxyTimeout: 300000, // 5 minutes proxy timeout
    onProxyReq: (proxyReq, req, res) => {
        console.log('Proxying to security scanner via /api route:', req.method, req.path);
        // Ensure request body is properly handled
        if (req.body && Object.keys(req.body).length > 0) {
            const bodyData = JSON.stringify(req.body);
            proxyReq.setHeader('Content-Type', 'application/json');
            proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData));
            proxyReq.write(bodyData);
        }
    },
    onError: (err, req, res) => {
        console.error('Security scanner proxy error:', err);
        res.status(503).json({ error: 'Security scanner service unavailable' });
    }
}));

// Default route
app.get('/', (req, res) => {
    res.json({
        message: 'Health Assistant API Gateway',
        version: '1.0.0',
        services: {
            auth: '/auth',
            nutrition: '/nutrition',
            fitness: '/fitness',
            ai: '/ai',
            reports: '/reports',
            notifications: '/notifications',
            securityScanner: '/security-scanner'
        }
    });
});

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({ error: 'Route not found' });
});

// Error handler
app.use((err, req, res, next) => {
    console.error('API Gateway error:', err);
    res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
    console.log(`API Gateway running on port ${PORT}`);
});
