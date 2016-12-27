const fs = require('fs');
const path = require('path');
const inquirer = require('inquirer');
const chalk = require('chalk');
const ep = require('es6-promisify');
const { exec } = require('child_process');
const ora = require('ora');

const caesar = require('./crypter');

const log = {
    done: msg => console.log(chalk.green(`✔ ${msg}`)),
    error: err => console.log(chalk.red(`× ${err}`)),
    info: msg => console.log(chalk.blue(`△ ${msg}`)),
    dim: msg => console.log(chalk.dim(`◎ ${msg}`))
};

const cwd = process.cwd();
const pkgPath = path.join(cwd, 'package.json');
const pkg = fs.readFileSync(pkgPath, 'utf8');
const content = JSON.parse(pkg);
const rVersion = /^\d+\.\d+\.\d+(?:-(.+))?$/;

let spinner = ora({ text: '检查 npm 源'});

async function publish() {
    const cVersion = content.version;

    const questions = [
        {
            type: 'input',
            name: 'version',
            message: '请输入要发布的版本号:',
            default: cVersion,
            validate: (content) => {
                if (rVersion.test(content) || !content) {
                    return true;
                }
                return `版本号 ${content} 不合法，正确的格式应为: 1.0.2 或 2.3.0-beta.1`
            }
        },
        {
            type: 'confirm',
            name: 'useTag',
            message: '检测到版本号携带 tag, 是否添加 npm tag?',
            when: (answers) => {
                const match = answers.version.match(rVersion);
                return match && match[1];
            }
        },
        {
            type: 'input',
            name: 'tag',
            message: '请输入要添加的 npm tag:',
            validate: (content) => {
                if (content) {
                    return true;
                }
                return '请输入 npm tag';
            },
            when: answers => answers.useTag
        },
        {
            type: 'confirm',
            name: 'github',
            message: '是否同步到 github?',
            default: false
        }
    ];
    try {

        const { version, tag, github } = await inquirer.prompt(questions);
        const branch = await getCurrentBranch();
        const remote = await parseRemote();
        const { name } = content;
        const nextRef = `v${version}`;
        const rQNpm = /^@qnpm/;
        const toQNpm = rQNpm.test(name);
        const qNpmRegistry = caesar.decode('iuuq;00sfhjtusz/oqn/dpsq/rvobs/dpn0');
        const registry = toQNpm ? qNpmRegistry : 'https://registry.npmjs.org/';
        if (github && !remote.github) throw new Error('本地无法找到 github 的 remote!');

        spinner.start();

        const sInfo = await ep(exec)(`npm info ${name} --registry=${registry}`);
        const info = eval(`global.npmInfo=${sInfo}`);

        if (cVersion === version) {
            if (!toQNpm) {
                // 发布到 npm 源
                if (global.npmInfo.versions.indexOf(version) > -1) {
                    throw new Error(`npm 源上已存在 ${version} 版本, 请不要重复发布!`);
                }
                delete global.npmInfo;
                spinner.succeed();
            } else {
                spinner.text = `移除私有源上已发布的版本 ${name}@${version}`;
                await ep(exec)(`npm unpublish ${name}@${version} --registry=${registry}`);
                spinner.text = `${name}@${version} 已 unpublish`;
                spinner.succeed();
            }

            spinner = ora({ text: `移除本地 tag: ${nextRef}` });
            spinner.start();
            try {
                await ep(exec)(`git tag -d ${nextRef}`);
                spinner.succeed();
            } catch (e) {
                spinner.text = `本地不存在 ${nextRef} tag`;
                spinner.stopAndPersist('◎');
            }

            spinner = ora({ text: `移除 gitlab 线上 tag: ${nextRef}` });
            spinner.start();
            try {
                await ep(exec)(`git push ${remote.gitlab} -d tag ${nextRef}`);
                spinner.succeed();
            } catch (e) {
                spinner.text = `gitlab 上不存在 ${nextRef} tag`;
                spinner.stopAndPersist('◎');
            }

            if (github && remote.github) {
                spinner = ora({ text: `移除 github 线上 tag: ${nextRef}` });
                spinner.start();
                try {
                    await ep(exec)(`git push ${remote.github} -d tag ${nextRef}`);
                    spinner.succeed();
                } catch (e) {
                    spinner.text = `github 上不存在 ${nextRef} tag`;
                    spinner.stopAndPersist('◎');
                }
            }
        } else {
            // 检查 npm 源成功
            spinner.succeed();
            spinner = ora({ text: `更新 package.json 到: ${version}` });
            spinner.start();
            await updateVersion(version);
            await ep(exec)(`git commit -am "chore: Version to ${version}"`);
            spinner.succeed();
        }

        // 本地源各种推代码和推分支
        if (remote.gitlab) {
            spinner = ora({ text: `推送本地代码到 gitlab` });
            spinner.start();

            await ep(exec)(`git push ${remote.gitlab} ${branch}`);
            await ep(exec)(`git tag ${nextRef}`);
            await ep(exec)(`git push ${remote.gitlab} ${nextRef}`);

            spinner.succeed();
        }

        if (github && remote.github) {
            spinner = ora({ text: `推送本地代码到 github` });
            spinner.start();

            await ep(exec)(`git push ${remote.github} ${branch}`);
            await ep(exec)(`git push ${remote.github} ${nextRef}`);

            spinner.succeed();
        }

        const tagName = tag ? ` --tag ${tag}` : '';

        spinner = ora({ text: `发布新版本 ${version} 到 npm 源` });
        spinner.start();

        await ep(exec)(`npm publish --registry=${registry}${tagName}`);

        spinner.succeed();
        log.done(`版本 ${version} 发布成功!`);
        log.done(`最后祝您, 身体健康, 再见!`)
    } catch (e) {
        spinner.text = e.message;
        spinner.fail();
    }
}

async function updateVersion(version) {
    content.version = version;
    await ep(fs.writeFile)(pkgPath, JSON.stringify(content, null, 2), 'utf8');
}

async function parseRemote() {
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

async function getCurrentBranch() {
    return await ep(exec)('git describe --contains --all HEAD');
}

export default publish;
