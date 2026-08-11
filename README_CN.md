<p align="center">
  <img src="assets/stop-stamp.svg" alt="红色 STOP 审查印章" width="240">
</p>

<h1 align="center">Stop That Shit</h1>

<p align="center">
  <strong>让 Codex 只做你交代的活。</strong><br>
  <a href="README.md">English</a>
</p>

你让 Codex 看一下 diff。它找出一个问题，然后调用了 `apply_patch`。

你让它比对两个 Excel。它先给每一行算 SHA-256，算完还是逐行比较。你让它修一个小 bug。它给从未发布的数据补了兼容层，拉起三个 subagent，又把全量测试跑了一遍。

Stop That Shit 给当前任务写明模式和几条硬边界。Codex 仍然可以读仓库，也必须处理真正受影响的调用方。它碰到 Hook 能确认的越界动作时，会收到一枚红章：

```text
STOP / INTENT
Review 不等于允许修改。
```

`0.0.1` 是技术预览版。LLM 每次运行都可能不同，Hook 也看不到 Codex 的全部动作。这个插件可以减少一部分越界多做，不能保证模型每次都听话。

## SHIT 是哪四种

一个有边界的任务，常从这四个方向跑掉：

| | 问题 | 常见样子 |
| --- | --- | --- |
| **S** | Scope creep，范围膨胀 | 修一个点，顺手重构半个项目。 |
| **H** | Hashing 与 hypothetical hardening | 加了一堆摘要或防御，却没有当前用途。 |
| **I** | Intent violation，意图越界 | 让它 Review 或回答问题，它直接动手改。 |
| **T** | Task thrashing，任务打转 | 已经查过、测过、审过，它又从头来一遍。 |

插件不数代码行数，也不把 diff 越小当成越好。它只问：这一步是用户要求的，还是当前代码、数据和验收条件确实需要的？

这些东西单看一项，往往都能讲出道理：

- 写下一堆 checksum，却没有任何命令会读；
- 为受支持路径不可能产生的输入加守卫；
- 该做工程判断时，改成评分表或反复审计；
- 为没人要求的将来加 feature flag、迁移框架和包装层；
- 新加一层守卫，只为了保护上一层守卫。

每一步都像在增加“严谨性”。最后，一个几行代码能完成的功能，被几百行防御代码埋住了。

## 为什么 hash 单独设一道默认闸门

在 covered tool path 上，Hook 可以较高置信度地识别 hash 动作。它也有一个很具体的判断题：摘要有没有省掉真实工作，结果会不会改变下一步？

我们沿用 [HERO](https://github.com/wanshuiyin/HERO-Anti-OverDefense) 写下的判据：digest 必须替代一个更贵的操作，而且结果必须控制下一步做什么。

```text
STOP
给每一行算 hash，算完还是逐行比较。

ALLOW
用 digest 跳过一个未变化大文件的重复读取。
```

`0.0.1` 默认拒绝可识别的新 hash 操作。用户或仓库给出了真实用途，就用 `hash=allow` 放行。Hook 不会根据自己没读过的代码猜测这个用途。

## 怎么用

普通任务只要一行：

```text
$stop-that-shit change -- 修复失败的配置测试。
$stop-that-shit review -- Review 这个 diff，只报告问题，不要修改。
```

边界已经很清楚时，再加限制：

```text
$stop-that-shit lock change files=src/config.cjs|test/config.test.cjs -- 修复这个行为。
$stop-that-shit change deps=allow -- 添加我要求的解析器依赖。
$stop-that-shit change hash=allow -- 生成我要求的发布校验和。
$stop-that-shit change agents=1 -- 使用一个独立测试 subagent。
```

不知道全部受影响文件时，不要硬写 `files=`。让 Codex 沿真实调用链检查，把完成任务必需的 caller、fixture 和测试一起改完。

## Hook 现在能拦什么

| covered path 上的动作 | 默认处理 | 怎么放行 |
| --- | --- | --- |
| 在 `review`、`answer` 或 `monitor` 中写文件 | 停止 | 切换到 `change` |
| 添加依赖 | 询问 | `deps=allow` |
| 启动 subagent | 超出预算时停止 | `agents=N` |
| 添加可识别的 hash 操作 | 停止 | `hash=allow` |
| 写入文件锁之外的路径 | 停止 | 扩大 `files=` |

Hook 必须收到受支持的事件和足够的输入才能判断。它不会看到 `cache`、`retry`、`migration` 或新文件这些词，就猜它们一定多余。Skill 用四个问题处理这种语义判断：

1. 用户要求了吗？
2. 不做它，当前结果能完成吗？
3. 哪段可达的代码、数据或部署状态证明它有必要？
4. 省掉它，当前验收会失败吗？

证据撑不住时，Codex 应该报告或暂缓，不要顺手实现。

## Bad Case / Good Case

```text
BAD CASE
用户   Review 这个 diff，不要修改。
Codex  调用 apply_patch。
STS    STOP / INTENT：Review 不等于允许修改。

GOOD CASE
用户   只修 P1 问题。
Codex  提交一个窄补丁，运行受影响的检查。
STS    ALLOWED：完成请求确实需要这个动作。
```

Good Case 防止插件走向另一个极端。已经发布的数据可能需要迁移；发布流程可能真的消费校验和；共享合同变化后可能必须跑跨组件测试。仓库或用户给得出理由，这些工作就该保留。

## 它怎么工作

Skill 负责语义判断。Hook 在受支持的工具运行前检查明确事实。Codex Adapter 把宿主事件翻译成核心决策接口。

`0.0.1` 只实现了 Codex Adapter。其他 harness 需要提供等价的 before-action 事件，才能复用同一套核心。接口说明见 [HOST-ADAPTER-CONTRACT.md](HOST-ADAPTER-CONTRACT.md)。

## 局限和证据

部分特殊工具路径可能绕过普通 Hook。插件不负责判断代码质量，不修复 Codex runtime bug，也不是安全沙箱。

测试只能证明规则在 covered event 上按设计运行，不能证明模型行为会普遍改善。[EVIDENCE.md](EVIDENCE.md) 记录了测试、真实运行、无差异结果和排除项。

## 安装

预览版面向支持 Plugin 和 Hook 的 Codex desktop 与 CLI，需要 Node.js 18 或更高版本。

按照 [INSTALL.md](INSTALL.md) 安装。信任 Hook 前先读源码，然后检查包：

```bash
codex plugin marketplace add lennney/stop-that-shit
codex plugin add stop-that-shit@stop-that-shit
```

重启 Codex，在 `/hooks` 中检查命令并确认信任，然后运行：

```powershell
npm test
npm run eval
npm run release:check
```

## 带一个案例来

Codex 做了请求不需要的工作，请提交 **Bad Case**。一个动作看着多余，但背后有真实消费者或故障，请提交 **Good Case**。最好让一组案例只改变一个关键事实，其余条件保持一致。

提交前先看[案例库](cases/README.md)和[贡献指南](CONTRIBUTING.md)。请删掉私有代码、密钥、账号数据、完整对话和可识别身份的路径。

## License

[MIT](LICENSE)
