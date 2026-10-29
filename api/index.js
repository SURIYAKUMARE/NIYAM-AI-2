const apiRouter = require('../src/routes/api');

module.exports = (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-user-id');

    if (req.method === 'OPTIONS') {
        res.statusCode = 204;
        res.end();
        return;
    }

    try {
        const parsed = new URL(req.url, 'http://localhost');
        if (parsed.searchParams.has('__route__')) {
            const subpath = parsed.searchParams.get('__route__');
            parsed.searchParams.delete('__route__');
            const search = parsed.searchParams.toString();
            req.url = `/api/${subpath}` + (search ? `?${search}` : '');
        } else if (req.headers['x-matched-path'] && req.headers['x-matched-path'].startsWith('/api/')) {
            req.url = req.headers['x-matched-path'];
        }
    } catch (_) {}

    const handled = apiRouter.handle(req, res);
    if (!handled && !res.headersSent) {
        res.statusCode = 404;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: `API endpoint '${req.url}' not found.` }));
    }
};
