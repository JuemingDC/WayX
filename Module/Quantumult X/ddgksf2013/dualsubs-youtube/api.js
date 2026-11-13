(function () {
    'use strict';
    class URLSearchParams {
        constructor(params, onUpdate) {
            switch (typeof params) {
                case "string": {
                    if (params.length === 0)
                        break;
                    if (params.startsWith("?"))
                        params = params.slice(1);
                    const pairs = params.split("&").map(pair => {
                        const separator = pair.indexOf("=");
                        return separator < 0 ? [pair, ""] : [pair.slice(0, separator), pair.slice(separator + 1)];
                    });
                    pairs.forEach(([key, value]) => {
                        this.#params.push(key ? this.#decodeQueryComponent(key) : key);
                        this.#values.push(this.#decodeQueryComponent(value));
                    });
                    break;
                }
                case "object":
                    if (Array.isArray(params)) {
                        Object.entries(params).forEach(([key, value]) => {
                            this.#params.push(key);
                            this.#values.push(value);
                        });
                    }
                    else if (Symbol.iterator in Object(params)) {
                        for (const [key, value] of params) {
                            this.#params.push(key);
                            this.#values.push(value);
                        }
                    }
                    break;
            }
            this.#updateSearchString(this.#params, this.#values);
            this.#onUpdate = onUpdate;
        }
        #param = "";
        #params = [];
        #values = [];
        #onUpdate;
        #decodeQueryComponent(str) {
            return decodeURIComponent(str.replace(/\+/g, " "));
        }
        #encodeQueryComponent(str) {
            return encodeURIComponent(str)
                .replace(/%20/g, "+")
                .replace(/[!'()~]/g, character => `%${character.charCodeAt(0).toString(16).toUpperCase()}`);
        }
        #updateSearchString(params, values) {
            if (params.length === 0)
                this.#param = "";
            else
                this.#param = params
                    .map((param, index) => {
                    switch (typeof values[index]) {
                        case "object":
                            return `${this.#encodeQueryComponent(param)}=${this.#encodeQueryComponent(JSON.stringify(values[index]))}`;
                        case "boolean":
                        case "number":
                        case "string":
                            return `${this.#encodeQueryComponent(param)}=${this.#encodeQueryComponent(values[index])}`;
                        case "undefined":
                        default:
                            return this.#encodeQueryComponent(param);
                    }
                })
                    .join("&");
            this.#onUpdate?.(this.#param);
        }
        append(name, value) {
            this.#params.push(name);
            this.#values.push(value);
            this.#updateSearchString(this.#params, this.#values);
        }
        delete(name, value) {
            while (this.#params.indexOf(name) > -1) {
                this.#values.splice(this.#params.indexOf(name), 1);
                this.#params.splice(this.#params.indexOf(name), 1);
            }
            this.#updateSearchString(this.#params, this.#values);
        }
        entries() {
            return this.#params.map((param, index) => [param, this.#values[index]]);
        }
        get(name) {
            return this.#values[this.#params.indexOf(name)];
        }
        getAll(name) {
            return this.#values.filter((value, index) => this.#params[index] === name);
        }
        has(name, value) {
            return this.#params.indexOf(name) > -1;
        }
        keys() {
            return this.#params;
        }
        set(name, value) {
            if (this.#params.indexOf(name) === -1) {
                this.append(name, value);
            }
            else {
                let first = true;
                const newValues = [];
                this.#params = this.#params.filter((currentParam, index) => {
                    if (currentParam !== name) {
                        newValues.push(this.#values[index]);
                        return true;
                    }
                    else if (first) {
                        first = false;
                        newValues.push(value);
                        return true;
                    }
                    return false;
                });
                this.#values = newValues;
                this.#updateSearchString(this.#params, this.#values);
            }
        }
        sort() {
            const sortedPairs = this.entries().sort();
            this.#params = [];
            this.#values = [];
            sortedPairs.forEach(pair => {
                this.#params.push(pair[0]);
                this.#values.push(pair[1]);
            });
            this.#updateSearchString(this.#params, this.#values);
        }
        toString = () => this.#param;
        values = () => this.#values.values();
    }
    class URL {
        constructor(url, base) {
            switch (typeof url) {
                case "string": {
                    const urlIsValid = /^(blob:|file:)?[a-zA-z]+:\/\/.*/.test(url);
                    const baseIsValid = base ? /^(blob:|file:)?[a-zA-z]+:\/\/.*/.test(base) : false;
                    if (urlIsValid)
                        this.href = url;
                    else if (baseIsValid)
                        this.href = base + url;
                    else
                        throw new TypeError('URL string is not valid. If using a relative url, a second argument needs to be passed representing the base URL. Example: new URL("relative/path", "http://www.example.com");');
                    break;
                }
                case "object":
                    break;
                default:
                    throw new TypeError("Invalid argument type.");
            }
        }
        #url = {
            hash: "",
            host: "",
            hostname: "",
            href: "",
            password: "",
            pathname: "",
            port: Number.NaN,
            protocol: "",
            search: "",
            searchParams: new URLSearchParams(""),
            username: "",
        };
        static #URLRegExp = /^(?<scheme>([^:\/?#]+):)?(?:\/\/(?<authority>[^\/?#]*))?(?<path>[^?#]*)(?<query>\?([^#]*))?(?<hash>#(.*))?$/;
        static #AuthorityRegExp = /^(?<authentication>(?<username>[^:]*)(:(?<password>[^@]*))?@)?(?<hostname>[^:]+)(:(?<port>\d+))?$/;
        get hash() {
            return this.#url.hash;
        }
        set hash(value) {
            if (value.length !== 0) {
                if (value.startsWith("#"))
                    value = value.slice(1);
                this.#url.hash = `#${encodeURIComponent(value)}`;
            }
        }
        get host() {
            return this.port.length > 0 ? `${this.hostname}:${this.port}` : this.hostname;
        }
        set host(value) {
            [this.hostname, this.port] = value.split(":", 2);
        }
        get hostname() {
            return encodeURIComponent(this.#url.hostname);
        }
        set hostname(value) {
            this.#url.hostname = value ?? "";
        }
        get href() {
            let authority = "";
            if (this.username.length > 0) {
                authority += this.username;
                if (this.password.length > 0)
                    authority += `:${this.password}`;
                authority += "@";
            }
            return `${this.protocol}//${authority}${this.host}${this.pathname}${this.search}${this.hash}`;
        }
        set href(value) {
            if (value.startsWith("blob:") || value.startsWith("file:"))
                value = value.slice(5);
            const urlMatch = value.match(URL.#URLRegExp);
            if (!urlMatch)
                throw new TypeError("Invalid URL format.");
            this.protocol = urlMatch.groups.scheme ?? "";
            const authorityMatch = urlMatch.groups.authority.match(URL.#AuthorityRegExp);
            this.username = authorityMatch.groups.username ?? "";
            this.password = authorityMatch.groups.password ?? "";
            this.hostname = authorityMatch.groups.hostname ?? "";
            this.port = authorityMatch.groups.port ?? "";
            this.pathname = urlMatch.groups.path ?? "";
            this.search = urlMatch.groups.query ?? "";
            this.hash = urlMatch.groups.hash ?? "";
        }
        get origin() {
            return `${this.protocol}//${this.host}`;
        }
        get password() {
            return encodeURIComponent(this.#url.password);
        }
        set password(value) {
            if (this.username.length > 0)
                this.#url.password = value ?? "";
        }
        get pathname() {
            return `/${this.#url.pathname}`;
        }
        set pathname(value) {
            value = `${value}`;
            if (value.startsWith("/"))
                value = value.slice(1);
            this.#url.pathname = value;
        }
        get port() {
            if (Number.isNaN(this.#url.port))
                return "";
            const port = this.#url.port.toString();
            if (this.protocol === "ftp:" && port === "21")
                return "";
            if (this.protocol === "http:" && port === "80")
                return "";
            if (this.protocol === "https:" && port === "443")
                return "";
            return port;
        }
        set port(value) {
            switch (value) {
                case "":
                    this.#url.port = Number.NaN;
                    break;
                default: {
                    const port = Number.parseInt(value, 10);
                    if (port >= 0 && port < 65535)
                        this.#url.port = port;
                }
            }
        }
        get protocol() {
            return `${this.#url.protocol}:`;
        }
        set protocol(value) {
            if (value.endsWith(":"))
                value = value.slice(0, -1);
            this.#url.protocol = value;
        }
        get search() {
            if (this.#url.search.length > 0)
                return `?${this.#url.search}`;
            else
                return "";
        }
        set search(value) {
            value = `${value}`;
            if (value.startsWith("?"))
                value = value.slice(1);
            this.#url.search = value;
            this.#url.searchParams = new URLSearchParams(this.#url.search, search => {
                this.#url.search = search;
            });
        }
        get searchParams() {
            return this.#url.searchParams;
        }
        get username() {
            return encodeURIComponent(this.#url.username);
        }
        set username(value) {
            this.#url.username = value ?? "";
        }
        static parse = (url, base) => new URL(url, base);
        toString = () => this.href;
        toJSON = () => JSON.stringify({
            hash: this.hash,
            host: this.host,
            hostname: this.hostname,
            href: this.href,
            origin: this.origin,
            password: this.password,
            pathname: this.pathname,
            port: this.port,
            protocol: this.protocol,
            search: this.search,
            searchParams: this.searchParams,
            username: this.username,
        });
    }
    const $app = (() => {
        const has = key => key in globalThis;
        switch (true) {
            case has("$task"):
                return "Quantumult X";
            case has("$loon"):
                return "Loon";
            case has("$rocket"):
                return "Shadowrocket";
            case has("Egern"):
                return "Egern";
            case Boolean(globalThis.$environment?.["surge-version"]):
                return "Surge";
            case Boolean(globalThis.$environment?.["stash-version"]):
                return "Stash";
            case has("Cloudflare"):
                return "Worker";
            case Boolean(globalThis.process?.versions?.node):
                return "Node.js";
            default:
                return undefined;
        }
    })();
    class Console {
        static #counts = new Map([]);
        static #groups = [];
        static #times = new Map([]);
        static clear = () => { };
        static count = (label = "default") => {
            switch (Console.#counts.has(label)) {
                case true:
                    Console.#counts.set(label, Console.#counts.get(label) + 1);
                    break;
                case false:
                    Console.#counts.set(label, 0);
                    break;
            }
            Console.log(`${label}: ${Console.#counts.get(label)}`);
        };
        static countReset = (label = "default") => {
            switch (Console.#counts.has(label)) {
                case true:
                    Console.#counts.set(label, 0);
                    Console.log(`${label}: ${Console.#counts.get(label)}`);
                    break;
                case false:
                    Console.warn(`Counter "${label}" doesn’t exist`);
                    break;
            }
        };
        static debug = (...msg) => {
            if (Console.#level < 4)
                return;
            msg = msg.map(m => `🅱️ ${m}`);
            Console.log(...msg);
        };
        static error(...msg) {
            if (Console.#level < 1)
                return;
            switch ($app) {
                case "Surge":
                case "Loon":
                case "Stash":
                case "Egern":
                case "Shadowrocket":
                case "Quantumult X":
                default:
                    msg = msg.map(m => `❌ ${m}`);
                    break;
                case "Worker":
                case "Node.js":
                    msg = msg.map(m => `❌ ${m?.stack ?? m}`);
                    break;
            }
            Console.log(...msg);
        }
        static exception = (...msg) => Console.error(...msg);
        static group = label => Console.#groups.unshift(label);
        static groupEnd = () => Console.#groups.shift();
        static info(...msg) {
            if (Console.#level < 3)
                return;
            msg = msg.map(m => `ℹ️ ${m}`);
            Console.log(...msg);
        }
        static #level = 3;
        static get logLevel() {
            switch (Console.#level) {
                case 0:
                    return "OFF";
                case 1:
                    return "ERROR";
                case 2:
                    return "WARN";
                case 3:
                default:
                    return "INFO";
                case 4:
                    return "DEBUG";
                case 5:
                    return "ALL";
            }
        }
        static set logLevel(level) {
            switch (typeof level) {
                case "string":
                    level = level.toLowerCase();
                    break;
                case "number":
                    break;
                case "undefined":
                default:
                    level = "warn";
                    break;
            }
            switch (level) {
                case 0:
                case "off":
                    Console.#level = 0;
                    break;
                case 1:
                case "error":
                    Console.#level = 1;
                    break;
                case 2:
                case "warn":
                case "warning":
                default:
                    Console.#level = 2;
                    break;
                case 3:
                case "info":
                    Console.#level = 3;
                    break;
                case 4:
                case "debug":
                    Console.#level = 4;
                    break;
                case 5:
                case "all":
                    Console.#level = 5;
                    break;
            }
        }
        static log = (...msg) => {
            if (Console.#level === 0)
                return;
            msg = msg.flatMap(log => {
                switch (typeof log) {
                    case "object":
                        return [JSON.stringify(log)];
                    case "bigint":
                    case "number":
                    case "boolean":
                        return [log.toString()];
                    case "string":
                        return log.split(/\r?\n/u);
                    case "undefined":
                    default:
                        return [log];
                }
            });
            Console.#groups.forEach(group => {
                msg = msg.map(log => `  ${log}`);
                msg.unshift(`▼ ${group}:`);
            });
            msg = ["", ...msg];
            console.log(msg.join("\n"));
        };
        static time = (label = "default") => Console.#times.set(label, Date.now());
        static timeEnd = (label = "default") => Console.#times.delete(label);
        static timeLog = (label = "default") => {
            const time = Console.#times.get(label);
            if (time)
                Console.log(`${label}: ${Date.now() - time}ms`);
            else
                Console.warn(`Timer "${label}" doesn’t exist`);
        };
        static warn(...msg) {
            if (Console.#level < 2)
                return;
            msg = msg.map(m => `⚠️ ${m}`);
            Console.log(...msg);
        }
    }
    class Lodash {
        static escape(string) {
            const map = {
                "&": "&amp;",
                "<": "&lt;",
                ">": "&gt;",
                '"': "&quot;",
                "'": "&#39;",
            };
            return string.replace(/[&<>"']/g, m => map[m]);
        }
        static get(object = {}, path = "", defaultValue = undefined) {
            if (!Array.isArray(path))
                path = Lodash.toPath(path);
            const result = path.reduce((previousValue, currentValue) => {
                return Object(previousValue)[currentValue];
            }, object);
            return result === undefined ? defaultValue : result;
        }
        static merge(object, ...sources) {
            if (object === null || object === undefined)
                return object;
            for (const source of sources) {
                if (source === null || source === undefined)
                    continue;
                for (const key of Object.keys(source)) {
                    const sourceValue = source[key];
                    const targetValue = object[key];
                    switch (true) {
                        case Lodash.#isPlainObject(sourceValue) && Lodash.#isPlainObject(targetValue):
                            object[key] = Lodash.merge(targetValue, sourceValue);
                            break;
                        case sourceValue instanceof Map && targetValue instanceof Map:
                            if (sourceValue.size > 0) {
                                for (const [k, v] of sourceValue) {
                                    targetValue.set(k, v);
                                }
                            }
                            break;
                        case sourceValue instanceof Set && targetValue instanceof Set:
                            if (sourceValue.size > 0) {
                                for (const v of sourceValue) {
                                    targetValue.add(v);
                                }
                            }
                            break;
                        case Array.isArray(sourceValue) && sourceValue.length === 0 && targetValue !== undefined:
                            break;
                        case (sourceValue instanceof Map && sourceValue.size === 0 && targetValue !== undefined):
                        case (sourceValue instanceof Set && sourceValue.size === 0 && targetValue !== undefined):
                            break;
                        case sourceValue !== undefined:
                            object[key] = sourceValue;
                            break;
                    }
                }
            }
            return object;
        }
        static #isPlainObject(value) {
            if (value === null || typeof value !== "object")
                return false;
            const proto = Object.getPrototypeOf(value);
            return proto === null || proto === Object.prototype;
        }
        static omit(object = {}, paths = []) {
            if (!Array.isArray(paths))
                paths = [paths.toString()];
            paths.forEach(path => Lodash.unset(object, path));
            return object;
        }
        static pick(object = {}, paths = []) {
            if (!Array.isArray(paths))
                paths = [paths.toString()];
            const filteredEntries = Object.entries(object).filter(([key, value]) => paths.includes(key));
            return Object.fromEntries(filteredEntries);
        }
        static set(object, path, value) {
            if (!Array.isArray(path))
                path = Lodash.toPath(path);
            path.slice(0, -1).reduce((previousValue, currentValue, currentIndex) => (Object(previousValue[currentValue]) === previousValue[currentValue] ? previousValue[currentValue] : (previousValue[currentValue] = /^\d+$/.test(path[currentIndex + 1]) ? [] : {})), object)[path[path.length - 1]] = value;
            return object;
        }
        static toPath(value) {
            return value
                .replace(/\[(\d+)\]/g, ".$1")
                .split(".")
                .filter(Boolean);
        }
        static unescape(string) {
            const map = {
                "&amp;": "&",
                "&lt;": "<",
                "&gt;": ">",
                "&quot;": '"',
                "&#39;": "'",
            };
            return string.replace(/&amp;|&lt;|&gt;|&quot;|&#39;/g, m => map[m]);
        }
        static unset(object = {}, path = "") {
            if (!Array.isArray(path))
                path = Lodash.toPath(path);
            const result = path.reduce((previousValue, currentValue, currentIndex) => {
                if (currentIndex === path.length - 1) {
                    delete previousValue[currentValue];
                    return true;
                }
                return Object(previousValue)[currentValue];
            }, object);
            return result;
        }
    }
    const StatusTexts = {
        100: "Continue",
        101: "Switching Protocols",
        102: "Processing",
        103: "Early Hints",
        200: "OK",
        201: "Created",
        202: "Accepted",
        203: "Non-Authoritative Information",
        204: "No Content",
        205: "Reset Content",
        206: "Partial Content",
        207: "Multi-Status",
        208: "Already Reported",
        226: "IM Used",
        300: "Multiple Choices",
        301: "Moved Permanently",
        302: "Found",
        304: "Not Modified",
        307: "Temporary Redirect",
        308: "Permanent Redirect",
        400: "Bad Request",
        401: "Unauthorized",
        402: "Payment Required",
        403: "Forbidden",
        404: "Not Found",
        405: "Method Not Allowed",
        406: "Not Acceptable",
        407: "Proxy Authentication Required",
        408: "Request Timeout",
        409: "Conflict",
        410: "Gone",
        411: "Length Required",
        412: "Precondition Failed",
        413: "Content Too Large",
        414: "URI Too Long",
        415: "Unsupported Media Type",
        416: "Range Not Satisfiable",
        417: "Expectation Failed",
        418: "I'm a teapot",
        421: "Misdirected Request",
        422: "Unprocessable Entity",
        423: "Locked",
        424: "Failed Dependency",
        425: "Too Early",
        426: "Upgrade Required",
        428: "Precondition Required",
        429: "Too Many Requests",
        431: "Request Header Fields Too Large",
        451: "Unavailable For Legal Reasons",
        500: "Internal Server Error",
        501: "Not Implemented",
        502: "Bad Gateway",
        503: "Service Unavailable",
        504: "Gateway Timeout",
        505: "HTTP Version Not Supported",
        506: "Variant Also Negotiates",
        507: "Insufficient Storage",
        508: "Loop Detected",
        510: "Not Extended",
        511: "Network Authentication Required",
    };
    function done(object = {}) {
        switch ($app) {
            case "Surge":
                if (object.policy)
                    Lodash.set(object, "headers.X-Surge-Policy", object.policy);
                Console.log("🚩 执行结束!", `🕛 ${new Date().getTime() / 1000 - $script.startTime} 秒`);
                $done(object);
                break;
            case "Loon":
                if (object.policy)
                    object.node = object.policy;
                Console.log("🚩 执行结束!", `🕛 ${(new Date() - $script.startTime) / 1000} 秒`);
                $done(object);
                break;
            case "Stash":
                if (object.policy)
                    Lodash.set(object, "headers.X-Stash-Selected-Proxy", encodeURI(object.policy));
                Console.log("🚩 执行结束!", `🕛 ${(new Date() - $script.startTime) / 1000} 秒`);
                $done(object);
                break;
            case "Egern":
                Console.log("🚩 执行结束!");
                $done(object);
                break;
            case "Shadowrocket":
                Console.log("🚩 执行结束!");
                $done(object);
                break;
            case "Quantumult X":
                if (object.policy)
                    Lodash.set(object, "opts.policy", object.policy);
                object = Lodash.pick(object, ["status", "url", "headers", "body", "bodyBytes"]);
                switch (typeof object.status) {
                    case "number":
                        object.status = `HTTP/1.1 ${object.status} ${StatusTexts[object.status]}`;
                        break;
                    case "string":
                    case "undefined":
                        break;
                    default:
                        throw new TypeError(`${Function.name}: 参数类型错误, status 必须为数字或字符串`);
                }
                if (object.body instanceof ArrayBuffer) {
                    object.bodyBytes = object.body;
                    object.body = undefined;
                }
                else if (ArrayBuffer.isView(object.body)) {
                    object.bodyBytes = object.body.buffer.slice(object.body.byteOffset, object.body.byteLength + object.body.byteOffset);
                    object.body = undefined;
                }
                else if (object.body)
                    object.bodyBytes = undefined;
                Console.log("🚩 执行结束!");
                $done(object);
                break;
            case "Worker":
                Console.log("🚩 执行结束!");
                break;
            case "Node.js":
                Console.log("🚩 执行结束!");
                process.exit(1);
                break;
            default:
                Console.log("🚩 执行结束!");
                break;
        }
    }
    class Storage {
        static data = null;
        static dataFile = "box.dat";
        static nodeBackend = null;
        static #nameRegex = /^@(?<key>[^.]+)(?:\.(?<path>.*))?$/;
        static getItem(keyName, defaultValue = null) {
            let keyValue = defaultValue;
            switch (keyName.startsWith("@")) {
                case true: {
                    const { key, path } = keyName.match(Storage.#nameRegex)?.groups;
                    keyName = key;
                    let value = Storage.getItem(keyName, {});
                    if (typeof value !== "object")
                        value = {};
                    keyValue = Lodash.get(value, path);
                    try {
                        keyValue = JSON.parse(keyValue);
                    }
                    catch { }
                    break;
                }
                default:
                    switch ($app) {
                        case "Surge":
                        case "Loon":
                        case "Stash":
                        case "Egern":
                        case "Shadowrocket":
                            keyValue = $persistentStore.read(keyName);
                            break;
                        case "Quantumult X":
                            keyValue = $prefs.valueForKey(keyName);
                            break;
                        case "Worker":
                            Storage.data = Storage.data ?? {};
                            keyValue = Storage.data[keyName];
                            break;
                        case "Node.js":
                            Storage.data = Storage.nodeBackend.load(Storage.dataFile);
                            keyValue = Storage.data?.[keyName];
                            break;
                        default:
                            keyValue = Storage.data?.[keyName] || null;
                            break;
                    }
                    try {
                        keyValue = JSON.parse(keyValue);
                    }
                    catch {
                    }
                    break;
            }
            return keyValue ?? defaultValue;
        }
        static setItem(keyName = new String(), keyValue = new String()) {
            let result = false;
            switch (typeof keyValue) {
                case "object":
                    keyValue = JSON.stringify(keyValue);
                    break;
                default:
                    keyValue = String(keyValue);
                    break;
            }
            switch (keyName.startsWith("@")) {
                case true: {
                    const { key, path } = keyName.match(Storage.#nameRegex)?.groups;
                    keyName = key;
                    let value = Storage.getItem(keyName, {});
                    if (typeof value !== "object")
                        value = {};
                    Lodash.set(value, path, keyValue);
                    result = Storage.setItem(keyName, value);
                    break;
                }
                default:
                    switch ($app) {
                        case "Surge":
                        case "Loon":
                        case "Stash":
                        case "Egern":
                        case "Shadowrocket":
                            result = $persistentStore.write(keyValue, keyName);
                            break;
                        case "Quantumult X":
                            result = $prefs.setValueForKey(keyValue, keyName);
                            break;
                        case "Worker":
                            Storage.data = Storage.data ?? {};
                            Storage.data[keyName] = keyValue;
                            result = true;
                            break;
                        case "Node.js":
                            Storage.data = Storage.nodeBackend.load(Storage.dataFile);
                            Storage.data[keyName] = keyValue;
                            Storage.nodeBackend.write(Storage.dataFile, Storage.data);
                            result = true;
                            break;
                        default:
                            result = Storage.data?.[keyName] || null;
                            break;
                    }
                    break;
            }
            return result;
        }
        static removeItem(keyName) {
            let result = false;
            switch (keyName.startsWith("@")) {
                case true: {
                    const { key, path } = keyName.match(Storage.#nameRegex)?.groups;
                    keyName = key;
                    let value = Storage.getItem(keyName);
                    if (typeof value !== "object")
                        value = {};
                    Lodash.unset(value, path);
                    result = Storage.setItem(keyName, value);
                    break;
                }
                default:
                    switch ($app) {
                        case "Surge":
                            result = $persistentStore.write(null, keyName);
                            break;
                        case "Loon":
                        case "Stash":
                        case "Egern":
                        case "Shadowrocket":
                            result = false;
                            break;
                        case "Quantumult X":
                            result = $prefs.removeValueForKey(keyName);
                            break;
                        case "Worker":
                            Storage.data = Storage.data ?? {};
                            delete Storage.data[keyName];
                            result = true;
                            break;
                        case "Node.js":
                            Storage.data = Storage.nodeBackend.load(Storage.dataFile);
                            delete Storage.data[keyName];
                            Storage.nodeBackend.write(Storage.dataFile, Storage.data);
                            result = true;
                            break;
                        default:
                            result = false;
                            break;
                    }
                    break;
            }
            return result;
        }
        static clear() {
            let result = false;
            switch ($app) {
                case "Surge":
                case "Loon":
                case "Stash":
                case "Egern":
                case "Shadowrocket":
                    result = false;
                    break;
                case "Quantumult X":
                    result = $prefs.removeAllValues();
                    break;
                case "Worker":
                    Storage.data = {};
                    result = true;
                    break;
                case "Node.js":
                    Storage.data = Storage.nodeBackend.load(Storage.dataFile);
                    Storage.data = {};
                    Storage.nodeBackend.write(Storage.dataFile, Storage.data);
                    result = true;
                    break;
                default:
                    result = false;
                    break;
            }
            return result;
        }
    }
    function validatePathParts(parts) {
        if (!parts.every(part => typeof part === "string" && /^[a-zA-Z0-9_-]+$/.test(part) && !["__proto__", "prototype", "constructor"].includes(part)))
            throw new TypeError("Invalid key path");
        return parts;
    }
    class API {
        async run() {
            const request = globalThis.$request;
            let result;
            try {
                result = await this.handle(request);
            }
            catch (error) {
                console.error(`PreferencePanes: ${error.message}`);
                result = this.#response(request, error.status ?? 500, { error: error.message });
            }
            if (!result)
                done({});
            else
                done($app === "Quantumult X" ? result : { response: result });
        }
        async handle(request) {
            const url = new URL(request.url);
            const action = /^\/api\/(get|set|delete)$/.exec(url.pathname)?.[1];
            if (action)
                return this.#store(request, action);
            return;
        }
        #store(request, action) {
            const reply = (status, data) => this.#response(request, status, data);
            if (request.method !== "POST")
                return reply(405, { error: "Use POST with a form body" });
            const headers = Object.fromEntries(Object.entries(request.headers ?? {}).map(([key, value]) => [key.toLowerCase(), value]));
            if (headers["content-type"]?.split(";")[0].trim().toLowerCase() !== "application/x-www-form-urlencoded")
                return reply(415, { error: "Expected application/x-www-form-urlencoded" });
            if (typeof request.body !== "string" || request.body.length > 65536)
                return reply(400, { error: "Expected a form body up to 65536 characters" });
            let parts, value;
            try {
                const fields = request.body.split("&");
                if (fields.length !== 1)
                    throw new TypeError("Send exactly one storage key");
                const separator = fields[0].indexOf("=");
                if (separator < 0)
                    throw new TypeError("Expected @root.path=value");
                const key = decodeURIComponent(fields[0].slice(0, separator).replace(/\+/g, " "));
                value = decodeURIComponent(fields[0].slice(separator + 1).replace(/\+/g, " "));
                if (!key.startsWith("@"))
                    throw new TypeError("Storage keys must start with @");
                parts = validatePathParts(key.slice(1).split("."));
                if (parts.length < 2)
                    throw new TypeError("Specify a storage root and child path");
            }
            catch (error) {
                return reply(400, { error: error.message });
            }
            if (action === "set") {
                try {
                    value = JSON.parse(value);
                }
                catch (error) {
                    if (!(error instanceof SyntaxError))
                        throw error;
                }
            }
            const [storageKey, ...path] = parts;
            try {
                const root = Storage.getItem(storageKey, {});
                if (!isRecord(root))
                    throw new TypeError("Stored root must be an object");
                const parent = storageParent(root, path, action === "set");
                const key = path.at(-1);
                switch (action) {
                    case "get": {
                        const result = parent ? Lodash.get(parent, [key]) : undefined;
                        return result === undefined ? reply(404, { error: "Stored path does not exist" }) : reply(200, result);
                    }
                    case "set":
                        Lodash.set(parent, [key], value);
                        break;
                    case "delete":
                        if (parent)
                            Lodash.unset(parent, [key]);
                        break;
                }
                if (!Storage.setItem(storageKey, root))
                    throw new Error("Storage write failed");
                return reply(200, action === "set" ? { saved: true } : { deleted: true });
            }
            catch (error) {
                return reply(500, { error: error.message });
            }
        }
        #response(request, status, body) {
            return {
                status,
                headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" },
                body: request.method === "HEAD" ? "" : JSON.stringify(body),
            };
        }
    }
    function isRecord(value) {
        return value !== null && typeof value === "object" && Object.getPrototypeOf(value) === Object.prototype;
    }
    function storageParent(root, parts, create) {
        let parent = root;
        for (const part of parts.slice(0, -1)) {
            let next = Lodash.get(parent, [part]);
            switch (typeof next) {
                case "undefined":
                    if (!create)
                        return;
                    next = {};
                    break;
                case "string":
                    next = JSON.parse(next);
                    break;
            }
            if (!isRecord(next) && !Array.isArray(next))
                throw new TypeError("Stored parent is not an object or array");
            Lodash.set(parent, [part], next);
            parent = next;
        }
        return parent;
    }
    new API().run();
})();
