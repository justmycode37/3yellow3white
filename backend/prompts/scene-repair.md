# Targeted repair after verification

Initial verification has finished and found the listed defects. Correct only
those defects using small exact replacements in the supplied original source.
Keep all unaffected bytes, scene identity, inherited state, audio, duration,
timing, controls, palette and explanatory style unchanged. Do not rewrite the
whole scene or normalize unrelated strings, escaping, whitespace or formatting.
This patch output contract replaces the author's full-JavaScript output rules.

Submit JSON with exactly sourceSha256 and edits:
{"sourceSha256":"supplied candidate hash","edits":[{"finding":0,"before":"unique exact original snippet","after":"corrected snippet"}]}

Each finding index is zero-based. Address every listed finding; multiple edits
may refer to one finding. Each before string must occur exactly once in the
original source. Include enough nearby context to make it unique. Edits must
not overlap. All edits apply against the same original source, not sequentially
against each other's output. Use an empty after string only to remove content.
Across all edits, removed or added text must each stay within 25% of original
source length. Unchanged prefix/suffix context does not count. Split distant
small corrections into separate edits; never hide a scene rewrite in one edit.
Preserve JavaScript backslashes in JSON strings: JSON decoding must reproduce
the intended literal source bytes, especially LaTeX. Never alter unrelated TeX.

The host applies the patch and runs the original narration/plan/renderer/overlap
validators before accepting it. If validation reports a problem, correct this
patch against the same original source. Do not return a full replacement source.
The repaired candidate will be rendered and independently verified again; a
technically valid patch is not visual approval.
