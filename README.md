# Release-Man

一键 Npm 发布工具，包括在内部源上卸载旧版本、删除原有 tag，打新 tag，推送代码至 github，发布新版本，打 rc-tag 等。

## 安装

```bash
$ npm install -g release-man
```

## 使用

在要发布的工程目录下，命令行内输入 `release` 按照提示走就行了。

```bash
$ release
? 请输入要发布的版本号: 1.2.0-beta.1
? 检测到版本号携带 tag, 是否添加 npm tag? Yes
? 请输入要添加的 npm tag: beta
? 是否同步到 github? Yes
✓ package.json 的版本已更新到 1.2.0-beta.1
✓ 代码和 tag 已 push 到 gitlab
✓ 代码和 tag 已 push 到 github
✓ 版本 1.2.0-beta.1 发布成功!
```



## 流程

1. 输入版本号
2. 如果版本号携带 tag（如 1.2.0-beta.1）会选择是否添加 npm-tag
3. 选择是否同步代码到 github
4. 如果发布版本相同，卸载当前版本（如果是 npm 源不卸载，线上如有当前版本阻止发布）
5. 如果发布版本相同，删除版本对应的 git tag（本地和远程）
6. 如果发布版本增加，更新 package.json
7. 推送代码到 gitlab
8. 如需推送到 github，推送代码到 github
9. 发布到对应的 npm 源上（根据 name 判定，如果是 `@qnpm/xxx`，发到 qnpm 上；否则发到 npm 上）