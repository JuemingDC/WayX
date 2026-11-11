/* SPDX-License-Identifier: GPL-3.0-only; ScriptHub derivative. */
(function () {
    const __wayxHost = { request: typeof $request === 'undefined' ? undefined : $request, response: typeof $response === 'undefined' ? undefined : $response, done: $done, store: typeof $persistentStore === 'undefined' ? undefined : $persistentStore, global: globalThis, argument: typeof $argument === 'undefined' ? undefined : $argument };
    if ((__wayxHost.response === undefined ? 'request' : 'response') !== "response")
        throw new Error('Unregistered HTTP source/target declaration');
    const __wayxConfig = { "apiPlan": { "target": { "responseStatus": "status", "scriptStartTime": "epoch-seconds", "binaryField": "body", "store": { "style": "store", "read": "read", "write": "write", "remove": null, "undefinedDeletes": false }, "http": { "style": "callback", "root": "$httpClient", "optionsRoot": null, "redirect": "auto-redirect", "cookie": "auto-cookie", "tls": "insecure", "policy": "policy", "timeoutMs": 1000, "directPolicy": "DIRECT", "defaults": { "redirect": true, "cookie": true, "tls": false } }, "notification": { "root": "$notification.post", "open": "url", "media": "media-url", "action": "action", "openAction": "open-url", "stringLink": false, "delay": false }, "completion": { "statusEncoding": "number", "synthetic": "response" }, "argument": "string" } } };
    if ("surge" === 'surge' && typeof __wayxHost.argument === 'string' && __wayxHost.argument.startsWith("wayx_qx_header_v1=")) {
        const p = JSON.parse(decodeURIComponent(__wayxHost.argument.slice(18)));
        if (!(function (p, r) {
            const re = new RegExp(p.pattern, p.flags), headers = Array.isArray(r.headers) ? r.headers : Object.keys(r.headers || {}).map(field => ({ field, value: r.headers[field] }));
            if (p.kind === 'method')
                return re.test(String(r.method || ''));
            if (p.kind === 'field')
                return headers.some(h => String(h.field).toLowerCase() === p.field.toLowerCase() && re.test(String(h.value)));
            const path = String(r.url || '').replace(/^[a-z]+:\/\/[^/]+/i, '').split('#')[0] || '/';
            return [String(r.method || ''), path, ...headers.flatMap(h => [String(h.field), String(h.value)])].some(value => re.test(value));
        })(p, __wayxHost.request))
            return __wayxHost.done({});
        __wayxHost.argument = undefined;
    }
    return (function (config, host, run) {
        const own = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
        const fail = message => { throw new TypeError('WayX API: ' + message); };
        const target = config.apiPlan.target;
        const headers = (function (headers) {
            if (headers === undefined || headers === null)
                return headers;
            if (typeof headers !== 'object' || Array.isArray(headers))
                throw new TypeError('Header dictionary required');
            const lowerCaseHeaders = Object.fromEntries(Object.entries(headers).map(([k, v]) => [k.toLowerCase(), v]));
            const key = prop => typeof prop === 'string' ? prop.toLowerCase() : prop;
            return new Proxy(lowerCaseHeaders, {
                get: (target, prop, receiver) => {
                    if (prop === 'hasOwnProperty')
                        return name => Object.prototype.hasOwnProperty.call(target, key(name));
                    if (prop === 'propertyIsEnumerable')
                        return name => Object.prototype.propertyIsEnumerable.call(target, key(name));
                    if (typeof prop === 'string' && !Object.prototype.hasOwnProperty.call(target, key(prop)) && ['toString', 'toLocaleString', 'valueOf', 'constructor'].includes(prop))
                        return Reflect.get(target, prop, receiver);
                    return Reflect.get(target, key(prop), receiver);
                },
                set: (target, prop, value) => Reflect.defineProperty(target, key(prop), { value, writable: true, enumerable: true, configurable: true }),
                deleteProperty: (target, prop) => Reflect.deleteProperty(target, key(prop)),
                has: (target, prop) => Reflect.has(target, key(prop)),
                defineProperty: (target, prop, descriptor) => {
                    if (key(prop) !== prop && !descriptor.configurable)
                        throw new TypeError('Case-insensitive Header descriptors must be configurable');
                    return Reflect.defineProperty(target, key(prop), descriptor);
                },
                getOwnPropertyDescriptor: (target, prop) => { const d = Reflect.getOwnPropertyDescriptor(target, key(prop)); return d && key(prop) !== prop ? Object.assign({}, d, { configurable: true }) : d; },
            });
        });
        const abLength = Object.getOwnPropertyDescriptor(ArrayBuffer.prototype, 'byteLength').get;
        const typed = Object.getPrototypeOf(Uint8Array.prototype);
        const get = name => Object.getOwnPropertyDescriptor(typed, name).get;
        const tag = Object.getOwnPropertyDescriptor(typed, Symbol.toStringTag).get;
        const bytes = value => {
            let length;
            try {
                length = abLength.call(value);
            }
            catch { }
            if (length !== undefined)
                return new Uint8Array(value, 0, length);
            if (ArrayBuffer.isView(value)) {
                const isTyped = tag.call(value) !== undefined, getter = name => isTyped ? get(name).call(value) : Object.getOwnPropertyDescriptor(DataView.prototype, name).get.call(value);
                return new Uint8Array(getter('buffer'), getter('byteOffset'), getter('byteLength'));
            }
            return fail('binary body requires BufferSource');
        };
        const binary = value => {
            if (ArrayBuffer.isView(value))
                return true;
            try {
                abLength.call(value);
                return true;
            }
            catch {
                return false;
            }
        };
        const buffer = value => { const b = bytes(value); return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength); };
        const status = value => {
            if (typeof value === 'number' && Number.isInteger(value) && value >= 100 && value <= 599)
                return value;
            const m = typeof value === 'string' && /^HTTP\/[\d.]+\s+(\d{3})(?:\s.*)?$/.exec(value);
            if (m)
                return status(Number(m[1]));
            return fail('invalid HTTP status');
        };
        const requestParts = value => typeof value === 'string' ? /^(https?):\/\/([^/?#]+)([^#]*)/i.exec(value) : null;
        const originalRequest = requestParts(host.request && host.request.url);
        const rawPath = parts => parts[3] ? (parts[3][0] === '?' ? '/' : '') + parts[3] : '/';
        function view(value, requestRole = false) {
            if (value === undefined)
                return undefined;
            const result = Object.assign({}, value);
            if (requestRole && true && originalRequest) {
                if (!own(result, 'scheme'))
                    result.scheme = originalRequest[1].toLowerCase();
                if (!own(result, 'path'))
                    result.path = rawPath(originalRequest);
            }
            if (value.headers !== undefined)
                result.headers = headers(value.headers);
            if (own(value, "status")) {
                result["statusCode"] = status(value["status"]);
                delete result["status"];
            }
            if (binary(value.bodyBytes) || binary(value.body)) {
                const valueBytes = value.body;
                if (valueBytes !== undefined) {
                    const b = bytes(valueBytes);
                    {
                        result.bodyBytes = buffer(b);
                        delete result.body;
                    }
                }
            }
            return result;
        }
        const request = view(host.request, true);
        const response = view(host.response);
        let completed = false;
        const finish = value => { completed = true; return host.done(value); };
        function message(value, synthetic) {
            if (!value || typeof value !== 'object' || Array.isArray(value))
                return fail('completion requires an object');
            const out = Object.assign({}, value);
            if (!synthetic && false && true && own(out, 'path')) {
                if (typeof out.path !== 'string' || !out.path.startsWith('/') || /[\r\n]/.test(out.path))
                    fail('QX request path must be an absolute request path');
                {
                    if (!originalRequest)
                        fail('QX request path requires the original HTTP URL');
                    if (!own(out, 'url') || out.url === (host.request && host.request.url))
                        out.url = originalRequest[1] + '://' + originalRequest[2] + out.path;
                    delete out.path;
                }
            }
            if (own(out, 'statusCode') && !own(out, 'status'))
                out.status = out.statusCode;
            delete out.statusCode;
            if (own(out, 'status'))
                out.status = status(out.status);
            if (own(out, 'headers')) {
                if (!out.headers || typeof out.headers !== 'object' || Array.isArray(out.headers))
                    fail('completion headers require a dictionary');
                out.headers = Object.assign({}, headers(out.headers));
            }
            if (own(out, 'bodyBytes')) {
                out.body = bytes(out.bodyBytes);
                delete out.bodyBytes;
            }
            if (binary(out.body)) {
                out.body = bytes(out.body);
            }
            for (const key of ['h2_trailers', 'node', 'policy'])
                delete out[key];
            for (const key of Object.keys(out))
                if (!['url', 'headers', 'body', 'bodyBytes', 'status', 'abort', ...([]), ...([])].includes(key)) {
                    fail('unmapped completion field: ' + key);
                }
            ;
            ;
            return out;
        }
        function done(value) {
            if (completed)
                return;
            if (['task', 'network', 'generic'].includes("response"))
                return finish(value ?? {});
            if (value === undefined || value === null)
                return finish({});
            if (value === response || value === request) {
                const out = {};
                for (const k of ['url', 'headers', 'body', 'bodyBytes', 'h2_trailers', ...([]), "statusCode"])
                    if (own(value, k))
                        out[k] = value[k];
                value = out;
            }
            if (typeof value === 'string')
                value = { body: value };
            let synthetic = false, payload = value;
            if (value && typeof value === 'object' && own(value, 'response')) {
                synthetic = true;
                payload = value.response;
            }
            else
                ;
            const out = message(payload, synthetic);
            if (synthetic) {
                ;
                return finish({ response: out });
            }
            return finish(out);
        }
        const nativeStore = host.store;
        const storageKey = key => {
            if (key === undefined) {
                const name = "hlwxx_remove_ads.js";
                if (!name)
                    return fail('source storage default key needs source script name');
                return name;
            }
            if (typeof key !== 'string')
                return fail('storage key must be String');
            return key;
        };
        const store = { read: key => nativeStore["read"](storageKey(key)), write: (value, key) => {
                key = storageKey(key);
                if (value === null || (value === undefined && false))
                    return nativeStore["write"](null, key);
                if (typeof value !== 'string')
                    return fail('storage value must be String or deletion marker');
                return nativeStore["write"](value, key);
            } };
        const prefKey = key => typeof key === 'string' ? key : fail('QX storage requires an explicit String key');
        const prefs = { valueForKey: key => store.read(prefKey(key)), setValueForKey: (value, key) => {
                key = prefKey(key);
                if (typeof value !== 'string')
                    return fail('QX storage value must be String');
                return store.write(value, key);
            }, removeValueForKey: key => nativeStore["write"](null, prefKey(key)) };
        prefs.removeAllValues = () => undefined;
        ;
        ;
        const overlay = {
            $response: response, $done: done
        };
        ;
        return run.call(host.global, overlay);
    })(__wayxConfig, __wayxHost, function (__wayxScope) {
        return (function ($response, $done) {
            return (function () {
                var qx97_body = $response.body;
                if (!qx97_body || !/(?:<!doctype|<html)/i.test(qx97_body)) {
                    $done({});
                }
                else {
                    try {
                        var qx97_clear_player_ads = function (match, prefix, quote, raw) {
                            try {
                                var cfg = JSON.parse(raw);
                                var changed = false;
                                if (cfg && Array.isArray(cfg.pre_ads)) {
                                    cfg.pre_ads = [];
                                    changed = true;
                                }
                                if (cfg && Array.isArray(cfg.post_ads)) {
                                    cfg.post_ads = [];
                                    changed = true;
                                }
                                if (cfg && (Object.prototype.hasOwnProperty.call(cfg, 'ads_jump_time') || changed)) {
                                    cfg.ads_jump_time = -1;
                                    changed = true;
                                }
                                return changed ? prefix + quote + JSON.stringify(cfg) + quote : match;
                            }
                            catch (e) {
                                return match;
                            }
                        };
                        qx97_body = qx97_body.replace(/(\bdata-config\s*=\s*)(['"])([\s\S]*?)\2/gi, qx97_clear_player_ads);
                        var qx97_css = '<style id="qx97-adblock">'
                            + '.adspop,.xqbj-component-adfloat,#adFloat,.horizontal-banner,.article-ads-btn,.article-bottom-apps,.ads-title,article.no-mask,article.post-card-ads,.post-card-ads,.bottom-ads,.message-ad-item,'
                            + 'script[src*="adfloat.js"],script[src*="bottom_ad_poll"],script[src*="googletagmanager"],script[src*="google-analytics"],'
                            + 'iframe[src*="yandex"],iframe[src*="googletagmanager"],iframe[src*="google-analytics"]'
                            + '{display:none!important;width:0!important;height:0!important;max-height:0!important;min-height:0!important;overflow:hidden!important;opacity:0!important;pointer-events:none!important}'
                            + '</style>';
                        var qx97_js = '<script id="qx97-adblock-js">'
                            + '!function(){'
                            + 'function qx97_clean(){'
                            + 'var s=['
                            + '".adspop",".xqbj-component-adfloat","#adFloat",".horizontal-banner",".article-ads-btn",".article-bottom-apps",".ads-title",'
                            + '"article.no-mask","article.post-card-ads",".post-card-ads",".bottom-ads",".message-ad-item",'
                            + '"[class*=adfloat]","[id*=adFloat]","[data-ad-type]","[data-ad_type]","[data-ad-id]","[data-ad_id]"'
                            + '];'
                            + 's.forEach(function(x){document.querySelectorAll(x).forEach(function(e){e.remove()})});'
                            + 'document.querySelectorAll("script,link,iframe").forEach(function(e){'
                            + 'var u=(e.src||e.href||"").toLowerCase();'
                            + 'if(/adfloat|bottom_ad_poll|popup-feed|googletagmanager|google-analytics|mc\\.yandex|cloudflareinsights|zyudkkup|shuifeng|cghhqca/.test(u))e.remove()'
                            + '});'
                            + 'document.querySelectorAll("a.tjtagmanager").forEach(function(e){'
                            + 'var p=e.closest(".horizontal-banner,.article-ads-btn,.article-bottom-apps,.ads-title,article,.bottom-ads,.message-ad-item");'
                            + 'if(p)p.remove();else e.remove()'
                            + '});'
                            + 'try{window.dataLayer=[];window.tjDataLayer=[];window.gtag=function(){};window.ym=function(){};window.tjtag=function(){}}catch(e){}'
                            + '}'
                            + 'if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",qx97_clean);else qx97_clean();'
                            + 'setTimeout(qx97_clean,500);setTimeout(qx97_clean,1500);setTimeout(qx97_clean,4000);setTimeout(qx97_clean,8000)'
                            + '}();<\/script>';
                        qx97_body = qx97_body.replace(/<script[^>]+(?:adfloat\.js|bottom_ad_poll|googletagmanager|google-analytics|mc\.yandex|cloudflareinsights|tjtag)[^>]*>[\s\S]*?<\/script>/gi, '');
                        qx97_body = qx97_body.replace(/<link[^>]+(?:AiSuite|im\.css|googletagmanager|google-analytics)[^>]*>/gi, '');
                        qx97_body = qx97_body.replace(/<iframe[^>]+(?:yandex|googletagmanager|google-analytics)[^>]*>[\s\S]*?<\/iframe>/gi, '');
                        qx97_body = qx97_body.replace(/<article\b[^>]*class=["'][^"']*\bno-mask\b[^"']*["'][^>]*>[\s\S]*?<\/article>/gi, '');
                        qx97_body = qx97_body.replace(/<div\b[^>]*class=["'][^"']*\bhorizontal-banner\b[^"']*["'][^>]*>[\s\S]*?<\/div>/gi, '');
                        qx97_body = qx97_body.replace(/<div\b[^>]*class=["'][^"']*\barticle-ads-btn\b[^"']*["'][^>]*>[\s\S]*?<\/div>/gi, '');
                        qx97_body = qx97_body.replace(/<div\b[^>]*class=["'][^"']*\barticle-bottom-apps\b[^"']*["'][^>]*>[\s\S]*?<\/div>/gi, '');
                        qx97_body = qx97_body.replace(/<div\b[^>]*class=["'][^"']*\bads-title\b[^"']*["'][^>]*>[\s\S]*?<\/div>/gi, '');
                        qx97_body = qx97_body.replace(/<div\b[^>]*class=["'][^"']*\bbottom-ads\b[^"']*["'][^>]*>[\s\S]*?<\/div>/gi, '');
                        qx97_body = qx97_body.replace(/<div\b[^>]*class=["'][^"']*\badspop\b[^"']*["'][^>]*>[\s\S]*?<\/div>/gi, '');
                        qx97_body = qx97_body.replace(/<script[^>]*id=["']qx97-adblock(?:-js)?["'][^>]*>[\s\S]*?<\/script>/gi, '');
                        qx97_body = qx97_body.replace(/<\/head>/i, qx97_css + '</head>');
                        qx97_body = qx97_body.replace(/<\/body>/i, qx97_js + '</body>');
                        $done({ body: qx97_body });
                    }
                    catch (e) {
                        $done({});
                    }
                }
            }).call(this);
        }).call(this, Object.prototype.hasOwnProperty.call(__wayxScope, "$response") ? __wayxScope["$response"] : (typeof $response === 'undefined' ? undefined : $response), Object.prototype.hasOwnProperty.call(__wayxScope, "$done") ? __wayxScope["$done"] : (typeof $done === 'undefined' ? undefined : $done));
    });
})();
