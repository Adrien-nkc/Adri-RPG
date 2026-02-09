---
name: test
description: Describe what this skill does and when to use it. Include keywords that help agents identify relevant tasks.
---

This skill enforces a safe code-editing workflow.

The agent MUST follow this sequence whenever modifying code.

STEP 1 — Scan before editing
Always read the full file before making changes.
Understand:

- imports
- types
- dependencies
- existing logic
- related constants
- exported interfaces

Never modify code based on assumptions.

Example:
If updating movement logic, scan the entire file to locate:

- constants usage
- config usage
- collision logic
- render logic

STEP 2 — Make minimal changes
Only modify the lines required to solve the problem.
Do not refactor unrelated code.
Do not rename variables unless necessary.

STEP 3 — Consistency check
After editing, verify:

- no missing imports
- no unused imports
- no undefined variables
- no duplicate declarations
- types still match

STEP 4 — Type safety verification
Ensure:

- no "possibly undefined" errors
- no implicit any
- props match interfaces
- config fields exist

Example:
If using `sceneConfig.width`, confirm the type definition includes:
width: number
height: number

STEP 5 — Build validation
Mentally simulate or run checks equivalent to:

TypeScript:
tsc --noEmit

Frontend:
npm run build

Backend:
npm run start / build

STEP 6 — Fallback safety
If replacing constants with dynamic values, always provide a fallback.

Example:
const width = scene.width ?? DEFAULT_WIDTH;

STEP 7 — Report changes clearly
When finished, output:

- what was changed
- why it was changed
- what errors were prevented

Example output:
"Replaced CANVAS_WIDTH with sceneConfig.width to ensure room resizing works. Added fallback to prevent undefined errors."

DO NOT:

- edit without scanning
- introduce new architecture
- remove constants unless confirmed unused
- assume config structure
- leave files in a non-compiling state
