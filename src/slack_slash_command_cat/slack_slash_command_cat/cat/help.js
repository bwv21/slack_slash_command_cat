"use strict";

exports.work = async function(args) {
    return {
        text: "`도움말`",
        response_type: "ephemeral",
        attachments: [
            {
                text: "```\n" +
                    "/cat price 키워드(아마존, 나스닥, 골드, 미국10년채권, 비트코인 ...)\n" + 
                    "/cat cat\n" + 
                    "/cat nasa [today] [-d] (today 없으면 랜덤, -e 있으면 설명 포함)\n" +
                    "타임아웃 에러는 개선 중 입니다. 무시해 주세요.\n" +
                    "```",
                color: Math.random().toString(16).substr(2, 6),
                footer: "버그 제보 및 건의 사항은 @bwv21"
            }]
    };
};