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

export function convertPluginWithContext(entry, source, context, {
  stamp='',
  rawBase='',
  onStage=null,
}={}) {
  if (!context || typeof context !== 'object') {
    throw new TypeError('convertPluginWithContext requires a materialized conversion context');
  }

  notify(onStage,'convert');
  return convertPlugin(entry,source,{
    parsed:context.parsed,
    scriptMap:context.scriptMap,
    stamp,
    mockFiles:context.mockFiles,
    jqFiles:context.jqFiles,
    rawBase,
  });
}

export function validateConvertedPlugin(entry, out, {
  surgeValidationOptions=undefined,
  onStage=null,
}={}) {
  if (!out || typeof out !== 'object') {
    throw new TypeError('validateConvertedPlugin requires converted output');
  }

  notify(onStage,'validate-qx');
  validateQX(out.qx,entry);

  notify(onStage,'validate-surge');
  if (surgeValidationOptions === undefined) validateSurgeModule(out.surge,entry);
  else validateSurgeModule(out.surge,entry,surgeValidationOptions);

  return out;
}
