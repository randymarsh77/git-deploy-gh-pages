# git-deploy-gh-pages

Yet another script to deploy to gh-pages.

## Behavior

- Validates config
- Detects current remote
- Builds app
- Clones current gh-pages branch
- Removes all files
- Copies new files to gh-pages
- If any changes
  - Commit
  - Push

## Configuration

Requires a `.gh-pages` containing valid json specifying `buildCommand`. Other defaults that can be overridden are:
```
{
	commitMessage: 'Deploy to GitHub Pages.',
	branch: 'gh-pages',
	stagingDirectory: 'gh-pages-staging',
};
```