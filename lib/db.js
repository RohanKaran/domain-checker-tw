const SQLite = require("better-sqlite3")

const db = new SQLite("domains.db");
db.pragma("journal_mode = WAL");

module.exports.createTables = () => {
    try {
        const stmt = db.prepare(`CREATE TABLE IF NOT EXISTS backlinks (
            domain TEXT,
            backlink TEXT,
            PRIMARY KEY(domain, backlink)
         )`);
        stmt.run();
        const stmt2 = db.prepare(`CREATE TABLE IF NOT EXISTS files (
            filename TEXT,
            md5 TEXT,
            lines INTEGER DEFAULT 0,
            completed BOOLEAN DEFAULT false,
            PRIMARY KEY(filename, md5)
         )`);
        stmt2.run();
    } catch (err) {
        console.log(err.message);
        process.exit(1);
    }
}

module.exports.doesBacklinkExist = (domain, backlink) => {
    try {
        const res = db.prepare(`SELECT count(*) as count FROM backlinks WHERE domain = ? and backlink = ?`).get(domain, backlink);
        return res.count > 0;
    } catch (err) {
        console.log(err);
    }
}

module.exports.prepareBacklinkInsert = () => {
    return db.prepare(`INSERT INTO backlinks (domain, backlink) VALUES (?, ?)`);
}

module.exports.insertBacklink = (stmt, domain, backlink) => {
    try {
        stmt.run(domain, backlink);
    } catch (err) {
        if (!err.message.startsWith("UNIQUE constraint failed"))
            console.log(err);
    }
}

module.exports.getLines = (file, md5) => {
    const res = db.prepare(`SELECT count(*) as count, lines FROM files WHERE filename = ? and md5 = ?`).get(file, md5);
    if (res.count > 0) {
        return res.lines;
    }
    return 1;
}

module.exports.updateLines = (file, md5, line) => {
    const res = db.prepare(`SELECT count(*) as count FROM files WHERE filename = ? and md5 = ?`).get(file, md5);
    if (res.count > 0) {
        const stmt = db.prepare(`UPDATE files SET lines = ? WHERE filename = ?`);
        stmt.run(line, file)
    } else {
        const stmt = db.prepare(`INSERT INTO files (filename, md5, lines) VALUES (?, ?, ?)`);
        stmt.run(file, md5, line)
    }
}

module.exports.isCompleted = (file, md5) => {
    const res = db.prepare(`SELECT completed FROM files WHERE filename = ? and md5 = ?`).get(file, md5);
    if (res) {
        return res.completed;
    }
    return false
}

module.exports.markCompleted = (file, md5) => {
    const stmt = db.prepare(`UPDATE files SET completed = true WHERE filename = ? and md5 = ?`);
    stmt.run(file, md5)
}

module.exports.getDomainFromBacklink = (backlink) => {
    try {
        const res = db.prepare(`SELECT domain FROM backlinks WHERE backlink = ?`).all(backlink.toLowerCase());
        return res;
    } catch (err) {
        console.log(err);
    }
}
