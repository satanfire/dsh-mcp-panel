window.__ModuleLoader__.load({
  id: '@satanfire/dsh-mcp-panel',
  factory(require) {
    const React = require('react');
    const h = React.createElement;
    const LIST_ROUTE = '/api/dsh-mcp-panel/list';
    const NS = 'dsh-mcp-panel';
    const COPY = {
      en: {
        nav: 'MCP', title: 'MCP servers',
        subtitle: 'Read-only view of the configured MCP servers, their tools, and each tool\u2019s token footprint.',
        refresh: 'Refresh', loading: 'Loading MCP state', failed: 'Could not read MCP state',
        empty: 'No MCP server is configured. Add a dsh-mcp-client row to cordis.patch.yml.',
        servers: 'Servers', tools: 'Tools', noTools: 'No tool exposed',
        toolCount: '{count} tools', target: 'Target',
        disabled: 'Disabled', headers: 'Headers',
        redacted: 'Credentials', redactedNote: 'Value hidden',
        active: 'Active', pending: 'Pending', loadingState: 'Loading', failedState: 'Failed',
        unloading: 'Unloading', toolsOnly: 'Tools only', unattributed: 'Unattributed',
        parameters: '{count} parameters', noParameters: 'No parameters',
        deferLoading: 'Deferred', none: 'None',
        truncated: 'The tool list was truncated.',
        hiddenHint: 'These tools are connected. The mcp-lazy-tools policy hides them from the model until an agent unlocks them.',
        expand: 'Show tools', collapse: 'Hide tools',
        tokens: '{count} tok', tokensLabel: 'Tool schema tokens',
        tokenHint: 'Token counts are a fixed estimate of each tool schema (about 4 characters per token), the same heuristic the DSH token meter uses.',
        unknown: 'Unknown',
      },
      zh: {
        nav: 'MCP', title: 'MCP 服务',
        subtitle: '只读查看已配置的 MCP 服务、它们的工具，以及每个工具的结构占用。',
        refresh: '刷新', loading: '正在读取 MCP 状态', failed: '无法读取 MCP 状态',
        empty: '没有配置 MCP 服务。请在 cordis.patch.yml 中添加 dsh-mcp-client 行。',
        servers: '服务', tools: '工具', noTools: '没有工具',
        toolCount: '{count} 个工具', target: '连接目标',
        disabled: '已禁用', headers: '请求头',
        redacted: '凭据', redactedNote: '已隐藏取值',
        active: '已激活', pending: '等待中', loadingState: '加载中', failedState: '失败',
        unloading: '卸载中', toolsOnly: '仅有工具', unattributed: '未归属',
        parameters: '{count} 个参数', noParameters: '无参数',
        deferLoading: '延迟加载', none: '无',
        truncated: '工具列表已被截断。',
        hiddenHint: '这些工具已连接。mcp-lazy-tools 策略会在 agent 解锁前对模型隐藏它们。',
        expand: '展开工具', collapse: '收起工具',
        tokens: '{count} tok', tokensLabel: '工具结构占用',
        tokenHint: 'Token 为按工具结构估算的固定值（约 4 字符 = 1 token），与 DSH token-meter 同一口径。',
        unknown: '未知',
      },
    };
    const CSS = `
      .dsh-mcp-page { box-sizing:border-box; max-width:100%; min-width:0; padding:20px 24px;
        color:var(--dsw-alias-label-primary); font-size:13px; }
      .dsh-mcp-page * { box-sizing:border-box; }
      .dsh-mcp-head { display:flex; align-items:flex-start; justify-content:space-between; gap:16px; }
      .dsh-mcp-page h2 { font-size:17px; line-height:24px; margin:0 0 6px; font-weight:600; }
      .dsh-mcp-sub { color:var(--dsw-alias-label-secondary); margin:0 0 18px; line-height:19px; }
      .dsh-mcp-totals { display:flex; gap:20px; padding:12px 0 4px; }
      .dsh-mcp-total b { display:block; font-size:19px; font-weight:600; line-height:26px; }
      .dsh-mcp-total span { color:var(--dsw-alias-label-secondary); }
      .dsh-mcp-actions button { border:1px solid var(--dsw-alias-border-l2); background:var(--dsw-alias-bg-layer-1);
        color:var(--dsw-alias-label-primary); border-radius:4px; min-height:32px; padding:6px 12px;
        cursor:pointer; font:inherit; }
      .dsh-mcp-actions button:hover:not(:disabled) { background:var(--dsw-alias-bg-layer-2); }
      .dsh-mcp-actions button:focus-visible { outline:2px solid var(--dsw-alias-brand-primary); outline-offset:2px; }
      .dsh-mcp-actions button:disabled { opacity:.55; cursor:not-allowed; }
      .dsh-mcp-card { border:1px solid var(--dsw-alias-border-l1); border-radius:6px;
        background:var(--dsw-alias-bg-layer-1); margin:12px 0; min-width:0; }
      .dsh-mcp-card-head { display:flex; align-items:center; gap:10px; padding:12px 14px;
        border-bottom:1px solid var(--dsw-alias-border-l1); min-width:0; }
      .dsh-mcp-card-head strong { font-size:14px; overflow-wrap:anywhere; }
      .dsh-mcp-card-head .dsh-mcp-spacer { flex:1; }
      .dsh-mcp-badge { border:1px solid var(--dsw-alias-border-l2); border-radius:999px;
        padding:1px 8px; font-size:11px; color:var(--dsw-alias-label-secondary); white-space:nowrap; }
      .dsh-mcp-badge[data-phase="active"] { color:var(--dsw-alias-state-success-primary); }
      .dsh-mcp-badge[data-phase="failed"] { color:var(--dsw-alias-state-error-primary); }
      .dsh-mcp-toggle { border:none; background:none; color:var(--dsw-alias-label-secondary);
        cursor:pointer; font:inherit; padding:2px 4px; }
      .dsh-mcp-toggle:hover { color:var(--dsw-alias-label-primary); }
      .dsh-mcp-tokens { color:var(--dsw-alias-label-secondary); font-size:11px; white-space:nowrap; }
      .dsh-mcp-tool-head { display:flex; align-items:center; gap:8px; flex-wrap:wrap; min-width:0; }
      .dsh-mcp-facts { display:flex; flex-wrap:wrap; gap:8px 24px; padding:10px 14px; min-width:0; }
      .dsh-mcp-fact { min-width:0; max-width:100%; }
      .dsh-mcp-fact span { display:block; color:var(--dsw-alias-label-secondary); font-size:11px; }
      .dsh-mcp-fact code { font-family:var(--ds-font-family-code); overflow-wrap:anywhere; }
      .dsh-mcp-tool { border-top:1px solid var(--dsw-alias-border-l1); padding:10px 14px; min-width:0; }
      .dsh-mcp-tool-name { font-family:var(--ds-font-family-code); overflow-wrap:anywhere; }
      .dsh-mcp-tool p { margin:4px 0 0; color:var(--dsw-alias-label-secondary); line-height:18px; }
      .dsh-mcp-muted { color:var(--dsw-alias-label-secondary); padding:8px 0; }
      .dsh-mcp-error { color:var(--dsw-alias-state-error-primary); padding:8px 0; }
      .dsh-mcp-hint { color:var(--dsw-alias-label-secondary); border-left:2px solid var(--dsw-alias-border-l2);
        padding:2px 0 2px 10px; margin:12px 0 0; line-height:18px; }
      @media (max-width:480px) { .dsh-mcp-page { padding:16px; } .dsh-mcp-facts { gap:8px 14px; } }
    `;

    function badge(text, phase) {
      return h('span', { className: 'dsh-mcp-badge', 'data-phase': phase ?? 'none' }, text);
    }

    function fact(label, value) {
      return h('div', { className: 'dsh-mcp-fact' },
        h('span', null, label),
        h('code', null, value));
    }

    function targetText(target) {
      if (target === null || target === undefined) return null;
      if (typeof target.url === 'string') return target.url;
      const command = target.command === null ? '' : String(target.command);
      const args = Array.isArray(target.args) ? target.args.join(' ') : '';
      return `${command}${args === '' ? '' : ` ${args}`}`.trim();
    }

    function parameterText(tool, t) {
      const parameters = tool.parameters;
      const properties = parameters !== null && typeof parameters === 'object' && !Array.isArray(parameters)
        ? parameters.properties
        : null;
      if (properties === null || typeof properties !== 'object' || Array.isArray(properties)) return t('noParameters');
      const count = Object.keys(properties).length;
      return count === 0 ? t('noParameters') : t('parameters', { count });
    }

    function phaseLabel(phase, t) {
      if (phase === 'active') return t('active');
      if (phase === 'pending') return t('pending');
      if (phase === 'loading') return t('loadingState');
      if (phase === 'failed') return t('failedState');
      if (phase === 'unloading') return t('unloading');
      if (phase === 'tools-only') return t('toolsOnly');
      return t('unknown');
    }

    const toolTokens = (tool) => (typeof tool?.tokens === 'number' ? tool.tokens : 0);

    function ServerCard({ server, t, expanded, onToggle }) {
      const target = targetText(server.target);
      const tools = Array.isArray(server.tools) ? server.tools : [];
      const tokens = typeof server.tokens === 'number' ? server.tokens : tools.reduce((sum, tool) => sum + toolTokens(tool), 0);
      const head = [];
      head.push(h('strong', { key: 'name' }, server.serverName ?? (server.phase === 'tools-only' ? t('unattributed') : server.id)));
      if (server.transport !== null) head.push(badge(server.transport, null));
      head.push(badge(phaseLabel(server.phase, t), server.phase));
      if (server.disabled) head.push(badge(t('disabled'), 'failed'));
      head.push(h('span', { key: 'spacer', className: 'dsh-mcp-spacer' }));
      head.push(h('span', { key: 'tokens', className: 'dsh-mcp-tokens', title: t('tokenHint') },
        t('tokens', { count: tokens })));
      head.push(h('span', { key: 'count', className: 'dsh-mcp-badge' }, tools.length === 0 ? t('noTools') : t('toolCount', { count: tools.length })));
      if (tools.length > 0) {
        head.push(h('button', {
          key: 'toggle', type: 'button', className: 'dsh-mcp-toggle',
          onClick: onToggle, 'aria-expanded': expanded === true,
        }, expanded === true ? t('collapse') : t('expand')));
      }
      // Status and transport already sit in the card head; repeat only the
      // connection facts that the head cannot show.
      const facts = [];
      if (target !== null && target !== '') facts.push(fact(t('target'), target));
      if (Array.isArray(server.target?.headerNames) && server.target.headerNames.length > 0) {
        facts.push(fact(t('headers'), server.target.headerNames.join(', ')));
      }
      if (server.target?.redacted === true) facts.push(fact(t('redacted'), t('redactedNote')));
      const body = facts.length === 0 ? [] : [h('div', { key: 'facts', className: 'dsh-mcp-facts' }, facts)];
      if (expanded === true) {
        for (const tool of tools) {
          body.push(h('div', { key: tool.name, className: 'dsh-mcp-tool' },
            h('div', { className: 'dsh-mcp-tool-head' },
              h('span', { className: 'dsh-mcp-tool-name' }, tool.name),
              h('span', { className: 'dsh-mcp-tokens', title: t('tokenHint') },
                t('tokens', { count: toolTokens(tool) })),
              tool.deferLoading === true ? badge(t('deferLoading'), null) : null),
            h('p', null, tool.description === '' ? t('none') : tool.description),
            h('p', null, parameterText(tool, t))));
        }
      }
      return h('div', { className: 'dsh-mcp-card' },
        h('div', { className: 'dsh-mcp-card-head' }, head),
        body);
    }

    function McpPanel({ t }) {
      const [state, setState] = React.useState({ loading: true, error: '', data: null });
      const [expanded, setExpanded] = React.useState({});
      const epoch = React.useRef(0);

      const load = React.useCallback(() => {
        epoch.current += 1;
        const current = epoch.current;
        setState((previous) => ({ loading: true, error: '', data: previous.data }));
        fetch(LIST_ROUTE.slice(1), { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' })
          .then((response) => {
            if (response.ok !== true) throw new Error(`HTTP ${response.status}`);
            return response.json();
          })
          .then((data) => {
            if (current !== epoch.current) return;
            setState({ loading: false, error: '', data });
          })
          .catch(() => {
            if (current !== epoch.current) return;
            setState({ loading: false, error: t('failed'), data: null });
          });
      }, [t]);

      React.useEffect(load, [load]);

      const servers = Array.isArray(state.data?.servers) ? state.data.servers : [];
      const toolCount = typeof state.data?.toolCount === 'number' ? state.data.toolCount : 0;
      const tokenTotal = typeof state.data?.toolTokens === 'number' ? state.data.toolTokens : 0;
      const nodes = [
        h('div', { key: 'head', className: 'dsh-mcp-head' },
          h('div', null,
            h('h2', null, t('title')),
            h('p', { className: 'dsh-mcp-sub' }, t('subtitle'))),
          h('div', { className: 'dsh-mcp-actions' },
            h('button', { type: 'button', onClick: load, disabled: state.loading === true }, t('refresh')))),
        h('div', { key: 'totals', className: 'dsh-mcp-totals' },
          h('div', { className: 'dsh-mcp-total' }, h('b', null, String(servers.length)), h('span', null, t('servers'))),
          h('div', { className: 'dsh-mcp-total' }, h('b', null, String(toolCount)), h('span', null, t('tools'))),
          h('div', { className: 'dsh-mcp-total' }, h('b', null, String(tokenTotal)), h('span', null, t('tokensLabel')))),
      ];
      if (state.loading === true && state.data === null) nodes.push(h('p', { key: 'loading', className: 'dsh-mcp-muted' }, t('loading')));
      if (state.error !== '') nodes.push(h('p', { key: 'error', className: 'dsh-mcp-error', role: 'alert' }, state.error));
      if (state.data !== null && servers.length === 0) nodes.push(h('p', { key: 'empty', className: 'dsh-mcp-muted' }, t('empty')));
      for (const server of servers) {
        nodes.push(h(ServerCard, {
          key: server.id ?? server.serverName,
          server,
          t,
          expanded: expanded[server.id ?? server.serverName] === true,
          onToggle: () => setExpanded((previous) => ({
            ...previous,
            [server.id ?? server.serverName]: previous[server.id ?? server.serverName] !== true,
          })),
        }));
      }
      if (state.data?.truncated === true) nodes.push(h('p', { key: 'truncated', className: 'dsh-mcp-muted' }, t('truncated')));
      // Only claim the tools are hidden when the lazy-tools policy is mounted.
      if (state.data?.lazyTools === true && toolCount > 0) nodes.push(h('p', { key: 'hint', className: 'dsh-mcp-hint' }, t('hiddenHint')));
      if (state.data !== null) nodes.push(h('p', { key: 'token-hint', className: 'dsh-mcp-hint' }, t('tokenHint')));
      return h('div', { className: 'dsh-mcp-page' }, nodes);
    }

    return {
      inject: ['slots', 'locale'],
      apply(ctx) {
        ctx.effect(() => {
          const offEn = ctx.locale.register(NS, 'en', COPY.en);
          const offZh = ctx.locale.register(NS, 'zh', COPY.zh);
          return () => { offZh(); offEn(); };
        }, 'dsh-mcp-panel: dictionaries');
        ctx.effect(() => {
          const style = document.createElement('style');
          style.textContent = CSS;
          document.head.appendChild(style);
          return () => { style.remove(); };
        }, 'dsh-mcp-panel: styles');
        ctx.slots.inject('settings.section', () => ctx.slots.register({
          name: 'settings.section', id: 'mcp-panel', order: 82,
          label: () => ctx.locale.bind(NS)('nav'),
          locale: NS,
        }, McpPanel));
      },
    };
  },
});
