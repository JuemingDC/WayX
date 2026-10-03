// Target-neutral Rule AST contract
// Author: chance
// Category: Converter / Rule / AST Validation

import assert from 'node:assert/strict';
import {
  parseLoonRuleAst,
  renderRuleAst,
  ruleTypesInAst,
} from '../src/rule-ast.mjs';
import { planQxRuleAst } from '../src/rule-qx.mjs';
import { planSurgeModuleRuleAst, renderSurgeRuleAst, validateSurgeRuleAst } from '../src/rule-surge.mjs';

const simple=parseLoonRuleAst('DOMAIN, example.com, REJECT');
assert.equal(simple.ok,true);
assert.equal(simple.ast.kind,'rule');
assert.equal(simple.ast.type,'DOMAIN');
assert.equal(simple.ast.valueRaw,'example.com');
assert.equal(simple.ast.value,'example.com');
assert.equal(simple.ast.policyRaw,'REJECT');
assert.equal(simple.ast.policy,'REJECT');
assert.deepEqual(simple.ast.params,[]);
assert.equal(renderRuleAst(simple.ast),'DOMAIN,example.com,REJECT');

const inlineComment=parseLoonRuleAst('DOMAIN, mallapi2.qinlinkeji.com, REJECT // 商城页面');
assert.equal(inlineComment.ok,true);
assert.equal(inlineComment.ast.syntaxSource,'DOMAIN, mallapi2.qinlinkeji.com, REJECT');
assert.equal(inlineComment.ast.inlineComment,'商城页面');
assert.equal(inlineComment.ast.policy,'REJECT');

const ipAsn=parseLoonRuleAst('IP-ASN, 6185, REJECT-DROP, no-resolve');
assert.equal(ipAsn.ok,true);
assert.equal(planQxRuleAst(ipAsn.ast).line,'ip-asn, 6185, reject');
assert.equal(planSurgeModuleRuleAst(ipAsn.ast).line,'IP-ASN,6185,REJECT-DROP,no-resolve');

const quoted=parseLoonRuleAst('USER-AGENT, "Example App*", REJECT');
assert.equal(quoted.ok,true);
assert.equal(quoted.ast.valueRaw,'"Example App*"');
assert.equal(quoted.ast.value,'Example App*');
assert.equal(renderRuleAst(quoted.ast),'USER-AGENT,"Example App*",REJECT');

const cidr=parseLoonRuleAst('IP-CIDR, 1.1.1.0/24, REJECT, no-resolve');
assert.equal(cidr.ok,true);
assert.deepEqual(cidr.ast.params,[{raw:'no-resolve',name:'no-resolve',value:null}]);
assert.equal(renderRuleAst(cidr.ast),'IP-CIDR,1.1.1.0/24,REJECT,no-resolve');

const argumentParam=parseLoonRuleAst('RULE-SET, Example, REJECT, extended-matching=true');
assert.equal(argumentParam.ok,true);
assert.deepEqual(argumentParam.ast.params,[{
  raw:'extended-matching=true',
  name:'extended-matching',
  value:'true',
}]);

const logical=parseLoonRuleAst(
  'AND, ((URL-REGEX, "^https:\\/\\/example\\.com\\/(a,b)"), (OR, ((DOMAIN-SUFFIX, example.com), (PROTOCOL, TCP)))), REJECT'
);
assert.equal(logical.ok,true);
assert.equal(logical.ast.kind,'logical');
assert.equal(logical.ast.type,'AND');
assert.equal(logical.ast.policy,'REJECT');
assert.deepEqual(ruleTypesInAst(logical.ast),[
  'AND','URL-REGEX','OR','DOMAIN-SUFFIX','PROTOCOL',
]);
assert.equal(logical.ast.children[0].nested,true);
assert.equal(logical.ast.children[0].value,'^https:\\/\\/example\\.com\\/(a,b)');
assert.equal(logical.ast.children[1].kind,'logical');
assert.equal(logical.ast.children[1].children.length,2);

const nestedFlag=parseLoonRuleAst(
  'AND, ((IP-CIDR, 10.0.0.0/8, no-resolve), (DOMAIN-SUFFIX, example.com)), REJECT'
);
assert.equal(nestedFlag.ok,true);
assert.deepEqual(nestedFlag.ast.children[0].params,[{
  raw:'no-resolve',
  name:'no-resolve',
  value:null,
}]);

