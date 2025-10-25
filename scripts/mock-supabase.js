// Simple mock server for testing attendance endpoints locally
// Run: node scripts/mock-supabase.js

const http = require('http');
const url = require('url');

const PORT = 8787;

function json(res, code, obj) {
    const s = JSON.stringify(obj);
    res.writeHead(code, {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(s),
    });
    res.end(s);
}

// Simple in-memory store per id/employeeId
// { [id]: { name?: string, attendanceDates: Set, progress: [ { videoId, categoryId, progress, watchTime, lastWatched } ] } }
const store = {};

const server = http.createServer((req, res) => {
    const parsed = url.parse(req.url, true);
    const path = parsed.pathname || '';
    // expected base: /functions/v1/make-server-a8898ff1/users/:employeeId/attendance
    const matchLogs = path.match(/^\/functions\/v1\/make-server-a8898ff1\/users\/(.+?)\/attendance\/logs$/);
    const matchAttendance = path.match(/^\/functions\/v1\/make-server-a8898ff1\/users\/(.+?)\/attendance$/);

    if (req.method === 'GET' && matchLogs) {
        const employeeId = decodeURIComponent(matchLogs[1]);
        const month = parsed.query.month || '';
        const m = month.split('-');
        // return a few dummy timestamps within the month
        const logs = [];
        const now = new Date();
        // put one log today for convenience
        logs.push({ timestamp: now.toISOString() });
        // also put logs on 1st and 5th of that month if possible
        if (m.length === 2) {
            const y = Number(m[0]);
            const mm = Number(m[1]) - 1;
            const add = (d) => logs.push({ timestamp: new Date(y, mm, d, 9, 0, 0).toISOString() });
            add(1);
            add(5);
        }
        // ensure store tracks
        store[employeeId] = store[employeeId] || { attendanceDates: new Set() };
        // mirror today's date in store
        store[employeeId].attendanceDates.add(new Date().toISOString().slice(0, 10));
        return json(res, 200, { logs });
    }

    if ((req.method === 'POST' || req.method === 'PUT') && matchAttendance) {
        const employeeId = decodeURIComponent(matchAttendance[1]);
        let body = '';
        req.on('data', (chunk) => body += chunk);
        req.on('end', () => {
            try {
                const data = body ? JSON.parse(body) : {};
                store[employeeId] = store[employeeId] || { attendanceDates: new Set(), progress: [], name: 'Local Test User' };
                const today = new Date().toISOString().slice(0, 10);
                if (data.attendance) store[employeeId].attendanceDates.add(today);
                else store[employeeId].attendanceDates.delete(today);

                // respond with a mocked user object
                const user = { employeeId, name: store[employeeId].name, attendance: !!data.attendance };
                return json(res, 200, { user });
            } catch (e) {
                return json(res, 400, { error: 'invalid json' });
            }
        });
        return;
    }

    // Save user progress (client posts to /functions/v1/make-server-a8898ff1/progress)
    if (req.method === 'POST' && path === '/functions/v1/make-server-a8898ff1/progress') {
        let body = '';
        req.on('data', (chunk) => body += chunk);
        req.on('end', () => {
            try {
                const data = body ? JSON.parse(body) : {};
                const { id, videoId, categoryId, progress, watchTime } = data;
                if (!id || !videoId) return json(res, 400, { error: 'id and videoId required' });

                store[id] = store[id] || { attendanceDates: new Set(), progress: [], name: 'Local Test User' };
                const now = new Date().toISOString();
                const entry = { videoId, categoryId, progress: Number(progress) || 0, watchTime, lastWatched: now };
                const idx = store[id].progress.findIndex(p => p.videoId === videoId);
                if (idx === -1) store[id].progress.push(entry);
                else store[id].progress[idx] = { ...store[id].progress[idx], ...entry };

                const user = { id: id, employeeId: id, name: store[id].name, progress: store[id].progress };
                return json(res, 200, { success: true, user });
            } catch (e) {
                return json(res, 400, { error: 'invalid json' });
            }
        });
        return;
    }

    // Get user progress
    const matchGetProgress = path.match(/^\/functions\/v1\/make-server-a8898ff1\/progress\/(.+)$/);
    if (req.method === 'GET' && matchGetProgress) {
        const id = decodeURIComponent(matchGetProgress[1]);
        store[id] = store[id] || { attendanceDates: new Set(), progress: [], name: 'Local Test User' };
        return json(res, 200, { progress: store[id].progress });
    }

    // Admin: get all progress
    if (req.method === 'GET' && path === '/functions/v1/make-server-a8898ff1/admin/progress') {
        const all = Object.keys(store).flatMap(id => (store[id].progress || []).map(p => ({ id: id, userName: store[id].name, ...p })));
        return json(res, 200, { progress: all });
    }

    // default 404
    json(res, 404, { error: 'not found', path });
});

server.listen(PORT, () => {
    console.log(`Mock Supabase function server listening on http://localhost:${PORT}`);
});
