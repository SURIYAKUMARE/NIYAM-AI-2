const fs = require('node:fs');
const path = require('node:path');

class CollegeController {
    constructor() {
        this.dataPath = path.join(__dirname, '..', '..', 'data', 'seed', 'institutions.json');
        this.gtPath = path.join(__dirname, '..', '..', 'data', 'seed', 'ground_truth.json');
    }

    _loadData() {
        try {
            if (fs.existsSync(this.dataPath)) {
                return JSON.parse(fs.readFileSync(this.dataPath, 'utf8'));
            }
        } catch (e) {
            console.error('[CollegeController] Error loading institutions:', e.message);
        }
        return [];
    }

    _loadGroundTruth() {
        try {
            if (fs.existsSync(this.gtPath)) {
                return JSON.parse(fs.readFileSync(this.gtPath, 'utf8'));
            }
        } catch (e) {
            console.error('[CollegeController] Error loading ground truth:', e.message);
        }
        return { colleges: {} };
    }

    list(req, res) {
        let colleges = this._loadData();
        const { status, state, search, sortBy } = req.query || {};

        if (status && status !== 'ALL') {
            colleges = colleges.filter(c => (c.status || '').toLowerCase() === status.toLowerCase());
        }

        if (state && state !== 'ALL') {
            colleges = colleges.filter(c => (c.state || '').toLowerCase() === state.toLowerCase());
        }

        if (search) {
            const q = search.toLowerCase().trim();
            colleges = colleges.filter(c => 
                (c.name && c.name.toLowerCase().includes(q)) ||
                (c.permanentId && c.permanentId.toLowerCase().includes(q)) ||
                (c.city && c.city.toLowerCase().includes(q)) ||
                (c.state && c.state.toLowerCase().includes(q))
            );
        }

        if (sortBy === 'trustScore') {
            colleges.sort((a, b) => (b.trustScore || 0) - (a.trustScore || 0));
        } else if (sortBy === 'name') {
            colleges.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
        } else if (sortBy === 'intake') {
            colleges.sort((a, b) => (b.intake || 0) - (a.intake || 0));
        } else if (sortBy === 'year') {
            colleges.sort((a, b) => (b.establishedYear || 0) - (a.establishedYear || 0));
        }

        res.json({
            count: colleges.length,
            colleges
        });
    }

    getById(req, res) {
        const { id } = req.params;
        const colleges = this._loadData();
        const college = colleges.find(c => c.id === id || c.permanentId === id);

        if (!college) {
            return res.status(404).json({ error: `College '${id}' not found.` });
        }

        const gt = this._loadGroundTruth();
        const groundTruth = gt.colleges ? gt.colleges[college.id] : null;

        res.json({
            college,
            groundTruth
        });
    }
}

module.exports = new CollegeController();
