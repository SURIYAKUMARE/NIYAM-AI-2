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

const server = http.createServer(async (req, res) => {
    // CORS headers for interoperability
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-user-id');

    if (req.method === 'OPTIONS') {
        res.statusCode = 204;
        res.end();
        return;
    }

    // Body parsing helper for JSON
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

        const urlObj = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
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

        // 2. Static Asset Serving
        let filePath = path.join(__dirname, 'public', pathname === '/' ? 'index.html' : pathname);
        
        // Prevent path traversal
        if (!filePath.startsWith(path.join(__dirname, 'public'))) {
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

server.listen(PORT, () => {
    console.log('================================================================');
    console.log(' AICTE SMART APPROVAL & COMPLIANCE MANAGEMENT SYSTEM');
    console.log(' Department of Regulation Bureau | Problem Statement ID: 26262');
    console.log(` Web Application & REST APIs Live on: http://localhost:${PORT}`);
    console.log('================================================================');
});

process.on('SIGINT', () => {
    console.log('[AICTE Platform] Shutting down gracefully...');
    schedulerService.stop();
    server.close(() => process.exit(0));
});
