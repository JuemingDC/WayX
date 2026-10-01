// Original-source fetch profile contract.
// Author: chance
// Category: Converter / Upstream Fetch Test

import assert from 'node:assert/strict';
import {
  ORIGINAL_FETCH_PROFILES,
  WAYX_FETCH_UA,
  WAYX_LOON_FETCH_UA,
  resolveOriginalUrl,
  selectOriginalFetchProfile,
} from '../src/source-fetch.mjs';

assert.equal(WAYX_FETCH_UA,'StashCore/2.7.1 Stash/2.7.1 Clash/1.11.0');
assert.equal(WAYX_LOON_FETCH_UA,'Loon/764 CFNetwork/1498.700.1 Darwin/23.6.0 iPhone/17.6.1');

for (const url of [
  'https://kelee.one/Tool/Loon/Lpx/FleaMarket_remove_ads.lpx',
  'https://hub.kelee.one/list.json',
]) {
  const profile=selectOriginalFetchProfile(url);
  assert.equal(profile.id,'kelee');
  assert.equal(profile.transport,'python-urllib');
  assert.equal(profile.userAgent,WAYX_LOON_FETCH_UA);
}

for (const url of [
  'https://rucu6.pages.dev/Plugins/amap.lpx',
  'https://rucu6.pages.dev/Plugins/webpage.lpx',
]) {
  const profile=selectOriginalFetchProfile(url);
  assert.equal(profile.id,'rucu6');
  assert.equal(profile.transport,'python-urllib');
  assert.equal(profile.userAgent,WAYX_LOON_FETCH_UA);
}

for (const url of [
  'https://evil.example/?next=https://kelee.one/x',
  'https://notkelee.one/x',
  'https://rucu6.pages.dev.evil.example/Plugins/amap.lpx',
  'https://raw.githubusercontent.com/example/repo/main/file.js',
]) {
  assert.equal(selectOriginalFetchProfile(url),ORIGINAL_FETCH_PROFILES.default);
}

assert.equal(
  resolveOriginalUrl('../Resource/JQLang/a.jq','https://kelee.one/Tool/Loon/Lpx/demo.lpx'),
  'https://kelee.one/Tool/Loon/Resource/JQLang/a.jq',
);

console.log('Original-source fetch profile contract passed');
