const fs = require("fs");

const sld_list = fs.readFileSync("lib/sld_list.txt", "utf-8");

module.exports.stripSubdomains = (domain) => {
    const domainArr = domain.split(".");
    if (domainArr.length <= 2) {
        return domain
    }

    const possible_sld = domainArr.slice(-2).join(".");

    if (sld_list.search(possible_sld) === -1) {
        return possible_sld
    }

    return domainArr[domainArr.length - 3] + "." + possible_sld;
}
