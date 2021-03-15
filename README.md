# git-deploy-gh-pages

Yet another script to deploy to gh-pages. Also deploys PRs to subdirectory.

## Behavior

- Validates config
- Detects current remote
- Detects PR environment (in GitHub Actions)
- Builds app
- Clones current gh-pages branch
- Removes all files
- Copies new files to gh-pages
  - Uses `pr/number` subdirectory for PRs.
- If any changes
  - Commit
  - Push

## Configuration

Requires a `.gh-pages` containing valid json specifying `buildCommand`. Other defaults that can be overridden are:
```
{
	commitMessage: 'Deploy #PR to GitHub Pages.',
	branch: 'gh-pages',
	stagingDirectory: 'gh-pages-staging',
};
```

`#PR` will be replaced with "PR #X" if in the PR environment.

## Identity

Runs git config if both `GH_USER_NAME` and `GH_USER_EMAIL` env variables are set.
