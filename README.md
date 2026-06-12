# obsidian_to_ai

Obsidian AI Bridge 是一组本地桥接插件，用于把 Obsidian 当前 Markdown 上下文发送到网页 AI，并把网页 AI 回复回传到 Obsidian。

项目包含两个插件：

1. **Obsidian 插件**：读取当前选中文字或当前 Markdown 文件全文，提供右侧对话输入框、本地 HTTP server、AI 回复显示、写回和 Accept replacement。
2. **网页端油猴脚本**：运行在 ChatGPT、DeepSeek、Kimi 等网页 AI 页面，自动接收 Obsidian 任务、填入输入框、发送、抓取回复并回传。

## 安装 Obsidian 插件

将仓库中的 `obsidian-ai-bridge` 文件夹复制到你的 vault：

```text
你的Vault/.obsidian/plugins/obsidian-ai-bridge/
```

最终应包含：

```text
你的Vault/.obsidian/plugins/obsidian-ai-bridge/manifest.json
你的Vault/.obsidian/plugins/obsidian-ai-bridge/main.js
你的Vault/.obsidian/plugins/obsidian-ai-bridge/styles.css
```

然后在 Obsidian 的 Community plugins 中启用 `Obsidian AI Bridge`。

## 安装网页端油猴脚本

用 Tampermonkey 或 ScriptCat 打开并安装：

```text
https://raw.githubusercontent.com/Kaergo/obsidian_to_ai/main/web-userscript/obsidian-ai-bridge.user.js
```

## 使用

1. 打开 Obsidian，并启用插件。
2. 打开 ChatGPT、DeepSeek 或 Kimi 页面。
3. 在 Obsidian 中打开一篇 Markdown 笔记。
4. 可选：选中一段文字。
5. 在 AI Bridge 面板输入指令，或点击快捷 prompt。
6. 插件会优先发送选中文字；没有选区时发送当前 Markdown 文件全文。
7. 网页 AI 回复会显示在 Obsidian 面板中。
8. 使用 `Accept replace context` 可以把 AI 回复替换原选区或全文。全文替换前会自动备份。

## 本地接口

Obsidian 插件默认监听：

```text
http://127.0.0.1:23129/obsidian-ai
```

调试地址：

```text
http://127.0.0.1:23129/obsidian-ai/status
http://127.0.0.1:23129/obsidian-ai/debug
```

## 更新检查

Obsidian 插件读取：

```text
https://raw.githubusercontent.com/Kaergo/obsidian_to_ai/main/releases/latest.json
```

油猴脚本内置：

```text
@updateURL   https://raw.githubusercontent.com/Kaergo/obsidian_to_ai/main/web-userscript/obsidian-ai-bridge.user.js
@downloadURL https://raw.githubusercontent.com/Kaergo/obsidian_to_ai/main/web-userscript/obsidian-ai-bridge.user.js
```

## 当前版本

- Obsidian 插件：0.1.1
- 网页端油猴脚本：0.1.2

## 限制

- 仅支持 Obsidian 桌面版。
- 不接 Zotero。
- 不上传真实 `.md` 文件，而是读取 Markdown 文本后作为 prompt 发送。
- 网页 AI 的 DOM 可能变化，如不能自动发送或抓取，需要继续适配。
