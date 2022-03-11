const axios = require("axios");
const cheerio = require("cheerio");
const moment = require("moment");

const db = require("./lib/db");
const axiosConfig = require("./lib/axiosConfig");
const sheets = require("./lib/sheets");

(async () => {
    sheets.checkToken();

    const tlds = [2, 3, 4, 12]  // tlds, 2 - com, 3 - net, 4 - org, 12 info

    {
        const domains = await sheets.getPendingDomains();

        for (let i = 0; i < tlds.length; i++) {
            switch (tlds[i]) {
                case 2:
                    console.log("Checking .com pending domains. \n");
                    break;
                case 3:
                    console.log("Checking .net pending domains. \n");
                    break;
                case 4:
                    console.log("Checking .org pending domains. \n");
                    break;
                case 12:
                    console.log("Checking .info pending domains. \n");
                    break;
            }

            let start = 0;
            let pagesLeft = true;
            while (pagesLeft) {
                let url = `https://www.expireddomains.net/backorder-expired-domains/?ftlds[]=${tlds[i]}&o=domainpop&r=d`;
                if (start !== 0) {
                    url += `&start=${start}`;
                }
                const res = await axios.get(url, axiosConfig);

                if (res.data.search("You hit the rate limiter") !== -1) {
                    console.log("Rate limiter. Waiting 10 seconds...")
                    await new Promise(resolve => setTimeout(resolve, 10000));
                    continue;
                }

                const $ = cheerio.load(res.data);

                const tb = $("table.base1");
                if (tb.length) {
                    const table_rows = $("table.base1 tbody tr");
                    for (let i = 0; i < table_rows.length; i++) {
                        const domainName = table_rows.eq(i).find(".field_domain > a").text();
                        const domainExpireDate = table_rows.eq(i).find(".field_enddate > a").text();
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
                    start += 25;
                } else {
                    pagesLeft = false;
                }
                console.log("Domain Checked: " + start + "\n");
            }
        }
    }
    {
        const domains = await sheets.getDeletedDomains();

        for (let i = 0; i < tlds.length; i++) {
            switch (tlds[i]) {
                case 2:
                    console.log("Checking .com deleted domains. \n");
                    break;
                case 3:
                    console.log("Checking .net deleted domains. \n");
                    break;
                case 4:
                    console.log("Checking .org deleted domains. \n");
                    break;
                case 12:
                    console.log("Checking .info deleted domains. \n");
                    break;
            }

            let start = 0;
            let pagesLeft = true;
            while (pagesLeft) {
                let url = `https://www.expireddomains.net/deleted-domains/?ftlds[]=${tlds[i]}&o=domainpop&r=d`;
                if (start !== 0) {
                    url += `&start=${start}`;
                }
                const res = await axios.get(url, axiosConfig);

                if (res.data.search("You hit the rate limiter") !== -1) {
                    console.log("Rate limiter. Waiting 10 seconds...")
                    await new Promise(resolve => setTimeout(resolve, 10000));
                    continue;
                }

                const $ = cheerio.load(res.data);

                const tb = $("table.base1");
                if (tb.length) {
                    const table_rows = $("table.base1 tbody tr");
                    for (let i = 0; i < table_rows.length; i++) {
                        const domainName = table_rows.eq(i).find(".field_domain > a").text();
                        let domainExpireDate = table_rows.eq(i).find(".field_changes").text();

                        if (domainExpireDate.startsWith("Today")) {
                            domainExpireDate = moment().format("YYYY-MM-DD");
                        } else if (domainExpireDate.startsWith("Yesterday")) {
                            domainExpireDate = moment().subtract(1, "days").format("YYYY-MM-DD");
                        } else {
                            domainExpireDate = moment().subtract(parseInt(domainExpireDate.split(" ")[0]), "days").format("YYYY-MM-DD");
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
                    start += 25;
                } else {
                    pagesLeft = false;
                }
                console.log("Domain Checked: " + start + "\n");
            }
        }
    }
})();

