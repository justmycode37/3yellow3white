# Verification-first visual gate

The user requests repairs only after first verification, and maximum speed
without reducing visual quality. Preserve the current model/thinking, full source
and narration context, native resolution, two aspect ratios, frame sampling,
style reference, technical validation, and approval before publication.

Measured failure: scene 2 needed 154.4 seconds to author, then 263.6 + 194.2 +
176.3 seconds in combined review/full-source-rewrite calls. The first rewrite
damaged unrelated LaTeX escaping, creating another review round.

1. Verification produces findings only, never repaired source. Valid approval
   returns the original bytes unchanged and does not invoke a repair model.
2. After failed verification, a separate repair produces bounded exact edits
   tied to the candidate hash and finding indexes. The host applies all edits
   atomically against the original bytes. Reject stale hashes, ambiguous matches,
   overlapping edits, no-op patches and undeclared output fields.
3. Revalidate, rerender, and verify the repaired candidate before publication.
   Preserve the existing checks and timestamp-selection algorithm. The final
   verifier receives earlier findings alongside the newly rendered evidence.
4. Use the existing terminal submission protocol for short verification/patch
   outputs. Do not repeat a validated result in an extra completion turn.
5. Cache successful deterministic validation for identical source in the same
   immutable narration/previous-frame context. Do not weaken validation or cache
   model verdicts across changed candidates.
6. Prove sequencing, byte preservation (especially TeX escapes), rejection,
   cancellation and approval/source provenance with tests. Benchmark the failed
   source and rerun the fixed milestone prompt without manual scene edits.

The user approved the described flow: one targeted repair pass maximum, followed
by final verification. A rejected final candidate stops publication.
