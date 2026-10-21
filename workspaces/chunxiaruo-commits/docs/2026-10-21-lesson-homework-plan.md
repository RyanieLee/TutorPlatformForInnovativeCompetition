# 课次、预习资料与作业提交 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. 本计划推荐由当前助手在当前会话执行；若用户选择委派方式，改用 superpowers:subagent-driven-development。

**Goal:** 在个人目录内交付可独立运行、复用现有账号角色的“老师发布课次和课件 → 学生上传作业 → 老师读取附件与历史版本”网页审核版。

**Architecture:** 以固定主项目基线和个人目录中的 overlay 生成隔离审核应用，根项目只读。新增教学模块复用现有 Fastify 会话、Prisma/SQLite 与 uni-app 页面模式，文件保存到独立私有目录。审核完成前不把 overlay 应用到主项目。

**Tech Stack:** Node.js >=20、Vue 3、TypeScript、uni-app、Fastify 5、Prisma 6/SQLite、Vitest、Playwright；受保护的 multipart 流式上传。

**Spec:** [2026-10-21-lesson-homework-design.md](./2026-10-21-lesson-homework-design.md)，用户于本会话确认。当前计划待审阅，尚未实施。

## Global Constraints

- 所有新增或修改均位于 `workspaces/chunxiaruo-commits/`；包括源码、配置、依赖、缓存、数据库、上传、日志和构建产物。
- 分支为 `feat/chunxiaruo-lesson-homework-review`；基线为 `5c189221bb80a6232e20c3902e550f1d867eb97b`；不推送 main，不自行合并，不覆盖其他人分支。
- 以下简称 P 为 `workspaces/chunxiaruo-commits/teaching`，O 为 P 下的 `overlay`，R 为 P 下的 `.local/review-app`。文件清单的这些前缀是明确路径缩写。
- 主项目 `src/`、`server/`、公共契约与依赖只读；计划中的根路径修改均指 O 中的修改副本及 R 中的生成副本。
- 保留 `parent/tutor/admin` 身份契约，沿用当前学生/家长账号；权限基于 bookingId、parentId 和 tutorProfile.userId，不能按学生姓名授权。
- 页面全部中文，沿用蓝白风格；检查 320px、390px 和桌面网页。小程序只记录实际执行的构建或真机结果。
- 文件允许 JPG、PNG、WebP、PDF、DOCX、PPTX；单文件 20 MiB，每组 5 个，单账户每天成功上传量 500 MiB，未绑定文件 24 小时后可清理。
- 标题 1–80 字，预习说明最多 10000 字，作业要求 1–10000 字，提交说明最多 2000 字；提交含 1–5 个附件。
- accepted 时老师可操作草稿并发布；学生可在 accepted/completed 提交；cancelled 时保留已发布只读记录。发布内容锁定；逾期允许提交并标记；历史版本保留。
- 测试、启动和迁移只连接个人目录的审核数据库；虚构账号密码从环境传入，不进入 Git、前端源码或报告。
- 每个任务在有行为改动时先运行能揭示缺失行为的测试，再实现并复跑；成功声明必须附实际证据。纯文档修改只核对内容与差异。

## Review Focus

1. 文件流中断或进程退出后，配额预留和部分文件必须能回收，重启不损坏已提交附件；Task 3 的 interrupted-upload/recovery 测试覆盖。
2. 客户端上传开始后，预约取消或账号退出，不能在最终落库时继续写入；Task 3、4 的 post-stream-state-change 测试覆盖。
3. 同一学生姓名出现在不同预约，列表及附件仍按预约隔离；Task 2、4 的 duplicate-student-name 测试覆盖。
4. 窄屏、中文长文件名、时区和输入法组合输入不能使发布内容错乱；Task 6、7 的 browser-long-name/timezone/composition 测试覆盖。
5. 预览重新生成或启动失败时，既有审核数据库、附件和根项目必须保持原样；Task 1、7 的 rematerialize-preserves-data/source-unchanged 测试覆盖。

---

## File Structure and Contracts

