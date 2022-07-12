"use strict";

if (process.env.is_local != null) {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
}

process.env['PATH'] = process.env['PATH'] + ':' + process.env['LAMBDA_TASK_ROOT'];
process.env.FONTCONFIG_PATH = "/var/task/fonts";

const fs = require("fs");
const Phantom = require("phantom");
const request = require("request-promise");
const sharp = require("sharp");
const AWS = require("aws-sdk");

const LOCAL_DIR = process.env.is_local ? "./" : "/tmp/";
const S3_PATH_PREFIX = "price";
const CACHE_LIFETIME = parseInt(process.env.image_cache_lifetime_sec);

const s3 = new AWS.S3();
const Cache = {};


function sleep(ms) {
    return new Promise((resolve, reject) => setTimeout(resolve, ms));
}

exports.handler = async (event) => {
    console.log(JSON.stringify(event));

    var phantom = null;
    var page = null;

    try {
        // event.keyword = "amazon";

        await prepareCache();

        const TIMEOUT = process.env.is_local ? 999999 : parseInt(process.env.timeout || 20000);
        const timeoutTask = new Promise(function (resolve, _) {
            setTimeout(resolve, TIMEOUT, "timeout");
        });

        phantom = await Phantom.create();
        page = await phantom.createPage();

        const workTask = work(event, page);

        const raceResult = await Promise.race([workTask, timeoutTask]);

        console.log("race result: ", raceResult);

        var result = null;
        if (raceResult === "timeout") {
            // 이유를 알 수 없지만 가끔 이런 일이 발생한다. 람다 타임 아웃 전에 종료시켜서 exit 코드를 실행한다.
            result = {
                error: "timeout",
                time: TIMEOUT
            };
        } else {
            result = raceResult;
        }

        console.log(JSON.stringify(result));

        return result;
    } catch (exception) {
        console.log(event);

        console.error("exception: ", exception);

        return {
            error: "exception",
            s3_key: null,
            exception: exception
        };
    } finally {
        console.log("finally");

        if (page) {
            await page.close();
        }

        if (phantom) {
            await phantom.exit();
        }
    }
};

async function prepareCache() {
    if (Cache.results == null) {
        Cache.results = {};
    }
}

async function work(event, page) {
    const result = {
        error: "unknown_error",
        s3_key: null
    };

    if (event == null || event.keyword == null || event.keyword.length <= 0) {
        result.error = "invalid event";
        return result;
    }

    const timeKey = Math.round(Math.round((new Date()).getTime() / 1000) / CACHE_LIFETIME);
    const resultCacheKey = `${event.keyword}_${timeKey}`;

    const cachedResult = readResultCache(resultCacheKey);
    if (cachedResult != null) {
        console.log(`hit cache: <${resultCacheKey}, ${event.keyword}>`);
        return cachedResult;
    }

    var chartUrl = `https://google.com/search?q=chart+${event.keyword}`;
    const image = await createWebpageImage(chartUrl, timeKey, page);
    if (image == null) {
        result.error = "fail createWebpageImageFile";
        return result;
    }

    var s3Key = image.s3_key;
    if (image.exist_s3 === false) {
        const localRawFileName = LOCAL_DIR + image.raw_file_name;
        const cropImageFileName = LOCAL_DIR + image.crop_file_name;
        const successCrop = await cropImageFile(localRawFileName, cropImageFileName, 655, getHeight(image.asset_type, image.asset_type_sub), 0, getTop() + image.banner_height);
        if (successCrop === false) {
            result.error = "fail cropImageFile";
            return result;
        }

        const successUpload = await uploadS3(cropImageFileName, s3Key);
        if (successUpload === false) {
            result.error = "fail uploadS3";
            return result;
        }

        if (process.env.upload_raw_file != null) {
            await uploadS3(localRawFileName, s3Key.replace(image.crop_file_name, image.raw_file_name));
        }
    }

    result.error = "ok";
    result.s3_key = `${process.env.bucket}/${s3Key}`;
    result.keyword = event.keyword;
    result.code = image.code;
    result.chart_url = chartUrl;
    result.asset_type = image.asset_type;

    writeResultCache(resultCacheKey, result);

    return result;
}

function readResultCache(key) {
    return Cache.results[key];
}

function writeResultCache(key, result) {
    Cache.results[key] = result;
}

