---
name: integration-contract
description: Use when producing a file, payload, or mock API that another system consumes — tracker CSVs, import formats, Firestore seed data, mock servers, JSON fixtures, or generated config. Also use when a generated file was rejected by the consuming system, or when field names, headers, or validation rules are being guessed rather than read from a spec.
---

# Integration Contract First

## Overview

Output that *looks* right is the most expensive kind of wrong: a CSV with human-readable
headers the tracker rejects, a mock API that returns 200 for empty input. Both passed
review by eye and failed on contact.

**Discover the contract, show it, then generate — never the reverse.**

## When to Use

Any deliverable whose correctness is judged by a *system*, not a human reader:
CSV/JSON imports, mock servers, schema fixtures, k8s manifests, generated config,
files consumed by another repo or agent.

## Required Order

1. **Discover.** Read the consuming system's actual rules — the live app's parser, the
   schema, the OpenAPI/ICD spec, the existing accepted file. Do not infer from a sample
   filename or a screenshot.
2. **Write the contract down** as a table before generating anything:

   | field | exact name | type | format | required | validation |
   |---|---|---|---|---|---|

   Include identifier conventions explicitly — e.g. k8s deployment names, not the
   human-readable label from a spreadsheet column.
3. **Show the contract to the user for confirmation.** One short message. This is the
   cheap round; it replaces three expensive ones.
4. **Generate** the output.
5. **Write a validation script** that checks the output against the contract, run it, and
   paste its real output. Not "looks correct" — an exit code and a row/field count.

## Mock API Rules

A mock that always succeeds is not a mock, it is a stub that hides bugs.

- Required fields missing or empty → **400** with a body naming the offending field
- Wrong type or malformed format → **400**
- Unknown/extra fields → reject or document explicitly which is intended
- Only a fully valid request returns 200
- Ship at least one example request per failure mode, with its actual response

## Red Flags — Stop

- "The header names are probably fine"
- "I'll generate it first and fix the schema issues if they complain"
- "The mock just needs to return the shape, validation comes later"
- Writing field names from memory of a conversation instead of from a file
- No validation run between generating and declaring done

## Done Means

The validation script ran, its output is in the response, and every row/field the
consuming system requires is accounted for — including the rows you had to fill from a
live source rather than the original input.
