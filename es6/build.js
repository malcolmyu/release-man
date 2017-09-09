import fs from 'fs';
import path from 'path';
import inquirer from 'inquirer';
import ep from 'es6-promisify';
import semver from 'semver';
import { exec } from 'child_process';
import ora from 'ora';

import { getConfig, add } from './config';
import {
  log,
  sync,
  goodbye,
  updateVersion,
  parseRemote
} from './utils';

const cwd = process.cwd();
const pkgPath = path.join(cwd, 'package.json');
const pkg = fs.readFileSync(pkgPath, 'utf8');
const content = JSON.parse(pkg);
const rNameSpace = /^(@\w+)\//;

let spinner;

/**
 * 逻辑发生变更
 * 1. 如果没有命名空间，走正常逻辑
 *   - (对同样版本的要进行 tag 的各种移除)
 *   - 变更版本
 *   - 推送代码
 *   - 发布
 * 2. 如果有命名空间
 *   - 检查是否配置了对应命名空间
 *   - 没有配置提示用户配置
 *   - 走正常逻辑
 *   - 发布携带对应的源
 *   - 需要一步同步手段（没配置就不同步了
 */

const RELEASE_TAG = [
  'ga: 正式版本',
  'rc: 发布候选版本, 不会新增 feature',
  'beta: 公测版, 会持续增加 feature',
  'alpha: 内测版, 拥有成吨的 bug'
];

const inc = (version, tag) => {
  const method = [
    { key: 'major', desc: '大版本升级' },
    { key: 'minor', desc: '中版本升级' },
    { key: 'patch', desc: '小版本升级' },
    { key: 'prerelease', desc: '预升级' },
    { key: 'premajor', desc: '大版本预升级' },
    { key: 'preminor', desc: '中版本预升级' },
    { key: 'prepatch', desc: '小版本预升级' }
  ];

  // 非正式版只能发 pre-tag
  const m = method.filter(v => {
    const pre = /^pre/.test(v.key);
    const ga = tag === 'ga';
    return ga ^ pre;
  });

  m.push({ key: 'current', desc: '当前版本' });

  return m.map(m => {
    const v = m.key === 'current' ? version : semver.inc(version, m.key, tag);
    return `${m.key}: ${m.desc}(${v})`;
  });
};

const tagPrompt = [
  {
    type: 'list',
    name: 'tag',
    message: '请选择要发布的版本类型:',
    default: 0,
    choices: RELEASE_TAG,
    filter: v => v.replace(/^(\w+):.+$/, '$1')
  }
];

const removeGitTag = async (nextRef, remote, github) => {
  spinner = ora({ text: `移除本地 tag: ${nextRef}` });
  spinner.start();
  try {
    await ep(exec)(`git tag -d ${nextRef}`);
    spinner.succeed();
  } catch (e) {
    spinner.text = `本地不存在 ${nextRef} tag`;
    spinner.stopAndPersist('◎');
  }

  if (remote.github !== 'origin') {
    spinner = ora({ text: `移除 origin 远端 tag: ${nextRef}` });
    spinner.start();
    try {
      await ep(exec)(`git push origin -d tag ${nextRef}`);
      spinner.succeed();
    } catch (e) {
      spinner.text = `origin 上不存在 ${nextRef} tag`;
      spinner.stopAndPersist('◎');
    }
  }

  if (github && remote.github) {
    spinner = ora({ text: `移除 github 远端 tag: ${nextRef}` });
    spinner.start();
    try {
      await ep(exec)(`git push ${remote.github} -d tag ${nextRef}`);
      spinner.succeed();
    } catch (e) {
      spinner.text = `github 上不存在 ${nextRef} tag`;
      spinner.stopAndPersist('◎');
    }
  }
};

