const sheets = require("./lib/sheets");
const fs = require("fs");

if (!fs.existsSync("token.json")) {
    sheets.getNewToken();
} else {
    console.log("Token.json already present");
}

