import Lake
open Lake DSL

package «backend» where
  -- no special settings needed

require mathlib from git
  "https://github.com/leanprover-community/mathlib4.git" @ "v4.16.0"

@[default_target]
lean_lib MathProofs where
  -- root defaults to MathProofs.lean
