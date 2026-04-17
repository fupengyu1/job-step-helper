# 一步一屏｜岗位执行支持器（纯前端 Demo）

用于心智障碍群体的线下岗位场景：把复杂 SOP 拆成“一步一屏”，并提供沟通卡片与记录导出（CSV），支持离线使用（基础缓存）。

## 功能

- 一步一屏 SOP：开始 / 上一步 / 下一步 / 完成并记录 / 重置本次
- 沟通卡片：全屏展示短句卡片（点击自动计入“求助/表达次数”）
- 记录导出：一键导出 CSV（开始/结束时间、用时、最后步骤、卡片点击次数）
- 离线可用：Service Worker 缓存静态资源（首次加载后断网仍可打开）

## 本地预览

直接用浏览器打开 `index.html` 即可。

## 部署到 GitHub Pages

1. 新建 GitHub 仓库（例如 `job-step-helper`）
2. 将本项目文件上传到仓库根目录（`main` 分支）
3. 仓库 Settings → Pages  
   - Source: Deploy from a branch  
   - Branch: `main` + `/ (root)`  
4. 等待 1-3 分钟后，访问：
   - `https://你的账号.github.io/job-step-helper/`

## 如何自定义岗位与卡片

编辑 `app.js` 顶部的 `JOBS`（岗位步骤）与 `COMM_CARDS`（沟通卡片）即可。

