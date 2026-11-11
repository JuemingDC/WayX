/* SPDX-License-Identifier: GPL-3.0-only */
(function () {
    if ((typeof $response === 'undefined' ? 'request' : 'response') !== "response")
        throw new Error('Unregistered HTTP source/target declaration');
    const __wayxDone = $done;
    let __wayxCompleted = false;
    const __wayxBinary = value => { if (ArrayBuffer.isView(value))
        return true; try {
        Object.getOwnPropertyDescriptor(ArrayBuffer.prototype, 'byteLength').get.call(value);
        return true;
    }
    catch {
        return false;
    } };
    const __wayxBytes = value => { let length; try {
        length = Object.getOwnPropertyDescriptor(ArrayBuffer.prototype, 'byteLength').get.call(value);
    }
    catch { } if (length !== undefined)
        return new Uint8Array(value, 0, length); if (ArrayBuffer.isView(value)) {
        const proto = Object.getPrototypeOf(Uint8Array.prototype), typed = Object.getOwnPropertyDescriptor(proto, Symbol.toStringTag).get.call(value) !== undefined, get = name => Object.getOwnPropertyDescriptor(typed ? proto : DataView.prototype, name).get.call(value);
        return new Uint8Array(get('buffer'), get('byteOffset'), get('byteLength'));
    } throw new TypeError('WayX API: binary body requires BufferSource'); };
    const __wayxView = value => { if (value === undefined)
        return undefined; const result = Object.assign({}, value); if (__wayxBinary(value.bodyBytes) || __wayxBinary(value.body)) {
        const data = value.bodyBytes;
        if (data !== undefined) {
            result.body = __wayxBytes(data);
            delete result.bodyBytes;
        }
    } return result; };
    return (function ($request, $response, $done) {
        return (function () {
            (() => {
                if (!$response?.body)
                    return $done({});
                const PREFIX = "**YGKJ";
                const SUFFIX = "YGKJ##";
                let rawBody = $response.body;
                let jsonText = rawBody;
                const hasWrapper = rawBody.startsWith(PREFIX) && rawBody.endsWith(SUFFIX);
                if (hasWrapper) {
                    jsonText = rawBody.slice(PREFIX.length, rawBody.length - SUFFIX.length);
                }
                let body;
                try {
                    body = JSON.parse(jsonText);
                }
                catch (e) {
                    console.log(`JSON解析失败: ${e.message}`);
                    return $done({});
                }
                const data = body?.jsonr?.data;
                if (!data || typeof data !== "object") {
                    return $done({});
                }
                let modified = false;
                const deleteKeys = [
                    "newYear",
                    "splashGray",
                    "enableSplashGray",
                    "splashAdType",
                    "splashCloseTime",
                    "sadt",
                    "dynamicSplashTime",
                    "splashCoverBar",
                    "splashSkipShowType",
                    "skipPopType",
                    "skipPopTime",
                    "skipStopDis",
                    "adPopExhibitTime",
                    "isAdPopExhibit",
                    "adStrategy",
                    "adConfigTriggerDelayTime",
                    "adNeedAnimate",
                    "needFetchInterstitialAd",
                    "intersitialAdPre",
                    "nativeAdFetchType",
                    "preloadAds",
                    "searchAdPos",
                    "searchPageAdType",
                    "searchPageAdAnimation",
                    "showTopSearchAd",
                    "feedAdClickSlipRegionType",
                    "feedAdClickSlipShowType",
                    "feedInfoSource",
                    "feedBackCutType",
                    "feedBackShakeType",
                    "expressAdDelayRefreshTime",
                    "disableAdAutoRefresh",
                    "reportAdNumLimit",
                    "shakeLeve",
                    "bdCloseDownloadDisplay",
                    "bdShowSplashDialog",
                    "sat",
                    "ldrAdAnimal",
                    "newKuaishouPicUrl",
                    "newKuaishouShowType",
                    "newKuaishouHigh",
                    "newKuaishouFeedId",
                    "kuaishouFeedId",
                    "showKSVideoHeader",
                    "ttSplashUsePhonePixel",
                    "supportMiniGame",
                    "welfareColor",
                    "welfareAllPage",
                    "welfareUrl",
                    "welfareSignUrl",
                    "oneLoginType",
                    "oneLoginPopType",
                    "oneLoginCheck",
                    "douyinLoginType",
                    "appInstallExhibitInterval",
                    "aiSpeakKeywords",
                    "aiSpeakTime",
                    "aiSpeakPreTime",
                    "aiSpeakAfterTime",
                    "voiceSearchMode",
                    "favGrayForAI",
                    "scanCodeTipType",
                    "blacklistDomains",
                    "appBackupDomains",
                    "useHttpDns",
                    "weatherGrayFlag"
                ];
                for (const key of deleteKeys) {
                    if (Object.prototype.hasOwnProperty.call(data, key)) {
                        delete data[key];
                        modified = true;
                    }
                }
                if (!modified) {
                    return $done({});
                }
                const result = JSON.stringify(body);
                const finalBody = hasWrapper ? `${PREFIX}${result}${SUFFIX}` : result;
                $done({ body: finalBody });
            })();
        }).call(this);
    }).call(globalThis, undefined, __wayxView(typeof $response === 'undefined' ? undefined : $response), value => {
        if (__wayxCompleted)
            return;
        const result = value == null ? {} : Object.assign({}, value);
        if (__wayxBinary(result.body)) {
            const data = __wayxBytes(result.body);
            result.bodyBytes = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength);
            delete result.body;
        }
        __wayxCompleted = true;
        return __wayxDone(result);
    });
})();
