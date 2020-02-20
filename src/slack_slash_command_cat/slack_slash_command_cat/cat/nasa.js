"use strict";

const request = require("request-promise");

const USER_NAME = "NASA오늘의사진봇";

exports.work = async function(args) {
    console.log(`[nasa] ${args}`);

    var ephemeral = false;
    if (0 < args.length && args[args.length - 1] === "-p") {
        ephemeral = true;
        args.pop();
    }

    var explanation = false;
    if (0 < args.length && args[args.length - 1] === "-e") {
        explanation = true;
        args.pop();
    }

    const today = new Date().toISOString().split('T')[0];

    var date = args[0];
    var isToday = false;
    if (date == null || date.length <= 0) {
        date = randomDate(new Date(2000, 0, 1), new Date()).toISOString().split('T')[0];
    } else if (date.toLowerCase() === "today") {
        date = today;
        isToday = true;
    }

    console.log(`[nasa] date: ${date}`);

    const nasaAPIUrl = `${process.env["nasa_api_url"]}?date=${date}&api_key=${process.env["nasa_api_key"]}`;

    var resultString = null;
    try {
        resultString = await request.get(nasaAPIUrl);
    } catch (exception) {
        if (isToday) {
            // 아직 오늘 날짜의 사진이 없음.
            console.log("not yet today picture.");

            return {
                username: USER_NAME,
                text: "아직 오늘의 사진이 등록되지 않았습니다.",
                response_type: "ephemeral"
            }
        }

        throw new Error("Fail Get Nasa API: ", nasaAPIUrl);
    }

    console.log(resultString);

    const result = JSON.parse(resultString);

    var attachments;
    if (result.media_type === "video") {
        attachments = [
            {
                title: result.title,
                text: result.url,
                color: Math.random().toString(16).substr(2, 6)
            }
        ];
    } else {
        attachments = [
            {
                title: `${result.title} (고화질 링크)`,
                title_link: result.hdurl,
                image_url: result.url,
                color: Math.random().toString(16).substr(2, 6)
            }
        ];
    }

    if (explanation) {
        attachments.push({
            text: "```" + result.explanation + "```",
            color: Math.random().toString(16).substr(2, 6)
        });
    }

    return {
        icon_emoji: ":nasa:",
        username: USER_NAME,
        text: `*Astronomy Picture Of the Day.* \`${result.date}\``,
        response_type: ephemeral ? "ephemeral" : "in_channel",
        attachments: attachments,
        mrkdwn: true
    };
}

function randomDate(start, end) {
    return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}