# 领航云学堂 · 智能匹配视频技术验证 01

成片：`exports/probe_01_match.mp4`，40秒，1920×1080，30fps，H.264。字幕：`subtitles/probe_01.srt`。四张关键帧在 `screenshots/01-opening.png` 至 `04-ending.png`。

应用基线：最新 main（本轮读取时）`5d04c4f789780d551b785c542e9946cf9453dd18`。录制真实 Vue/uni-app H5，没有重画页面、替换推荐结果或修改业务代码。

## 重新生成

在仓库根目录安装 Node.js 20+ 与项目依赖：

```sh
npm ci
npx playwright install chromium ffmpeg
python -m pip install Pillow imageio-ffmpeg
```

安装系统 FFmpeg（须包含 libx264），或将 imageio-ffmpeg 的可执行文件路径赋给 `FFMPEG_PATH`：

```sh
python -c "import imageio_ffmpeg; print(imageio_ffmpeg.get_ffmpeg_exe())"
```

Windows PowerShell 示例：

```powershell
$env:FFMPEG_PATH = python -c "import imageio_ffmpeg; print(imageio_ffmpeg.get_ffmpeg_exe())"
$env:PROBE_BROWSER_CHANNEL = 'chromium'
node video-production/probe-01/scripts/produce.mjs
```

也可分开执行：

```sh
node video-production/probe-01/scripts/capture.mjs
python video-production/probe-01/scripts/render.py --ffmpeg /absolute/path/to/ffmpeg
```

默认 capture 自动启动 `scripts/start-demo.mjs`（与 `npm run demo` 完全相同的原项目入口），解析实际端口，再打开 `/#/pages/demo/index`。也可先 `npm run demo`，然后设置 `PROBE_URL=http://127.0.0.1:5173` 复用服务。设置 PROBE_URL 时脚本不会关闭外部服务。

默认使用已安装的 Google Chrome（Chromium 内核）。安装了 Playwright Chromium 后设置 `PROBE_BROWSER_CHANNEL=chromium`；也可用 `PROBE_CHROME_PATH` 指定 Chromium 可执行文件。每次录制都新建隔离 context；暖机 context 随后销毁，业务存储不带入录制。

字体默认读取 Windows 系统微软雅黑 `msyh.ttc` / `msyhbd.ttc`，不分发字体。其他系统以 `PROBE_FONT`、`PROBE_BOLD_FONT` 指定有权使用的中文字体文件。需要 Python Pillow；无需 Remotion。

## 实现与证据

- `capture.mjs`：真实页面录制、缓入缓出光标、真实 mouse.click、波纹和实际理由高亮。三个点击的坐标、路由及实际推荐文字写入 `capture-log.json`。
- `render.py`：FFmpeg 对连续录屏做平滑缩放；用首个实际路由场景变化与操作日志自动校准时间；叠加原创文字图层、字幕及淡入淡出。PNG 图层只有标题和说明，不含任何伪造业务页面。
- `produce.mjs`：一键顺序录制与渲染。浏览器原始 WebM 由 Playwright 以25fps录制，最终重采样为30fps。
- 静音 AAC 音轨供后期配音替换；未加入音乐、旁白或外来水印。
- `validation.json`、`exports/media-info.txt`、`assets/scene-sync.json` 与验证报告记录实际参数及检查。
- 原始素材在 `assets/raw/browser.webm`，重新生成即可得到；为避免仓库膨胀不纳入Git。可剪辑成片16MB左右，小于GitHub单文件100MB限制，纳入本分支。

## 本次环境处理

宿主没有 npm CLI，使用捆绑 pnpm 安装依赖，并直接运行相同的 demo Node 入口。Windows非管理员符号链接限制通过 hoisted 安装方式解决；pnpm报告忽略部分构建脚本，实际H5服务和录制均成功启动。浏览器采用已安装 Chrome 155，FFmpeg 7.1来自 PyPI imageio-ffmpeg。Playwright录像编码器使用同一FFmpeg放在其预期的缓存位置。首次录制后发现Vite监视大录像文件可能触发Windows EBUSY，复用脚本改为系统临时目录录制、开启轮询，并在自启服务停止后复制素材；业务源码未改。

本轮没有验证真实API、大模型、微信端或其他功能；只验证本机规则匹配和老师详情。
