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
import { planSurgeModuleRuleAst, renderSurgeRuleAst } from '../src/rule-surge.mjs';

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

const unknown=parseLoonRuleAst('FUTURE-RULE, value, REJECT');
assert.equal(unknown.ok,true);
assert.equal(unknown.ast.type,'FUTURE-RULE');
assert.equal(planQxRuleAst(unknown.ast).reason,'unsupported-qx-rule-comment');
assert.equal(planSurgeModuleRuleAst(unknown.ast).reason,'unsupported-rule-type');

const invalidNot=parseLoonRuleAst('NOT, ((DOMAIN, a.example), (DOMAIN, b.example)), REJECT');
assert.equal(invalidNot.ok,false);
assert.equal(invalidNot.reason,'NOT-requires-one-subrule');

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
