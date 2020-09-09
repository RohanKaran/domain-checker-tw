const fs = require("fs");
const log = require("single-line-log").stdout;
const md5File = require("md5-file");

const db = require("./lib/db");
const domains = require("./lib/domains");

db.createTables();
const stmt = db.prepareBacklinkInsert();

const dir = fs.readdirSync("input", {withFileTypes: true});
dir.forEach((file) => {
    if (file.isFile() && file.name.endsWith(".csv")) {
        console.log(file.name);
        const fileHash = md5File.sync("input/" + file.name);
        const domain = file.name.split("-")[0];
        console.log("Domain: " + domain);
        if (db.isCompleted(file.name, fileHash)) {
            console.log("It's already completed.");
            console.log("");
            return;
        }

        const lines = fs.readFileSync("input/" + file.name,  "utf-8").split("\n");
        const start = Date.now();
        let i = db.getLines(file.name, fileHash);
        if (i > 1) {
            console.log(`Starting from ${i}`);
        }
        for (; i < lines.length; i++) {
            if (!lines[i] || lines[i] === "") {
                continue;
            }
            const percentage = Math.floor(100 * i/lines.length);
            const now = Date.now() - start;
            const seconds = Math.floor(now / 1000);
            const backlink = domains.stripSubdomains(lines[i].split(",")[1]);
            db.insertBacklink(stmt, domain, backlink);
            log(`Progress: ${i}/${lines.length} [${percentage}%], Time Elapsed: ${seconds}s`);
            if (i % 1000 === 0) {
                db.updateLines(file.name, fileHash, i);
            }
        }
        db.markCompleted(file.name, fileHash);
        console.log("\n");
    }
});

