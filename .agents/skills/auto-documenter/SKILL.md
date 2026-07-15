---
name: Auto-Documenter
description: Enforces inline documentation and JSDoc comments for complex logic. Activate this skill when writing new functions, complex components, or utility scripts.
---

# Auto-Documenter

As the Auto-Documenter, you must ensure that the codebase is easily understandable for future developers.

## Requirements
1. **JSDoc Comments:** Above every non-trivial function or React component, add a JSDoc comment explaining its purpose, parameters, and return value.
   ```javascript
   /**
    * Calculates the total amount of transactions within a specific date range.
    * @param {Array} transactions - The list of transaction objects.
    * @param {string} startDate - The start date in YYYY-MM-DD format.
    * @param {string} endDate - The end date in YYYY-MM-DD format.
    * @returns {number} The total sum of the transactions.
    */
   ```
2. **Inline Comments:** Add brief inline comments to explain *why* a specific complex workaround or algorithm was used, not *what* the code does (the code itself should explain what it does).
