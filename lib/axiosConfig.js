const config = require("../config.json");

const axiosConfig = {
    headers: {
        "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9",
        "accept-encoding": "gzip, deflate, br",
        "accept-language": "en-IN,en-GB;q=0.9,en-US;q=0.8,en;q=0.7",
        "cache-control": "max-age=0",
        "dnt": "1",
        "sec-fetch-dest": "document",
        "sec-fetch-mode": "navigate",
        "sec-fetch-site": "none",
        "sec-fetch-user": "?1",
        "upgrade-insecure-requests": "1",
        "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/85.0.4183.83 Safari/537.36",
    },
    maxRedirects: 0,
    validateStatus: function (status) {
        return status <= 400;
    }
}

if (config.proxy && config.proxy !== "") {
    const [host, port] = config.proxy.split(":");
    axiosConfig.proxy = {
        host,
        port
    }
}

module.exports = axiosConfig;
