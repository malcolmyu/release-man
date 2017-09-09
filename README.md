# Release-Man

[![Build Status](https://travis-ci.org/malcolmyu/release-man.svg?branch=master)](https://travis-ci.org/malcolmyu/release-man)
[![npm](https://img.shields.io/npm/v/release-man.svg?maxAge=60)](https://www.npmjs.com/package/release-man)

一键 Npm 发布工具，包括在内部源上卸载旧版本、删除原有 tag，打新 tag，推送代码至 github，发布新版本，打 rc-tag 等。

## 安装

```bash
$ npm install -g release-man
```

## 使用

### 发布

在要发布的工程目录下，命令行内输入 `release` 按照提示走就行了。

```bash
$ release
? 请选择要发布的版本类型: ga: 正式版本
? 请选择升版方式: prerelease: 预升级(1.4.1-alpha.2)
? 是否同步代码到 github (小心安全组)? Yes
✔ 检测 npm 源
✔ 更新 package.json 到: 1.4.1-alpha.2
✔ 推送本地代码到 github
✔ 发布新版本 1.4.1-alpha.2 到 npm 源
? 请选择要同步的私有源: @cnpm(https://npm.taobao.org)
✔ 同步到内网源
✔ 版本 1.4.1-alpha.2 发布成功!
✔ 最后祝你, 提乾涉经, 再见!
```

#### 版本类型

提供四种可选择的版本类型，规范发版

- ga: 正式版本
- rc: 发布候选版本, 不会新增 feature
- beta: 公测版, 会持续增加 feature
- alpha: 内测版, 拥有成吨的 bug

#### 升版方式

选择正式版本 GA 之后会出现如下的升级方式：

- major: 大版本升级(2.0.0)
- minor: 中版本升级(1.5.0)
- patch: 小版本升级(1.4.2)

选择 rc/beta/alpha 后会出现如下的升级方式：

- prerelease: 预升级(1.4.2-rc.0)
- premajor: 大版本预升级(2.0.0-rc.0)
- preminor: 中版本预升级(1.5.0-rc.0)
- prepatch: 小版本预升级(1.4.2-rc.0)
- current: 当前版本(1.4.1)


## 参考

- [npm-version](https://docs.npmjs.com/cli/version)
- [npm-semver](https://www.npmjs.com/package/semver)
- [软件发布生命周期](https://en.wikipedia.org/wiki/Software_release_life_cycle)
