const SCHEME = {
    Telegram: "tg",
    Swiftgram: "sg",
    Turrit: "turrit",
    iMe: "ime",
    Nicegram: "ng",
    Lingogram: "lingo",
    Nagram: "na",
};
function readClient() {
    try {
        if (typeof $prefs !== "undefined") {
            const v = $prefs.valueForKey("telegram_redirect_client");
            if (v && typeof v === "string")
                return v.trim();
        }
    }
    catch (e) {
        console.log(`Read BoxJs setting failed: ${e}`);
    }
    return "Telegram";
}
function qval(qs, key) {
    if (!qs)
        return "";
    const re = new RegExp("(?:^|&)" + key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "=([^&]*)");
    const m = qs.match(re);
    return m ? decodeURIComponent(m[1].replace(/\+/g, "%20")) : "";
}
function deeplink(scheme, path, qs) {
    const p = path.split("/").filter(Boolean);
    if (!p[0])
        return "";
    if (p[0][0] === "+") {
        return `${scheme}://join?invite=${encodeURIComponent(p[0].slice(1))}`;
    }
    if (p[0] === "joinchat" && p[1]) {
        return `${scheme}://join?invite=${encodeURIComponent(p[1])}`;
    }
    if (p[0] === "addstickers" && p[1]) {
        return `${scheme}://addstickers?set=${encodeURIComponent(p[1])}`;
    }
    if (p[0] === "share" && p[1] === "url") {
        const url = qval(qs, "url");
        const text = qval(qs, "text");
        return `${scheme}://msg_url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`;
    }
    if (p[1] && /^\d+$/.test(p[1])) {
        return `${scheme}://resolve?domain=${encodeURIComponent(p[0])}&post=${encodeURIComponent(p[1])}`;
    }
    return `${scheme}://resolve?domain=${encodeURIComponent(p[0])}`;
}
function finishRedirect(location) {
    $done({
        status: "HTTP/1.1 302 Found",
        headers: {
            Location: location,
            "Cache-Control": "no-store, no-cache",
            Pragma: "no-cache",
        },
        body: "",
    });
}
function finishNoop() {
    $done({
        status: "HTTP/1.1 204 No Content",
        headers: {
            "Cache-Control": "no-store, no-cache",
        },
        body: "",
    });
}
try {
    const url = $request.url;
    const m = url.match(/^https?:\/\/t\.me\/(.+)$/i);
    if (!m) {
        finishNoop();
    }
    else {
        let tail = m[1];
        if (tail.startsWith("s/")) {
            tail = tail.slice(2);
        }
        const qi = tail.indexOf("?");
        const path = qi < 0 ? tail : tail.slice(0, qi);
        const qs = qi < 0 ? "" : tail.slice(qi + 1);
        const client = readClient();
        const scheme = SCHEME[client] || "tg";
        const loc = deeplink(scheme, path, qs);
        if (!loc) {
            finishNoop();
        }
        else {
            finishRedirect(loc);
        }
    }
}
catch (e) {
    console.log(`Telegram Redirect error: ${e}`);
    finishNoop();
}
