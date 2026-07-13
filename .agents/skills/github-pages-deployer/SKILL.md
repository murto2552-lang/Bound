---
name: GitHub Pages Deployer
description: Standard operating procedure for deploying the BounD app to GitHub Pages. Activate this skill when the user asks to deploy, publish, or update the website online.
---

# GitHub Pages Deployer Workflow

When requested to deploy or update the live BounD website, follow these exact steps:

1. **Verify Configuration**: Check `vite.config.js` to ensure `base: '/Bound/'` is present.
2. **Verify Router**: Ensure `src/App.jsx` uses `<HashRouter>` (NOT `<BrowserRouter>`) to prevent 404 errors on GitHub Pages.
3. **Commit to dev branch**: 
   - DO NOT push directly to `main`.
   - Run `git add .`
   - Run `git commit -m "Your descriptive message"`
   - Run `git push origin dev`
4. **Instruct the User**: Inform the user to go to GitHub, create a Pull Request from `dev` to `main`, and merge it. Remind them that GitHub Actions will take ~1 minute to build and deploy the site after the merge.