async function createWebpageImage(url, timeKey, page) {
    console.log(`createWebpageImage url, timeKey: ${url}, ${timeKey}`);

    await page.on("onResourceRequested",
        function (requestData) {
            // console.log("requesting: ", requestData.url);
        });

    try {
        const status = await page.open(encodeURI(url));
        if (status !== "success") {
            console.log("fail open chart page: ", url);
            return null;
        }

        // https://kr.investing.com/crypto/bitcoin
        // https://kr.investing.com/equities/amazon-com-inc
        const tokens = url.split("+");

        const code = tokens.pop();

        console.log(`code: ${code}`);

        const rawFileName = `${code}_${timeKey}+raw.png`;
        const cropFileName = `${code}_${timeKey}.png`;
        const s3Key = `${S3_PATH_PREFIX}/${buildPrefixByDate()}/${cropFileName}`;

        console.log(`raw file: ${rawFileName}`);
        console.log(`crop file: ${cropFileName}`);
        console.log(`s3 key: ${s3Key}`);

        const existS3 = await checkExistS3(s3Key);
        if (existS3) {
            console.log(`already exist s3: ${s3Key}`);

            return {
                exist_s3: true,
                s3_key: s3Key,
                code: code
            };
        }

        await page.render(LOCAL_DIR + rawFileName);

        console.log(`create image: ${rawFileName}`);

        const result = {
            exist_s3: false,
            code: code,
            s3_key: s3Key,
            raw_file_name: rawFileName,
            crop_file_name: cropFileName
        };

        console.log(`image: ${JSON.stringify(result)}`);

        return result;
    } catch (exception) {
        console.error("createWebpageImage exception: ", exception);

        return null;
    } finally {
        //await page.close();
    }
}

function buildPrefixByDate(addMinute = 540) {
    const date = new Date(new Date().toUTCString());
    date.setMinutes(date.getMinutes() + addMinute);
    const isoDate = date.toISOString();                 // 2019-08-12T13:25:08.000Z
    const tokens = isoDate.split("T");                  // [2019-08-12, 13:25:08.000Z]
    const ymd = tokens[0].replace(/\-/g, "/");          // 2019/08/12
    const hour = tokens.pop().split(":")[0];            // 13

    return `${ymd}/${hour}`; // "2019/08/05/13"
}

async function checkExistS3(s3Key) {
    console.log(`checkExistS3 s3Key: ${s3Key}`);

    try {
        const params = {
            Bucket: process.env.bucket,
            Key: s3Key
        };

        const getResult = await s3.getObject(params).promise();

        const exist = 0 < getResult.ContentLength && getResult.ETag;
        if (exist) {
            console.log(`exist in s3: ${s3Key}`);
        }

        return exist;
    } catch (exception) {
        console.log(`not exist in s3: ${s3Key}`);
        return false;
    }
}

function getTop() {
    let top = 500;
    try {
        if (process.env.crop_top != null) {
            top = parseInt(process.env.crop_top);
            if (0 < top) {
                console.log(`use env crop_height: ${top}`);
                return top;
            }
        }
    } catch (exception) {
        console.log(exception);
    }

    return top;
}

function getHeight(assetType, assetTypeSub) {
    let height = 0;
    try {
        if (process.env.crop_height != null) {
            const cropHeights = JSON.parse(process.env.crop_height);
            height = cropHeights[assetType];
            if (height && 0 < height) {
                console.log(`use env crop_height: ${height}(${assetType}, ${assetTypeSub})`);
                return height;
            }
        }
    } catch (exception) {
        console.log(exception);
        height = -1;
    }

    if (height == null || height <= 0) {
        console.log("use default height.");
    }

    if (assetType === "stock") {
        return 1100;
    } else if (assetType === "equities") {
        return 1100;
    } else if (assetType === "crypto") {
        return 810;
    } else if (assetType === "commodities") {
        return 990;
    } else if (assetType === "rates-bonds") {
        return 950;
    } else if (assetType === "indices") {
        return 910;
    } else if (assetType === "currencies") {
        return 1050;
    }

    // https://www.investing.com//crypto/bitcoin/btc-usd
    if (assetTypeSub === "crypto") {
        return 1025;
    }

    return 1000;
}

async function cropImageFile(rawFileName, cropFileName, width, height, left, top) {
    height = 170;
    width = 450;
    left = 160;
    top = 590;

    try {
        console.log(`cropImageFile rawFileName, cropFileName, (width, height, left, top): ${rawFileName}, ${cropFileName}, (${width}, ${height}, ${left}, ${top})`);

        await sharp(rawFileName).extract({ width: width, height: height, left: left, top: top }).toFile(cropFileName);

        console.log(`ok crop: ${cropFileName}`);

        return true;
    } catch (exception) {
        console.error("cropImageFile Exception: " + exception);
        return false;
    }
}

async function uploadS3(fileName, s3Key) {
    console.log(`uploadS3 fileName, s3Key: ${fileName}, ${s3Key}`);

    const stream = fs.createReadStream(fileName);

    const params = {
        Bucket: process.env.bucket,
        Key: s3Key,
        Body: stream,
        ContentType: "image/png"
    };

    const putResult = await s3.putObject(params).promise();

    if (putResult.ETag == null) {
        console.error(`fail upload s3: ${fileName}`);
        return false;
    }

    stream.close();

    console.log(`complete upload s3: ${fileName}`);

    return true;
}
