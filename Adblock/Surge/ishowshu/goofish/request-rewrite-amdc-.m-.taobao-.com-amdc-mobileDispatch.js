(function () {
    if (!(function (p, r) {
        const re = new RegExp(p.pattern, p.flags), headers = Array.isArray(r.headers) ? r.headers : Object.keys(r.headers || {}).map(field => ({ field, value: r.headers[field] }));
        if (p.kind === 'method')
            return re.test(String(r.method || ''));
        if (p.kind === 'field')
            return headers.some(h => String(h.field).toLowerCase() === p.field.toLowerCase() && re.test(String(h.value)));
        const path = String(r.url || '').replace(/^[a-z]+:\/\/[^/]+/i, '').split('#')[0] || '/';
        return [String(r.method || ''), path, ...headers.flatMap(h => [String(h.field), String(h.value)])].some(value => re.test(value));
    })({ "kind": "token", "pattern": "%E9%97%B2%E9%B1%BC*", "flags": "" }, $request))
        return $done({});
    const action = "reject";
    if (action === 'reject')
        return $done({ response: { status: 404, headers: {}, body: '' } });
    const body = action === 'reject-dict' ? '{}' : action === 'reject-array' ? '[]' : '';
    return $done({ response: { status: 200, headers: body ? { 'Content-Type': 'application/json' } : {}, body } });
})();
