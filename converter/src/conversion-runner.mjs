// Shared workflow-facing conversion execution primitives.
// Author: chance
// Category: Converter / Execution / Validation

import { materializeConversionContext } from './conversion-context.mjs';
import { convertPlugin } from './conversion-pipeline.mjs';
import { validateQX } from './qx-snippet-validator.mjs';
import { validateSurgeModule } from './surge-module.mjs';

function notify(onStage, stage) {
  if (typeof onStage === 'function') onStage(stage);
}

export async function materializeConversionRunContext(entry, source, {onStage=null}={}) {
  notify(onStage,'materialize-context');
  return await materializeConversionContext(entry,source);
}

export function convertAndValidatePlugin(entry, source, context, {
  stamp='',
  rawBase='',
  surgeValidationOptions=undefined,
  onStage=null,
}={}) {
  if (!context || typeof context !== 'object') {
    throw new TypeError('convertAndValidatePlugin requires a materialized conversion context');
  }

  notify(onStage,'convert');
  const out=convertPlugin(entry,source,{
    parsed:context.parsed,
    scriptMap:context.scriptMap,
    stamp,
    mockFiles:context.mockFiles,
    jqFiles:context.jqFiles,
    rawBase,
  });

  notify(onStage,'validate-qx');
  validateQX(out.qx,entry);

  notify(onStage,'validate-surge');
  if (surgeValidationOptions === undefined) validateSurgeModule(out.surge,entry);
  else validateSurgeModule(out.surge,entry,surgeValidationOptions);

  return out;
}
