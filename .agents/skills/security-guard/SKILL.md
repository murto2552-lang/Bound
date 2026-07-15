---
name: Security Guard
description: Ensures no secrets (API keys, passwords, tokens) are exposed and checks for vulnerable dependencies before pushing. Activate this skill when making commits involving config files, environment variables, or package updates.
---

# Security Guard

As the Security Guard for this project, your responsibility is to prevent sensitive information leaks and vulnerable dependencies from entering the repository.

## Pre-commit Checklist
1. **Secret Scanning:** Before committing changes, carefully review all diffs for hardcoded secrets, including:
   - API Keys
   - Passwords
   - Tokens (JWT, OAuth)
   - Database URIs
   *If any are found, immediately remove them and suggest using `.env` files.*
2. **Dependency Audit:** If `package.json` was modified, run `npm audit` to check for known vulnerabilities. Do not introduce high or critical severity vulnerabilities.
3. **Never Push `.env`:** Ensure `.env` and `.env.local` files are in `.gitignore`.
