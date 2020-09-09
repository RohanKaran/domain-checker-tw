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
        "o": "changes",  // sort by end date
        "r": "d",  // a = asc, d = desc
        "fbl": 50,  /// backlinks,
        "fworden": 1,  // english lang
        "flimit": 200,  // per page, max 200
        "start": 0,
        "ftlds": [2, 3, 4, 12]  // tlds, 2 - com, 3 - net, 4 - org, 12 info
    };

    let pagesLeft = true;
    console.log("Checking deleted domains.");
    const domains = await sheets.getDeletedDomains();

    while (pagesLeft) {
        const url = "https://member.expireddomains.net/domains/combinedexpired/?" +
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
                let domainExpireDate = table_rows.eq(i).find(".field_changes").text();

                if (domainExpireDate.startsWith("Today")) {
                    domainExpireDate = moment().format("DD-MMM-YYYY");
                } else if (domainExpireDate.startsWith("Yesterday")) {
                    domainExpireDate = moment().subtract(1, "days").format("DD-MMM-YYYY");
                } else {
                    domainExpireDate = moment().subtract(parseInt(domainExpireDate.split(" ")[0]), "days").format("DD-MMM-YYYY");
                }

                let domainAvailability = table_rows.eq(i).find(".field_whois > a").text();

                if (!domainAvailability) {
                    domainAvailability = "Registered";
                } else {
                    domainAvailability = "Available";
                }

                const linkedDomains = db.getDomainFromBacklink(domainName);
                if (linkedDomains.length > 0) {
                    if (domainAvailability === "Available" && !domains.includes(domainName)) {
                        await sheets.addDeletedDomain(domainName, domainExpireDate, linkedDomains.length);
                    }

                    console.log(`Domain: ${domainName}\nExpire Date: ${domainExpireDate}\nAvailability: ${domainAvailability}`);
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
