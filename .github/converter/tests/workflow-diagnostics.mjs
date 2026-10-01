import assert from 'node:assert/strict';
import {
  createWorkflowFailureReporter,
  formatWorkflowErrorAnnotation,
} from '../src/workflow-diagnostics.mjs';

assert.equal(
  formatWorkflowErrorAnnotation(
    {id:'Demo'},
    {message:'line 1\nline 2'},
  ),
  '::error title=Demo::line 1%0Aline 2'
);

assert.equal(
  formatWorkflowErrorAnnotation(
    {id:'Demo'},
    'plain failure',
    {annotationFallback:'error'},
  ),
  '::error title=Demo::plain failure'
);

{
  const output=[];
  const reporter=createWorkflowFailureReporter({
    summaryLabel:'Failures',
    writeError:value=>output.push(value),
  });
  const error={stack:'STACK TRACE',message:'sync line 1\nsync line 2'};
  reporter.capture({id:'SyncEntry'},error);

  assert.equal(reporter.size,1);
  assert.deepEqual(reporter.snapshot(),['SyncEntry: STACK TRACE']);
  assert.deepEqual(output,[
    '::error title=SyncEntry::sync line 1%0Async line 2',
  ]);
  assert.equal(reporter.report(),true);
  assert.deepEqual(output,[
    '::error title=SyncEntry::sync line 1%0Async line 2',
    '\nFailures:\nSyncEntry: STACK TRACE',
  ]);
}

{
  const output=[];
  const reporter=createWorkflowFailureReporter({
    summaryLabel:'Failures',
    writeError:value=>output.push(value),
  });
  reporter.capture({id:'SyncPrimitive'},'plain failure');
  assert.deepEqual(reporter.snapshot(),['SyncPrimitive: undefined']);
  assert.deepEqual(output,['::error title=SyncPrimitive::undefined']);
}

{
  const output=[];
  const reporter=createWorkflowFailureReporter({
    summaryLabel:'Canonical regeneration failures',
    detailFallback:'error',
    annotationFallback:'error',
    writeError:value=>output.push(value),
  });
  reporter.capture({id:'CanonicalEntry'},'plain failure');
  assert.deepEqual(reporter.snapshot(),['CanonicalEntry: plain failure']);
  assert.deepEqual(output,['::error title=CanonicalEntry::plain failure']);
  assert.equal(reporter.report(),true);
  assert.deepEqual(output,[
    '::error title=CanonicalEntry::plain failure',
    '\nCanonical regeneration failures:\nCanonicalEntry: plain failure',
  ]);
}

{
  const output=[];
  const reporter=createWorkflowFailureReporter({
    writeError:value=>output.push(value),
  });
  assert.equal(reporter.report(),false);
  assert.equal(reporter.size,0);
  assert.deepEqual(reporter.snapshot(),[]);
  assert.deepEqual(output,[]);
}

console.log('workflow diagnostics contract passed');
