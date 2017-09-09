import fs from 'fs';
import path from 'path';
import fetch from 'node-fetch';
import ep from 'es6-promisify';
import chalk from 'chalk';
import ora from 'ora';
import { exec } from 'child_process';

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
  const rGithub = /(\w+)\s+.+github.+/;
  const githubMatched = remotes.match(rGithub);

  const remote = {};

  if (githubMatched && githubMatched[1]) remote.github = githubMatched[1];

  return remote;
}

export async function getCurrentBranch() {
  return await ep(exec)('git describe --contains --all HEAD');
}

export function sync(name, urlList) {
  return Promise.all(urlList.map(url => {
    const u = /\/$/.test(url) ? url : `${url}/`;
    return fetch(`${u}sync/${name}`, { method: 'PUT' })
      .then((response) => {
        if (!response.ok) {
          throw new Error(response.statusText);
        }
      }
    );
  }));
}

export async function spinning(msg, cb) {
  const spinner = ora(msg);
  spinner.start();
  const result = await cb(spinner);
  result
    ? spinner.succeed()
    : spinner.stopAndPersist('◎');
}

export function goodbye() {
  const list = [
    '提乾涉经',
    '人群当中看见了一个光头',
    '不要打架',
    '身体健康',
    '带着小姨子跑了',
    '也是一个广♂东人',
    '乖♂乖站好',
    '吔屎啦',
    '一百块都不给我',
    '什么仇什么怨',
    '大力出奇迹',
    '倒戈卸甲, 以礼来降',
    '妙啊, 快撤',
    '瞬间爆炸',
    'Are you OK',
    '八百标兵奔北坡\n北坡炮兵并排跑\n炮兵怕把标兵碰\n标兵怕碰炮兵炮\n'
  ];

  const i = Math.floor(Math.random() * list.length);
  return `最后祝你, ${list[i]}, 再见!`;
}