// TODO: 把代码拆一拆
export default async () => {
  const cVersion = content.version;
  const { tag } = await inquirer.prompt(tagPrompt);
  let config = getConfig();

  const questions = [
    {
      type: 'list',
      name: 'version',
      message: '请选择升版方式:',
      default: 0,
      choices: inc(cVersion, tag),
      filter: v => v.replace(/^[^(]+\(([\w\-.]+)\)$/, '$1')
    },
    {
      type: 'confirm',
      name: 'github',
      message: '是否同步代码到 github (小心安全组)?',
      default: true
    }
  ];
  try {
    const { version, github } = await inquirer.prompt(questions);
    const remote = await parseRemote();
    const { name } = content;
    const nextRef = `v${version}`;
    const matched = name.match(rNameSpace);
    const ns = matched ? matched[1] : 'npm(official)';
    const official = ns === 'npm(official)';

    let conf = config.filter(v => v.namespace === ns)[0];

    if (!conf) {
      log.error(`未检测到名为 ${ns} 的内部空间，请进行配置`);
      conf = await add(ns);
      config = getConfig();
    }

    if (github && !remote.github) throw new Error('本地无法找到 github 的 remote!');

    spinner = ora({ text: '检测 npm 源' });
    spinner.start();

    try {
      const sInfo = await ep(exec)(`npm info ${name} --registry=${conf.registry}`);
      /* eslint-disable no-eval */
      eval(`global.npmInfo=${sInfo}`);
      /* eslint-enable no-eval */
    } catch (e) {
      // npm 源上根本没有这个项目
      global.npmInfo = null;
    }

    if (global.npmInfo && global.npmInfo.versions.indexOf(version) > -1) {
      if (official) {
        throw new Error(`npm 源上已存在 ${version} 版本, 请不要重复发布!`);
      } else {
        spinner.text = `移除私有源上已发布的版本 ${name}@${version}`;
        await ep(exec)(`npm unpublish ${name}@${version} --registry=${conf.registry}`);
        spinner.text = `${name}@${version} 已 unpublish`;
        spinner.succeed();

        await removeGitTag(nextRef, remote, github);
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

    try {
      await ep(exec)(`git tag ${nextRef}`);
    } catch (e) {
      if (/exists/.test(e.message)) {
        await removeGitTag(nextRef, remote, github);
        await ep(exec)(`git tag ${nextRef}`);
      } else {
        throw e;
      }
    }

    // 本地源各种推代码和推分支
    if (remote.github !== 'origin') {
      spinner = ora({ text: `推送本地代码到 origin` });
      spinner.start();

      await ep(exec)(`git push origin`);
      await ep(exec)(`git push origin ${nextRef}`);

      spinner.succeed();
    }

    if (github && remote.github) {
      spinner = ora({ text: `推送本地代码到 github` });
      spinner.start();

      await ep(exec)(`git push ${remote.github}`);
      await ep(exec)(`git push ${remote.github} ${nextRef}`);

      spinner.succeed();
    }

    const tagName = tag !== 'ga' ? ` --tag ${tag}` : '';

    spinner = ora({ text: `发布新版本 ${version} 到 npm 源` });
    spinner.start();

    await ep(exec)(`npm publish --registry=${conf.registry}${tagName}`);

    spinner.succeed();

    // 只有发到官网才需要同步内网源
    if (official) {
      const syncChoices = config.filter(v => v.namespace !== 'npm(official)');

      const syncPrompt = [
        {
          type: 'checkbox',
          name: 'website',
          message: '请选择要同步的私有源:',
          default: 0,
          choices: syncChoices.map(v => `${v.namespace}(${v.website})`)
        }
      ];

      const { website } = await inquirer.prompt(syncPrompt);
      const urlList = website.map(v => v.replace(/^[^(]+\(([^)]+)\)$/, '$1'));

      spinner = ora({ text: `同步到内网源` });
      spinner.start();

      await sync(name, urlList);

      spinner.succeed();
    }

    log.done(`版本 ${version} 发布成功!`);
    log.done(goodbye());
  } catch (e) {
    spinner.text = e.message;
    spinner.fail();
  }
};
