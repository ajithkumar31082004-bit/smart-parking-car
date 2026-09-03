const express = require('express');
const cors = require('cors');
const path = require('path');
const rateLimit = require('express-rate-limit');
const { PORT } = require('./config/constants');
const errorHandler = require('./middleware/errorHandler');

// Route Imports
const authRoutes = require('./routes/authRoutes');
const locationRoutes = require('./routes/locationRoutes');
const bookingRoutes = require('./routes/bookingRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const qrRoutes = require('./routes/qrRoutes');
const aiRoutes = require('./routes/aiRoutes');
const adminRoutes = require('./routes/adminRoutes');
const vehicleRoutes = require('./routes/vehicleRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const iotRoutes = require('./routes/iotRoutes');

// Prometheus Observability Setup
const client = require('prom-client');
const collectDefaultMetrics = client.collectDefaultMetrics;
collectDefaultMetrics({ register: client.register });

const httpRequestCounter = new client.Counter({
    name: 'smartpark_http_requests_total',
    help: 'Total number of HTTP requests processed by SmartPark AI',
    labelNames: ['method', 'route', 'status_code']
});

const httpRequestDuration = new client.Histogram({
    name: 'smartpark_http_request_duration_seconds',
    help: 'HTTP request duration in seconds',
    labelNames: ['method', 'route', 'status_code'],
    buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5]
});

const app = express();

// Track request metrics middleware
app.use((req, res, next) => {
    const start = process.hrtime();
    res.on('finish', () => {
        const diff = process.hrtime(start);
        const durationSec = diff[0] + diff[1] / 1e9;
        const routePath = req.baseUrl || req.path || 'unknown';
        httpRequestCounter.inc({ method: req.method, route: routePath, status_code: res.statusCode });
        httpRequestDuration.observe({ method: req.method, route: routePath, status_code: res.statusCode }, durationSec);
    });
    next();
});

// Security & Middlewares
const _allowedOrigins = (process.env.ALLOWED_ORIGINS || '*')
    .split(',')
    .map(o => o.trim())
    .filter(Boolean);

app.use(cors({
    origin: (origin, callback) => {
        // Allow all origins dynamically (echo requesting origin for credentials support)
        callback(null, true);
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Rate Limiter
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 500, // 500 requests per IP per window
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, error: 'Too many requests from this IP, please try again after 15 minutes.' }
});
app.use('/api/', apiLimiter);

// Prometheus Metrics Endpoint
app.get('/metrics', async (req, res) => {
    try {
        res.set('Content-Type', client.register.contentType);
        res.end(await client.register.metrics());
    } catch (err) {
        res.status(500).end(err);
    }
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({
        status: 'healthy',
        service: 'SmartPark AI Enterprise API',
        version: '2.0.0',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/locations', locationRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/qr', qrRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/vehicles', vehicleRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/iot', iotRoutes);

// Static assets serving (serve both frontend directory and root workspace)
app.use('/frontend', express.static(path.join(__dirname, '../../frontend')));
app.use(express.static(path.join(__dirname, '../../')));

// Error handling middleware
app.use(errorHandler);

if (process.env.NODE_ENV !== 'test') {
    app.listen(PORT, () => {
        console.log(`\n=================================================`);
        console.log(`🚀 SmartPark AI Server running on http://localhost:${PORT}`);
        console.log(`📡 API Health: http://localhost:${PORT}/api/health`);
        console.log(`📊 Admin Portal: http://localhost:${PORT}/frontend/admin.html`);
        console.log(`⚡ AI Recommendations: http://localhost:${PORT}/api/ai/recommendations`);
        console.log(`=================================================\n`);
    });
}

module.exports = app;
