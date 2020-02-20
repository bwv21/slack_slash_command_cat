"use strict";

process.env["is_local"] = 1;
process.env["webpage_capture_lambda"] = "bwv21_slack_slash_command_webpage_capture";
process.env["slack_webhook_url"] = null;
process.env["cat_api_url"] = "https://api.thecatapi.com";
process.env["cat_api_key"] = null;
process.env["nasa_api_url"] = "https://api.nasa.gov/planetary/apod";
process.env["nasa_api_key"] = null;


const fs = require("fs");
const app = require("./app");
const event = JSON.parse(fs.readFileSync("./sample.json", "utf8").trim());

function sleep(ms) {
    return new Promise((resolve, reject) => setTimeout(resolve, ms));
}

const run = async () => {
    const res = await app.handler(event);
    console.log(res);

    while (true) {
        console.log("fin.");
        await sleep(5000);
    }
};

run();