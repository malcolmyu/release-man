import fs from 'fs';
import path from 'path';
import inquirer from 'inquirer';
import ep from 'es6-promisify';
import ora from 'ora';

const home = process.env[process.platform === 'win32' ? 'USERPROFILE' : 'HOME'];
const configFile = path.join(home, '.release-man-config');

const DEFAULT_CONFIG = [
  {
    namespace: 'npm(official)',
    official: true,
    registry: 'https://registry.npmjs.org/',
    website: 'https://npmjs.org/'
  },
  {
    namespace: '@cnpm',
    registry: 'https://registry.npm.taobao.org/',
    website: 'https://npm.taobao.org/'
  }
];

export const getConfig = () => {
  let config = DEFAULT_CONFIG;

  try {
    config = JSON.parse(fs.readFileSync(configFile, 'utf8'));
  } catch (e) {}

  return config;
};

const config = getConfig();

const reURL = /^https?:\/\/[\w.:]+\/?$/;

/**
 * 配置文件
 * namespace: 内网源的命名空间
 * registry: 内部源，如 https://registry.npm.taobao.org
 * website: 内部源网页，如 https://npm.taobao.org/
 */

const addPrompts = [
  {
    type: 'input',
    name: 'namespace',
    message: '请输入内部源命名空间(如 @cnpm):',
    validate: (v) => {
      const ns = config.map(v => v.namespace);

      if (!/^@/.test(v)) {
        return `命名空间 ${v} 不合法，应以 @ 开头`;
      }

      if (ns.indexOf(v) > -1) {
        return `命名空间 ${v} 已存在，请运行 release list 查看`;
      }

      return true;
    }
  },
  {
    type: 'input',
    name: 'registry',
    message: '请输入内部源(如 https://registry.npm.taobao.org)\n:',
    validate: (v) => {
      if (!reURL.test(v)) {
        return `内部源 ${v} 不是合法的网址`;
      }

      return true;
    }
  },
  {
    type: 'input',
    name: 'website',
    message: '请输入内部源页面地址(便于发外网时同步 如 https://npm.taobao.org)\n:',
    validate: (v) => {
      if (v && !reURL.test(v)) {
        return `内部源页面地址 ${v} 不是合法的网址`;
      }

      return true;
    }
  }
];

const listPrompts = [
  {
    type: 'list',
    name: 'choice',
    message: '请选择要查看的命名空间',
    choices: config.map(v => v.namespace)
  }
];

const removePrompts = [
  {
    type: 'list',
    name: 'choice',
    message: '请选择要查看的命名空间',
    choices: config.map(v => v.namespace)
  },
  {
    type: 'confirm',
    name: 'confirm',
    message: '确认要删除该命名空间的配置吗?',
    when(answers) {
      return answers.choice;
    }
  }
];

async function setConfig(conf) {
  let spinner = ora({ text: '写入配置文件' });
  await ep(fs.writeFile)(configFile, JSON.stringify(conf));
  spinner.succeed();
  return conf;
}

export async function add(name) {
  let conf;
  if (/^@/.test(name)) {
    conf = await inquirer.prompt(addPrompts.slice(1));
    conf.namespace = name;
  } else {
    conf = await inquirer.prompt(addPrompts);
  }
  return await setConfig(config.concat(conf));
};

export async function list() {
  const { choice } = await inquirer.prompt(listPrompts);
  console.log(config.filter(v => v.namespace === choice)[0]);
}

export async function remove() {
  const { choice, confirm } = await inquirer.prompt(removePrompts);

  if (confirm) {
    await setConfig(config.filter(v => v.namespace === choice));
  }
}
