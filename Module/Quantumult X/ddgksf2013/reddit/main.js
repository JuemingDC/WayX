let headers = $request.headers;
delete headers['x-reddit-translations'];
delete headers['X-Reddit-Translations'];
headers['x-reddit-translations'] = 'enabled, seo, zh-hans';
$done({ headers });
