#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const shell = require('shelljs');
const { Octokit } = require('@octokit/rest');

const pr = process.env.GH_PR;
if (pr) {
	console.log(`Detected PR environment for PR #${pr}`);
}

function exec(command, options) {
	console.log(`   executing: ${command} in ${shell.pwd()}`);
	var ref = shell.exec(command, options);
	if (ref.code === 0) {
		return ref.stdout.trim();
	}

	var message = 'Exec code(' + ref.code + ') on executing: ' + command + '\n' + shell.stderr;

	throw new Error(message);
}

function logConfigErrorAndExit(error) {
	console.error(error);
	console.error('You need to at least specify a build command, e.g.');
	console.error(
		`{
  "buildCommand": "yarn build-pages-app"
}`
	);
	process.exit(1);
}

if (!fs.existsSync('.gh-pages')) {
	logConfigErrorAndExit('No .gh-pages config file found.');
}

const userConfig = JSON.parse(fs.readFileSync('.gh-pages'));
const defaults = {
	commitMessage: 'Deploy to GitHub Pages.',
	branch: 'gh-pages',
	stagingDirectory: 'gh-pages-staging',
};

const config = {
	...defaults,
	...userConfig,
};

const { commitMessage, branch, stagingDirectory, buildCommand } = config;
Object.keys({ commitMessage, branch, stagingDirectory, buildCommand }).forEach((x) => {
	if (typeof config[x] !== 'string') {
		logConfigErrorAndExit(`${x} must be a string.`);
	}
});

const { GH_USER_NAME, GH_USER_EMAIL, GH_TOKEN } = process.env;
const authenticatedScheme = GH_TOKEN ? `https://${GH_TOKEN}@` : 'https://';

const remote = exec('git remote show origin', { silent: true })
	.split('\n')
	.map((x) => x.trim())
	.find((x) => x.startsWith('Fetch URL:'))
	.replace('Fetch URL:', '')
	.replace('https://', authenticatedScheme)
	.trim();

const workingDirectory = shell.pwd().stdout;
const outDirectory = path.isAbsolute(stagingDirectory)
	? stagingDirectory
	: path.join(workingDirectory, stagingDirectory);
shell.rm('-rf', outDirectory);
exec(buildCommand);

const relativeDestinationPath = pr ? path.join(branch, 'pr', pr) : branch;
const destinationPath = path.join(workingDirectory, relativeDestinationPath);

shell.rm('-rf', branch);
exec(`git clone -b ${branch} ${remote} ${branch}`);
shell.rm('-rf', `${destinationPath}${path.sep}*`);
exec(`mkdir --parents ${destinationPath}`);
exec(`cp -r ${outDirectory}${path.sep} ${destinationPath}${path.sep}`);
shell.rm('-rf', outDirectory);

shell.cd(`./${branch}`);

if (GH_USER_NAME && GH_USER_EMAIL) {
	exec(`git config user.name ${GH_USER_NAME}`);
	exec(`git config user.email ${GH_USER_EMAIL}`);
}

exec('git add .');
if (!pr) {
	const hasStagedPRFiles = !!exec('git diff --name-only --cached')
		.split('\n')
		.find((x) => x.startsWith('pr/'));
	if (hasStagedPRFiles) {
		exec('git checkout HEAD pr');
	}
}

const resolvedMessage = commitMessage.includes('#PR')
	? commitMessage.replace('#PR', pr ? `PR #${pr}` : '')
	: commitMessage;
const commitResponse = shell.exec('git commit -m ' + JSON.stringify(resolvedMessage)).stdout;
const nothingToCommitMatch = commitResponse.match('nothing to commit');
if (nothingToCommitMatch && nothingToCommitMatch.length > 0) {
	console.log('Build artifacts unchanged, nothing to deploy.');
	console.log('Exiting...');
	process.exit(0);
}

const filesChangedMatch = commitResponse.match('files changed');
if (filesChangedMatch && filesChangedMatch.length > 0) {
	exec(`git push origin ${branch}`);
	shell.cd('..');
	shell.rm('-rf', branch);
}

console.log('GitHub pages deployment success!');

const pagesBaseUrl = process.env.GH_PAGES_BASE_URL;
if (pr && pagesBaseUrl) {
	const [owner, repo] = process.env.GITHUB_REPOSITORY?.split('/') ?? [];
	const haveLinkData = !!owner && !!repo;
	const linkToDeploy = haveLinkData ? `https://${pagesBaseUrl}/${owner}/${repo}/pr/${pr}` : null;

	if (!!linkToDeploy) {
		const ghBase = process.env.GH_API_BASE_URL ?? 'api.github.com';
		const github = new Octokit({
			baseUrl: `https://${ghBase}`,
			auth: process.env.GH_TOKEN,
		});
		github.rest.issues.createComment({
			issue_number: pr,
			owner,
			repo,
			body: `Your PR has been [deployed](${linkToDeploy})! 🚀`,
		});
	} else {
		console.log('No PR data; skipping adding comment.');
	}
}