| 位置 | 职责 |
| --- | --- |
| P/scripts/review-lib.mjs、prepare-review.mjs、review.mjs、check-scope.mjs | 固定基线生成、限定路径、审核启动、差异验证；禁止提供自动覆盖根项目命令 |
| P/baseline.json、integration-manifest.json、.gitignore、README.md | 逐文件基线 SHA-256、目标位置、理由、启动与审核入口；忽略 .local 与安装产物 |
| O/server/src/teaching/types.ts、validation.ts、access.ts、lessons.ts | 后端教学 DTO、校验、归属及课次业务 |
| O/server/src/teaching/files.ts、file-types.ts、quota.ts、cleanup.ts | 受保护文件流、类型校验、配额与清理恢复 |
| O/server/src/teaching/submissions.ts、routes.ts | 作业事务与路由注册 |
| O/server/prisma/schema.prisma、migrations/20261021000000_teaching/migration.sql | 新增课次、附件、版本关系及上传配额，保留旧表数据 |
| O/server/src/app.ts、package.json、package-lock.json | 挂载新模块、锁定 multipart/受限 ZIP 读取依赖 |
| O/src/types/teaching.ts、services/teaching.ts、services/api/teaching.ts、services/mock/teaching.ts | 前端教学类型与模式选择；不修改旧 BusinessService 必选接口 |
| O/src/pages/teaching/index.vue、edit.vue、detail.vue、shared/* | 课次列表、草稿编辑、资料与提交页，局部交互组件 |
| O/src/pages/tutor/booking-detail.vue、pages/orders/index.vue、pages.json | 仅增加双方入口及路由，不改变预约处理 |
| O/server/tests/teaching*.test.ts、P/tests/* | 真实接口测试、预览隔离检查、前端行为与双浏览器流程 |
| P/docs/VALIDATION.md、P/docs/screenshots/* | 记录真实执行结果、审核截图、限制与集成清单 |

跨任务约定：`Page<T>={data:T[],meta:{total:number,page:number,pageSize:number}}`；课次列表按 scheduledAt ASC、createdAt ASC、id ASC，提交按 revision DESC；page 默认 1、pageSize 默认 20、最大 100。列表页提供加载更多。

`LessonInput={title:string,scheduledAt:string,previewText:string,homeworkText:string,dueAt:string|null}`；创建另含 requestId，更新另含 version；`PublishInput={version:number,attachmentIds:string[]}`；`SubmissionInput={requestId:string,note:string,attachmentIds:string[]}`。

`AttachmentPurpose='preview'|'homework'|'submission'`；multipart 将 purpose 作为 query 参数，正文只有一个 `file` 字段，避免字段顺序改变鉴权。发布和提交通过 JSON 原子绑定已上传附件，上传本身不等于提交。

## Task 1: 可验证的个人目录预览环境

**Files:** Create P/scripts/review-lib.mjs、prepare-review.mjs、review.mjs、check-scope.mjs；P/tests/review-isolation.test.mjs；P/baseline.json、integration-manifest.json、.gitignore、README.md。

**Interfaces:** `materializeReview({sourceDir,personalDir,baseSha}):Promise<{appDir,dataDir}>` 只读固定基线并生成 R；`checkScope({baseSha,head}):Promise<string[]>` 返回越界路径，非空退出非零。CLI 均从仓库根目录运行。

- [ ] 写 node:test 测试 `rejects-path-traversal-and-symlinks`、`rejects-baseline-mismatch`、`rematerialize-preserves-data`：越界路径、符号链接、错误基线必须拒绝，二次生成后 data/ 内哨兵数据库和上传文件字节相同。

  核心断言：`await assert.rejects(() => materializeReview(invalidOptions))`；对有效场景断言 `assert.deepEqual(readFileSync(dataFile), originalBytes)`，并断言根源文件 SHA-256 不变。
- [ ] 运行 `node --test P/tests/review-isolation.test.mjs`，确认因模块未实现失败，而不是测试语法或工具缺失。
- [ ] 经 using-git-worktrees 技能选择隔离执行位置；取得固定基线只读快照，记录其来源和提交。实现生成器：只从固定提交导出受跟踪文件，不复制工作区 .env、node_modules、.git 或运行数据，不沿符号链接，不递归复制 P/.local。
- [ ] 实现 P/scripts/review.mjs 的 `setup|serve|verify|clean-temp` 子命令。运行 cwd、npm cache、日志、临时目录、数据库与上传必须在 P/.local；setup 只在 R 和 R/server 执行 npm ci，生成 Prisma 客户端、增量迁移并通过原 seed 准备虚构账号，缺少密码则明确失败。serve 默认 H5 5174、API 3002，精确配置 CORS；不继承外部 DATABASE_URL/UPLOAD_ROOT 到审核运行。
- [ ] 重跑隔离测试；运行 `node workspaces/chunxiaruo-commits/teaching/scripts/prepare-review.mjs --base 5c189221bb80a6232e20c3902e550f1d867eb97b`，比对根项目文件哈希未变。
- [ ] 提交本任务，提交差异全部以个人目录前缀开头。P 的真实路径代入上述命令，不把缩写字符串当目录。

## Task 2: 课次数据、权限与草稿 API

**Files:** Create O/server/src/teaching/types.ts、validation.ts、access.ts、lessons.ts、routes.ts；O/server/tests/teaching-lessons.test.ts；O/server/prisma/migrations/20261021000000_teaching/migration.sql。Modify O/server/prisma/schema.prisma、O/server/src/app.ts。

**Interfaces:** `registerTeachingRoutes(app:FastifyInstance,db:PrismaClient,options:TeachingOptions):Promise<void>`；`TeachingOptions={uploadRoot:string,now:()=>Date}`；`requireBooking(request,db,bookingId,mode:'read'|'draft'|'submit'):Promise<BookingAccess>`，BookingAccess 包含服务端 user、booking 及 tutorUserId。`buildApp` 保留前两个原参数，增加可选第三个教学配置参数，兼容旧测试。

- [ ] 写 `owner-can-create-save-list-draft`、`duplicate-student-name-isolated`、`parent-cannot-read-draft`、`status-and-version-conflict` 和 `migration-preserves-existing-booking` 测试：草稿仅所属老师可见；其它老师、家长猜 ID 得 404；admin 无教学权限；title 0/81 字拒绝；旧预约数据迁移后保持；更新旧 version 得 409。

  核心断言：`expect(parentDraftResponse.statusCode).toBe(404)`；`expect(staleUpdate.statusCode).toBe(409)`；`expect(afterMigration.studentName).toBe(beforeMigration.studentName)`。字段长度按边界 0、1、80、81 测试。
- [ ] 生成审核应用后，在 R/server 运行 `npm run test -- teaching-lessons`；若原 runner 不转发参数，直接使用本任务的个人测试运行器调用 Prisma migrate deploy 后执行 `vitest run tests/teaching-lessons.test.ts`。确认断言揭示未实现功能。
- [ ] 在 schema 中增加设计中的模型、逆向关系与索引。Lesson 加 `requestId/requestFingerprint`；唯一约束 `[bookingId,requestId]`，规范化输入相同重试返回同一课次，不同输入 409；HomeworkSubmission 唯一 `[lessonId,revision]`、`[parentId,requestId]`。附件追加上传状态、reservedBytes、expiresAt，以便恢复配额。
- [ ] 通过现有 `actor()` 校验会话；通过预约外键校验归属；注册创建、草稿更新、详情和分页列表接口。学生查询必须在数据库过滤草稿；更新用 version 和预约 accepted 条件保证并发安全。
- [ ] 后端教学测试运行器 Create P/scripts/test-server.mjs，在个人目录建立临时测试库及上传目录，生成、迁移后按传入文件调用 Vitest，失败退出非零并清理测试目录，不能删除审核持久数据。
- [ ] 运行 `node workspaces/chunxiaruo-commits/teaching/scripts/test-server.mjs tests/teaching-lessons.test.ts`，全部通过；在 R/server 运行原 `npm test` 确认旧接口回归。提交。

## Task 3: 真实附件、配额、发布与重启恢复

**Files:** Create O/server/src/teaching/files.ts、file-types.ts、quota.ts、cleanup.ts；O/server/tests/teaching-files.test.ts；P/tests/fixtures/*；P/scripts/cleanup-uploads.mjs。Modify O/server/src/teaching/lessons.ts、routes.ts；O/server/package.json、package-lock.json。

**Interfaces:** `receiveAttachment(request,db,options,lessonId,purpose):Promise<AttachmentDto>`；`streamAttachment(request,reply,db,options,id):Promise<void>`；`detectFileType(path:string,originalName:string):Promise<AllowedFileType>`；`cleanupUploads(db,options):Promise<{removed:number,recovered:number}>`。文件根目录由审核配置显式传入。

- [ ] 写 `authorized-byte-roundtrip`、`size-format-count-limits`、`partial-upload-cleanup`、`quota-concurrent-reservations`、`restart-recovers-reservations`、`post-stream-state-change`、`private-temp-and-bound-download`：比较下载 SHA-256；20 MiB 接受、20 MiB+1 拒绝 413；第 6 个绑定附件拒绝；伪扩展名/路径穿越拒绝；超 500 MiB 返回 429；流期间撤销会话或取消预约不能成功落库。

  核心断言：`expect(download.rawPayload).toEqual(originalBytes)`；`expect(oversize.statusCode).toBe(413)`；`expect(overQuota.statusCode).toBe(429)`；`expect(remainingPartialFiles).toEqual([])`；`expect(recoveredQuota.reservedBytes).toBe(0)`。
- [ ] 运行 `node workspaces/chunxiaruo-commits/teaching/scripts/test-server.mjs tests/teaching-files.test.ts`，确认失败；只在 R/server 安装 `@fastify/multipart@9`、`yauzl@3` 和开发类型 `@types/yauzl@2`，使用 --save-exact，将实际 package.json 与 lock 副本回写 O。禁用根目录安装。
- [ ] 实现随机 storageKey、流式写临时文件、大小及格式校验与最终重命名。yauzl 使用 lazyEntries，最多 4096 项、总声明解压量 200 MiB、单个必要 XML 读取上限 512 KiB，验证 [Content_Types].xml 与 word/document.xml 或 ppt/presentation.xml；不把归档解压到磁盘。图片验证格式签名并与扩展名/MIME 对应，PDF 检查签名；不接受 SVG/HTML/可执行文件。
- [ ] 实现配额原子增量预留和失败释放；每个进行中附件保存 reservedBytes。单实例启动前恢复遗留 uploading 记录与预留，删除部分文件；成功配额转为 usedBytes，失败不计成功量。UTC 日期、计数和文件元数据持久化；清理临时文件不退还历史成功上传量。
- [ ] 实现发布：事务内检查预约、version、dueAt、同课次同老师同用途的未绑定附件，每组最多 5，固定集合后置 published。重复相同发布返回现有结果；不同集合返回 409。附件下载实时校验会话、已绑定记录和归属，添加 nosniff 与安全文件名；未知 storageKey 不能逃逸上传根目录。
- [ ] 加 `cleanup-expired-preserves-bound` 测试：超过 24 小时仅删除未绑定附件；模拟在文件写入、DB 提交和重命名边界异常后恢复，已绑定文件不能被清除。重跑测试，重启应用后再次比对文件字节；提交。

## Task 4: 作业提交版本与幂等事务

**Files:** Create O/server/src/teaching/submissions.ts、O/server/tests/teaching-submissions.test.ts。Modify O/server/src/teaching/routes.ts。

**Interfaces:** `submitHomework(request,db,options,lessonId,input:SubmissionInput):Promise<SubmissionDto>`；`listSubmissions(request,db,lessonId,page):Promise<Page<SubmissionDto>>`。SubmissionDto 提供 revision、note、attachments、submittedAt、late，不暴露磁盘路径。

- [ ] 写 `same-request-returns-original`、`changed-replay-conflicts`、`concurrent-new-revisions`、`foreign-attachment-rejected`、`duplicate-student-name-isolated`、`completed-accepts-cancelled-readonly`：相同 requestId 返回相同 ID；不同内容 409；并发不同提交版本不丢失；他人/其它课次/旧版本已绑定附件不能复用；学生需重新上传新版本文件；历史字节不变。

  核心断言：`expect(replay.json().data.id).toBe(first.json().data.id)`；`expect(changedReplay.statusCode).toBe(409)`；`expect(revisions.sort()).toEqual([1, 2])`；`expect(oldAttachment.rawPayload).toEqual(originalBytes)`。
- [ ] 运行 `node workspaces/chunxiaruo-commits/teaching/scripts/test-server.mjs tests/teaching-submissions.test.ts`，确认失败。
- [ ] 事务内重查会话、预约和已发布状态，按 parentId 归属创建版本并绑定完整附件集合。基于唯一约束处理并发版本竞争，有限重试；使用规范化内容指纹区分幂等重放。迟交按服务端提交时刻与 dueAt 比较，不信任客户端 late 或 parentId。
- [ ] 补 `clock-boundary-late`、`replay-after-completion`、`cancel-during-submit`：恰好截止时间不迟交，之后迟交；事务竞争时取消与提交按最终数据库顺序决定；已成功请求的重放返回原记录，不能产生重复版本。
- [ ] 运行本任务和 Task 2/3 的测试；确认提交历史分页 total 及内容仅统计当前预约所属学生。提交。

## Task 5: 前端教学服务与上传下载状态

**Files:** Create O/src/types/teaching.ts、services/teaching.ts、services/api/teaching.ts、services/mock/teaching.ts；O/src/pages/teaching/shared/files.ts、request-state.ts；P/tests/teaching-service.test.ts、teaching-request-state.test.ts、vitest.config.ts。

**Interfaces:** `TeachingService` 提供 `listLessons(bookingId,page,pageSize)`、`getLesson(id)`、`createLesson(bookingId,input,requestId)`、`saveLesson(id,input,version)`、`publishLesson(id,input)`、`listSubmissions(lessonId,page,pageSize)`、`submitHomework(lessonId,input)`、`uploadAttachment(lessonId,purpose,file,onProgress)`、`downloadAttachment(attachment)`；异步结果对应 DTO/Page。上传返回 `{promise:Promise<AttachmentDto>,abort:()=>void}`。

- [ ] 写服务测试：列表保留 meta；上传带当前 Bearer token；multipart URL 中 purpose 正确；401 清空会话；413/429 显示中文原因；网络错误不转 Mock；创建与提交结果未知时复用 requestId；成功后才清空 requestId。先运行测试确认缺失模块失败。

  核心断言：`expect(result.meta.total).toBe(21)` 且第一页 `data.length===20`；`expect(retryInput.requestId).toBe(firstInput.requestId)`；`expect(uploadHeaders.Authorization).toBe('Bearer ' + token)`；`expect(mockFallback).not.toHaveBeenCalled()`。
- [ ] 实现 API adapter：JSON 请求复用现有 apiRequest 和 readToken；新增上传/下载封装独立处理二进制与错误 envelope。上传失败不产生已提交状态；页面销毁可 abort。身份改变后忽略旧响应，保留同身份重试所需内容。
- [ ] H5 下载使用带鉴权请求取得 Blob，图片打开受控对象 URL，其他文件下载；失效和卸载 revoke URL。使用 uni-app 条件编译隔离 H5 DOM 代码，小程序走可编译的 uni.downloadFile/openDocument 路径，不声称已真机验证。
- [ ] 实现 Mock adapter，只允许个人本机演示并明确标记；使用按账号及预约隔离的本地记录和真实 Blob 生命周期，不承诺跨设备。若环境不能持久存文件，界面明确不支持并引导 API 模式，不能返回假的上传成功。
- [ ] 在 R 依赖上下文运行 `vitest run --config workspaces/chunxiaruo-commits/teaching/vitest.config.ts`（脚本换算个人目录绝对路径），验证 `logout-aborts-upload-clears-object-url`、`stale-response-ignored`、`failed-submit-retains-input`。提交。

## Task 6: 老师与学生网页入口及页面

**Files:** Create O/src/pages/teaching/index.vue、edit.vue、detail.vue；shared/AttachmentList.vue、UploadPicker.vue、SubmissionHistory.vue、teaching.css。Modify O/src/pages/tutor/booking-detail.vue、pages/orders/index.vue、pages.json；Create P/tests/teaching-ui.spec.ts。

**Interfaces:** 列表路由 `/pages/teaching/index?bookingId=...`；编辑 `/pages/teaching/edit?bookingId=...&lessonId=...`，无 lessonId 时首次保存创建；详情 `/pages/teaching/detail?lessonId=...`。身份始终从当前会话读取，禁止 URL role 参数授权。

- [ ] 写浏览器测试：老师 accepted 预约可见入口、学生入口只进入其预约；草稿不可出现在学生列表；老师发布按钮与学生提交按钮按权限/状态显示；先运行确认新增页面尚不可访问。

  核心断言：`await expect(studentPage.getByText(draftTitle, {exact:true})).toHaveCount(0)`；`await expect(teacherPage.getByRole('button', {name:'发布课次', exact:true})).toBeVisible()`；取消预约后断言提交按钮不存在或禁用。
- [ ] 实现列表及分页、草稿表单和提交页，调用 Task 5 服务。绑定现有角色容器与身份控制模式；无权、空、加载、错误均有中文反馈。操作前锁定忙碌状态，所有上传结束前禁用提交。
- [ ] 草稿只允许老师编辑；发布前明确提示“发布后本版内容不可修改”。详情展示截止时间、逾期标记和提交历史；重新提交说明“本次上传将作为新版本，历史版本保留”。已取消预约隐藏写操作但保留已发布内容。
- [ ] 提供 JPG/PNG/WebP/PDF/DOCX/PPTX 文件选择、5 个/20 MiB 客户端限制、移除、进度、单文件失败重试。文件名折行，移动端按钮不超宽；保存/提交失败保留输入。
- [ ] 增加 browser-long-name/timezone/composition 检查：中文长文件名不溢出；本地日期正确转 UTC，空日期不构造无效时间；输入法组合结束后才使用完整文本验证；重复点击只发一次发布或提交。
- [ ] 运行 Task 5 测试、R 中 `npm run typecheck` 与 `npm run build:h5`，执行本任务浏览器测试；提交。

## Task 7: 双账号真实收交、边界回归与审核交付

**Files:** Create P/tests/teaching-e2e.spec.ts、P/playwright.config.ts、P/scripts/verify.mjs；P/docs/VALIDATION.md、docs/screenshots/*。Modify P/README.md、integration-manifest.json；如测试发现缺陷，只修改本计划列出的个人目录副本。

**Interfaces:** 从仓库根运行 `node workspaces/chunxiaruo-commits/teaching/scripts/review.mjs setup`、`node workspaces/chunxiaruo-commits/teaching/scripts/review.mjs serve`、`node workspaces/chunxiaruo-commits/teaching/scripts/review.mjs verify`。verify 汇总真实命令、退出码和截图到个人目录；任一要求的检查失败则退出非零。

- [ ] Playwright 建立两个独立 browser context，分别登录老师和学生/家长：创建已接受预约课次 → 上传课件并发布 → 学生下载并核对内容 → 学生上传图片和 DOCX 提交 → 老师打开/下载且 SHA-256 相同 → 新版本提交后老师仍可读取旧版。先记录新流程测试结果，不能用静态截图替代交互验收。

  核心断言：`expect(teacherDownloadedBytes).toEqual(studentUploadedBytes)`；`expect(historyVersions).toEqual([2, 1])`；在各 viewport 断言 `scrollWidth <= clientWidth`，并对浏览器下载结果读取字节验证，而非仅等待下载事件。
- [ ] 通过专用测试数据库或注入 now 验证逾期，禁止等待真实截止时间。测试两个同名学生预约、另一个老师、另一个家长、未登录和 admin 访问课程/文件的拒绝结果。
- [ ] 运行 API 模式的电脑 1440px、手机 390px、窄屏 320px；实际检查长文件名、重复点击、断网/丢响应重试、身份切换和加载更多。存储敏感信息的网络日志不进入报告。
- [ ] 原服务器关闭后用同一审核数据库和上传目录重启，确认登录后仍能获取课次、版本和同样文件字节；重跑生成器确认持久数据不丢。运行 `clean-temp` 验证只清理过期未绑定上传。
- [ ] verify 在隔离 R 中执行前后端旧测试、全部教学测试、前后端类型/构建检查和 H5 双角色浏览器测试。实际执行 `npm run build:mp-weixin` 时只记录构建结论，浏览器流程不代表小程序真机通过。
- [ ] 对每个 overlay 文件登记目标路径、基线 SHA-256 或新文件标记、原因和审批状态；运行 scope 检查，确认 Git 差异只在个人目录，根项目哈希未变，数据库/附件/.env/node_modules/日志未被跟踪。
- [ ] 更新 README 的实际启动命令、环境变量名、个人审核页入口和已知限制；VALIDATION 记录各检查实际结果及未验证事项。提交完成的个人目录审核版，提供分支和文件链接，等待用户功能审核；不创建覆盖根项目的自动集成操作，不自行合并。

## Self-Review and Execution Handoff

设计覆盖：目录限制和隔离预览由 Task 1/7 覆盖；课次、账号与状态由 Task 2 覆盖；文件格式、配额、清理由 Task 3 覆盖；版本、迟交与幂等由 Task 4 覆盖；状态/身份控制和二进制传输由 Task 5 覆盖；双端网页由 Task 6/7 覆盖。上述五个 Review Focus 均有具名测试。

路径约定：计划内 O 的每个根文件都是个人目录副本；P/tests 的依赖由 R 提供，生成器不得使根项目可写。接口方法与设计中的九个 API 路径保持一致，旧 buildApp 调用和 BusinessService 消费者继续兼容。

推荐当前会话执行，因为任务共享预约权限、附件事务和前端 DTO，连续实现便于核对接口并控制上下文开销。用户审阅本计划并确认执行方式后，先读 using-git-worktrees、executing-plans 与 test-driven-development，再开始 Task 1。若需要超出个人目录，停止该部分并列明具体文件和原因；授权范围内的工作继续推进。
