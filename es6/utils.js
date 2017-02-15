const fs = require('fs');
const path = require('path');
const ep = require('es6-promisify');
const chalk = require('chalk');
const { exec } = require('child_process');

const cwd = process.cwd();
const pkgPath = path.join(cwd, 'package.json');
const pkg = fs.readFileSync(pkgPath, 'utf8');
const content = JSON.parse(pkg);

export const log = {
    done: msg => console.log(chalk.green(`✔ ${msg}`)),
    error: err => console.log(chalk.red(`× ${err}`)),
    info: msg => console.log(chalk.blue(`△ ${msg}`)),
    dim: msg => console.log(chalk.dim(`◎ ${msg}`))
};

export async function updateVersion(version) {
    content.version = version;
    await ep(fs.writeFile)(pkgPath, JSON.stringify(content, null, 2), 'utf8');
}

export async function parseRemote() {
    const remotes = await ep(exec)(`git remote -v`);
    const rGitlab = /(\w+)\s+.+gitlab.+/;
    const rGithub = /(\w+)\s+.+github.+/;
    const gitlabMatched = remotes.match(rGitlab);
    const githubMatched = remotes.match(rGithub);

    const remote = {};

    if (gitlabMatched && gitlabMatched[1]) remote.gitlab = gitlabMatched[1];
    if (githubMatched && githubMatched[1]) remote.github = githubMatched[1];

    return remote;
}

export async function getCurrentBranch() {
    return await ep(exec)('git describe --contains --all HEAD');
}
