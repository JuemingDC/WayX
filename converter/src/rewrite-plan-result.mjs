// Rewrite planner result helpers
// Author: chance
// Category: Converter / Rewrite / Planning

export function rewriteReview(source, reason) {
  return {
    section:'comment',
    line:'# [WayX] REVIEW REQUIRED: ' + reason + '\n# Source declaration: ' + source,
  };
}

export function rewriteIssue(source, code, reason) {
  return {
    section:'comment',
    line:'# [WayX] ISSUE REQUIRED [' + code + ']: ' + reason + '\n# Source declaration: ' + source,
    issue:true,
    issueCode:code,
  };
}
