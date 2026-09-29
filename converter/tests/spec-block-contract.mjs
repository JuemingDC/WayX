import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';

const ROOT=process.cwd();
const contracts=[
  ['00','docs/conversion-spec/00-authority.md',['converter/tests/genericity-audit.mjs','converter/tools/audit-repository.mjs']],
  ['05','docs/conversion-spec/05-generic-converter.md',['converter/src/source-catalog.mjs','converter/src/script-path.mjs','.github/scripts/sync-convert.mjs']],
  ['10','docs/conversion-spec/10-target-format.md',['converter/src/paths.mjs','converter/src/metadata.mjs','converter/src/surge-module.mjs']],
  ['20','docs/conversion-spec/20-rule-mapping.md',['converter/src/rule.mjs']],
  ['30','docs/conversion-spec/30-rewrite-mapping.md',['converter/src/legacy-rewrite.mjs','converter/src/rewrite-v2.mjs','converter/src/rewrite-v2-semantic.mjs']],
  ['40','docs/conversion-spec/40-regex-condition.md',['converter/src/rewrite-v2.mjs','converter/src/rewrite-v2-actions.mjs','converter/src/target-regex.mjs']],
  ['50','docs/conversion-spec/50-json-jq-mock.md',['converter/src/jq.mjs','converter/src/dependency.mjs','converter/src/qx-mock.mjs']],
  ['60','docs/conversion-spec/60-script-argument.md',['converter/src/script.mjs','converter/src/script-compat.mjs','converter/src/script-v2.mjs','converter/src/script-v2-target.mjs','converter/src/argument.mjs']],
  ['70','docs/conversion-spec/70-mitm-comments.md',['converter/src/mitm.mjs','converter/src/metadata.mjs']],
  ['80','docs/conversion-spec/80-review-validation.md',['converter/src/surge-module.mjs','converter/tests/genericity-audit.mjs','converter/tests/end-to-end-golden.mjs']],
  ['90','docs/conversion-spec/90-project-workflow.md',['.github/scripts/sync-convert.mjs','converter/tools/regenerate-canonical.mjs','.github/workflows/converter-check.yml','.github/workflows/upstream-monitor.yml']],
];

for(const [block,doc,impls] of contracts){
  const docText=await fs.readFile(path.join(ROOT,doc),'utf8');
  assert.match(docText,/自动(?:转换|化|执行)/, `Block ${block}: missing automatic implementation section`);
  for(const rel of impls){
    const stat=await fs.stat(path.join(ROOT,rel));
    assert.ok(stat.isFile() && stat.size>0, `Block ${block}: missing implementation ${rel}`);
  }
}

const index=await fs.readFile(path.join(ROOT,'docs/conversion-spec/95-implementation-index.md'),'utf8');
for(const [block] of contracts) assert.match(index,new RegExp('\\| '+block+' \\|'), `implementation index missing Block ${block}`);

console.log('Spec block implementation contract passed');
