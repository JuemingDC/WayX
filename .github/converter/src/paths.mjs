// Canonical WayX output layout
// Author: chance
// Category: Converter / Paths
export const AD_BLOCK_ROOT='Adblock';export const QX_ADBLOCK_DIR='Adblock/Quantumult X';export const SURGE_ADBLOCK_DIR='Adblock/Surge';export const BOXJS_SUBSCRIPTION='Boxjs/QuantumultX/Chanceの订阅.json';
export function qxTargetPath(entry){if(!entry?.qx)throw new Error('manifest entry missing qx filename');return `${QX_ADBLOCK_DIR}/${entry.qx}`;}
export function surgeTargetPath(entry){if(!entry?.surge)throw new Error('manifest entry missing surge filename');return `${SURGE_ADBLOCK_DIR}/${entry.surge}`;}
