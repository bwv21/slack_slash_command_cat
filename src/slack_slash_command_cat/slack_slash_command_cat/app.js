"use strict";

if (process.env.is_local != null) {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
}

const request = require("request-promise");
const help = require("./cat/help.js");

exports.handler = async (event) => {
    console.log(JSON.stringify(event));

    try {
        var error = checkValidRequest(event);
        if (error != null) {
            await sendEphemeralMessage(event.channel_id, event.response_url, error);
            return "error";
        }

        return await main(event);
    } catch (exception) {
        console.error("=================== event beg ===================");
        console.error(JSON.stringify(event));
        console.error("=================== event end ===================");

        console.error("=================== exception beg ===================");
        console.error(exception);
        console.error("=================== exception end ===================");

        await sendEphemeralMessage(event.channel_id, event.response_url, `명령어 실행에 실패하였습니다. ${exception.message}`);

        return "error";
    }
};

function checkValidRequest(event) {
    if (process.env.slack_slash_command_tokens == null) {
        return `슬랙 슬래시 명령어 토큰이 설정되지 않았습니다.`;
    }

    let findToken = false;
    const splits = process.env.slack_slash_command_tokens;
    for (let i = 0; i < splits.length; ++i) {
        if (splits[i].trim() == event.token.toString().trim()) {
            findToken = true;
            break;
        }
    }

    if (findToken === false) {
        console.log(`fail checkValidRequest: ${event.token}`);
        return `유효한 슬랙 슬래시 명령어 토큰이 아닙니다.`;
    }

    if (event.channel_name !== "directmessage" && process.env.available_channels != null) {
        let findChannel = false;
        const splits = process.env.available_channels.split(",");
        for (let i = 0; i < splits.length; ++i) {
            if (splits[i].trim() == event.channel_name.toString().trim()) {
                findChannel = true;
                break;
            }
        }

        if (findChannel === false) {
            console.log(`fobidden channel: ${event.channel_name}`);
            return `명령어를 실행할 수 없는 채널입니다.`;
        }
    }

    return null;
}


async function sendEphemeralMessage(channel_id, response_url, text) {
    if (process.env.is_local) {
        return;
    }

    const response = {
        channel: channel_id,
        response_type: "ephemeral",
        text: text
    };

    const options = {
        method: "POST",
        url: response_url,
        headers: {
            'Content-Type': "application/json"
        },
        json: response
    };

    const result = await request.post(options);
    if (result !== "ok") {
        console.error("Fail Send Slack. Result: ", result);
    }
}

async function main(event) {
    const command = event.command.replace("/", "").toLowerCase();
    const args = event.text.toLowerCase().split(" ");
    const workerName = args.shift();
    const worker = findWorker(command, workerName);

    const timeoutTask = new Promise(function (resolve, _) {
        setTimeout(resolve, parseInt(process.env.timeout || 3000), "timeout");
    });

    const workTask = worker(args);

    const raceResult = await Promise.race([workTask, timeoutTask]);

    console.log("race result: ", raceResult);

    var response = null;
    if (raceResult === "timeout") {
        await sendEphemeralMessage(event.channel_id, event.response_url, "수행 중입니다. 잠시만 기다려 주세요.");
        response = await workTask;
    } else {
        response = raceResult;
    }

    if (event.warm_up) {
        console.log("warm up");
        return "ok. warm up";
    }

    await toSlack(response, event);

    return "ok";
}

function findWorker(command, workerName) {
    var worker;

    try {
        worker = require(`./${command}/${workerName}.js`).work;
    } catch (exception) {
        worker = help.work;
        console.log(`cannot find worker: ${workerName}`);
    }

    return worker;
}

async function toSlack(response, event) {
    function formattedNow() {
        const date = new Date();
        date.setHours(date.getHours() + 9);
        const now = (date).toISOString().replace(/T/, " ").replace(/\..+/, "");
        return now;
    }
    
    response.channel = event.channel_id;

    response.username = response.username || "명령봇";
    response.mrkdwn = response.mrkdwn || true;
    response.icon_emoji = response.icon_emoji || ":slack:";
    response.response_type = response.response_type || "in_channel"; // "ephemeral" 은 webhook 이면 의미 없음.
    response.attachments = response.attachments || [];

    response.attachments.push({
        footer: `\`${formattedNow()}\` by \`${event.user_name} ${event.command} ${event.text}\``,
        color: Math.random().toString(16).substr(2, 6)
    });

    var webhookUrl = findWebhookUrl(event.team_domain);

    const options = {
        method: "POST",
        url: response.response_type === "ephemeral" ? event.response_url : webhookUrl,
        headers: {
            'Content-Type': "application/json"
        },
        json: response
    };

    const result = await request.post(options);
    if (result !== "ok") {
        console.error("Fail Send Slack. Result: ", result);
    }
}

function findWebhookUrl(teamDomain) {
    const webhookUrlJson = JSON.parse(process.env["team_domain_to_webhook_url"]);
    const webhookUrl = webhookUrlJson[teamDomain];
    return webhookUrl;
}