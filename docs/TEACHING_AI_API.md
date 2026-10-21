# 教学闭环接口

新增TeachingLoop聚合外键关联Booking，原Lesson、课件与作业接口保持不变。

| 方法与路径 | 行为 |
| --- | --- |
| GET /api/bookings/:bookingId/teaching-loop | 关联教师读完整聚合；关联家长仅读plan、versions和已发布feedbacks，无draft、records、suggestions、receipts。管理员403，其他预约404。 |
| POST /api/bookings/:bookingId/teaching-loop | 关联教师且预约accepted时可写。{requestId,expectedRevision,type,payload}，返回{data:聚合}。 |
| POST /api/bookings/:bookingId/teaching-loop/generate | {requestId,expectedRevision,kind:course或feedback或revision}。后端真实模型生成候选草稿，不自动发布。 |

命令：initialize加载预置；saveDraft保存{course,source}；discardDraft撤销草稿；publish发布；record保存事实；feedback保存{recordId,feedback}；editFeedback修改{feedbackId,report}并标manual；publishFeedback确认发布；suggest保存{suggestion}；applyRevision/rejectRevision处理{suggestionId}。完整类型见server/src/teaching-loop/types.ts。

成功写入revision递增；相同ID与命令重试不重复写入；同ID不同内容或过期revision返回409。普通请求最多180KB，历史最多2MB。model来源只能由服务端生成接口写入，普通命令不能伪造。无模型503 MODEL_UNAVAILABLE；超时/无效上游502或504 MODEL_UPSTREAM；限流429。modelEnabled只表示配置齐备，不证明供应商连通。

课程每节45分钟，题号稳定。课堂事实包含lessonId/date/completed/goalMet/results[{questionId,correct}]/errorTypes/observation/questions/consolidation。统计由逐题事实计算，证据引用已有题号或teacher-observation。家长仅收到教师发布版本；采纳建议只生成草稿，另外发布形成v2。已发布快照不可覆盖；新课堂事实使旧建议失效。

模型只接收匿名课程与课堂事实，不接收预约称呼、用户ID或附件；保留已核验题目及答案，教师须核验。Mock复用纯规则及本机存储，不具备服务端安全能力。
