"use strict";

process.env["AWS_REGION"] = "ap-northeast-2";
process.env["is_local"] = 1;
process.env["image_cache_lifetime_sec"] = 60;

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
}

run();