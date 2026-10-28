const reportService = require('../services/reportService');

class ReportController {
    listReports(req, res) {
        try {
            const reports = reportService.getAvailableReports();
            return res.json({ reports });
        } catch (err) {
            return res.status(500).json({ error: err.message });
        }
    }

    generate(req, res) {
        try {
            const { reportId } = req.params;
            const data = reportService.generateReport(reportId, req.query);
            return res.json(data);
        } catch (err) {
            return res.status(500).json({ error: err.message });
        }
    }

    exportCSV(req, res) {
        try {
            const { reportId } = req.params;
            const data = reportService.generateReport(reportId, req.query);
            const csv = reportService.convertToCSV(data.records);

            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', `attachment; filename="${reportId}_${Date.now()}.csv"`);
            return res.send(csv);
        } catch (err) {
            return res.status(500).json({ error: err.message });
        }
    }
}

module.exports = new ReportController();