const didiLogical=parseLoonRuleAst(
  'AND, ((IP-ASN, 45090, no-resolve), (DEST-PORT, 25641), (PROTOCOL, TCP)), REJECT'
);
assert.equal(didiLogical.ok,true);
assert.equal(didiLogical.ast.kind,'logical');
assert.equal(didiLogical.ast.children.length,3);
assert.equal(didiLogical.ast.children[0].type,'IP-ASN');
assert.deepEqual(didiLogical.ast.children[0].params,[{
  raw:'no-resolve',
  name:'no-resolve',
  value:null,
}]);
assert.equal(planQxRuleAst(didiLogical.ast).reason,'unsupported-qx-rule-comment');
assert.equal(
  planSurgeModuleRuleAst(didiLogical.ast).line,
  'AND,((IP-ASN,45090,no-resolve),(DEST-PORT,25641),(PROTOCOL,TCP)),REJECT',
);

const manyChildSource=[
  'DOMAIN-SUFFIX,example.com',
  'DEST-PORT,443',
  'PROTOCOL,TCP',
  'IP-ASN,13335,no-resolve',
  'USER-AGENT,Example*',
  'URL-REGEX,^https:\\/\\/example\\.com\\/',
];
const manyLogical=parseLoonRuleAst(
  'AND,(' + manyChildSource.map(rule=>'('+rule+')').join(',') + '),REJECT'
);
assert.equal(manyLogical.ok,true);
assert.equal(manyLogical.ast.children.length,6);
assert.equal(planQxRuleAst(manyLogical.ast).reason,'unsupported-qx-rule-comment');
assert.equal(planSurgeModuleRuleAst(manyLogical.ast).kind,'rule');
assert.match(planSurgeModuleRuleAst(manyLogical.ast).line,/^AND,\(\(.+\),\(.+\),\(.+\),\(.+\),\(.+\),\(.+\)\),REJECT$/);

function nestedNotRule(depth) {
  let rule='DOMAIN,example.com';
  for (let i=1;i<depth;i++) rule='NOT,(('+rule+'))';
  return 'NOT,(('+rule+')),REJECT';
}
const depth10=parseLoonRuleAst(nestedNotRule(10));
assert.equal(depth10.ok,true);
assert.equal(validateSurgeRuleAst(depth10.ast).ok,true);
assert.equal(planSurgeModuleRuleAst(depth10.ast).kind,'rule');

const depth11=parseLoonRuleAst(nestedNotRule(11));
assert.equal(depth11.ok,true);
assert.equal(validateSurgeRuleAst(depth11.ast).reason,'logical-nesting-depth-exceeds-10');
assert.equal(planSurgeModuleRuleAst(depth11.ast).reason,'unsupported-rule-type');

const unknown=parseLoonRuleAst('FUTURE-RULE, value, REJECT');
assert.equal(unknown.ok,true);
assert.equal(unknown.ast.type,'FUTURE-RULE');
assert.equal(planQxRuleAst(unknown.ast).reason,'unsupported-qx-rule-comment');
assert.equal(planSurgeModuleRuleAst(unknown.ast).reason,'unsupported-rule-type');

const invalidNot=parseLoonRuleAst('NOT, ((DOMAIN, a.example), (DOMAIN, b.example)), REJECT');
assert.equal(invalidNot.ok,false);
assert.equal(invalidNot.reason,'invalid-NOT-cardinality');

const malformed=parseLoonRuleAst('AND, DOMAIN, REJECT');
assert.equal(malformed.ok,false);
assert.equal(malformed.reason,'invalid-AND-subrules');

const surgeRegex=parseLoonRuleAst('URL-REGEX, "^https:\\/\\/example\\.com\\/(a,b)", REJECT');
assert.equal(surgeRegex.ok,true);
assert.equal(
  renderSurgeRuleAst(surgeRegex.ast),
  'URL-REGEX,"^https:\\/\\/example\\.com\\/(a,b)",REJECT',
);

assert.equal(planQxRuleAst(simple.ast).line,'host, example.com, reject');
assert.equal(planSurgeModuleRuleAst(simple.ast).line,'DOMAIN,example.com,REJECT');

console.log('Rule AST contract passed');
