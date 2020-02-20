"use strict";

const request = require("request-promise");

const category = [
    {
        "id": 5,
        "name": "boxes"
    },
    {
        "id": 6,
        "name": "caturday"
    },
    {
        "id": 15,
        "name": "clothes"
    },
    {
        "id": 9,
        "name": "dream"
    },
    {
        "id": 3,
        "name": "funny"
    },
    {
        "id": 1,
        "name": "hats"
    },
    {
        "id": 10,
        "name": "kittens"
    },
    {
        "id": 14,
        "name": "sinks"
    },
    {
        "id": 2,
        "name": "space"
    },
    {
        "id": 4,
        "name": "sunglasses"
    },
    {
        "id": 7,
        "name": "ties"
    }
];

exports.work = async function(args) {
    console.log(`[cat] ${args}`);

    var ephemeral = false;
    if (0 < args.length && args[args.length - 1] === "-p") {
        ephemeral = true;
        args.pop();
    }

    const index = new Date().getTime() % category.length;
    const categoryID = category[index]["id"];

    const catAPIUrl = `${process.env["cat_api_url"]}/v1/images/search?category_ids=${categoryID}&api_key=${process.env["cat_api_key"]}`;

    const resultString = await request.get(catAPIUrl);

    console.log(resultString);

    const result = JSON.parse(resultString)[0];

    return {
        icon_emoji: ":cmd_cat:",
        username: "고양이짤봇",
        text: "",   // 필요(footer attachment).
        response_type: ephemeral ? "ephemeral" : "in_channel",
        attachments: [{
            title: `${result.categories[0].name}`,
            title_link: result.url,
            image_url: result.url,
            color: Math.random().toString(16).substr(2, 6)
        }],
        mrkdwn: true
    };
}
