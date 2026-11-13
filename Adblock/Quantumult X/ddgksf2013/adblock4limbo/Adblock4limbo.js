const privacyGate_style = `
<head>
<style id="privacy-gate">
    /* 初始强制黑屏 */
    html.locked body { 
        visibility: hidden !important; 
        background: #000 !important;  
    }
</style>
`;
const privacyGate_script = `
<script>
    (function() {
        const isOn = localStorage.getItem('nsfw_status') === 'on';
        const isLocked = localStorage.getItem('is_locked') === 'true';
        const hasPwd = !!localStorage.getItem('privateProtect');

        // 只有在“开启了保护”且“处于锁定状态或没设密码”时，才保持黑屏
        if (isOn && (isLocked || !hasPwd)) {
            document.documentElement.classList.add('locked');
        } else {
            // 否则立即移除样式，显示正常页面
            var gate = document.getElementById('privacy-gate');
            if (gate) gate.remove();
        }
    })();
</script>
</body>
`;
const JS_URL = "https://limbopro.com/Adguard/Adblock4limbo.user.js";
const fc_JS_URL = "https://limbopro.com/Adguard/Adblock4limbo.function.js";
const fd_JS_URL = "https://limbopro.com/Adguard/elementBlocker.user.js";
const agent_JS_URL = "https://limbopro.com/Adguard/isAgent.js";
const autoAdDetector_JS_URL = "https://limbopro.com/Adguard/autoAdDetector.js";
const TITLE_INJECTION_BASE = `
<script type="text/javascript" defer src="${autoAdDetector_JS_URL}"></script>
<script type="text/javascript" defer src="${JS_URL}"></script>
<script type="text/javascript" defer src="${fc_JS_URL}"></script>
<script type="text/javascript" defer src="${fd_JS_URL}"></script>
<script type="text/javascript" defer src="${agent_JS_URL}"></script>
`;
const BODY_INJECTION_BASE = `
<script type="text/javascript" defer src="${autoAdDetector_JS_URL}"></script>
<script type="text/javascript" defer src="${JS_URL}">
<script type="text/javascript" defer src="${fc_JS_URL}"></script>
<script type="text/javascript" defer src="${fd_JS_URL}"></script>
<script type="text/javascript" defer src="${agent_JS_URL}"></script>
</body>
`;
const TARGET_SITES_REGEX = /(missav|iyf|netflav|hitomi|supjav|njav|javday|91porna|lk1\.supremejav\.com|turbovidhls\.com|trailerhg\.xyz|turbovidhls\.com|turboplayers\.xyz|javggvideo\.xyz|turtleviplay\.xyz|findjav\.com|stbturbo\.xyz|emturbovid\.com)/i;
const JAVBUS_REGEX = /(javbus)/i;
const DMM_REGEX = /dmm\.co/i;
const MDSP_REGEX = /d1skbu98kuldnf\.cloudfront\.net/i;
const HUARENLIVE_REGEX = /(huaren|huavod)\.(live|top)\/player\/ec\.php/i;
const TITLE_REGEX = /<head\b[^>]*>/i;
const BODY_REGEX = /<\/body>/i;
const WINDOW_OPEN_REGEX = /window\.open\s*\(/g;
function getRootDomain(hostname) {
    if (!hostname)
        return '';
    let siteName = hostname.toLowerCase();
    if (siteName.startsWith('www.')) {
        siteName = siteName.substring(4);
    }
    if (siteName.startsWith('m.')) {
        siteName = siteName.substring(2);
    }
    if (siteName.startsWith('mobile.')) {
        siteName = siteName.substring(7);
    }
    let parts = siteName.split('.');
    const complexTLDs = [
        'co.uk', 'com.cn', 'co.jp', 'com.au', 'com.hk', 'com.tw',
        'nom.co', 'com.br', 'gov.cn', 'ac.jp', 'org.uk'
    ];
    if (parts.length > 2) {
        const lastTwo = parts.slice(-2).join('.');
        if (complexTLDs.includes(lastTwo)) {
            return parts.slice(-3).join('.');
        }
    }
    return parts.slice(-2).join('.');
}
function main() {
    try {
        const url = $request.url;
        const headers = $response.headers;
        let body = $response.body;
        const contentType = headers['Content-Type'] || headers['content-type'] || '';
        if (!contentType.includes('text/html')) {
            $done({});
            return;
        }
        if (typeof body !== 'string') {
            try {
                body = body.toString('utf8');
            }
            catch (e) {
                console.log("Failed to decode body");
                $done({});
                return;
            }
        }
        let modified = false;
        let newBody = body;
        let hostname = '';
        const hostnameMatch = url.match(/^(?:https?:\/\/)?([^:\/\n?]+)/im);
        if (hostnameMatch && hostnameMatch.length > 1) {
            hostname = hostnameMatch[1];
        }
        const domain = getRootDomain(hostname);
        let domainCSS_Injection = '';
        let domainCSS_Injection_byHand = '';
        if (domain && domain.includes('.')) {
            const domainCSS_URL = `https://limbopro.com/CSS/${domain}.css`;
            domainCSS_Injection = `<link rel="stylesheet" href="${domainCSS_URL}" type="text/css" />\n`;
            const domainCSS_URLbyHand = `https://limbopro.com/CSS/limbopro.${domain}.css`;
            domainCSS_Injection_byHand = `<link rel="stylesheet" href="${domainCSS_URLbyHand}" type="text/css" />\n`;
            console.log(`[Adblock4limbo] Injecting domain-specific CSS: ${domainCSS_URL}`);
        }
        else if (hostname) {
            console.log(`[Adblock4limbo] Ignored non-standard hostname or IP: ${hostname}`);
        }
        const FINAL_TITLE_INJECTION = `<head>\n${TITLE_INJECTION_BASE}${domainCSS_Injection}${domainCSS_Injection_byHand}`;
        const FINAL_BODY_INJECTION = `\n${domainCSS_Injection}${domainCSS_Injection_byHand}${BODY_INJECTION_BASE}`;
        const isTargetSite = TARGET_SITES_REGEX.test(url);
        const isJavbus = JAVBUS_REGEX.test(url);
        const isDMM = DMM_REGEX.test(url);
        const isMDSP = MDSP_REGEX.test(url);
        const isHuarenlive = HUARENLIVE_REGEX.test(url);
        if (isTargetSite) {
            if (TITLE_REGEX.test(newBody)) {
                newBody = newBody.replace(TITLE_REGEX, FINAL_TITLE_INJECTION);
                modified = true;
            }
            newBody = newBody.replace(WINDOW_OPEN_REGEX, 'function block_open(');
            modified = true;
        }
        else if (isJavbus || isDMM || isMDSP) {
            if (BODY_REGEX.test(newBody)) {
                newBody = newBody.replace(TITLE_REGEX, privacyGate_style);
                newBody = newBody.replace(BODY_REGEX, privacyGate_script);
                newBody = newBody.replace(BODY_REGEX, FINAL_BODY_INJECTION);
                modified = true;
            }
        }
        else if (isHuarenlive) {
            newBody = newBody
                .replace(/"time":\s*"20"/g, '"time":"0"')
                .replace(/"img":\s*"[^"]*"/g, '"img":""');
            modified = true;
        }
        else {
            if (TITLE_REGEX.test(newBody)) {
                newBody = newBody.replace(TITLE_REGEX, privacyGate_style);
                newBody = newBody.replace(BODY_REGEX, privacyGate_script);
                newBody = newBody.replace(TITLE_REGEX, FINAL_TITLE_INJECTION);
                modified = true;
            }
        }
        if (!modified) {
            $done({});
            return;
        }
        const newHeaders = { ...headers };
        newHeaders["Cross-Origin-Embedder-Policy"] = "unsafe-none";
        newHeaders["Cross-Origin-Opener-Policy"] = "unsafe-none";
        newHeaders["Cross-Origin-Resource-Policy"] = "cross-origin";
        delete newHeaders["Content-Security-Policy"];
        delete newHeaders["content-security-policy"];
        delete newHeaders["X-Frame-Options"];
        delete newHeaders["x-frame-options"];
        delete newHeaders["Referrer-Policy"];
        $done({
            headers: newHeaders,
            body: newBody
        });
    }
    catch (error) {
        console.log(`Adblock4limbo Error: ${error.message}`);
        $done({});
    }
}
main();
