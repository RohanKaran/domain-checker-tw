const axios = require("axios");
const fs = require("fs");
const qs = require("querystring");
const cheerio = require("cheerio");
const moment = require("moment");

const db = require("./lib/db");
const login = require("./lib/login");
const axiosConfig = require("./lib/axiosConfig");
const sheets = require("./lib/sheets");

(async () => {
    if (!fs.existsSync("cookies.json")) {
        await login.login()
    }

    sheets.checkToken();

    const cookies = JSON.parse(fs.readFileSync("cookies.json", "utf-8"));
    axiosConfig.headers['Cookie'] = qs.stringify(cookies, "; ");

    const queryParams = {
        "o": "enddate",  // sort by end date
        "r": "a",  // a = asc, d = desc
        "fbl": 50,  /// backlinks,
        "fworden": 1,  // english lang
        "flimit": 200,  // per page, max 200
        "start": 0,
        "ftlds": [2, 3, 4, 12]  // tlds, 2 - com, 3 - net, 4 - org, 12 info
    };

    let pagesLeft = true;
    console.log("Checking pending domains.");
    const domains = await sheets.getPendingDomains();

    while (pagesLeft) {
        const url = "https://member.expireddomains.net/domains/pendingdelete/?" +
            qs.stringify(queryParams).replace(/ftlds/g, "ftlds[]");
        const res = await axios.get(url, axiosConfig);

        if (res.data.search("You hit the rate limiter") !== -1) {
            console.log("Rate limiter. Waiting 10 seconds...")
            await new Promise(resolve => setTimeout(resolve, 10000));
            continue;
        }

        if (res.data.search("Redirecting to <a href=\"/login/\">/login/</a>") !== -1) {
            console.log("Either you are not logged in or your account is disabled.");
            break;
        }

        const $ = cheerio.load(res.data);

        const tb = $("table.base1");
        if (tb.length) {
            const table_rows = $("table.base1 tbody tr");
            for (let i = 0; i < table_rows.length; i++) {
                const domainName = table_rows.eq(i).find(".field_domain > a").text();
                const domainExpireDate = moment(table_rows.eq(i).find(".field_enddate > a").text(), "YYYY-MM-DD").format("DD-MMM-YYYY");
                const domainExpireAccuracyClass = table_rows.eq(i).find(".field_enddate > a").attr("class");
                let domainExpireAccuracy = "No Info";
                switch (domainExpireAccuracyClass) {
                    case "verified1":
                        domainExpireAccuracy = "Accurate";
                        break;
                    case "verified2":
                        domainExpireAccuracy = "Less Accurate";
                        break;
                    case "verified3":
                        domainExpireAccuracy = "Guess";
                        break;
                }

                const linkedDomains = db.getDomainFromBacklink(domainName);
                if (linkedDomains.length > 0) {
                    if (!domains.includes(domainName)) {
                        await sheets.addPendingDomain(domainName, domainExpireDate, domainExpireAccuracy, linkedDomains.length);
                    }
                    console.log(`Domain: ${domainName}\nPending Expire Date: ${domainExpireDate}\nExpire Date Accuracy: ${domainExpireAccuracy}`);
                    console.log("\nBacklinks:");
                    linkedDomains.forEach((linkedDomain, index) => {
                        console.log(`${index + 1}. ${linkedDomain.domain}`)
                    });
                    console.log("")
                }
            }
            queryParams["start"] += 200
        } else {
            pagesLeft = false;
        }
        console.log("Domain Checked: " + queryParams["start"] + "\n");
    }
})();

