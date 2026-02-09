---
description: Describe when these instructions should be loaded
# applyTo: 'Describe when these instructions should be loaded' # when provided, instructions will automatically be added to the request context when the pattern matches an attached file
---

AI Code Editing Instructions

This document defines the required workflow an AI agent must follow when modifying source code in this repository.

The goal is to prevent regressions, broken builds, and unsafe edits.

Mandatory Editing Workflow

The agent must always follow these steps when editing code.

1. Read Before Editing

Before making any modification, the agent must read the entire file being edited.

The agent must understand:

imports

exports

types and interfaces

constants

dependencies

related logic in the file

how the file interacts with other modules

Edits must never be made based on assumptions.

2. Make Minimal Changes

Only change the code necessary to solve the problem.

Do not:

refactor unrelated logic

rename variables unnecessarily

reformat entire files

introduce new abstractions unless required

Small, targeted changes are required.

3. Preserve Project Consistency

After editing, verify:

no missing imports

no unused imports

no undefined variables

no duplicate declarations

exports remain valid

props match interfaces

function signatures remain compatible

4. Type Safety Verification

All changes must be TypeScript-safe.

Ensure:

no "possibly undefined" errors

no implicit any

config fields exist in types

interface contracts are respected

7. Change Reporting Requirement

After completing edits, the agent must report:

what changed

why it changed

what issue was fixed or prevented

Example:

Replaced CANVAS_WIDTH usage with sceneConfig.width so room resizing works correctly. Added fallback to prevent undefined runtime errors.

Forbidden Actions

The agent must never:

modify files without reading them first

introduce unrelated refactors

change architecture without instruction

delete constants still in use

assume config structure without checking types

leave the repository in a non-compiling state

Goal

All edits must be:

minimal

type-safe

reversible

build-safe

context-aware

The agent is responsible for maintaining repository stability during all code changes.
