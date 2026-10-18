# Frontend Development Guidelines

> Best practices for frontend development in this project.

---

## Overview

This directory contains guidelines for frontend development. Fill in each file with your project's specific conventions.

---

## Guidelines Index

| Guide | Description | Status |
|-------|-------------|--------|
| [Single-File HTML](./single-file-html.md) | **Start here.** Zero-dependency `index.html` conventions: structure, state, a11y, theming, forbidden patterns | Written |
| [Directory Structure](./directory-structure.md) | Module organization and file layout | N/A (single file) |
| [Component Guidelines](./component-guidelines.md) | Component patterns, props, composition | N/A (no framework) |
| [Hook Guidelines](./hook-guidelines.md) | Custom hooks, data fetching patterns | N/A (no framework) |
| [State Management](./state-management.md) | Local state, global state, server state | Superseded by single-file-html.md |
| [Quality Guidelines](./quality-guidelines.md) | Code standards, forbidden patterns | Superseded by single-file-html.md |
| [Type Safety](./type-safety.md) | Type patterns, validation | N/A (no TypeScript) |

> This project is one dependency-free `index.html`. The React-shaped guides above are
> template leftovers and marked N/A rather than deleted, so a future `trellis update`
> does not silently reintroduce them as unfilled.

---

## How to Fill These Guidelines

For each guideline file:

1. Document your project's **actual conventions** (not ideals)
2. Include **code examples** from your codebase
3. List **forbidden patterns** and why
4. Add **common mistakes** your team has made

The goal is to help AI assistants and new team members understand how YOUR project works.

---

**Language**: All documentation should be written in **English**.
