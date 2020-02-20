"use strict";

const AWS = require("aws-sdk");
AWS.config.update({ region: 'ap-northeast-2' });
const lambda = new AWS.Lambda();

const HELP_TEXT = `/cat price 키워드(아마존, 나스닥, 골드, 미국10년채권, 비트코인 ...)`;

exports.work = async function(args) {
    console.log(`[price] ${args}`);

    if (args == null || args.length <= 0) {
        return {
            text: HELP_TEXT,
            response_type: "ephemeral"
        };
    }

    var ephemeral = false;
    if (args[args.length - 1] === "-p") {
        ephemeral = true;
        args.pop();
    }

    if (args.length <= 0) {
        return {
            text: HELP_TEXT,
            response_type: "ephemeral"
        };
    }

    // 띄어쓰기는 하나의 키워드로 처리.
    var keyword = args.join(" ").trim();
    if (keyword.length <= 0) {
        return {
            text: HELP_TEXT,
            response_type: "ephemeral"
        };
    }

    // 금리는 "금리 결정"으로 검색해야 제대로 나와서 변경(예를 들어 "한국 금리"보다 "한국 금리 결정"이 제대로 나옴).
    keyword = keyword.replace("금리", "금리 결정");

    const params = {
        FunctionName: process.env.webpage_capture_lambda,
        Payload: JSON.stringify({
            keyword: keyword
        })
    };

    const result = await lambda.invoke(params).promise();
    console.log(`result: ${JSON.stringify(result)}`);

    if (result.StatusCode !== 200) {
        return {
            text: `에러: ${result.StatusCode}`,
            response_type: "ephemeral"
        };
    }

    console.log(`payload: ${result.Payload}`);

    const payload = JSON.parse(result.Payload);

    // 람다에서 발생한 에러.
    if (payload.errorMessage) {
        return {
            text: `에러: ${payload.errorMessage}`,
            response_type: "ephemeral"
        };
    }

    if (payload.error !== "ok") {
        console.log(`payload.error: ${payload.error}(${payload.time / 1000})`);

        // 여러 이유로 에러가 발생할 수 있다.
        // 캡차를 요구해서 스샷을 못찍거나 라이브러리 에러 등.
        // 람다의 머신이 바뀌면 정상으로 돌아오는데, 강제로 바꿔주기 위해 함수를 업데이트 한다.
        await updateWebpageCaptureLambda();

        return {
            text: `오류가 발생하여 프로그램을 재시작합니다. 잠시 후 다시 시도해 주세요. \`error: ${payload.error}\``,
            response_type: "ephemeral"
        };
    }

    return {
        icon_emoji: ":chart_price:",
        username: "가격봇",
        text: "",   // 필요(footer attachment).
        response_type: ephemeral ? "ephemeral" : "in_channel",
        attachments: [{
            title: `${payload.code}`,
            title_link: payload.chart_url,
            image_url: `https://s3.ap-northeast-2.amazonaws.com/${payload.s3_key}`,
            color: Math.random().toString(16).substr(2, 6)
        }],
        mrkdwn: true
    };
};

// 현재 값을 읽어와서 config의 특정 값만 업데이트.
async function updateWebpageCaptureLambda() {
    console.log("updateWebpageCaptureLambda start...");

    const UPDATE_CONFIG_TIME = "update_config_time";

    const getParams = {
        FunctionName: process.env.webpage_capture_lambda
    };

    const getResult = await lambda.getFunctionConfiguration(getParams).promise();

    console.log("getFunctionConfiguration: ", getResult);

    getResult.Environment.Variables[UPDATE_CONFIG_TIME] = (new Date().getTime()).toString();
    
    const updateParams = {
        FunctionName: process.env.webpage_capture_lambda,
        Environment: getResult.Environment
    };

    const updateResult = await lambda.updateFunctionConfiguration(updateParams).promise();

    console.log(updateResult);

    console.log("updateWebpageCaptureLambda ok.");
}