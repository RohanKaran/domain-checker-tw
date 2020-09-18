const axios = require("axios");
const moment = require("moment");

const db = require("./lib/db");
const sheets = require("./lib/sheets");

let page = 1;
const pageIndex = process.argv.findIndex((el) => el === "--page");
if (pageIndex !== -1) {
    page = parseInt(process.argv[pageIndex + 1]);
}

(async () => {
    sheets.checkToken();
    const dropCatchDomains = await sheets.getDropCatchDomains();
    let firstTime = true;

    const axiosConfig = {
        headers: {
            "cache-control": "no-cache, no-store, must-revalidate, post-check=0, pre-check=0",
            "dnt": "1",
            "expires": "0",
            "pragma": "no-cache",
            "referer": "https://www.dropcatch.com/",
            "sec-fetch-dest": "empty",
            "sec-fetch-mode": "cors",
            "sec-fetch-site": "same-origin",
            "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/85.0.4183.83 Safari/537.36",
        }
    }

    const data = {
        filters: [
            {
                values: [{
                    Range: {
                        Min: moment().format("YYYY-MM-DD"),
                        Max: moment().format("YYYY-MM-DD")
                    }
                }],
                Name: "ExpirationDate"
            },
            {
                values: [{
                    Value: "Pending Delete"
                }],
                Name: "RecordType"
            },
            {
                values: [
                    {Value: "com"},
                    {Value: "org"},
                    {Value: "net"}
                ],
                Name: "Tld"
            }
        ],
        page,
        size: 250
    };

    let pagesLeft = true;
    while (pagesLeft) {
        const res = await axios.post("https://client.dropcatch.com/Search", data, axiosConfig);

        if (res.data.success && res.data.result.items && res.data.result.items.length) {
            if (firstTime) {
                console.log("Total domains: " + res.data.result.totalRecords + "\n");
                firstTime = false;
            }
            const domains = res.data.result.items;
            for (let i = 0; i < domains.length; i++)  {
                const linkedDomains = db.getDomainFromBacklink(domains[i].name);
                const expirationDate = moment(domains[i].expirationDate).format("YYYY-MM-DD HH:mm:ss")
                if (linkedDomains.length > 0) {
                    if (!dropCatchDomains.includes(domains[i].name)) {
                        await sheets.addDropCatchDomain(domains[i].name, expirationDate, linkedDomains.length, domains[i].numberOfBids, "$" + domains[i].highBid);
                    }
                    console.log(`Domain: ${domains[i].name}\nExpiration Date: ${expirationDate}`);
                    console.log("\nBacklinks:");
                    linkedDomains.forEach((linkedDomain, index) => {
                        console.log(`${index + 1}. ${linkedDomain.domain}`)
                    });
                    console.log("")
                }
            }
        } else {
            pagesLeft = false;
        }
        console.log("Page: " + data.page + ", Domain Checked: " + data.size * data.page + "\n");
        data.page++;
    }
})();
