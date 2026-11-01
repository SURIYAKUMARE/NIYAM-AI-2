const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { PORT } = require('./src/config/constants');
const apiRouter = require('./src/routes/api');
const schedulerService = require('./src/services/schedulerService');
const seedDatabase = require('./src/database/seedData');

// Ensure database is seeded on startup if empty
try {
    const db = require('./src/database/db');
    const userCount = db.queryOne('SELECT COUNT(*) as count FROM users');
    if (!userCount || userCount.count === 0) {
        seedDatabase();
    }
} catch (e) {
    console.error('[Startup DB Check]', e.message);
}

// MIME types for static asset serving
const MIME_TYPES = {
    '.html': 'text/html; charset=UTF-8',
    '.css': 'text/css; charset=UTF-8',
    '.js': 'application/javascript; charset=UTF-8',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.pdf': 'application/pdf'
};

// ----------------------------------------------------------------------------
// Configurable CORS Allowlist
// ----------------------------------------------------------------------------
const DEFAULT_ALLOWED_ORIGINS = [
    'https://niyam-ai-2-nu.vercel.app',
    'https://niyam-ai-2.vercel.app',
    'http://localhost:8080',
    'http://localhost:3000',
    'http://127.0.0.1:8080',
    'http://127.0.0.1:3000'
];

const envOrigins = (process.env.CORS_ALLOWED_ORIGINS || '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);

const ALLOWED_ORIGINS = new Set([...DEFAULT_ALLOWED_ORIGINS, ...envOrigins]);

const server = http.createServer(async (req, res) => {
    const origin = req.headers.origin;

    // 1. Strict CORS Validation
    if (origin && ALLOWED_ORIGINS.has(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
        res.setHeader('Vary', 'Origin');
        res.setHeader('Access-Control-Allow-Credentials', 'true');
    }

    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    // 2. Comprehensive HTTP Security Headers
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
    res.setHeader('Permissions-Policy', 'geolocation=(self), camera=(self), microphone=()');
    res.setHeader('Content-Security-Policy', [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
        "font-src 'self' https://fonts.gstatic.com data:",
        "img-src 'self' data: https:",
        "connect-src 'self' https://niyam-ai-2-nu.vercel.app",
        "frame-ancestors 'none'",
        "base-uri 'self'",
        "object-src 'none'"
    ].join('; '));

    if (req.method === 'OPTIONS') {
        res.statusCode = 204;
        res.end();
        return;
    }

    // Body parsing helper for JSON with strict 10MB limit
    let body = '';
    req.on('data', chunk => {
        body += chunk.toString();
        if (body.length > 10 * 1024 * 1024) { // 10MB limit
            res.statusCode = 413;
            res.end('Payload Too Large');
            req.destroy();
        }
    });

    req.on('end', () => {
        if (body && (req.headers['content-type'] || '').includes('application/json')) {
            try {
                req.body = JSON.parse(body);
            } catch {
                req.body = {};
            }
        } else {
            req.body = {};
        }

        let urlObj = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
        if (urlObj.searchParams.has('__route__')) {
            const sub = urlObj.searchParams.get('__route__');
            urlObj.searchParams.delete('__route__');
            const search = urlObj.searchParams.toString();
            req.url = `/api/${sub}` + (search ? `?${search}` : '');
            urlObj = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
        } else if (req.headers['x-matched-path'] && req.headers['x-matched-path'].startsWith('/api/')) {
            req.url = req.headers['x-matched-path'];
            urlObj = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
        }

        const pathname = urlObj.pathname;

        // 1. API Route matching
        if (pathname.startsWith('/api/')) {
            const handled = apiRouter.handle(req, res);
            if (!handled && !res.headersSent) {
                res.statusCode = 404;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: `API endpoint '${pathname}' not found.` }));
            }
            return;
        }

        // 2. Sensitive Directory Static Protection
        // Prevent unauthorized direct crawling of internal ground truth or seed data
        if (pathname.startsWith('/data/seed/ground_truth.json')) {
            const authHeader = req.headers['authorization'];
            if (!authHeader) {
                res.statusCode = 403;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: 'Access Denied: Regulatory ground truth datasets require official authentication.' }));
                return;
            }
        }

        // 3. Static Asset Serving with Path Traversal Protection
        const safePath = path.normalize(pathname).replace(/^(\.\.[\/\\])+/, '');
        let filePath = path.join(__dirname, 'public', safePath === '/' || safePath === '\\' ? 'index.html' : safePath);
        
        // Strictly prevent path traversal outside public root
        const publicRoot = path.join(__dirname, 'public');
        if (!filePath.startsWith(publicRoot)) {
            res.statusCode = 403;
            res.end('Access Denied');
            return;
        }

        if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
            const ext = path.extname(filePath).toLowerCase();
            const contentType = MIME_TYPES[ext] || 'application/octet-stream';
            res.setHeader('Content-Type', contentType);
            const stream = fs.createReadStream(filePath);
            stream.on('error', () => {
                if (!res.headersSent) {
                    res.statusCode = 500;
                    res.end('Server Error');
                }
            });
            stream.pipe(res);
        } else {
            // SPA fallback: Return index.html for UI client-side routes
            const indexPath = path.join(__dirname, 'public', 'index.html');
            if (fs.existsSync(indexPath)) {
                res.setHeader('Content-Type', 'text/html; charset=UTF-8');
                const stream = fs.createReadStream(indexPath);
                stream.on('error', () => {
                    if (!res.headersSent) {
                        res.statusCode = 500;
                        res.end('Server Error');
                    }
                });
                stream.pipe(res);
            } else {
                if (!res.headersSent) {
                    res.statusCode = 404;
                    res.end('404 Not Found');
                }
            }
        }
    });
});

// Start Background Worker
schedulerService.start(60000); // Check deadlines every 60s

if (!process.env.VERCEL) {
    server.listen(PORT, () => {
        console.log('================================================================');
        console.log(' AICTE SMART APPROVAL & COMPLIANCE MANAGEMENT SYSTEM');
        console.log(' Department of Regulation Bureau | Problem Statement ID: 26262');
        console.log(` Web Application & REST APIs Live on: http://localhost:${PORT}`);
        console.log('================================================================');
    });
}

process.on('SIGINT', () => {
    console.log('[AICTE Platform] Shutting down gracefully...');
    schedulerService.stop();
    server.close(() => process.exit(0));
});

module.exports = server;
