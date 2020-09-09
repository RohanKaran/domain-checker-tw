const axios = require("axios");
const fs = require("fs");
const qs = require("querystring");

const config = require("../config.json")
const axiosConfig = require("./axiosConfig");

module.exports.login = async () => {
    axiosConfig.headers["content-type"] = "application/x-www-form-urlencoded";

    const data = {
        "login": config.username,
        "password": config.password,
        "rememberme": 1
    };

    const res = await axios.post("https://member.expireddomains.net/login/", qs.stringify(data), axiosConfig);
    if (res.headers.location.search("login") !== -1) {
        console.log("Invalid credentials");
        process.exit(1)
    } else {
        const cookies = {}
        res.headers["set-cookie"].forEach(cookie => {
            const cookieArr = cookie.split("=")
            cookies[cookieArr[0]] = decodeURIComponent(cookieArr[1].split(";")[0])
        });
        fs.writeFileSync("cookies.json", JSON.stringify(cookies), {encoding: "utf-8"});
        console.log("Login Successful")
    }
}
