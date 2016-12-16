const fs = require('fs');
const path = require('path');
const inquirer = require('inquirer');
const chalk = require('chalk');
const ep = require('es6-promisify');
const { exec } = require('child_process');

const log = {
  done: msg => console.log(chalk.green(`✓ ${msg}`)),
  error: err => console.log(chalk.red(`× ${err}`)),
  info: msg => console.log(chalk.blue(`△ ${msg}`)),
  dim: msg => console.log(chalk.dim(`◎ ${msg}`))
};

const cwd = process.cwd();
const pkgPath = path.join(cwd, 'package.json');
const pkg = fs.readFileSync(pkgPath, 'utf8');
const content = JSON.parse(pkg);
const rversion = /^\d+\.\d+\.\d+(?:-(.+))?$/;

async function publish() {
  const cversion = content.version;

  const questions = [
    {
      type: 'input',
      name: 'version',
      message: '请输入要发布的版本号:',
      default: cversion,
      validate: (content) => {
        if (rversion.test(content) || !content) {
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
        const match = answers.version.match(rversion);
        return match && match[1];
      }
    },
    {
      type: 'input',
      name: 'tag',
      message: '请输入要添加的 npm tag:',
      validate: (content) => {
        if (!content) {
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
    const branch = await getCurrnetBranch();
    const remote = await parseRemote();
    const { name } = content;
    const nextRef = `v${version}`;
    const rqnpm = /^@qnpm/;
    const registry = rqnpm.test(name) ?
      'http://registry.npm.corp.qunar.com/' :
      'https://registry.npmjs.org/';
    if (github && !remote.github) throw new Error('本地无法找到 github 的 remote!');

    if (cversion === version) {
      await ep(exec)(`npm unpublish ${name}@${version} --registry=${registry}`);

      log.done(`${name}@${version} 已 unpublish`);

      try {
        await ep(exec)(`git tag -d ${nextRef}`);
      } catch (e) {
        log.dim(`本地不存在 ${nextRef} 分支`);
      }

      try {
        await ep(exec)(`git push ${remote.gitlab} -d tag ${nextRef}`);
      } catch (e) {
        log.dim(`gitlab 上不存在 ${nextRef} 分支`);
      }

      if (github && remote.github) {
        try {
          await ep(exec)(`git push ${remote.github} -d tag ${nextRef}`);
        } catch (e) {
          log.dim(`github 上不存在 ${nextRef} 分支`);
        }
      }

      log.done(`分支 ${nextRef} 移除成功`);
    } else {
      await updateVersion(version);
      await ep(exec)(`git commit -am "chore: Version to ${version}"`);
      log.done(`package.json 的版本已更新到 ${version}`);
    }

    // 本地源各种推代码和推分支
    await ep(exec)(`git push ${remote.gitlab} ${branch}`);
    await ep(exec)(`git tag ${nextRef}`);
    await ep(exec)(`git push ${remote.gitlab} ${nextRef}`);

    log.done(`代码和 tag 已 push 到 gitlab`);

    if (github && remote.github) {
      await ep(`git push ${remote.github} ${branch}`);
      await ep(exec)(`git push ${remote.github} ${nextRef}`);
      log.done(`代码和 tag 已 push 到 github`);
    }

    const tagName = tag ? ` --tag ${tag}` : '';

    await ep(exec)(`npm publish --registry=${registry}${tagName}`);

    log.done(`版本 ${version} 发布成功!`);
  } catch (e) {
    log.error(e.message);
  }
}

async function updateVersion(version) {
  content.version = version;
  await ep(fs.writeFile)(pkgPath, JSON.stringify(content, null, 4), 'utf8');
}

async function parseRemote() {
  const remotes = await ep(exec)(`git remote -v`);
  const rgitlab = /(\w+)\s+.+gitlab.+/;
  const rgithub = /(\w+)\s+.+github.+/;
  const gitlabMatched = remotes.match(rgitlab);
  const githubMatched = remotes.match(rgithub);

  const remote = {};

  if (gitlabMatched && gitlabMatched[1]) remote.gitlab = gitlabMatched[1];
  if (githubMatched && githubMatched[1]) remote.github = githubMatched[1];

  return remote;
}

async function getCurrnetBranch() {
  return await ep(exec)('git describe --contains --all HEAD');
}

publish();
// publish();