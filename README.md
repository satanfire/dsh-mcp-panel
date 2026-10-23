# DSH MCP Panel

为 **DeepSeek Harness Web** 设置页提供 MCP 面板：列出宿主上配置的 MCP 服务、它们当前的状态、连接目标，以及每个工具的 token 结构占用估值。只读，不改任何 MCP 配置。

## 功能

- **服务列表**：每台 `@deepseek-ai/dsh-mcp-client` 服务一行，显示传输方式（`stdio` / `streamable-http`）、状态（已激活 / 加载中 / 失败 / 已禁用）、连接目标与请求头名。
- **工具清单**：展开后列出该服务全部工具、描述、参数数量，以及每个工具的 token 占用估值。
- **占用合计**：每台服务显示合计，页面顶部显示全部 MCP 工具的合计。
- **凭据脱敏**：连接目标里的 URL query、`--flag value`、`KEY=value`、HTTP 头里的凭据一律打码，面板不显示密钥明文。
- **延迟加载提示**：若部署里挂了 `mcp-lazy-tools` 策略，会说明工具对模型隐藏，解锁前不占模型上下文。

token 估值采用与 DSH `token-meter` 相同的固定口径：**约 4 字符 = 1 token**，按 `name + description + parameters` 的 JSON 长度计算。它用于横向比较各工具的成本，不是精确分词结果。

## 环境要求

- 已配置模型的 DSH Web，要求 **`@deepseek-ai/dsh >= 0.2.0-rc.2`**。
- Node.js **22 或更新版本**。

## 安装

从仓库本地安装（会读取仓库根目录的 `package.json`）：

```sh
git clone https://github.com/satanfire/dsh-mcp-panel.git
cd dsh-mcp-panel
dsh plugin --profile web add "$PWD"
```

或以依赖形式固定到某个提交：

```json
"@satanfire/dsh-mcp-panel": "https://codeload.github.com/satanfire/dsh-mcp-panel/tar.gz/<commit-sha>"
```

装完重启 `dsh web`（宿主半侧必须重启才生效），刷新页面后打开 **设置 → MCP**。

## 说明

- 面板是**只读**的：它不负责启用/停用 MCP 服务。运行中切换 MCP 条目的启用状态会触发热重载，在某些版本上会卡住宿主；本插件刻意不提供该操作，避免误触。
- 工具类型、参数结构等原始数据来自宿主 `tools` 服务的 schemas；面板不做任何缓存，点“刷新”读最新状态。

## 许可

[MIT](LICENSE)
