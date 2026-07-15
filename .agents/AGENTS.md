# Project Rules for Smart Finance Manager

## Git Branch & Push Policy
- **DO NOT** push directly to the `main` branch.
- When making modifications or updates, always create a new feature/development branch (e.g., `dev`, `feature/xyz`), commit your changes there, and push that branch to GitHub.
- The user will review and merge the changes into `main` manually.

## Communication & Artifacts
- **Implementation Plan**: All Implementation Plan artifacts (e.g. `implementation_plan.md`) must be written entirely in Thai (ภาษาไทย).

## Strict Variable Replacement
- When renaming or removing a variable, you MUST always run `grep_search` to find all occurrences of the old variable name across the entire file or project.
- Ensure that NO residual references remain in the code before committing your changes.

## Error Boundary Policy
- When creating or significantly modifying a major React component, always consider using or implementing an `Error Boundary`.
- This ensures that if a localized runtime error occurs (e.g., a data processing error or missing variable), the entire application does not crash into a white screen, but instead displays a fallback UI.
