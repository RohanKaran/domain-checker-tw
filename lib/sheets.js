const fs = require("fs");
const readline = require("readline");
const {google} = require("googleapis");
const sheets = google.sheets("v4");

const config = require("../config.json");
const credentials = require("../credentials.json");

// Token scope
const SCOPES = ["https://www.googleapis.com/auth/spreadsheets"];

/**
 * Check if token present or not
 */
function checkToken() {
    if (!fs.existsSync("token.json")) {
        console.log("Token.json not found");
        process.exit(0);
    }
}

/**
 * Get new token after prompting for user authorization
 */
function getNewToken() {
    const {client_secret, client_id, redirect_uris} = credentials.installed;
    const oAuth2Client = new google.auth.OAuth2(
        client_id, client_secret, redirect_uris[0]);

    const authUrl = oAuth2Client.generateAuthUrl({
        access_type: "offline",
        scope: SCOPES,
    });
    console.log("Authorize this app by visiting this url:", authUrl);
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });
    rl.question("Enter the code from that page here: ", (code) => {
        rl.close();
        oAuth2Client.getToken(code, (err, token) => {
            if (err) return console.error("Error while trying to retrieve access token", err);
            fs.writeFile("token.json", JSON.stringify(token), (err) => {
                if (err) return console.error(err);
                console.log("Token stored to token.json");
            });
        });
    });
}

function getAuth2Client() {
    const {client_secret, client_id, redirect_uris} = credentials.installed;
    const oAuth2Client = new google.auth.OAuth2(
        client_id, client_secret, redirect_uris[0]);
    const token = JSON.parse(fs.readFileSync("token.json", "utf-8"));
    oAuth2Client.setCredentials(token);
    return oAuth2Client;
}

async function getDeletedDomains() {
    const auth = getAuth2Client();
    try {
        const response = (await sheets.spreadsheets.values.get({
            spreadsheetId: config.spreadsheetId,
            range: "Deleted!A:A",
            auth
        })).data;
        const domains = [];

        if (response.values) {
            response.values.forEach((row) => {
                domains.push(row[0])
            });
        }

        return domains;
    } catch (err) {
        console.error(err);
    }
}

async function addDeletedDomain(domain, date, backlinks) {
    const auth = getAuth2Client();
    try {
        await sheets.spreadsheets.values.append({
            spreadsheetId: config.spreadsheetId,
            range: "Deleted!A:B",
            valueInputOption: "USER_ENTERED",
            requestBody: {
                values: [
                    [domain, date, backlinks]
                ]
            },
            auth
        });
    } catch (err) {
        console.error(err);
    }
}

async function getPendingDomains() {
    const auth = getAuth2Client();
    try {
        const response = (await sheets.spreadsheets.values.get({
            spreadsheetId: config.spreadsheetId,
            range: "Pending!A:A",
            auth
        })).data;
        const domains = [];

        if (response.values) {
            response.values.forEach((row) => {
                domains.push(row[0])
            });
        }

        return domains;
    } catch (err) {
        console.error(err);
    }
}

async function addPendingDomain(domain, date, accuracy, backlink) {
    const auth = getAuth2Client();
    try {
        await sheets.spreadsheets.values.append({
            spreadsheetId: config.spreadsheetId,
            range: "Pending!A:D",
            valueInputOption: "USER_ENTERED",
            requestBody: {
                values: [
                    [domain, date, accuracy, backlink]
                ]
            },
            auth
        });
    } catch (err) {
        console.error(err);
    }
}

async function getDropCatchDomains() {
    const auth = getAuth2Client();
    try {
        const response = (await sheets.spreadsheets.values.get({
            spreadsheetId: config.spreadsheetId,
            range: "Dropcatch Pending Domains!A:A",
            auth
        })).data;
        const domains = [];

        if (response.values) {
            response.values.forEach((row) => {
                domains.push(row[0])
            });
        }

        return domains;
    } catch (err) {
        console.error(err);
    }
}

async function addDropCatchDomain(domain, date, backlinks, bids, highestBid) {
    const auth = getAuth2Client();
    try {
        await sheets.spreadsheets.values.append({
            spreadsheetId: config.spreadsheetId,
            range: "Dropcatch Pending Domains!A:E",
            valueInputOption: "USER_ENTERED",
            requestBody: {
                values: [
                    [domain, date, backlinks, bids, highestBid]
                ]
            },
            auth
        });
    } catch (err) {
        console.error(err);
    }
}

module.exports = {
    checkToken,
    getNewToken,
    getDeletedDomains,
    addDeletedDomain,
    getPendingDomains,
    addPendingDomain,
    getDropCatchDomains,
    addDropCatchDomain
}
