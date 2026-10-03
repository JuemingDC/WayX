// Source section / comment / metadata architecture contract
// Author: chance
// Category: Converter / Source Structure Validation

import assert from 'node:assert/strict';
import {
  WAYX_SUPPORTED_SOURCE_SECTIONS,
  cleanSourceComments,
  groupSourceSectionItems,
  isSupportedSourceSection,
  sourceCommentText,
} from '../src/plugin-parser.mjs';
import { attachQxInlineNote, looksLikeCommentedSourceDeclaration } from '../src/qx-comment.mjs';
import { parseSourceMetadataHeader, renderQxSnippetHeader, renderSurgeModuleHeader } from '../src/metadata.mjs';

const grouped=groupSourceSectionItems([
  '# group',
  '',
  'DOMAIN-SUFFIX,example.com,REJECT',
  '; note',
  'DOMAIN,api.example.com,REJECT',
  '// trailing',
]);
assert.equal(grouped.length,3);
assert.deepEqual(grouped[0],{
  comments:['# group',''],
  line:'DOMAIN-SUFFIX,example.com,REJECT',
  sourceIndex:2,
});
assert.deepEqual(grouped[1],{
  comments:['; note'],
  line:'DOMAIN,api.example.com,REJECT',
  sourceIndex:4,
});
assert.deepEqual(grouped[2],{
  comments:['// trailing'],
  line:null,
  sourceIndex:6,
});

assert.deepEqual(cleanSourceComments(['# a','','','; b']),['# a','','; b']);
assert.equal(sourceCommentText('# hello'),'hello');
assert.equal(sourceCommentText('; hello'),'hello');
assert.equal(sourceCommentText('// hello'),'hello');
assert.equal(sourceCommentText('DOMAIN,example.com,REJECT'),null);

assert.deepEqual(
  [...WAYX_SUPPORTED_SOURCE_SECTIONS],
  ['Argument','General','Rule','Rewrite','Script','MITM','MitM'],
);
for(const name of ['Argument','General','Rule','Rewrite','Script','MITM','MitM']) {
  assert.equal(isSupportedSourceSection(name),true);
}
assert.equal(isSupportedSourceSection('MITMExtra'),false);

const metadata=parseSourceMetadataHeader([
  '#!name=Demo',
  '#!desc=Demo Loon plugin',
  '#!author=chance',
  '# source header comment',
  '',
]);
assert.equal(metadata.directives.get('name'),'Demo');
assert.equal(metadata.directives.get('desc'),'Demo Loon plugin');
assert.equal(metadata.directives.get('author'),'chance');
assert.deepEqual(metadata.comments,['# source header comment','']);

const qxHeader=renderQxSnippetHeader(
  ['#!name=Demo','#!desc=Demo Loon plugin','#!author=chance','# source header comment'],
  {id:'Fallback',category:'去广告',source:'https://example.com/demo.lpx'},
  '2026-10-01 12:00:00 +08:00',
);
assert.equal(qxHeader[0],'# Name: Demo');
assert.equal(qxHeader[1],'# Description: Demo Quantumult X plugin');
assert.ok(qxHeader.includes('# Author: chance'));
assert.ok(qxHeader.includes('# source header comment'));

const surgeHeader=renderSurgeModuleHeader(
  ['#!name=Demo','#!desc=Demo Loon plugin','#!author=chance','# source header comment'],
  {id:'Fallback',category:'去广告',source:'https://example.com/demo.lpx'},
  '2026-10-01 12:00:00 +08:00',
);
assert.equal(surgeHeader[0],'#!name=Demo');
assert.equal(surgeHeader[1],'#!desc=Demo Surge plugin');
assert.ok(surgeHeader.includes('# Author: chance'));
assert.ok(surgeHeader.includes('# source header comment'));

const oneCommentOneRule=['# ads','DOMAIN-SUFFIX,example.com,REJECT'];
const oneItem=groupSourceSectionItems(oneCommentOneRule)[0];
assert.deepEqual(
  attachQxInlineNote({
    sectionLines:oneCommentOneRule,
    item:oneItem,
    sectionKind:'rule',
    lines:['host-suffix, example.com, reject'],
  }),
  {comments:[],lines:['{# ads #} host-suffix, example.com, reject']},
);

const groupComment=['# ads','DOMAIN-SUFFIX,a.example,REJECT','DOMAIN-SUFFIX,b.example,REJECT'];
const groupItem=groupSourceSectionItems(groupComment)[0];
const groupRendered=attachQxInlineNote({
  sectionLines:groupComment,
  item:groupItem,
  sectionKind:'rule',
  lines:['host-suffix, a.example, reject'],
});
assert.deepEqual(groupRendered.comments,['# ads']);
assert.deepEqual(groupRendered.lines,['host-suffix, a.example, reject']);

const multiComment=['# ads','# group','DOMAIN-SUFFIX,a.example,REJECT'];
const multiItem=groupSourceSectionItems(multiComment)[0];
assert.deepEqual(
  attachQxInlineNote({
    sectionLines:multiComment,
    item:multiItem,
    sectionKind:'rule',
    lines:['host-suffix, a.example, reject'],
  }).comments,
  ['# ads','# group'],
);

const disabledSource=['# DOMAIN-SUFFIX,disabled.example,REJECT','DOMAIN-SUFFIX,a.example,REJECT'];
const disabledItem=groupSourceSectionItems(disabledSource)[0];
const disabledRendered=attachQxInlineNote({
  sectionLines:disabledSource,
  item:disabledItem,
  sectionKind:'rule',
  lines:['host-suffix, a.example, reject'],
});
assert.deepEqual(disabledRendered.comments,['# DOMAIN-SUFFIX,disabled.example,REJECT']);
assert.equal(disabledRendered.lines[0],'host-suffix, a.example, reject');

assert.equal(looksLikeCommentedSourceDeclaration('DOMAIN,example.com,REJECT','rule'),true);
assert.equal(looksLikeCommentedSourceDeclaration('response if ${url} ~= /api/ then reject(200)','rewrite'),true);
assert.equal(looksLikeCommentedSourceDeclaration('http-response ^https://api script-path=https://example.com/a.js','script'),true);
assert.equal(looksLikeCommentedSourceDeclaration('human explanation','rule'),false);

const expansion=attachQxInlineNote({
  sectionLines:oneCommentOneRule,
  item:oneItem,
  sectionKind:'rule',
  lines:['host-suffix, example.com, reject','host-keyword, example, reject'],
});
assert.deepEqual(expansion.comments,['# ads']);
assert.equal(expansion.lines.length,2);

console.log('Source section/comment/metadata architecture contract passed');
