/**
 * 禅道面板 Client 半边。
 *
 * 注册两块 UI：左侧栏的「禅道」入口图标，以及该入口选中后在主区域渲染的面板页面。
 * 数据全部走同源只读接口 `/zentao-panel/api/*`，由 Host 半边带 token 访问禅道。
 */
window.__ModuleLoader__.load({
  id: '@qq304379685/dsh-zentao-panel',
  factory(require) {
    const React = require('react')
    const h = React.createElement
    const { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } = React

    /** 本插件的 locale 命名空间。 */
    const NS = 'zentao-panel'
    /** 面板在左侧栏里的行 ID，同时也是主区域 key。 */
    const PANEL_ID = 'zentao'
    /** 左侧栏行顺序：插件 0 / 定时 10 / 看板 20 / 技能中心 30。 */
    const PANEL_ORDER = 50

    /** 中文字典。 */
    const zh = {
      'entry.label': '禅道',
      'panel.title': '禅道',
      'panel.refresh': '刷新',
      'settings.open': '设置',
      'settings.title': '禅道登录',
      'settings.hint': '账号密码只保存在本机 profile 数据目录，不会写进插件配置文件。',
      'settings.baseUrl': '禅道地址',
      'settings.account': '账号',
      'settings.password': '密码',
      'settings.passwordPlaceholder': '每次保存都要重新输入密码',
      'settings.save': '保存并登录',
      'settings.saving': '登录中…',
      'settings.logout': '退出登录',
      'settings.saved': '当前登录：{user}',
      'act.resolve': '解决',
      'act.close': '关闭',
      'act.activate': '激活',
      'act.edit': '编辑',
      'act.delete': '删除',
      'act.start': '开始',
      'act.finish': '完成',
      'act.change': '变更',
      'act.create': '新建',
      'act.submit': '确认',
      'act.cancel': '取消',
      'act.saving': '提交中…',
      'act.required': '请填写：{field}',
      'act.deleteConfirm': '删除后不可恢复，确认删除 #{id}？',
      'session.toSession': '转为会话',
      'session.title': '转为会话',
      'session.hint': '创建后跳到新会话，这段上下文只放进输入框，确认后自己按回车发送。',
      'session.workspace': '选择工作区',
      'session.prompt': '初始提示词（可修改）',
      'session.create': '创建会话',
      'session.creating': '创建中…',
      'session.newWorkspace': '新建工作区',
      'session.pickDir': '选择目录…',
      'session.missing': '目录不存在',
      'session.empty': '还没有工作区',
      'session.search': '搜索工作区',
      'session.emptyPrompt': '提示词不能为空',
      'session.copied': '当前环境无法新建会话，已把上下文复制到剪贴板。',
      'session.noPicker': '这个环境不支持选择目录',
      'session.createFailed': '创建工作区失败',
      'field.title': '标题',
      'field.name': '名称',
      'field.comment': '备注',
      'field.steps': '重现步骤',
      'field.closedReason': '关闭原因',
      'field.reviewer': '评审人',
      'field.resolvedBuild': '解决版本',
      'field.currentConsumed': '本次消耗',
      'field.openedBuild': '影响版本',
      'field.deadlineShort': '截止日期',
      'bugtype.codeerror': '代码错误',
      'bugtype.config': '配置相关',
      'bugtype.install': '安装部署',
      'bugtype.security': '安全相关',
      'bugtype.performance': '性能问题',
      'bugtype.standard': '标准规范',
      'bugtype.automation': '测试脚本',
      'bugtype.designdefect': '设计缺陷',
      'bugtype.others': '其他',
      'resolution.fixed': '已修复',
      'resolution.notrepro': '无法重现',
      'resolution.bydesign': '设计如此',
      'resolution.duplicate': '重复缺陷',
      'resolution.external': '外部原因',
      'resolution.postponed': '延期处理',
      'resolution.willnotfix': '不予解决',
      'resolution.tostory': '转为需求',
      'closedReason.done': '已完成',
      'closedReason.subdivided': '已拆分',
      'closedReason.duplicate': '重复',
      'closedReason.postponed': '延期',
      'closedReason.willnotdo': '不做',
      'closedReason.cancel': '已取消',
      'closedReason.bydesign': '设计如此',
      'panel.loading': '加载中…',
      'panel.empty': '暂无数据',
      'panel.error': '加载失败',
      'panel.retry': '重试',
      'panel.summary': '{user} · {p} 个产品 · {e} 个迭代',
      'field.unassigned': '未指派',
      'filter.all': '全部',
      'filter.any': '不限',
      'filter.sort': '排序',
      'filter.keyword': '搜索编号 / 标题 / 处理人',
      'filter.overdue': '只看逾期',
      'filter.clear': '清除筛选',
      'filter.none': '未指派',
      'sort.id': '编号 ↓',
      'sort.pri': '优先级',
      'sort.severity': '严重度',
      'sort.deadline': '截止日',
      'sort.progress': '进度',
      'sort.estimate': '预估工时',
      'severity.1': '1 致命',
      'severity.2': '2 严重',
      'severity.3': '3 一般',
      'severity.4': '4 提示',
      'pri.1': 'P1 紧急',
      'pri.2': 'P2 高',
      'pri.3': 'P3 中',
      'pri.4': 'P4 低',
      'tab.bugs': '缺陷',
      'tab.mine': '我的待办',
      'tab.tasks': '任务',
      'tab.stories': '需求',
      'bugs.product': '产品',
      'bugs.product.all': '全部产品',
      'bugs.status': '状态',
      'bugs.status.unclosed': '未关闭',
      'bugs.status.all': '全部',
      'bugs.status.mine': '指派给我',
      'bugs.total': '共 {n} 条',
      'bugs.detail': '缺陷详情',
      'bugs.steps': '重现步骤',
      'bugs.pager.prev': '上一页',
      'bugs.pager.next': '下一页',
      'bugs.pager.info': '第 {page} / {total} 页',
      'mine.title': '我的待办',
      'mine.bugs': '指派给我的缺陷',
      'mine.tasks': '指派给我的任务',
      'mine.account': '当前账号',
      'tasks.execution': '迭代',
      'tasks.subtasks': '子任务',
      'tasks.main': '主任务',
      'tasks.parent': '所属父任务',
      'tasks.subCount': '子任务 {n} · 完成 {d}',
      'tasks.belongsTo': '↳ 父任务 #{id}',
      'tasks.collapseAll': '全部折叠',
      'tasks.expandAll': '全部展开',
      'tasks.progress': '进度',
      'stories.product': '产品',
      'field.severity': '严重程度',
      'field.pri': '优先级',
      'field.assignee': '处理人',
      'field.status': '状态',
      'field.assignedTo': '指派给',
      'field.openedBy': '创建者',
      'field.openedDate': '创建时间',
      'field.product': '产品',
      'field.deadline': '截止',
      'field.estimate': '预计',
      'field.consumed': '消耗',
      'field.left': '剩余',
      'field.progress': '进度',
      'field.type': '类型',
      'field.execution': '执行',
      'field.project': '项目',
      'field.story': '关联需求',
      'field.stage': '阶段',
      'field.resolution': '解决方案',
      'field.resolvedBy': '解决者',
      'field.resolvedDate': '解决时间',
      'field.desc': '描述',
      'field.spec': '需求描述',
      'field.verify': '验收标准',
      'field.estStarted': '预计开始',
      'field.realStarted': '实际开始',
      'field.finishedDate': '完成时间',
      'field.overdue': '已逾期',
      'field.today': '今天到期',
      'detail.task': '任务详情',
      'detail.story': '需求详情',
      'detail.history': '动态',
      'detail.noHistory': '暂无动态记录',
      'detail.attachments': '附件',
      'search.placeholder': '搜索缺陷 / 任务 / 需求',
      'search.hint': '输入关键词后回车（编号、标题、处理人都能搜）',
      'search.searching': '搜索中…',
      'search.empty': '没有匹配的结果',
      'search.bugs': '缺陷',
      'search.tasks': '任务',
      'search.stories': '需求',
      'search.shortcut': 'Ctrl+K',
      'batch.selected': '已选 {n} 条',
      'batch.assign': '批量指派',
      'batch.close': '批量关闭',
      'batch.delete': '批量删除',
      'batch.clear': '取消选择',
      'batch.title': '批量操作 {n} 条',
      'batch.running': '处理中…',
      'batch.result': '成功 {ok} 条，失败 {n} 条',
      'batch.selectAll': '全选本页',
      'detail.commentOnly': '禅道 OpenAPI 不支持单独发表评论，评论随「解决/关闭/开始/完成/变更」的说明一起提交。',
      'unit.hour': '小时',
    }

    /** 英文字典（保持与中文同键，便于界面切换）。 */
    const en = {
      'entry.label': 'ZenTao',
      'panel.title': 'ZenTao',
      'panel.refresh': 'Refresh',
      'settings.open': 'Settings',
      'settings.title': 'ZenTao sign-in',
      'settings.hint': 'Credentials are stored in your local profile data, not in the plugin config.',
      'settings.baseUrl': 'Base URL',
      'settings.account': 'Account',
      'settings.password': 'Password',
      'settings.passwordPlaceholder': 'Re-enter the password on each save',
      'settings.save': 'Save & sign in',
      'settings.saving': 'Signing in…',
      'settings.logout': 'Sign out',
      'settings.saved': 'Signed in as {user}',
      'act.resolve': 'Resolve',
      'act.close': 'Close',
      'act.activate': 'Activate',
      'act.edit': 'Edit',
      'act.delete': 'Delete',
      'act.start': 'Start',
      'act.finish': 'Finish',
      'act.change': 'Change',
      'act.create': 'New',
      'act.submit': 'Confirm',
      'act.cancel': 'Cancel',
      'act.saving': 'Saving…',
      'act.required': 'Required: {field}',
      'act.deleteConfirm': 'This cannot be undone. Delete #{id}?',
      'session.toSession': 'To session',
      'session.title': 'Send to a session',
      'session.hint': 'Opens a new session with this context in the composer; nothing is sent until you press Enter.',
      'session.workspace': 'Workspace',
      'session.prompt': 'Initial prompt (editable)',
      'session.create': 'Create session',
      'session.creating': 'Creating…',
      'session.newWorkspace': 'New workspace',
      'session.pickDir': 'Choose folder…',
      'session.missing': 'Folder missing',
      'session.empty': 'No workspaces yet',
      'session.search': 'Search workspaces',
      'session.emptyPrompt': 'The prompt must not be empty',
      'session.copied': 'Session creation is unavailable here; the context was copied to your clipboard.',
      'session.noPicker': 'Choosing a folder is not supported here',
      'session.createFailed': 'Could not create the workspace',
      'field.title': 'Title',
      'field.name': 'Name',
      'field.comment': 'Comment',
      'field.steps': 'Steps',
      'field.closedReason': 'Close reason',
      'field.reviewer': 'Reviewer',
      'field.resolvedBuild': 'Resolved build',
      'field.currentConsumed': 'Consumed now',
      'field.openedBuild': 'Opened build',
      'field.deadlineShort': 'Deadline',
      'bugtype.codeerror': 'Code error',
      'bugtype.config': 'Configuration',
      'bugtype.install': 'Installation',
      'bugtype.security': 'Security',
      'bugtype.performance': 'Performance',
      'bugtype.standard': 'Standard',
      'bugtype.automation': 'Test script',
      'bugtype.designdefect': 'Design defect',
      'bugtype.others': 'Other',
      'resolution.fixed': 'Fixed',
      'resolution.notrepro': 'Cannot reproduce',
      'resolution.bydesign': 'By design',
      'resolution.duplicate': 'Duplicate',
      'resolution.external': 'External',
      'resolution.postponed': 'Postponed',
      'resolution.willnotfix': "Won't fix",
      'resolution.tostory': 'To story',
      'closedReason.done': 'Done',
      'closedReason.subdivided': 'Subdivided',
      'closedReason.duplicate': 'Duplicate',
      'closedReason.postponed': 'Postponed',
      'closedReason.willnotdo': "Won't do",
      'closedReason.cancel': 'Cancelled',
      'closedReason.bydesign': 'By design',
      'panel.loading': 'Loading…',
      'panel.empty': 'Nothing here',
      'panel.error': 'Failed to load',
      'panel.retry': 'Retry',
      'panel.summary': '{user} · {p} products · {e} iterations',
      'field.unassigned': 'Unassigned',
      'filter.all': 'All',
      'filter.any': 'Any',
      'filter.sort': 'Sort',
      'filter.keyword': 'Search id / title / owner',
      'filter.overdue': 'Overdue only',
      'filter.clear': 'Clear',
      'filter.none': 'Unassigned',
      'sort.id': 'ID ↓',
      'sort.pri': 'Priority',
      'sort.severity': 'Severity',
      'sort.deadline': 'Due date',
      'sort.progress': 'Progress',
      'sort.estimate': 'Estimate',
      'severity.1': '1 Fatal',
      'severity.2': '2 Major',
      'severity.3': '3 Normal',
      'severity.4': '4 Minor',
      'pri.1': 'P1 Urgent',
      'pri.2': 'P2 High',
      'pri.3': 'P3 Medium',
      'pri.4': 'P4 Low',
      'tab.bugs': 'Bugs',
      'tab.mine': 'My work',
      'tab.tasks': 'Tasks',
      'tab.stories': 'Stories',
      'bugs.product': 'Product',
      'bugs.product.all': 'All products',
      'bugs.status': 'Status',
      'bugs.status.unclosed': 'Open',
      'bugs.status.all': 'All',
      'bugs.status.mine': 'Assigned to me',
      'bugs.total': '{n} items',
      'bugs.detail': 'Bug detail',
      'bugs.steps': 'Steps',
      'bugs.pager.prev': 'Prev',
      'bugs.pager.next': 'Next',
      'bugs.pager.info': 'Page {page} / {total}',
      'mine.title': 'My to-do',
      'mine.bugs': 'Bugs assigned to me',
      'mine.tasks': 'Tasks assigned to me',
      'mine.account': 'Account',
      'tasks.execution': 'Iteration',
      'tasks.subtasks': 'Subtasks',
      'tasks.main': 'Main task',
      'tasks.parent': 'Parent task',
      'tasks.subCount': 'Subtasks {n} · {d} done',
      'tasks.belongsTo': '↳ Parent #{id}',
      'tasks.collapseAll': 'Collapse all',
      'tasks.expandAll': 'Expand all',
      'tasks.progress': 'Progress',
      'stories.product': 'Product',
      'field.severity': 'Severity',
      'field.pri': 'Priority',
      'field.assignee': 'Owner',
      'field.status': 'Status',
      'field.assignedTo': 'Assigned to',
      'field.openedBy': 'Opened by',
      'field.openedDate': 'Opened',
      'field.product': 'Product',
      'field.deadline': 'Deadline',
      'field.estimate': 'Estimate',
      'field.consumed': 'Consumed',
      'field.left': 'Left',
      'field.progress': 'Progress',
      'field.type': 'Type',
      'field.execution': 'Execution',
      'field.project': 'Project',
      'field.story': 'Story',
      'field.stage': 'Stage',
      'field.resolution': 'Resolution',
      'field.resolvedBy': 'Resolved by',
      'field.resolvedDate': 'Resolved on',
      'field.desc': 'Description',
      'field.spec': 'Specification',
      'field.verify': 'Acceptance',
      'field.estStarted': 'Planned start',
      'field.realStarted': 'Started',
      'field.finishedDate': 'Finished',
      'field.overdue': 'Overdue',
      'field.today': 'Due today',
      'detail.task': 'Task detail',
      'detail.story': 'Story detail',
      'detail.history': 'Activity',
      'detail.noHistory': 'No activity yet',
      'detail.attachments': 'Files',
      'search.placeholder': 'Search bugs / tasks / stories',
      'search.hint': 'Type a keyword and press Enter (id, title or owner)',
      'search.searching': 'Searching…',
      'search.empty': 'No matching result',
      'search.bugs': 'Bugs',
      'search.tasks': 'Tasks',
      'search.stories': 'Stories',
      'search.shortcut': 'Ctrl+K',
      'batch.selected': '{n} selected',
      'batch.assign': 'Assign',
      'batch.close': 'Close',
      'batch.delete': 'Delete',
      'batch.clear': 'Clear',
      'batch.title': 'Batch action on {n} items',
      'batch.running': 'Running…',
      'batch.result': '{ok} succeeded, {n} failed',
      'batch.selectAll': 'Select page',
      'detail.commentOnly': 'The Zentao OpenAPI cannot post a standalone comment; comments are submitted with resolve/close/start/finish/change.',
      'unit.hour': 'h',
    }

    /** 主题取色：全部走宿主的设计变量，深浅色自动跟随。 */
    const C = {
      text: 'var(--dsw-alias-label-primary)',
      sub: 'var(--dsw-alias-label-secondary)',
      dim: 'var(--dsw-alias-label-tertiary, var(--dsw-alias-label-secondary))',
      line: 'var(--dsw-alias-border-l2)',
      layer1: 'var(--dsw-alias-bg-layer-1)',
      layer2: 'var(--dsw-alias-bg-layer-2)',
      brand: 'var(--dsw-alias-brand-primary, var(--color-blue-500))',
      danger: 'var(--dsw-alias-state-danger-primary, var(--color-red-500))',
      warn: 'var(--dsw-alias-state-warning-primary, var(--color-amber-500))',
      ok: 'var(--dsw-alias-state-success-primary, var(--color-green-500))',
    }

    /** 面板样式：hover / 选中 / 焦点 / 滚动条。随插件卸载一起移除。 */
    const PANEL_CSS = `
.zt-row{transition:background .12s ease,border-color .12s ease,box-shadow .12s ease}
.zt-row[role="button"]:hover{background:var(--dsw-alias-bg-layer-2,#f6f7f9)!important;box-shadow:0 2px 12px rgba(15,23,42,.07)}
.zt-row[role="button"]:focus-visible{outline:none;box-shadow:0 0 0 2px color-mix(in srgb,var(--dsw-alias-brand-primary,#3b82f6) 40%,transparent)}
.zt-row[data-active="1"]{border-color:color-mix(in srgb,var(--dsw-alias-brand-primary,#3b82f6) 50%,transparent)!important;box-shadow:0 0 0 2px color-mix(in srgb,var(--dsw-alias-brand-primary,#3b82f6) 12%,transparent)}
.zt-row[data-overdue="1"]{background:color-mix(in srgb,#ef4444 5%,var(--dsw-alias-bg-layer-1,#fff))!important}
@keyframes zt-shimmer{0%{background-position:-320px 0}100%{background-position:320px 0}}
.zt-skel{background:linear-gradient(90deg,color-mix(in srgb,var(--dsw-alias-bg-layer-2,#f2f3f5) 100%,transparent) 25%,color-mix(in srgb,var(--dsw-alias-bg-layer-1,#fff) 70%,transparent) 37%,color-mix(in srgb,var(--dsw-alias-bg-layer-2,#f2f3f5) 100%,transparent) 63%);background-size:640px 100%;animation:zt-shimmer 1.2s linear infinite;border-radius:6px}
.zt-tab{font:inherit;font-size:12.5px;line-height:1.6;padding:5px 14px;border-radius:8px;border:none;cursor:pointer;color:var(--dsw-alias-label-secondary,#666);background:transparent;transition:background .12s ease,color .12s ease}
.zt-tab:hover{color:var(--dsw-alias-label-primary,#111);background:color-mix(in srgb,var(--dsw-alias-label-primary,#111) 6%,transparent)}
.zt-tab[data-on="1"]{color:var(--dsw-alias-label-primary,#111);background:var(--dsw-alias-bg-layer-1,#fff);box-shadow:0 1px 3px rgba(15,23,42,.12);font-weight:600}
.zt-scroll{scrollbar-width:thin}
.zt-scroll::-webkit-scrollbar{width:8px;height:8px}
.zt-scroll::-webkit-scrollbar-thumb{background:color-mix(in srgb,var(--dsw-alias-label-tertiary,#999) 35%,transparent);border-radius:4px}
.zt-scroll::-webkit-scrollbar-track{background:transparent}
.zt-chipbtn{font:inherit;border-radius:8px;cursor:pointer;transition:background .12s ease}
.zt-chipbtn:hover{background:color-mix(in srgb,var(--dsw-alias-label-primary,#111) 8%,transparent)}
/* 任务树：主任务 / 子任务 / 独立任务三层视觉 */
.zt-row[data-kind="parent"]{box-shadow:0 1px 2px rgba(15,23,42,.05)}
.zt-row[data-kind="parent"]>span:first-child{background:#2563eb}
.zt-row[data-kind="parent"] .zt-title{font-weight:700}
.zt-row[data-kind="child"]{background:transparent;border-color:transparent}
.zt-row[role="button"][data-kind="child"]:hover{background:var(--dsw-alias-bg-layer-2,#f6f7f9)!important;border-color:var(--dsw-alias-border-l2,#e3e6ea)!important;box-shadow:none}
.zt-row[data-kind="child"] .zt-title{font-size:12.6px;font-weight:500;color:var(--dsw-alias-label-secondary,#475569)}
.zt-kids{position:relative;margin-left:20px;padding-left:14px;border-left:2px solid color-mix(in srgb,var(--dsw-alias-border-l2,#e3e6ea) 80%,transparent);display:flex;flex-direction:column;gap:8px;margin-top:8px}
.zt-kids::before{content:'';position:absolute;left:-2px;top:0;width:2px;height:16px;background:#2563eb;border-radius:2px}
/* —— 清爽卡片视觉层 —— */
.zt-hero{position:relative}
.zt-hero::before{content:'';position:absolute;left:-8px;right:-8px;top:-10px;height:132px;border-radius:18px;pointer-events:none;background:radial-gradient(120% 100% at 0% 0%,color-mix(in srgb,var(--dsw-alias-brand-primary,#3b82f6) 9%,transparent),transparent 70%)}
.zt-row{box-shadow:0 1px 2px rgba(15,23,42,.045)}
.zt-row[role="button"]:hover{transform:translateY(-1px);box-shadow:0 4px 14px -6px rgba(15,23,42,.18)!important}
.zt-row[data-kind="child"]{box-shadow:none}
.zt-row[data-kind="child"][role="button"]:hover{transform:none;box-shadow:inset 0 0 0 1px var(--dsw-alias-border-l2,#e3e6ea)!important}
.zt-row[data-active="1"]{box-shadow:0 0 0 2px color-mix(in srgb,var(--dsw-alias-brand-primary,#3b82f6) 16%,transparent),0 6px 18px -10px rgba(15,23,42,.25)!important}
.zt-tab[data-on="1"]{color:var(--dsw-alias-brand-primary,#3b82f6)}
.zt-filterbar{padding:2px 0 6px}
.zt-drawer{box-shadow:-14px 0 40px -24px rgba(15,23,42,.4)}
.zt-row input[type="checkbox"]{accent-color:var(--dsw-alias-brand-primary,#3b82f6);border-radius:4px}
`

    /**
     * 请求同源接口。
     * @param {string} path - 相对 `/zentao-panel/api` 的路径。
     * @returns {Promise<any>} JSON 响应。
     */
    /**
     * 调本插件的 Host 接口。
     * @param {string} path - 以 / 开头的相对路径。
     * @param {{ method?: string, body?: any }} [options] - 请求选项。
     */
    async function api(path, options) {
      const init = { cache: 'no-store' }
      if (options?.method) init.method = options.method
      if (options?.body !== undefined) {
        init.method = init.method || 'POST'
        init.headers = { 'content-type': 'application/json' }
        init.body = JSON.stringify(options.body)
      }
      const response = await fetch(`/zentao-panel/api${path}`, init)
      const body = await response.json().catch(() => ({}))
      if (!response.ok) {
        const error = new Error(body.error || `HTTP ${response.status}`)
        // 401 表示账号没配或登录失效，界面据此弹登录抽屉。
        error.status = response.status
        throw error
      }
      return body
    }

    /** 填充占位符的简易模板函数。 */
    function fill(text, values) {
      return String(text).replace(/\{(\w+)\}/g, (_match, key) => String(values[key] ?? ''))
    }

    /** 状态徽章配色。 */
    /** 状态色：固定十六进制，避免主题 token 缺省时整片变黑。 */
    const STATUS_HEX = {
      wait: '#2563eb',
      doing: '#d97706',
      done: '#16a34a',
      resolved: '#16a34a',
      closed: '#6b7280',
      cancelled: '#9ca3af',
      active: '#dc2626',
      paused: '#8b5cf6',
    }

    function statusColor(status) {
      if (STATUS_HEX[status]) return STATUS_HEX[status]
      if (status === 'active' || status === 'doing' || status === 'wait') return '#2563eb'
      if (status === 'resolved' || status === 'done') return '#16a34a'
      if (status === 'closed' || status === 'cancelled') return '#6b7280'
      return '#d97706'
    }

    /** 把禅道日期（YYYY-MM-DD 或带时间）转成当天 0 点的毫秒数，非法值返回 0。 */
    function dayMs(value) {
      const text = String(value ?? '').slice(0, 10)
      if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return 0
      const time = Date.parse(`${text}T00:00:00`)
      return Number.isFinite(time) ? time : 0
    }

    /** 截止日期状态：逾期 / 今天到期 / 正常 / 无截止。 */
    function dueInfo(value) {
      const time = dayMs(value)
      if (time === 0) return { level: 'none', color: C.dim }
      const now = new Date()
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
      if (time < today) return { level: 'overdue', color: C.danger }
      if (time === today) return { level: 'today', color: C.warn }
      return { level: 'normal', color: C.sub }
    }

    /** 截止日期徽章：逾期红、今天到期橙，其余灰。 */
    function DueBadge({ value, t }) {
      const due = dueInfo(value)
      if (due.level === 'none') return null
      const prefix = due.level === 'overdue' ? t('field.overdue') : due.level === 'today' ? t('field.today') : t('field.deadline')
      return h(Badge, { color: due.color }, `${prefix} ${String(value).slice(0, 10)}`)
    }

    /** 进度条。 */
    function ProgressBar({ value }) {
      const percent = Math.max(0, Math.min(100, Number(value) || 0))
      return h(
        'div',
        { style: { display: 'flex', alignItems: 'center', gap: 6, flex: 1, minWidth: 80 } },
        h(
          'div',
          { style: { flex: 1, height: 6, borderRadius: 999, background: C.layer2, overflow: 'hidden' } },
          h('div', {
            style: {
              width: `${percent}%`,
              height: '100%',
              borderRadius: 999,
              background: percent >= 100 ? C.ok : `linear-gradient(90deg, ${C.brand}, #60a5fa)`,
              transition: 'width .25s ease',
            },
          }),
        ),
        h(
          'span',
          { style: { fontSize: 11.5, fontWeight: 560, color: percent >= 100 ? C.ok : C.sub, fontVariantNumeric: 'tabular-nums', flex: 'none' } },
          `${percent}%`,
        ),
      )
    }

    /** 一行灰色小字（用 · 连接，自动忽略空值）。 */
    function Meta({ items }) {
      const parts = items.filter((item) => item !== null && item !== undefined && String(item) !== '')
      if (parts.length === 0) return null
      return h(
        'span',
        {
          style: {
            fontSize: 11.5,
            color: C.dim,
            lineHeight: 1.55,
            overflowWrap: 'anywhere',
            display: 'block',
          },
        },
        parts.join(' · '),
      )
    }

    /** 头像底色池：同一个人颜色稳定。 */
    const AVATAR_COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#06b6d4', '#f97316', '#6366f1']

    /** 字符串稳定哈希，用于挑头像颜色。 */
    function hashOf(text) {
      const value = String(text ?? '')
      let hash = 7
      for (let index = 0; index < value.length; index += 1) hash = (hash * 31 + value.charCodeAt(index)) % 99991
      return hash
    }

    /** 处理人头像：姓名末两字 + 配色。 */
    function Avatar({ name, size }) {
      const label = String(name ?? '').trim()
      const color = AVATAR_COLORS[hashOf(label) % AVATAR_COLORS.length]
      const box = size ?? 24
      return h(
        'span',
        {
          style: {
            width: box,
            height: box,
            flex: 'none',
            borderRadius: '50%',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 10.5,
            fontWeight: 600,
            letterSpacing: '-0.03em',
            color,
            background: `color-mix(in srgb, ${color} 15%, transparent)`,
            border: `1px solid color-mix(in srgb, ${color} 32%, transparent)`,
          },
        },
        label ? label.slice(0, 1) : '?',
      )
    }

    /** 处理人：列表行右侧固定列，最显眼的位置。 */
    function Assignee({ name, fallback }) {
      const label = String(name ?? '').trim()
      // 未指派时不画头像圈（避免孤零零一个问号），改成虚线描边的文字胶囊。
      if (!label) {
        return h(
          'span',
          {
            style: {
              display: 'inline-flex',
              alignItems: 'center',
              padding: '1px 9px',
              borderRadius: 999,
              border: `1px dashed ${C.border}`,
              fontSize: 12,
              fontWeight: 500,
              color: C.dim,
              whiteSpace: 'nowrap',
            },
          },
          fallback,
        )
      }
      return h(
        'span',
        { style: { display: 'inline-flex', alignItems: 'center', gap: 6, minWidth: 0 } },
        h(Avatar, { name: label }),
        h(
          'span',
          {
            style: {
              fontSize: 12,
              fontWeight: 560,
              color: label ? C.text : C.dim,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              maxWidth: 84,
            },
          },
          label || fallback,
        ),
      )
    }

    /** 状态胶囊：小圆点 + 文字，带同色浅底。 */
    function StatusPill({ text, color }) {
      return h(
        'span',
        {
          style: {
            display: 'inline-flex',
            alignItems: 'center',
            gap: 5,
            padding: '2px 9px',
            borderRadius: 999,
            fontSize: 11.5,
            fontWeight: 560,
            lineHeight: 1.5,
            whiteSpace: 'nowrap',
            color: color === '#6b7280' || color === '#9ca3af' ? C.sub : '#fff',
            background:
              color === '#6b7280' || color === '#9ca3af'
                ? `color-mix(in srgb, ${color} 16%, transparent)`
                : color,
            boxShadow:
              color === '#6b7280' || color === '#9ca3af'
                ? 'none'
                : `0 1px 2px color-mix(in srgb, ${color} 40%, transparent)`,
          },
        },
        h('span', {
          style: {
            width: 5,
            height: 5,
            borderRadius: '50%',
            background: color === '#6b7280' || color === '#9ca3af' ? color : 'rgba(255,255,255,.9)',
            flex: 'none',
          },
        }),
        text,
      )
    }

    /** 列表行外壳：左侧信息区 + 右侧处理人列。 */
    function Row({ children, right, active, overdue, onClick, selected, mixed = false, onSelect, dim, inset = 0, kind = 'card', accent = false, tone = null }) {
      return h(
        'div',
        {
          role: onClick ? 'button' : undefined,
          tabIndex: onClick ? 0 : undefined,
          onClick,
          onKeyDown:
            onClick === undefined
              ? undefined
              : (event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault()
                    onClick()
                  }
                },
          className: 'zt-row',
          'data-active': active ? '1' : undefined,
          'data-overdue': overdue ? '1' : undefined,
          'data-kind': kind,
          style: {
            position: 'relative',
            display: 'flex',
            alignItems: 'flex-start',
            gap: 14,
            width: inset > 0 ? `calc(100% - ${inset}px)` : '100%',
            marginLeft: inset,
            boxSizing: 'border-box',
            padding: kind === 'child' ? '8px 12px' : '11px 14px',
            borderRadius: kind === 'child' ? 9 : 11,
            // 主任务：品牌色浅底 + 淡描边；子任务：中性浅底、无描边 —— 一眼分两层
            border: `1px solid ${kind === 'child' ? 'transparent' : `color-mix(in srgb, #2563eb 14%, ${C.line})`}`,
            background: kind === 'child' ? 'transparent' : C.layer1,
            boxShadow:
              kind === 'child'
                ? 'none'
                : '0 1px 3px rgba(15,23,42,.05), 0 10px 26px -22px rgba(15,23,42,.45)',
            textAlign: 'left',
            opacity: dim ? 0.62 : 1,
            cursor: onClick ? 'pointer' : 'default',
          },
        },
        overdue || accent || tone
          ? h('span', {
              style: {
                position: 'absolute',
                left: 0,
                top: 10,
                bottom: 10,
                width: 3,
                borderRadius: '0 3px 3px 0',
                background: overdue ? C.danger : tone || C.brand,
              },
            })
          : null,
        onSelect === undefined
          ? null
          : h('input', {
              type: 'checkbox',
              ref: (node) => {
                if (node) node.indeterminate = Boolean(mixed)
              },
              checked: Boolean(selected),
              onClick: (event) => event.stopPropagation(),
              onKeyDown: (event) => event.stopPropagation(),
              onChange: (event) => onSelect(event.target.checked),
              style: { marginTop: 3, flex: 'none', width: 14, height: 14, cursor: 'pointer' },
            }),
        h('span', { style: { display: 'flex', flexDirection: 'column', gap: 6, flex: 1, minWidth: 0 } }, children),
        right === undefined || right === null
          ? null
          : h(
              'span',
              {
                style: {
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-end',
                  gap: 6,
                  flex: 'none',
                  width: 108,
                  paddingTop: 1,
                },
              },
              right,
            ),
      )
    }

    /** 多选状态：Set + 便捷方法。 */
    function useSelection() {
      const [ids, setIds] = useState(() => new Set())
      const has = useCallback((id) => ids.has(id), [ids])
      const toggle = useCallback((id, on) => {
        setIds((prev) => {
          const next = new Set(prev)
          if (on) next.add(id)
          else next.delete(id)
          return next
        })
      }, [])
      const replace = useCallback((list) => setIds(new Set(list)), [])
      const clear = useCallback(() => setIds(new Set()), [])
      const setMany = useCallback((list, on) => {
        setIds((previous) => {
          const next = new Set(previous)
          for (const id of list) {
            if (on) next.add(id)
            else next.delete(id)
          }
          return next
        })
      }, [])
      return { ids, list: [...ids], count: ids.size, has, toggle, replace, clear, setMany }
    }

    /** 批量操作条：选中若干行后出现在列表上方。 */
    function SelectionBar({ count, list, shownIds, t, busy, onAction, onSelectAll, onClear }) {
      if (count === 0) return null
      const allPicked = shownIds.length > 0 && shownIds.every((id) => list.includes(id))
      return h(
        'div',
        {
          style: {
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            flexWrap: 'wrap',
            padding: '8px 10px',
            borderRadius: 10,
            border: `1px solid color-mix(in srgb, ${C.brand} 30%, transparent)`,
            background: `color-mix(in srgb, ${C.brand} 7%, transparent)`,
            flex: 'none',
          },
        },
        h('span', { style: { fontSize: 12.5, fontWeight: 620, color: C.text } }, fill(t('batch.selected'), { n: count })),
        h(Button, { onClick: () => onSelectAll(allPicked ? [] : shownIds) }, t('batch.selectAll')),
        h('span', { style: { flex: 1 } }),
        h(Button, { disabled: busy, onClick: () => onAction('assign') }, t('batch.assign')),
        h(Button, { disabled: busy, onClick: () => onAction('close') }, t('batch.close')),
        h(Button, { disabled: busy, onClick: () => onAction('delete') }, t('batch.delete')),
        h(Button, { onClick: onClear }, t('batch.clear')),
      )
    }

    /** 批量操作弹窗：指派（edit + assignedTo）/ 关闭（comment）/ 删除（二次确认）。 */
    function BatchModal({ kind, action, ids, t, onClose, onDone }) {
      const [values, setValues] = useState({})
      const [busy, setBusy] = useState(false)
      const [error, setError] = useState('')
      const [result, setResult] = useState(null)

      const fields =
        action === 'assign'
          ? [{ key: 'assignedTo', kind: 'owner', label: t('field.assignee'), required: true }]
          : action === 'close'
            ? kind === 'story'
              ? [
                  { key: 'closedReason', kind: 'select', label: t('field.closedReason'), required: true, options: closeReasonOptions(t) },
                  { key: 'comment', kind: 'textarea', label: t('field.comment') },
                ]
              : [{ key: 'comment', kind: 'textarea', label: t('field.comment') }]
            : []

      const submit = async () => {
        for (const field of fields) {
          if (field.required && String(values[field.key] ?? '').trim() === '') {
            setError(fill(t('act.required'), { field: field.label }))
            return
          }
        }
        setBusy(true)
        setError('')
        try {
          const body =
            action === 'delete'
              ? { kind, ids, action: 'delete', fields: {} }
              : { kind, ids, action: action === 'assign' ? 'edit' : action, fields: values }
          const payload = await api('/batch', { method: 'POST', body })
          REFRESH.emit()
          setResult(payload)
          if ((payload?.failed ?? []).length === 0) onDone(payload)
        } catch (caught) {
          setError(caught instanceof Error ? caught.message : String(caught))
        } finally {
          setBusy(false)
        }
      }

      return h(
        Modal,
        { title: fill(t('batch.title'), { n: ids.length }), onClose },
        result === null
          ? h(
              'div',
              { style: { display: 'flex', flexDirection: 'column', gap: 10 } },
              fields.map((field) =>
                h(FormField, {
                  key: field.key,
                  field,
                  value: values[field.key] ?? '',
                  onChange: (value) => setValues((prev) => ({ ...prev, [field.key]: value })),
                  t,
                }),
              ),
              action === 'delete'
                ? h('div', { style: { fontSize: 12, color: C.danger, lineHeight: 1.6 } }, t('act.deleteConfirm').replace('#{id}', ''))
                : null,
              error === '' ? null : h('div', { style: { fontSize: 12, color: C.danger } }, error),
              h(
                'div',
                { style: { display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 } },
                h(Button, { onClick: onClose }, t('act.cancel')),
                h(Button, { disabled: busy, primary: true, onClick: () => void submit() }, busy ? t('batch.running') : t('act.submit')),
              ),
            )
          : h(
              'div',
              { style: { display: 'flex', flexDirection: 'column', gap: 8 } },
              h(
                'div',
                { style: { fontSize: 12.5, color: (result.failed ?? []).length > 0 ? C.danger : C.ok } },
                fill(t('batch.result'), { ok: result.ok ?? 0, n: (result.failed ?? []).length }),
              ),
              (result.failed ?? []).slice(0, 6).map((item) =>
                h('div', { key: `f${item.id}`, style: { fontSize: 11.5, color: C.dim } }, `#${item.id} ${item.error}`),
              ),
              h('div', { style: { display: 'flex', justifyContent: 'flex-end', marginTop: 6 } }, h(Button, { onClick: onClose }, t('panel.close'))),
            ),
      )
    }

    /** 行首编号。 */
    function IdTag({ id }) {
      return h(
        'span',
        { style: { fontSize: 11.5, color: C.dim, flex: 'none', fontVariantNumeric: 'tabular-nums', fontWeight: 500 } },
        `#${id}`,
      )
    }

    /** 行标题。 */
    function Title({ children, size = 14, weight = 600, color = C.text }) {
      return h(
        'span',
        {
          className: 'zt-title',
          style: {
            fontSize: size,
            color,
            fontWeight: weight,
            lineHeight: 1.45,
            letterSpacing: '-0.005em',
            overflow: 'hidden',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflowWrap: 'anywhere',
          },
        },
        children,
      )
    }

    /** 详情抽屉外壳：标题栏 + 可滚动正文。 */
    function DetailShell({ title, subtitle, onClose, children }) {
      return h(
        'div',
        {
          className: 'zt-scroll',
          style: {
            width: 400,
            flex: 'none',
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
            padding: '14px 16px',
            borderRadius: 12,
            border: `1px solid ${C.line}`,
            background: C.layer1,
            overflow: 'auto',
            boxSizing: 'border-box',
          },
        },
        h(
          'div',
          { style: { display: 'flex', alignItems: 'center', gap: 8, flex: 'none' } },
          h(
            'span',
            { style: { display: 'flex', flexDirection: 'column', gap: 1, flex: 1, minWidth: 0 } },
            h('span', { style: { fontSize: 12, color: C.dim, fontWeight: 500 } }, title),
            subtitle ? h('span', { style: { fontSize: 11, color: C.dim } }, subtitle) : null,
          ),
          h(
            'button',
            {
              type: 'button',
              onClick: onClose,
              className: 'zt-chipbtn',
              style: {
                font: 'inherit',
                fontSize: 13,
                width: 26,
                height: 26,
                flex: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: C.sub,
                background: 'transparent',
                border: 'none',
              },
            },
            '✕',
          ),
        ),
        children,
      )
    }

    /** 详情分组：小标题 + 上方细线。 */
    function Section({ title, children }) {
      return h(
        'div',
        { style: { display: 'flex', flexDirection: 'column', gap: 8 } },
        h(
          'span',
          {
            style: {
              fontSize: 11,
              color: C.dim,
              letterSpacing: '0.04em',
              paddingTop: 8,
              borderTop: `1px solid ${C.line}`,
            },
          },
          title,
        ),
        children,
      )
    }

    /** 详情里的长文本块。 */
    function TextBlock({ label, text }) {
      if (text === undefined || text === null || String(text) === '') return null
      return h(
        'div',
        { style: { display: 'flex', flexDirection: 'column', gap: 6 } },
        h('span', { style: { fontSize: 11, color: C.dim, letterSpacing: '0.04em' } }, label),
        h(
          'pre',
          {
            style: {
              margin: 0,
              padding: '10px 12px',
              borderRadius: 9,
              background: C.layer2,
              border: `1px solid ${C.line}`,
              fontSize: 12,
              lineHeight: 1.7,
              color: C.text,
              whiteSpace: 'pre-wrap',
              overflowWrap: 'anywhere',
              fontFamily: 'inherit',
            },
          },
          String(text),
        ),
      )
    }

    /** 小徽章。 */
    function Badge({ children, color }) {
      return h(
        'span',
        {
          style: {
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            padding: '2px 8px',
            borderRadius: 999,
            fontSize: 11.5,
            fontWeight: 550,
            lineHeight: 1.5,
            whiteSpace: 'nowrap',
            fontVariantNumeric: 'tabular-nums',
            color: color || C.sub,
            border: `1px solid ${color ? `color-mix(in srgb, ${color} 35%, transparent)` : C.line}`,
            background: color ? `color-mix(in srgb, ${color} 8%, transparent)` : 'transparent',
          },
        },
        children,
      )
    }

    /** 通用按钮。 */
    function Button({ children, onClick, disabled, primary }) {
      return h(
        'button',
        {
          type: 'button',
          onClick,
          disabled,
          className: 'zt-chipbtn',
          style: {
            font: 'inherit',
            fontSize: 12.5,
            fontWeight: 560,
            lineHeight: 1.6,
            padding: '5px 13px',
            borderRadius: 9,
            cursor: disabled ? 'default' : 'pointer',
            opacity: disabled ? 0.45 : 1,
            color: primary ? 'var(--dsw-alias-label-primary-foreground, #fff)' : C.text,
            background: primary ? C.brand : C.layer1,
            border: primary ? '1px solid transparent' : `1px solid color-mix(in srgb, ${C.line} 80%, transparent)`,
            boxShadow: primary ? `0 2px 8px -2px color-mix(in srgb, ${C.brand} 55%, transparent)` : '0 1px 2px rgba(15,23,42,.04)',
          },
        },
        children,
      )
    }

    /** 下拉选择。 */
    function Select({ value, onChange, options, width }) {
      return h(
        'select',
        {
          value,
          onChange: (event) => onChange(event.target.value),
          style: {
            font: 'inherit',
            fontSize: 12,
            padding: '4px 8px',
            minWidth: width ?? 120,
            maxWidth: 280,
            color: C.text,
            background: C.layer1,
            border: `1px solid ${C.line}`,
            borderRadius: 8,
            outline: 'none',
            cursor: 'pointer',
          },
        },
        options.map((option) => h('option', { key: String(option.value), value: option.value }, option.label)),
      )
    }

    /** 空态 / 加载 / 错误 三态展示。 */
    function State({ kind, message, onRetry, t }) {
      const text =
        kind === 'loading' ? t('panel.loading') : kind === 'error' ? `${t('panel.error')}：${message ?? ''}` : t('panel.empty')
      return h(
        'div',
        {
          style: {
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
            padding: '48px 16px',
            color: C.sub,
            fontSize: 12.5,
          },
        },
        kind === 'loading'
          ? h('span', {
              style: {
                width: 18,
                height: 18,
                borderRadius: '50%',
                border: `2px solid ${C.line}`,
                borderTopColor: C.brand,
              },
            })
          : h(
              'span',
              {
                style: {
                  width: 44,
                  height: 44,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 14,
                  border: `1px dashed color-mix(in srgb, ${C.brand} 35%, ${C.line})`,
                  background: `color-mix(in srgb, ${C.brand} 6%, transparent)`,
                  color: C.brand,
                  fontSize: 20,
                },
              },
              kind === 'error' ? '!' : '∅',
            ),
        h('div', null, text),
        kind === 'error' && onRetry ? h(Button, { onClick: onRetry }, t('panel.retry')) : null,
      )
    }

    /** 列表加载骨架：几条带微光的占位行，避免加载时整块空白。 */
    function SkeletonRows({ count = 5 }) {
      return h(
        'div',
        { style: { display: 'flex', flexDirection: 'column', gap: 8 } },
        Array.from({ length: count }).map((_unused, index) =>
          h(
            'div',
            {
              key: `sk${index}`,
              style: {
                display: 'flex',
                flexDirection: 'column',
                gap: 9,
                padding: '12px 14px',
                borderRadius: 11,
                border: `1px solid ${C.line}`,
                background: C.layer1,
              },
            },
            h('div', { style: { display: 'flex', gap: 8, alignItems: 'center' } },
              h('span', { className: 'zt-skel', style: { width: 34, height: 12 } }),
              h('span', { className: 'zt-skel', style: { flex: 1, height: 13, maxWidth: 380 } }),
            ),
            h('div', { style: { display: 'flex', gap: 6 } },
              h('span', { className: 'zt-skel', style: { width: 62, height: 18, borderRadius: 999 } }),
              h('span', { className: 'zt-skel', style: { width: 48, height: 18, borderRadius: 999 } }),
              h('span', { className: 'zt-skel', style: { width: 40, height: 18, borderRadius: 999 } }),
            ),
            h('span', { className: 'zt-skel', style: { width: '46%', height: 10 } }),
          ),
        ),
      )
    }

    /** 全局搜索框：回车搜索缺陷 / 任务 / 需求，点结果跳到对应页签并打开详情。 */
    function SearchBox({ t, onPick }) {
      const [keyword, setKeyword] = useState('')
      const [state, setState] = useState({ kind: 'idle' })
      const [open, setOpen] = useState(false)
      const inputRef = useRef(null)
      const boxRef = useRef(null)

      // Ctrl+K 聚焦搜索框（面板可见时生效）。
      useEffect(() => {
        const onKey = (event) => {
          if ((event.ctrlKey || event.metaKey) && String(event.key).toLowerCase() === 'k') {
            event.preventDefault()
            inputRef.current?.focus()
          }
        }
        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
      }, [])

      // 点空白处收起结果面板。
      useEffect(() => {
        if (!open) return undefined
        const onDown = (event) => {
          if (boxRef.current && !boxRef.current.contains(event.target)) setOpen(false)
        }
        window.addEventListener('mousedown', onDown)
        return () => window.removeEventListener('mousedown', onDown)
      }, [open])

      const run = useCallback(async () => {
        const needle = keyword.trim()
        if (needle === '') {
          setState({ kind: 'idle' })
          return
        }
        setState({ kind: 'loading' })
        setOpen(true)
        try {
          const body = await api(`/search?keyword=${encodeURIComponent(needle)}&limit=6`)
          setState({ kind: 'ready', ...body })
        } catch (error) {
          setState({ kind: 'error', message: error instanceof Error ? error.message : String(error) })
        }
      }, [keyword])

      const groups = state.kind === 'ready'
        ? [
            { kind: 'bug', label: t('search.bugs'), items: state.bugs ?? [], pick: (item) => item.title, owner: (item) => item.ownerName },
            { kind: 'task', label: t('search.tasks'), items: state.tasks ?? [], pick: (item) => item.name, owner: (item) => item.assignedToName },
            { kind: 'story', label: t('search.stories'), items: state.stories ?? [], pick: (item) => item.title, owner: (item) => item.assignedToName },
          ]
        : []

      return h(
        'span',
        { ref: boxRef, style: { position: 'relative', display: 'inline-flex' } },
        h(
          'span',
          {
            style: {
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              height: 30,
              padding: '0 9px',
              borderRadius: 9,
              border: `1px solid ${C.line}`,
              background: C.layer1,
              width: 232,
            },
          },
          h('span', { style: { fontSize: 12.5, color: C.dim } }, '⌕'),
          h('input', {
            ref: inputRef,
            value: keyword,
            placeholder: t('search.placeholder'),
            onChange: (event) => {
              setKeyword(event.target.value)
              if (event.target.value.trim() === '') {
                setState({ kind: 'idle' })
                setOpen(false)
              }
            },
            onKeyDown: (event) => {
              if (event.key === 'Enter') {
                event.preventDefault()
                void run()
              } else if (event.key === 'Escape') {
                setOpen(false)
              }
            },
            style: { flex: 1, minWidth: 0, font: 'inherit', fontSize: 12.5, border: 'none', outline: 'none', background: 'transparent', color: C.text },
          }),
          keyword.trim() === '' ? h('span', { style: { fontSize: 10.5, color: C.dim, flex: 'none' } }, t('search.shortcut')) : null,
        ),
        open
          ? h(
              'div',
              {
                className: 'zt-scroll',
                style: {
                  position: 'absolute',
                  top: 36,
                  right: 0,
                  width: 460,
                  maxHeight: 420,
                  overflow: 'auto',
                  zIndex: 40,
                  padding: 10,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                  borderRadius: 12,
                  border: `1px solid ${C.line}`,
                  background: C.layer1,
                  boxShadow: '0 12px 32px rgba(15,23,42,.16)',
                },
              },
              state.kind === 'loading'
                ? h('span', { style: { fontSize: 12, color: C.dim, padding: '8px 4px' } }, t('search.searching'))
                : state.kind === 'error'
                  ? h('span', { style: { fontSize: 12, color: C.danger, padding: '8px 4px' } }, `${t('panel.error')}：${state.message}`)
                  : state.kind === 'ready' && groups.every((group) => group.items.length === 0)
                    ? h('span', { style: { fontSize: 12, color: C.dim, padding: '8px 4px' } }, t('search.empty'))
                    : state.kind === 'ready'
                      ? groups
                          .filter((group) => group.items.length > 0)
                          .map((group) =>
                            h(
                              'div',
                              { key: group.kind, style: { display: 'flex', flexDirection: 'column', gap: 2 } },
                              h('span', { style: { fontSize: 11, color: C.dim, letterSpacing: '0.04em', padding: '2px 4px' } }, group.label),
                              group.items.map((item) =>
                                h(
                                  'button',
                                  {
                                    key: `${group.kind}${item.id}`,
                                    type: 'button',
                                    className: 'zt-row',
                                    onClick: () => {
                                      setOpen(false)
                                      onPick({ kind: group.kind, id: item.id })
                                    },
                                    style: {
                                      font: 'inherit',
                                      textAlign: 'left',
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: 8,
                                      padding: '6px 8px',
                                      borderRadius: 8,
                                      border: 'none',
                                      background: 'transparent',
                                      color: C.text,
                                      cursor: 'pointer',
                                    },
                                  },
                                  h(IdTag, { id: item.id }),
                                  h('span', { style: { flex: 1, minWidth: 0, fontSize: 12.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, String(group.pick(item) ?? '')),
                                  h('span', { style: { fontSize: 11, color: C.dim, flex: 'none' } }, String(group.owner(item) ?? '')),
                                ),
                              ),
                            ),
                          )
                      : h('span', { style: { fontSize: 12, color: C.dim, padding: '8px 4px' } }, t('search.hint')),
            )
          : null,
      )
    }

    /** 一行键值。 */
    function Field({ label, children }) {
      return h(
        'div',
        { style: { display: 'grid', gridTemplateColumns: '76px minmax(0, 1fr)', gap: 10, fontSize: 12.5, lineHeight: 1.65 } },
        h('span', { style: { color: C.dim } }, label),
        h('span', { style: { color: C.text, overflowWrap: 'anywhere' } }, children),
      )
    }

    /** 动态里单个动作的配色：完成类绿、关闭/删除灰、其余品牌色。 */
    function actionTone(code) {
      if (code === 'resolved' || code === 'finished' || code === 'confirmed') return C.ok
      if (code === 'closed' || code === 'deleted') return C.sub
      if (code === 'activated' || code === 'started' || code === 'resumed') return C.warn
      return C.brand
    }

    /** 动态时间线的一条：左侧圆点与竖线，右侧动作、人、时间、备注、附件。 */
    function TimelineRow({ item, last, t }) {
      const tone = actionTone(item.code)
      const files = Array.isArray(item.files) ? item.files : []
      const children = [
        h(
          'span',
          { key: 'head', style: { display: 'flex', alignItems: 'baseline', gap: 6, flexWrap: 'wrap' } },
          h('span', { style: { fontSize: 12, fontWeight: 600, color: C.text } }, item.text || item.code || '—'),
          item.actorName ? h('span', { style: { fontSize: 11.5, color: C.sub } }, item.actorName) : null,
          h('span', { style: { fontSize: 11, color: C.dim, marginLeft: 'auto' } }, item.date || ''),
        ),
      ]
      if (item.comment) {
        children.push(
          h(
            'span',
            {
              key: 'comment',
              style: {
                fontSize: 12,
                lineHeight: 1.65,
                color: C.sub,
                whiteSpace: 'pre-wrap',
                overflowWrap: 'anywhere',
                padding: '6px 9px',
                borderRadius: 8,
                background: C.layer2,
                border: `1px solid ${C.line}`,
              },
            },
            item.comment,
          ),
        )
      }
      if (files.length > 0) {
        children.push(
          h(
            'span',
            { key: 'files', style: { display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', fontSize: 11.5, color: C.dim } },
            h('span', null, t('detail.attachments')),
            files.map((file) =>
              h(
                'span',
                {
                  key: file.id,
                  title: file.title,
                  style: {
                    padding: '1px 7px',
                    borderRadius: 6,
                    background: C.layer2,
                    border: `1px solid ${C.line}`,
                    color: C.sub,
                    maxWidth: 170,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  },
                },
                file.title || `#${file.id}`,
              ),
            ),
          ),
        )
      }
      return h(
        'div',
        { style: { display: 'grid', gridTemplateColumns: '12px minmax(0, 1fr)', gap: 10 } },
        h(
          'span',
          { style: { display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 5 } },
          h('span', { style: { width: 7, height: 7, borderRadius: 99, background: tone, flex: 'none' } }),
          last ? null : h('span', { style: { flex: 1, width: 1, background: C.line, marginTop: 3 } }),
        ),
        h(
          'div',
          { style: { display: 'flex', flexDirection: 'column', gap: 5, paddingBottom: last ? 0 : 12, minWidth: 0 } },
          children,
        ),
      )
    }

    /** 详情里的历史动态（禅道详情接口返回的 actions）。 */
    function Timeline({ actions, t }) {
      const list = Array.isArray(actions) ? actions : []
      if (list.length === 0) {
        return h(
          Section,
          { title: t('detail.history') },
          h('span', { style: { fontSize: 12, color: C.dim } }, t('detail.noHistory')),
        )
      }
      return h(
        Section,
        { title: t('detail.history') },
        h(
          'div',
          { style: { display: 'flex', flexDirection: 'column', gap: 0 } },
          list.map((item, index) =>
            h(TimelineRow, { key: item.id === undefined ? `a${index}` : `a${item.id}`, item, last: index === list.length - 1, t }),
          ),
        ),
      )
    }

    // ---- 写操作（解决 / 关闭 / 激活 / 编辑 / 删除 / 新建） ----

    /**
     * 写操作成功后广播刷新：动作按钮在详情抽屉里，层级较深，用事件通知各页签重新拉数据。
     */
    // 客户端 uiWorkspace 服务句柄：apply 时取一次；取不到时「转为会话」降级为复制到剪贴板。
    let UI_WORKSPACE = null

    const REFRESH = {
      listeners: new Set(),
      on(fn) {
        this.listeners.add(fn)
        return () => this.listeners.delete(fn)
      },
      emit() {
        for (const fn of [...this.listeners]) fn()
      },
    }

    /** bootstrap 带下来的用户 / 产品 / 迭代列表（下拉选项用，由面板渲染时写入）。 */
    let USER_LIST = []
    let PRODUCT_LIST = []
    let EXECUTION_LIST = []

    const toOptions = (pairs) => pairs.map((pair) => ({ value: pair[0], label: pair[1] }))

    const severityOptions = (t) =>
      toOptions([['1', t('severity.1')], ['2', t('severity.2')], ['3', t('severity.3')], ['4', t('severity.4')]])

    const priOptions = (t) => toOptions([['1', t('pri.1')], ['2', t('pri.2')], ['3', t('pri.3')], ['4', t('pri.4')]])

    const resolutionOptions = (t) =>
      toOptions([
        ['fixed', t('resolution.fixed')],
        ['notrepro', t('resolution.notrepro')],
        ['bydesign', t('resolution.bydesign')],
        ['duplicate', t('resolution.duplicate')],
        ['external', t('resolution.external')],
        ['postponed', t('resolution.postponed')],
        ['willnotfix', t('resolution.willnotfix')],
        ['tostory', t('resolution.tostory')],
      ])

    const closeReasonOptions = (t) =>
      toOptions([
        ['done', t('closedReason.done')],
        ['subdivided', t('closedReason.subdivided')],
        ['duplicate', t('closedReason.duplicate')],
        ['postponed', t('closedReason.postponed')],
        ['willnotdo', t('closedReason.willnotdo')],
        ['cancel', t('closedReason.cancel')],
        ['bydesign', t('closedReason.bydesign')],
      ])

    const bugTypeOptions = (t) =>
      toOptions([
        ['codeerror', t('bugtype.codeerror')],
        ['config', t('bugtype.config')],
        ['install', t('bugtype.install')],
        ['security', t('bugtype.security')],
        ['performance', t('bugtype.performance')],
        ['standard', t('bugtype.standard')],
        ['automation', t('bugtype.automation')],
        ['designdefect', t('bugtype.designdefect')],
        ['others', t('bugtype.others')],
      ])

    const assignToOptions = (t) =>
      toOptions([['', t('filter.none')]].concat(USER_LIST.map((user) => [user.account, user.realname || user.account])))

    /**
     * 每种对象在每个状态下可用哪些动作，以及每个动作要填哪些字段。
     * @param {string} kind - bug | task | story。
     * @param {any} item - 当前对象（用来按状态决定动作、按现值预填）。
     */
    function actionsFor(kind, item, t) {
      const comment = { key: 'comment', kind: 'textarea', label: t('field.comment') }
      const owner = { key: 'assignedTo', kind: 'owner', label: t('field.assignedTo') }
      const remove = { id: 'delete', label: t('act.delete'), danger: true, fields: [] }

      if (kind === 'bug') {
        const list = []
        if (item.status !== 'resolved' && item.status !== 'closed') {
          list.push({
            id: 'resolve',
            label: t('act.resolve'),
            fields: [
              { key: 'resolution', kind: 'select', label: t('field.resolution'), options: resolutionOptions(t), required: true },
              { key: 'resolvedBuild', kind: 'text', label: t('field.resolvedBuild') },
              owner,
              comment,
            ],
          })
        }
        list.push({ id: 'close', label: t('act.close'), fields: [comment] })
        if (item.status === 'resolved' || item.status === 'closed') {
          list.push({ id: 'activate', label: t('act.activate'), fields: [owner, comment] })
        }
        list.push({
          id: 'edit',
          label: t('act.edit'),
          fields: [
            { key: 'title', kind: 'text', label: t('field.title'), value: item.title },
            { key: 'severity', kind: 'select', label: t('field.severity'), options: severityOptions(t), value: String(item.severity ?? ''), required: true },
            { key: 'pri', kind: 'select', label: t('field.pri'), options: priOptions(t), value: String(item.pri ?? ''), required: true },
            { key: 'type', kind: 'select', label: t('field.type'), options: bugTypeOptions(t), value: item.type || '', required: true },
            { key: 'steps', kind: 'textarea', label: t('field.steps') },
          ],
        })
        list.push(remove)
        return list
      }

      if (kind === 'task') {
        const list = []
        if (item.status === 'wait') {
          list.push({
            id: 'start',
            label: t('act.start'),
            fields: [
              { key: 'realStarted', kind: 'date', label: t('field.realStarted'), value: today() },
              { key: 'left', kind: 'number', label: t('field.left'), value: String(item.left ?? item.estimate ?? 0) },
              { key: 'consumed', kind: 'number', label: t('field.currentConsumed'), value: '0' },
              comment,
            ],
          })
        }
        if (item.status === 'wait' || item.status === 'doing') {
          list.push({
            id: 'finish',
            label: t('act.finish'),
            fields: [
              { key: 'finishedDate', kind: 'date', label: t('field.finishedDate'), value: today(), required: true },
              // 禅道返回的是「2026-11-25 00:00:00」，日期控件只认 YYYY-MM-DD，不截断会显示空白并卡住必填校验。
              { key: 'realStarted', kind: 'date', label: t('field.realStarted'), value: String(item.realStarted || today()).slice(0, 10), required: true },
              {
                key: 'currentConsumed',
                kind: 'number',
                label: t('field.currentConsumed'),
                // 禅道要求「总计消耗」大于 0 才能完成：默认取「已耗 + 剩余」，没有就退回预估工时，再退回 1。
                value: String(
                  (Number(item.consumed ?? 0) || 0) + (Number(item.left ?? 0) || 0) ||
                    (Number(item.estimate ?? 0) || 0) ||
                    1,
                ),
                required: true,
              },
              comment,
            ],
          })
        }
        list.push({ id: 'close', label: t('act.close'), fields: [comment] })
        if (item.status === 'done' || item.status === 'closed' || item.status === 'pause') {
          list.push({
            id: 'activate',
            label: t('act.activate'),
            fields: [{ key: 'left', kind: 'number', label: t('field.left'), value: String(item.left ?? 0) }, owner, comment],
          })
        }
        list.push({
          id: 'edit',
          label: t('act.edit'),
          fields: [
            { key: 'name', kind: 'text', label: t('field.name'), value: item.name, required: true },
            owner,
            { key: 'pri', kind: 'select', label: t('field.pri'), options: priOptions(t), value: String(item.pri ?? '') },
            { key: 'estimate', kind: 'number', label: t('field.estimate'), value: String(item.estimate ?? 0) },
            { key: 'deadline', kind: 'date', label: t('field.deadlineShort'), value: item.deadline || '' },
            { key: 'desc', kind: 'textarea', label: t('field.desc') },
          ],
        })
        list.push(remove)
        return list
      }

      const list = []
      if (item.status === 'closed') {
        list.push({ id: 'activate', label: t('act.activate'), fields: [owner, comment] })
      }
      list.push({
        id: 'edit',
        label: t('act.edit'),
        fields: [
          { key: 'title', kind: 'text', label: t('field.title'), value: item.title, required: true },
          { key: 'pri', kind: 'select', label: t('field.pri'), options: priOptions(t), value: String(item.pri ?? '') },
          { key: 'estimate', kind: 'number', label: t('field.estimate'), value: String(item.estimate ?? 0) },
          owner,
        ],
      })
      list.push({
        id: 'change',
        label: t('act.change'),
        fields: [
          { key: 'title', kind: 'text', label: t('field.title'), value: item.title, required: true },
          { key: 'reviewer', kind: 'owner', label: t('field.reviewer'), required: true },
          { key: 'spec', kind: 'textarea', label: t('field.spec') },
          { key: 'verify', kind: 'textarea', label: t('field.verify') },
        ],
      })
      list.push({
        id: 'close',
        label: t('act.close'),
        fields: [
          { key: 'closedReason', kind: 'select', label: t('field.closedReason'), options: closeReasonOptions(t), required: true },
          comment,
        ],
      })
      list.push(remove)
      return list
    }

    /** 今天的 yyyy-mm-dd（日期输入框默认值）。 */
    function today() {
      const now = new Date()
      const pad = (value) => String(value).padStart(2, '0')
      return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
    }

    /** 通用模态框（动作表单 / 新建表单 / 删除确认共用）。 */
    function Modal({ title, onClose, children, footer }) {
      useEffect(() => {
        const onKeyDown = (event) => {
          if (event.key === 'Escape') onClose()
        }
        document.addEventListener('keydown', onKeyDown)
        return () => document.removeEventListener('keydown', onKeyDown)
      }, [onClose])
      return h(
        'div',
        {
          style: {
            position: 'fixed',
            inset: 0,
            zIndex: 40,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
            background: 'rgba(15,20,30,0.34)',
          },
          onClick: onClose,
        },
        h(
          'div',
          {
            onClick: (event) => event.stopPropagation(),
            style: {
              width: 460,
              maxWidth: '100%',
              maxHeight: '82vh',
              overflow: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
              padding: '16px 18px',
              borderRadius: 14,
              background: C.layer1,
              border: `1px solid ${C.line}`,
              boxShadow: '0 20px 48px rgba(15,23,42,0.22)',
            },
          },
          h(
            'div',
            { style: { display: 'flex', alignItems: 'center', gap: 10 } },
            h('span', { style: { flex: 1, fontSize: 14.5, fontWeight: 660, color: C.text } }, title),
            h(
              'button',
              {
                type: 'button',
                onClick: onClose,
                style: { border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 15, lineHeight: 1, color: C.dim },
              },
              '✕',
            ),
          ),
          children,
          footer ? h('div', { style: { display: 'flex', gap: 8, justifyContent: 'flex-end' } }, footer) : null,
        ),
      )
    }

    /** 表单里的一行（标签 + 控件）。 */
    function FormField({ field, value, onChange, t }) {
      const options = field.kind === 'owner' ? assignToOptions(t) : field.options
      const list = field.required ? options : [{ value: '', label: t('filter.any') }].concat(options ?? [])
      return h(
        'div',
        {
          style: {
            display: 'grid',
            gridTemplateColumns: '76px minmax(0, 1fr)',
            gap: 10,
            alignItems: 'center',
            fontSize: 12.5,
          },
        },
        h('span', { style: { color: C.dim } }, field.label),
        field.kind === 'textarea'
          ? h('textarea', {
              value: value ?? '',
              rows: 4,
              onChange: (event) => onChange(event.target.value),
              style: {
                width: '100%',
                boxSizing: 'border-box',
                font: 'inherit',
                fontSize: 12.5,
                lineHeight: 1.6,
                padding: '7px 10px',
                borderRadius: 9,
                border: `1px solid ${C.line}`,
                background: C.layer2,
                color: C.text,
                outline: 'none',
                resize: 'vertical',
              },
            })
          : field.kind === 'select' || field.kind === 'owner'
            ? h(Select, { value: value ?? '', onChange, options: list, width: 170 })
            : h(TextInput, {
                value: value ?? '',
                onChange,
                type: field.kind === 'number' ? 'number' : field.kind === 'date' ? 'date' : 'text',
              }),
      )
    }

    /** 详情抽屉底部的操作栏：按状态给出按钮，点开填表提交。 */
    function ActionBar({ kind, item, t, onDone }) {
      const [open, setOpen] = useState(null)
      const [values, setValues] = useState({})
      const [busy, setBusy] = useState(false)
      const [error, setError] = useState('')
      const [confirming, setConfirming] = useState(false)
      const [toSession, setToSession] = useState(false)

      const actions = actionsFor(kind, item, t)

      const start = (action) => {
        if (action.id === 'delete') {
          setConfirming(true)
          return
        }
        const initial = {}
        for (const field of action.fields) {
          if (field.value !== undefined) initial[field.key] = field.value
        }
        setValues(initial)
        setError('')
        setOpen(action)
      }

      const submit = async () => {
        setBusy(true)
        setError('')
        try {
          const missing = (open?.fields ?? []).find((field) => field.required && !String(values[field.key] ?? '').trim())
          if (missing) throw new Error(fill(t('act.required'), { field: missing.label }))
          await api('/action', { method: 'POST', body: { kind, id: item.id, action: open.id, fields: values } })
          setOpen(null)
          REFRESH.emit()
          onDone?.({ removed: false })
        } catch (problem) {
          setError(problem instanceof Error ? problem.message : String(problem))
        } finally {
          setBusy(false)
        }
      }

      const remove = async () => {
        setBusy(true)
        setError('')
        try {
          await api('/delete', { method: 'POST', body: { kind, id: item.id } })
          setConfirming(false)
          REFRESH.emit()
          onDone?.({ removed: true })
        } catch (problem) {
          setError(problem instanceof Error ? problem.message : String(problem))
        } finally {
          setBusy(false)
        }
      }

      return h(
        'div',
        { style: { display: 'flex', flexDirection: 'column', gap: 8, paddingTop: 10, borderTop: `1px solid ${C.line}` } },
        h(
          'div',
          { style: { display: 'flex', flexWrap: 'wrap', gap: 6 } },
          [h(Button, { key: 'to-session', onClick: () => setToSession(true) }, t('session.toSession'))].concat(
            actions.map((action) =>
              h(
                Button,
                {
                  key: action.id,
                  onClick: () => start(action),
                },
                action.label,
              ),
            ),
          ),
        ),
        error && open === null && confirming === false
          ? h('div', { style: { fontSize: 12, color: C.danger } }, error)
          : null,
        open
          ? h(
              Modal,
              {
                title: open.label,
                onClose: () => setOpen(null),
                footer: [
                  h(Button, { key: 'cancel', onClick: () => setOpen(null) }, t('act.cancel')),
                  h(Button, { key: 'ok', onClick: () => void submit(), primary: true, disabled: busy }, busy ? t('act.saving') : t('act.submit')),
                ],
              },
              h(
                'div',
                { style: { display: 'flex', flexDirection: 'column', gap: 9 } },
                open.fields.map((field) =>
                  h(FormField, {
                    key: field.key,
                    field,
                    value: values[field.key],
                    onChange: (next) => setValues((previous) => ({ ...previous, [field.key]: next })),
                    t,
                  }),
                ),
              ),
              error ? h('div', { style: { fontSize: 12, color: C.danger } }, error) : null,
            )
          : null,
        confirming
          ? h(
              Modal,
              {
                title: t('act.delete'),
                onClose: () => setConfirming(false),
                footer: [
                  h(Button, { key: 'cancel', onClick: () => setConfirming(false) }, t('act.cancel')),
                  h(Button, { key: 'ok', onClick: () => void remove(), primary: true, disabled: busy }, busy ? t('act.saving') : t('act.submit')),
                ],
              },
              h('div', { style: { fontSize: 13, lineHeight: 1.6, color: C.text } }, fill(t('act.deleteConfirm'), { id: item.id })),
              error ? h('div', { style: { fontSize: 12, color: C.danger } }, error) : null,
            )
          : null,
        toSession ? h(SessionModal, { kind, item, t, onClose: () => setToSession(false) }) : null,
      )
    }

    /** 把禅道对象整理成一段可以直接丢进会话的上下文。 */
    function sessionPrompt(kind, item, baseUrl) {
      const line = (label, value) => {
        const text = value === undefined || value === null ? '' : String(value).trim()
        return text === '' ? null : '- ' + label + '：' + text
      }
      const heading = (text) => '# ' + text
      const section = (title, body) => {
        const text = body === undefined || body === null ? '' : String(body).trim()
        return text === '' ? [] : ['', '## ' + title, text]
      }
      const rows = []
      let title = ''

      if (kind === 'bug') {
        title = '禅道缺陷 #' + item.id + ' ' + String(item.title ?? '')
        rows.push(
          line('状态', item.statusText),
          line('类型', item.typeText),
          line('严重程度', item.severityText),
          line('优先级', item.priText),
          line('产品', item.productName),
          line('执行', item.executionName),
          line('处理人', item.assignedToName),
          line('创建者', item.openedByName),
          line('创建时间', item.openedDate),
          line('截止', item.deadline),
        )
      } else if (kind === 'task') {
        title = '禅道任务 #' + item.id + ' ' + String(item.name ?? '')
        rows.push(
          line('迭代', item.executionName),
          line('负责人', item.assignedToName),
          line('状态', item.statusText),
          line('优先级', item.priText),
          line('进度', (item.progress ?? 0) + '%'),
          line('预计 / 已耗 / 剩余', (item.estimate ?? 0) + ' / ' + (item.consumed ?? 0) + ' / ' + (item.left ?? 0) + ' 小时'),
          line('预计开始', item.estStarted),
          line('实际开始', item.realStarted),
          line('截止', item.deadline),
          line('完成时间', item.finishedDate),
        )
      } else {
        title = '禅道需求 #' + item.id + ' ' + String(item.title ?? '')
        rows.push(
          line('产品', item.productName),
          line('状态', item.statusText),
          line('阶段', item.stageText),
          line('优先级', item.priText),
          line('预估工时', item.estimate === undefined ? '' : item.estimate + ' 小时'),
          line('处理人', item.assignedToName),
          line('创建者', item.openedByName),
          line('创建时间', item.openedDate),
        )
      }

      const parts = [heading(title), '', rows.filter(Boolean).join('\n')]

      if (kind === 'bug') {
        parts.push(...section('重现步骤', item.steps))
        parts.push(...section('关联需求', item.storyTitle))
        parts.push(...section('解决方案', item.resolutionText))
      } else if (kind === 'task') {
        parts.push(...section('描述', item.desc))
        const story = [item.storyTitle, item.storySpec].filter((entry) => entry !== undefined && String(entry).trim() !== '')
        parts.push(...section('关联需求' + (item.storyID ? ' #' + item.storyID : ''), story.join('\n\n')))
        parts.push(...section('验收标准', item.storyVerify))
        const children = Array.isArray(item.children) ? item.children : []
        if (children.length > 0) {
          const list = children.map((child) => '- #' + child.id + ' ' + child.name + '（' + (child.statusText ?? '') + '）').join('\n')
          parts.push(...section('子任务', list))
        }
      } else {
        parts.push(...section('需求描述', item.spec))
        parts.push(...section('验收标准', item.verify))
      }

      if (baseUrl !== '') {
        const object = kind === 'bug' ? 'bug' : kind === 'task' ? 'task' : 'story'
        parts.push('', '来源：' + baseUrl + '/' + object + '-view-' + item.id + '.html')
      }

      return parts.join('\n').replace(/\n{3,}/g, '\n\n').trim() + '\n'
    }

    /** 复制到剪贴板（新建会话不可用时的兜底）。 */
    async function copyText(text) {
      try {
        await navigator.clipboard.writeText(text)
        return true
      } catch {
        return false
      }
    }

    /** 「转为会话」弹窗：选工作区 + 编辑初始提示词，只预填不发送。 */
    function SessionModal({ kind, item, t, onClose }) {
      const [workspaces, setWorkspaces] = useState([])
      const [phase, setPhase] = useState('loading')
      const [query, setQuery] = useState('')
      const [selected, setSelected] = useState('')
      const [prompt, setPrompt] = useState(() => sessionPrompt(kind, item, ''))
      const [busy, setBusy] = useState(false)
      const [error, setError] = useState('')
      const [hint, setHint] = useState('')

      useEffect(() => {
        let alive = true
        void (async () => {
          try {
            const [config, listed] = await Promise.all([
              api('/config').catch(() => ({ baseUrl: '' })),
              api('/workspaces').catch(() => ({ workspaces: [] })),
            ])
            if (!alive) return
            const root = String(config?.baseUrl ?? '').replace(/\/api\.php\/v2\/?$/, '')
            setPrompt(sessionPrompt(kind, item, root))
            const items = Array.isArray(listed?.workspaces) ? listed.workspaces : []
            setWorkspaces(items)
            const remembered = items.find((entry) => entry.id === VIEW.sessionWorkspace && entry.missing !== true)
            const pick = remembered ?? items.find((entry) => entry.missing !== true) ?? items[0]
            setSelected(pick ? pick.id : '')
            setPhase('ready')
          } catch (problem) {
            if (!alive) return
            setPhase('error')
            setError(problem instanceof Error ? problem.message : String(problem))
          }
        })()
        return () => {
          alive = false
        }
      }, [])

      const needle = query.trim().toLowerCase()
      const shown = needle === ''
        ? workspaces
        : workspaces.filter((entry) => (entry.title + ' ' + entry.path).toLowerCase().indexOf(needle) >= 0)

      const pickDirectory = async () => {
        setError('')
        setHint('')
        try {
          if (UI_WORKSPACE === null || typeof UI_WORKSPACE.pickDirectory !== 'function') throw new Error(t('session.noPicker'))
          const path = await UI_WORKSPACE.pickDirectory()
          if (path === null || path === undefined || path === '') return
          const created = await api('/workspaces', { method: 'POST', body: { path } })
          const entry = created?.workspace
          if (!entry || !entry.id) throw new Error(t('session.createFailed'))
          setWorkspaces((previous) => [entry].concat(previous.filter((old) => old.id !== entry.id)))
          setSelected(entry.id)
        } catch (problem) {
          setError(problem instanceof Error ? problem.message : String(problem))
        }
      }

      const create = () => {
        setError('')
        setHint('')
        const text = prompt.trim()
        if (text === '') {
          setError(t('session.emptyPrompt'))
          return
        }
        setBusy(true)
        try {
          if (UI_WORKSPACE === null || typeof UI_WORKSPACE.startSession !== 'function') throw new Error('ui-workspace-unavailable')
          if (selected !== '') VIEW.sessionWorkspace = selected
          UI_WORKSPACE.startSession(selected === '' ? undefined : selected, { prompt: text, whenDraftExists: 'append' })
          onClose()
        } catch (problem) {
          void copyText(text)
          setHint(t('session.copied'))
          const message = problem instanceof Error ? problem.message : String(problem)
          setError(message === 'ui-workspace-unavailable' ? '' : message)
        } finally {
          setBusy(false)
        }
      }

      const body = h(
        'div',
        { style: { display: 'flex', flexDirection: 'column', gap: 12 } },
        h('div', { style: { fontSize: 12, lineHeight: 1.6, color: C.dim } }, t('session.hint')),
        h(
          'div',
          { style: { display: 'flex', flexDirection: 'column', gap: 6 } },
          h('div', { style: { fontSize: 12, fontWeight: 600, color: C.sub } }, t('session.workspace')),
          workspaces.length > 5
            ? h(SearchInput, { value: query, onChange: setQuery, placeholder: t('session.search') })
            : null,
          h(
            'div',
            {
              className: 'zt-scroll',
              style: {
                display: 'flex',
                flexDirection: 'column',
                gap: 4,
                maxHeight: 248,
                overflowY: 'auto',
                padding: 4,
                borderRadius: 10,
                border: '1px solid ' + C.line,
                background: C.layer2,
              },
            },
            phase === 'loading'
              ? h('div', { style: { padding: '10px 8px', fontSize: 12, color: C.dim } }, t('common.loading'))
              : shown.length === 0
                ? h('div', { style: { padding: '10px 8px', fontSize: 12, color: C.dim } }, t('session.empty'))
                : shown.map((entry) =>
                    h(
                      'button',
                      {
                        key: entry.id,
                        type: 'button',
                        onClick: () => {
                          if (entry.missing === true) return
                          setSelected(entry.id)
                        },
                        style: {
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'flex-start',
                          gap: 2,
                          width: '100%',
                          padding: '7px 9px',
                          borderRadius: 8,
                          border: '1px solid ' + (entry.id === selected ? C.brand : 'transparent'),
                          background: entry.id === selected ? 'color-mix(in srgb, ' + C.brand + ' 10%, transparent)' : 'transparent',
                          cursor: entry.missing === true ? 'not-allowed' : 'pointer',
                          opacity: entry.missing === true ? 0.5 : 1,
                          textAlign: 'left',
                          font: 'inherit',
                        },
                      },
                      h(
                        'span',
                        { style: { fontSize: 12.5, fontWeight: 600, color: C.text } },
                        (entry.title === '' ? entry.path : entry.title) + (entry.missing === true ? ' · ' + t('session.missing') : ''),
                      ),
                      h(
                        'span',
                        {
                          style: {
                            fontSize: 11,
                            color: C.dim,
                            fontFamily: 'ui-monospace, SFMono-Regular, Consolas, monospace',
                            maxWidth: '100%',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          },
                        },
                        entry.path,
                      ),
                    ),
                  ),
          ),
          UI_WORKSPACE !== null && typeof UI_WORKSPACE?.pickDirectory === 'function'
            ? h(
                'div',
                { style: { display: 'flex', justifyContent: 'flex-end' } },
                h(Button, { onClick: () => void pickDirectory() }, t('session.newWorkspace')),
              )
            : null,
        ),
        h(
          'div',
          { style: { display: 'flex', flexDirection: 'column', gap: 6 } },
          h('div', { style: { fontSize: 12, fontWeight: 600, color: C.sub } }, t('session.prompt')),
          h('textarea', {
            value: prompt,
            onChange: (event) => setPrompt(event.target.value),
            spellCheck: false,
            style: {
              width: '100%',
              minHeight: 180,
              resize: 'vertical',
              padding: '9px 10px',
              borderRadius: 10,
              border: '1px solid ' + C.line,
              background: C.layer1,
              color: C.text,
              font: '12px/1.6 ui-monospace, SFMono-Regular, Consolas, monospace',
              boxSizing: 'border-box',
            },
          }),
        ),
        hint === '' ? null : h('div', { style: { fontSize: 12, color: C.warn, lineHeight: 1.6 } }, hint),
        error === '' ? null : h('div', { style: { fontSize: 12, color: C.danger, lineHeight: 1.6 } }, error),
      )

      return h(
        Modal,
        {
          title: t('session.title'),
          onClose,
          footer: [
            h(Button, { key: 'cancel', onClick: onClose }, t('act.cancel')),
            h(Button, { key: 'ok', onClick: create, primary: true, disabled: busy }, busy ? t('session.creating') : t('session.create')),
          ],
        },
        body,
      )
    }

    /** 新建按钮：弹窗填必填字段后提交。 */
    function CreateButton({ kind, t, onDone }) {
      const [open, setOpen] = useState(false)
      const [values, setValues] = useState({})
      const [busy, setBusy] = useState(false)
      const [error, setError] = useState('')

      const fields =
        kind === 'bug'
          ? [
              { key: 'productID', kind: 'select', label: t('field.product'), required: true, options: toOptions(PRODUCT_LIST.map((item) => [String(item.id), item.name])) },
              { key: 'title', kind: 'text', label: t('field.title'), required: true },
              { key: 'severity', kind: 'select', label: t('field.severity'), options: severityOptions(t), value: '3', required: true },
              { key: 'pri', kind: 'select', label: t('field.pri'), options: priOptions(t), value: '3', required: true },
              { key: 'type', kind: 'select', label: t('field.type'), options: bugTypeOptions(t), value: 'codeerror', required: true },
              { key: 'steps', kind: 'textarea', label: t('field.steps') },
            ]
          : kind === 'task'
            ? [
                { key: 'executionID', kind: 'select', label: t('field.execution'), required: true, options: toOptions(EXECUTION_LIST.map((item) => [String(item.id), item.name])) },
                { key: 'name', kind: 'text', label: t('field.name'), required: true },
                { key: 'assignedTo', kind: 'owner', label: t('field.assignedTo') },
                { key: 'pri', kind: 'select', label: t('field.pri'), options: priOptions(t), value: '3' },
                { key: 'estimate', kind: 'number', label: t('field.estimate'), value: '0' },
                { key: 'estStarted', kind: 'date', label: t('field.estStarted'), value: today() },
                { key: 'deadline', kind: 'date', label: t('field.deadlineShort') },
                { key: 'desc', kind: 'textarea', label: t('field.desc') },
              ]
            : [
                { key: 'productID', kind: 'select', label: t('field.product'), required: true, options: toOptions(PRODUCT_LIST.map((item) => [String(item.id), item.name])) },
                { key: 'title', kind: 'text', label: t('field.title'), required: true },
                { key: 'pri', kind: 'select', label: t('field.pri'), options: priOptions(t), value: '3' },
                { key: 'estimate', kind: 'number', label: t('field.estimate'), value: '0' },
                { key: 'assignedTo', kind: 'owner', label: t('field.assignedTo') },
                { key: 'spec', kind: 'textarea', label: t('field.spec') },
                { key: 'verify', kind: 'textarea', label: t('field.verify') },
              ]

      const start = () => {
        const initial = {}
        for (const field of fields) {
          if (field.value !== undefined) initial[field.key] = field.value
        }
        setValues(initial)
        setError('')
        setOpen(true)
      }

      const submit = async () => {
        setBusy(true)
        setError('')
        try {
          const missing = fields.find((field) => field.required && !String(values[field.key] ?? '').trim())
          if (missing) throw new Error(fill(t('act.required'), { field: missing.label }))
          const payload = { ...values }
          if (kind === 'bug') payload.openedBuild = ['trunk']
          await api('/create', { method: 'POST', body: { kind, fields: payload } })
          setOpen(false)
          REFRESH.emit()
          onDone?.()
        } catch (problem) {
          setError(problem instanceof Error ? problem.message : String(problem))
        } finally {
          setBusy(false)
        }
      }

      return h(
        'span',
        { style: { display: 'inline-flex' } },
        h(Button, { onClick: start, primary: true }, t('act.create')),
        open
          ? h(
              Modal,
              {
                title: t('act.create'),
                onClose: () => setOpen(false),
                footer: [
                  h(Button, { key: 'cancel', onClick: () => setOpen(false) }, t('act.cancel')),
                  h(Button, { key: 'ok', onClick: () => void submit(), primary: true, disabled: busy }, busy ? t('act.saving') : t('act.submit')),
                ],
              },
              h(
                'div',
                { style: { display: 'flex', flexDirection: 'column', gap: 9 } },
                fields.map((field) =>
                  h(FormField, {
                    key: field.key,
                    field,
                    value: values[field.key],
                    onChange: (next) => setValues((previous) => ({ ...previous, [field.key]: next })),
                    t,
                  }),
                ),
              ),
              error ? h('div', { style: { fontSize: 12, color: C.danger } }, error) : null,
            )
          : null,
      )
    }

    /** 单行文本输入框。 */
    function TextInput({ value, onChange, type, placeholder }) {
      return h('input', {
        type: type || 'text',
        value,
        placeholder,
        onChange: (event) => onChange(event.target.value),
        style: {
          width: '100%',
          boxSizing: 'border-box',
          font: 'inherit',
          fontSize: 12.5,
          padding: '7px 10px',
          borderRadius: 9,
          border: `1px solid ${C.line}`,
          background: C.layer2,
          color: C.text,
          outline: 'none',
        },
      })
    }

    /**
     * 登录设置抽屉：填禅道地址 / 账号 / 密码，保存前 Host 会先真登录一次。
     * @param {{ t: (key: string) => string, onClose: () => void, onSaved: (user: any) => void }} props
     */
    function SettingsDrawer({ t, onClose, onSaved }) {
      const [form, setForm] = useState({ baseUrl: '', account: '', password: '' })
      const [view, setView] = useState({ kind: 'loading' })
      const [busy, setBusy] = useState(false)
      const [error, setError] = useState('')

      useEffect(() => {
        let alive = true
        api('/config')
          .then((body) => {
            if (!alive) return
            setForm({ baseUrl: body.baseUrl || '', account: body.account || '', password: '' })
            setView({ kind: 'ready', ...body })
          })
          .catch((failure) => {
            if (alive) setView({ kind: 'error', message: failure instanceof Error ? failure.message : String(failure) })
          })
        return () => {
          alive = false
        }
      }, [])

      const submit = async () => {
        if (busy) return
        setBusy(true)
        setError('')
        try {
          const body = await api('/config', { method: 'POST', body: form })
          onSaved(body.user)
        } catch (failure) {
          setError(failure instanceof Error ? failure.message : String(failure))
        } finally {
          setBusy(false)
        }
      }

      const logout = async () => {
        if (busy) return
        setBusy(true)
        setError('')
        try {
          await api('/logout', { method: 'POST', body: {} })
          onSaved(null)
        } catch (failure) {
          setError(failure instanceof Error ? failure.message : String(failure))
        } finally {
          setBusy(false)
        }
      }

      const current = view.kind === 'ready' && view.user ? view.user.realname || view.user.account : ''

      return h(
        'div',
        {
          style: {
            position: 'absolute',
            inset: 0,
            zIndex: 30,
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'center',
            paddingTop: 72,
            background: 'rgba(15, 23, 42, 0.26)',
          },
          onClick: (event) => {
            if (event.target === event.currentTarget) onClose()
          },
        },
        h(
          'div',
          {
            style: {
              width: 430,
              maxWidth: '92%',
              borderRadius: 14,
              border: `1px solid ${C.line}`,
              background: C.layer1,
              boxShadow: '0 18px 48px rgba(15, 23, 42, 0.22)',
              padding: '16px 18px',
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
            },
          },
          h(
            'div',
            { style: { display: 'flex', alignItems: 'center', gap: 8 } },
            h('span', { style: { fontSize: 13.5, fontWeight: 660 } }, t('settings.title')),
            h('span', { style: { flex: 1 } }),
            h(
              'button',
              {
                type: 'button',
                onClick: onClose,
                style: {
                  border: 'none',
                  background: 'transparent',
                  color: C.dim,
                  fontSize: 15,
                  lineHeight: 1,
                  cursor: 'pointer',
                  padding: 4,
                },
              },
              '✕',
            ),
          ),
          h('span', { style: { fontSize: 11.5, color: C.dim, lineHeight: 1.6 } }, t('settings.hint')),
          h('label', { style: { display: 'flex', flexDirection: 'column', gap: 5 } }, h('span', { style: { fontSize: 11.5, color: C.dim } }, t('settings.baseUrl')), h(TextInput, { value: form.baseUrl, onChange: (value) => setForm({ ...form, baseUrl: value }), placeholder: 'https://zentao.example.com/zentao/api.php/v2' })),
          h('label', { style: { display: 'flex', flexDirection: 'column', gap: 5 } }, h('span', { style: { fontSize: 11.5, color: C.dim } }, t('settings.account')), h(TextInput, { value: form.account, onChange: (value) => setForm({ ...form, account: value }) })),
          h(
            'label',
            { style: { display: 'flex', flexDirection: 'column', gap: 5 } },
            h('span', { style: { fontSize: 11.5, color: C.dim } }, t('settings.password')),
            h(TextInput, { type: 'password', value: form.password, onChange: (value) => setForm({ ...form, password: value }), placeholder: t('settings.passwordPlaceholder') }),
          ),
          current
            ? h('span', { style: { fontSize: 11.5, color: C.ok } }, fill(t('settings.saved'), { user: current }))
            : null,
          error ? h('span', { style: { fontSize: 11.5, color: C.danger, overflowWrap: 'anywhere' } }, error) : null,
          h(
            'div',
            { style: { display: 'flex', alignItems: 'center', gap: 8, marginTop: 2 } },
            h(Button, { onClick: () => void submit(), disabled: busy, primary: true }, busy ? t('settings.saving') : t('settings.save')),
            h('span', { style: { flex: 1 } }),
            h(Button, { onClick: () => void logout(), disabled: busy }, t('settings.logout')),
          ),
        ),
      )
    }

/** 缺陷列表行。 */
    function BugRow({ bug, t, active, overdue, onOpen, selected, onSelect }) {
      const due = dueInfo(bug.deadline)
      return h(
        Row,
        {
          active,
          overdue: overdue ?? due.level === 'overdue',
          onClick: onOpen,
          selected,
          onSelect,
          tone: statusColor(bug.status),
        },
        h(
          'span',
          { style: { display: 'flex', gap: 8, alignItems: 'center', minWidth: 0, width: '100%' } },
          h(IdTag, { id: bug.id }),
          h('span', { style: { flex: 1, minWidth: 0, display: 'flex' } }, h(Title, null, bug.title)),
        ),
        h(
          'span',
          { style: { display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' } },
          h(Assignee, { name: bug.ownerName ?? bug.assignedToName, fallback: t('field.unassigned') }),
          h(StatusPill, { text: bug.statusText, color: statusColor(bug.status) }),
          bug.typeText ? h(Badge, null, bug.typeText) : null,
          h(Badge, { color: bug.severity <= 2 ? C.danger : C.sub }, bug.severityText),
          h(Badge, { color: bug.pri <= 2 ? C.warn : C.sub }, bug.priText),
          h(DueBadge, { value: bug.deadline, t }),
        ),
        h(Meta, { items: [bug.executionName || bug.productName, bug.openedDate] }),
      )
    }

    /** 缺陷详情。 */
    function BugDetail({ bug, t, onClose, onDone }) {
      return h(
        DetailShell,
        { title: `${t('bugs.detail')} #${bug.id}`, onClose },
        h('div', { style: { fontSize: 14, fontWeight: 650, lineHeight: 1.5, color: C.text } }, bug.title),
        h(
          'div',
          { style: { display: 'flex', flexDirection: 'column', gap: 3 } },
          h(Field, { label: t('field.status') }, bug.statusText),
          h(Field, { label: t('field.type') }, bug.typeText || '—'),
          h(Field, { label: t('field.severity') }, bug.severityText),
          h(Field, { label: t('field.pri') }, bug.priText),
          h(Field, { label: t('field.product') }, bug.productName || '—'),
          h(Field, { label: t('field.execution') }, bug.executionName || '—'),
          h(Field, { label: t('field.story') }, bug.storyTitle || '—'),
          h(Field, { label: t('field.assignedTo') }, bug.assignedToName || '—'),
          h(Field, { label: t('field.deadline') }, bug.deadline || '—'),
          h(Field, { label: t('field.openedBy') }, `${bug.openedByName || '—'}${bug.openedDate ? ` · ${bug.openedDate}` : ''}`),
          bug.resolvedDate
            ? h(
                Field,
                { label: t('field.resolvedBy') },
                `${bug.resolvedByName || '—'} · ${bug.resolvedDate}${bug.resolutionText ? ` · ${bug.resolutionText}` : ''}`,
              )
            : null,
        ),
        h(TextBlock, { label: t('bugs.steps'), text: bug.steps }),
        h(Timeline, { actions: bug.actions, t }),
        h(ActionBar, { kind: 'bug', item: bug, t, onDone }),
      )
    }

    /** 任务列表行。 */
    function TaskRow({ task, t, active, onOpen, selected, onSelect, kind = 'card', collapsed = false, childCount = 0, onToggle = null, summary = null, parentLabel = '', dimmed = false }) {
      const due = dueInfo(task.deadline)
      const finished = task.status === 'done' || task.status === 'closed'
      const percent = Math.max(0, Math.min(100, Number(task.progress) || 0))
      const shownPercent = summary ? summary.progress : percent
      /** 折叠箭头只对父任务渲染；点击不触发行本身的打开详情。 */
      const toggle =
        childCount > 0 && onToggle
          ? h(
              'span',
              {
                role: 'button',
                tabIndex: 0,
                'aria-label': t('tasks.subtasks'),
                onClick: (event) => {
                  event.stopPropagation()
                  onToggle()
                },
                onKeyDown: (event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault()
                    event.stopPropagation()
                    onToggle()
                  }
                },
                style: {
                  flex: 'none',
                  width: 14,
                  height: 14,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: C.sub,
                  fontSize: 10,
                  transform: collapsed ? 'rotate(-90deg)' : 'none',
                  transition: 'transform .12s ease',
                },
              },
              '▼',
            )
          : null
      /** 子任务：单行紧凑呈现，与父任务卡片、独立任务卡片形成三级差异。 */
      if (kind === 'child') {
        return h(
          Row,
          {
            active,
            overdue: due.level === 'overdue' && !finished,
            onClick: onOpen,
            selected,
            onSelect,
            dim: dimmed,
            kind,
          },
          h(
            'span',
            { style: { display: 'flex', alignItems: 'center', gap: 9, minWidth: 0, width: '100%' } },
            h(IdTag, { id: task.id }),
            h(
              'span',
              { style: { minWidth: 0, maxWidth: '52%', display: 'flex', overflow: 'hidden' } },
              h(Title, { size: 12.6, weight: 500, color: C.sub }, task.name),
            ),
            h(Assignee, { name: task.assignedToName, fallback: t('field.unassigned') }),
            h(StatusPill, { text: task.statusText, color: statusColor(task.status) }),
            h(Badge, { color: shownPercent >= 100 ? C.ok : C.sub }, `${shownPercent}%`),
            h(DueBadge, { value: task.deadline, t }),
            h('span', { style: { flex: 1 } }),
          ),
        )
      }

      return h(
        Row,
        {
          active,
          overdue: due.level === 'overdue' && !finished,
          onClick: onOpen,
          selected,
          onSelect,
          dim: dimmed,
          kind,
          tone: statusColor(task.status),
        },
        h(
          'span',
          { style: { display: 'flex', gap: 8, alignItems: 'center', minWidth: 0, width: '100%' } },
          toggle,
          h(IdTag, { id: task.id }),
          h(
            'span',
            { style: { flex: 1, minWidth: 0, display: 'flex' } },
            kind === 'child'
              ? h(Title, { size: 12.6, weight: 500, color: C.sub }, task.name)
              : h(Title, null, task.name),
          ),
        ),
        h(
          'span',
          { style: { display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' } },
          kind === 'parent' ? h(Badge, { color: '#2563eb' }, t('tasks.main')) : null,
          h(Assignee, { name: task.assignedToName, fallback: t('field.unassigned') }),
          h(StatusPill, { text: task.statusText, color: statusColor(task.status) }),
          h(Badge, { color: task.pri <= 2 ? C.warn : C.sub }, task.priText),
          h(Badge, { color: shownPercent > 0 ? C.ok : C.sub }, `${t('field.progress')} ${shownPercent}%`),
          h(DueBadge, { value: task.deadline, t }),
          summary
            ? h(Badge, { color: summary.done === summary.total ? C.ok : C.brand }, fill(t('tasks.subCount'), { n: summary.total, d: summary.done }))
            : null,
        ),
        h(Meta, {
          items: [
            parentLabel,
            task.executionName,
            `${t('field.estimate')} ${task.estimate || 0} / ${t('field.consumed')} ${task.consumed || 0} / ${t('field.left')} ${task.left || 0}${t('unit.hour')}`,
            task.openedDate,
          ],
        }),
      )
    }

    /** 把扁平任务列表按 parent 组装成树；父任务不在列表里时当根，保证不丢行。 */
    function buildTaskTree(list, compare) {
      const nodes = new Map()
      list.forEach((task) => nodes.set(task.id, { task, children: [] }))
      const roots = []
      nodes.forEach((node) => {
        const parent = nodes.get(node.task.parent)
        if (parent && parent !== node) parent.children.push(node)
        else roots.push(node)
      })
      const sortLevel = (items) => {
        items.sort((left, right) => compare(left.task, right.task))
        items.forEach((item) => sortLevel(item.children))
      }
      sortLevel(roots)
      return roots
    }

    /** 父任务的子任务汇总：条数、完成数、平均进度。 */
    function childSummary(children) {
      if (children.length === 0) return null
      const done = children.filter((node) => node.task.status === 'done' || node.task.status === 'closed').length
      const progress = Math.round(children.reduce((sum, node) => sum + (Number(node.task.progress) || 0), 0) / children.length)
      return { total: children.length, done, progress }
    }

    /** 任务详情。 */
    function TaskDetail({ task, t, onClose, onDone, onOpenTask }) {
      return h(
        DetailShell,
        { title: `${t('detail.task')} #${task.id}`, onClose },
        h('div', { style: { fontSize: 14, fontWeight: 650, lineHeight: 1.5, color: C.text } }, task.name),
        h(
          'div',
          { style: { display: 'flex', flexDirection: 'column', gap: 3 } },
          h(Field, { label: t('field.status') }, task.statusText),
          h(Field, { label: t('field.pri') }, task.priText),
          h(Field, { label: t('field.progress') }, `${task.progress}%`),
          h(Field, { label: t('field.execution') }, task.executionName || '—'),
          h(Field, { label: t('field.estimate') }, `${task.estimate}${t('unit.hour')}`),
          h(Field, { label: t('field.consumed') }, `${task.consumed}${t('unit.hour')}`),
          h(Field, { label: t('field.left') }, `${task.left}${t('unit.hour')}`),
          h(Field, { label: t('field.estStarted') }, task.estStarted || '—'),
          h(Field, { label: t('field.realStarted') }, task.realStarted || '—'),
          h(Field, { label: t('field.deadline') }, task.deadline || '—'),
          h(Field, { label: t('field.finishedDate') }, task.finishedDate || '—'),
          h(Field, { label: t('field.assignedTo') }, task.assignedToName || '—'),
          h(Field, { label: t('field.openedBy') }, `${task.openedByName || '—'}${task.openedDate ? ` · ${task.openedDate}` : ''}`),
        ),
        task.parent > 0
          ? h(
              'div',
              { style: { display: 'flex', gap: 6, alignItems: 'baseline', fontSize: 12, color: C.dim } },
              h('span', null, t('tasks.parent')),
              onOpenTask
                ? h(
                    'span',
                    {
                      role: 'button',
                      tabIndex: 0,
                      onClick: () => onOpenTask(task.parent),
                      onKeyDown: (event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault()
                          onOpenTask(task.parent)
                        }
                      },
                      style: { color: C.brand, cursor: 'pointer', fontWeight: 600 },
                    },
                    `#${task.parent} ${task.parentName || ''}`.trim(),
                  )
                : h('span', null, `#${task.parent} ${task.parentName || ''}`.trim()),
            )
          : null,
        Array.isArray(task.children) && task.children.length > 0
          ? h(
              Section,
              { title: `${t('tasks.subtasks')} (${task.children.length})` },
              h(
                'div',
                { style: { display: 'flex', flexDirection: 'column', gap: 6, marginTop: 2 } },
                task.children.map((child) =>
                  h(
                    'div',
                    {
                      key: child.id,
                      role: onOpenTask ? 'button' : undefined,
                      tabIndex: onOpenTask ? 0 : undefined,
                      onClick: onOpenTask ? () => onOpenTask(child.id) : undefined,
                      onKeyDown: onOpenTask
                        ? (event) => {
                            if (event.key === 'Enter' || event.key === ' ') {
                              event.preventDefault()
                              onOpenTask(child.id)
                            }
                          }
                        : undefined,
                      style: {
                        display: 'flex',
                        gap: 8,
                        alignItems: 'center',
                        padding: '6px 8px',
                        borderRadius: 8,
                        border: `1px solid ${C.line}`,
                        background: C.layer1,
                        cursor: onOpenTask ? 'pointer' : 'default',
                        fontSize: 12,
                      },
                    },
                    h(IdTag, { id: child.id }),
                    h('span', { style: { flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, child.name),
                    h(StatusPill, { text: child.statusText, color: statusColor(child.status) }),
                    h('span', { style: { color: C.dim, fontVariantNumeric: 'tabular-nums' } }, `${child.progress}%`),
                  ),
                ),
              ),
            )
          : null,
        h(TextBlock, { label: t('field.desc'), text: task.desc }),
        task.storyTitle
          ? h(TextBlock, { label: `${t('field.story')} #${task.storyID} ${task.storyTitle}`, text: task.storySpec })
          : null,
        h(TextBlock, { label: t('field.verify'), text: task.storyVerify }),
        h(Timeline, { actions: task.actions, t }),
        h(ActionBar, { kind: 'task', item: task, t, onDone }),
      )
    }

    /** 需求列表行。 */
    function StoryRow({ story, t, active, onOpen, selected, onSelect }) {
      return h(
        Row,
        {
          active,
          onClick: onOpen,
          selected,
          onSelect,
          tone: statusColor(story.status),
        },
        h(
          'span',
          { style: { display: 'flex', gap: 8, alignItems: 'center', minWidth: 0, width: '100%' } },
          h(IdTag, { id: story.id }),
          h('span', { style: { flex: 1, minWidth: 0, display: 'flex' } }, h(Title, null, story.title)),
        ),
        h(
          'span',
          { style: { display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' } },
          h(Assignee, { name: story.assignedToName, fallback: t('field.unassigned') }),
          h(StatusPill, { text: story.statusText, color: statusColor(story.status) }),
          story.stageText && story.stageText !== story.statusText ? h(Badge, null, story.stageText) : null,
          h(Badge, { color: story.pri <= 2 ? C.warn : C.sub }, story.priText),
          story.estimate ? h(Badge, null, `${t('field.estimate')} ${story.estimate}${t('unit.hour')}`) : null,
        ),
        h(Meta, {
          items: [
            story.productName,
            story.taskCount ? `${story.taskCount} 个任务` : '',
            story.openedDate,
          ],
        }),
      )
    }

    /** 需求详情。 */
    function StoryDetail({ story, t, onClose, onDone }) {
      return h(
        DetailShell,
        { title: `${t('detail.story')} #${story.id}`, onClose },
        h('div', { style: { fontSize: 14, fontWeight: 650, lineHeight: 1.5, color: C.text } }, story.title),
        h(
          'div',
          { style: { display: 'flex', flexDirection: 'column', gap: 3 } },
          h(Field, { label: t('field.status') }, story.statusText),
          h(Field, { label: t('field.stage') }, story.stageText || '—'),
          h(Field, { label: t('field.pri') }, story.priText),
          h(Field, { label: t('field.estimate') }, `${story.estimate}${t('unit.hour')}`),
          h(Field, { label: t('field.assignedTo') }, story.assignedToName || '—'),
          h(Field, { label: t('field.openedBy') }, `${story.openedByName || '—'}${story.openedDate ? ` · ${story.openedDate}` : ''}`),
          h(Field, { label: '关联任务' }, String(story.taskCount ?? 0)),
        ),
        h(TextBlock, { label: t('field.spec'), text: story.spec }),
        h(TextBlock, { label: t('field.verify'), text: story.verify }),
        h(Timeline, { actions: story.actions, t }),
        h(ActionBar, { kind: 'story', item: story, t, onDone }),
      )
    }

    /**
     * 跨页签保留的筛选状态：页签切换会卸载子组件，用这里存住选择。
     * 只在面板存活期间有效，不落盘。
     */
    // 各页签各自记忆筛选条件：缺陷页的“全部产品”(all) 不能带到需求页（需求接口必须给数字产品 ID）。
    const VIEW = { product: '', status: 'unclosed', page: 1, execution: '', storyProduct: '', sessionWorkspace: '' }

    /** 缺陷页签。 */
    /** 未指派在筛选下拉里的取值。 */
    const NO_OWNER = '__none__'

    /** 截止日排序用：空值排最后。 */
    function dueRank(value) {
      const ms = dayMs(value)
      return ms || Number.MAX_SAFE_INTEGER
    }

    /** 关键词匹配：编号 / 标题 / 处理人，忽略大小写。 */
    function hitKeyword(keyword, ...fields) {
      if (!keyword) return true
      const needle = String(keyword).trim().toLowerCase()
      if (!needle) return true
      return fields.some((field) => String(field ?? '').toLowerCase().includes(needle))
    }

    /** 处理人是否命中筛选（NO_OWNER 表示未指派）。 */
    function hitOwner(name, filter) {
      if (!filter) return true
      const value = String(name ?? '').trim()
      if (filter === NO_OWNER) return !value || value === '—'
      return value === filter
    }

    /** 从数据里现抽处理人选项：全部 / 未指派 / 具体的人。 */
    function ownerOptions(list, t, pick) {
      const names = new Set()
      let hasNone = false
      list.forEach((item) => {
        const name = String(pick(item) ?? '').trim()
        if (!name || name === '—') hasNone = true
        else names.add(name)
      })
      const options = [{ value: '', label: t('filter.all') }]
      if (hasNone) options.push({ value: NO_OWNER, label: t('filter.none') })
      Array.from(names)
        .sort((left, right) => left.localeCompare(right, 'zh-Hans-CN'))
        .forEach((name) => options.push({ value: name, label: name }))
      return options
    }

    /** 从数据里现抽某一列的取值（状态 / 类型 / 阶段），按出现顺序去重。 */
    function distinctOptions(list, t, pick) {
      const seen = new Set()
      const options = [{ value: '', label: t('filter.all') }]
      list.forEach((item) => {
        const value = String(pick(item) ?? '').trim()
        if (!value || seen.has(value)) return
        seen.add(value)
        options.push({ value, label: value })
      })
      return options
    }

    /** 关键词输入框。 */
    function SearchInput({ value, onChange, placeholder }) {
      return h(
        'span',
        {
          style: {
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '0 8px',
            height: 27,
            color: C.text,
            background: C.layer1,
            border: `1px solid ${C.line}`,
            borderRadius: 8,
          },
        },
        h('span', { style: { fontSize: 12, color: C.dim } }, '⌕'),
        h('input', {
          value,
          placeholder,
          onChange: (event) => onChange(event.target.value),
          style: {
            font: 'inherit',
            fontSize: 12,
            width: 132,
            border: 'none',
            outline: 'none',
            background: 'transparent',
            color: C.text,
          },
        }),
        value
          ? h(
              'button',
              {
                type: 'button',
                onClick: () => onChange(''),
                style: {
                  font: 'inherit',
                  fontSize: 13,
                  lineHeight: 1,
                  padding: 0,
                  border: 'none',
                  background: 'transparent',
                  color: C.dim,
                  cursor: 'pointer',
                },
              },
              '✕',
            )
          : null,
      )
    }

    /** 工具栏：等宽换行的一排筛选控件。 */
    function FilterBar({ children }) {
      return h(
        'div',
        { className: 'zt-filterbar', style: { display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' } },
        children,
      )
    }

    /** 筛选标签。 */
    function Label({ children }) {
      return h('span', { style: { fontSize: 11.5, color: C.dim } }, children)
    }

    function BugsTab({ bootstrap, products, t, jump, onJumped }) {
      const [product, setProduct] = useState(() => VIEW.product || 'all')
      const [status, setStatus] = useState(VIEW.status)
      const [severity, setSeverity] = useState(VIEW.bugSeverity || '')
      const [pri, setPri] = useState(VIEW.bugPri || '')
      const [owner, setOwner] = useState(VIEW.bugOwner || '')
      const [type, setType] = useState(VIEW.bugType || '')
      const [keyword, setKeyword] = useState(VIEW.bugKeyword || '')
      const [sort, setSort] = useState(VIEW.bugSort || 'id')
      const [page, setPage] = useState(VIEW.page)
      const [state, setState] = useState({ kind: 'loading' })
      const [openBug, setOpenBug] = useState(null)
      const [detail, setDetail] = useState(null)
      const [detailTick, setDetailTick] = useState(0)
      const selection = useSelection()
      const [batch, setBatch] = useState(null)

      // 禅道只认 all / unclosed / assignedtome 这三种视图，其余状态在前端过滤。
      const SERVER_VIEW = { unclosed: 'unclosed', all: 'all', assignedtome: 'assignedtome' }
      const serverView = SERVER_VIEW[status] ?? 'all'

      useEffect(() => {
        VIEW.product = product
        VIEW.status = status
        VIEW.page = page
        VIEW.bugSeverity = severity
        VIEW.bugPri = pri
        VIEW.bugOwner = owner
        VIEW.bugType = type
        VIEW.bugKeyword = keyword
        VIEW.bugSort = sort
      }, [product, status, page, severity, pri, owner, type, keyword, sort])

      const load = useCallback(async () => {
        if (product === '') return
        setState((previous) => (previous.kind === 'ready' ? previous : { kind: 'loading' }))
        try {
          // 一次拿全量（recPerPage 上限 1000），前端再筛选分页，避免翻页丢筛选结果。
          const body = await api(`/bugs?product=${product}&status=${serverView}&page=1&limit=1000`)
          setState({ kind: 'ready', bugs: body.bugs ?? [] })
        } catch (error) {
          setState({ kind: 'error', message: error instanceof Error ? error.message : String(error) })
        }
      }, [product, serverView])

      useEffect(() => {
        void load()
        // 写操作成功后广播刷新，页签跟着重新拉一次数据。
        return REFRESH.on(() => void load())
      }, [load])

      // 全局搜索命中：直接打开对应详情（列表数据可能还没回来，详情按 id 单独拉）。
      useEffect(() => {
        if (!jump || jump.kind !== 'bug') return
        setOpenBug({ id: jump.id })
        onJumped()
      }, [jump])
      useEffect(() => {
        if (openBug === null) {
          setDetail(null)
          return
        }
        let alive = true
        setDetail((previous) => (previous?.kind === 'ready' ? previous : { kind: 'loading' }))
        api(`/bug?id=${openBug.id}`)
          .then((body) => {
            if (alive) setDetail({ kind: 'ready', bug: body.bug })
          })
          .catch((error) => {
            if (alive) setDetail({ kind: 'error', message: error instanceof Error ? error.message : String(error) })
          })
        return () => {
          alive = false
        }
      }, [openBug, detailTick])

      const raw = state.kind === 'ready' ? state.bugs : []

      /** 本地筛选 + 排序。 */
      const bugs = useMemo(() => {
        const filtered = raw.filter((bug) => {
          if (status === 'active' || status === 'resolved' || status === 'closed') {
            if (bug.status !== status) return false
          }
          if (severity && String(bug.severity) !== severity) return false
          if (pri && String(bug.pri) !== pri) return false
          if (type && bug.typeText !== type) return false
          if (!hitOwner(bug.ownerName ?? bug.assignedToName, owner)) return false
          return hitKeyword(keyword, bug.id, bug.title, bug.ownerName ?? bug.assignedToName, bug.productName, bug.executionName)
        })
        const SORT = {
          id: (left, right) => right.id - left.id,
          pri: (left, right) => (left.pri ?? 9) - (right.pri ?? 9) || right.id - left.id,
          severity: (left, right) => (left.severity ?? 9) - (right.severity ?? 9) || right.id - left.id,
          deadline: (left, right) => dueRank(left.deadline) - dueRank(right.deadline) || right.id - left.id,
        }
        return filtered.sort(SORT[sort] ?? SORT.id)
      }, [raw, status, severity, pri, type, owner, keyword, sort])

      const filtered = severity || pri || type || owner || keyword || ['active', 'resolved', 'closed'].includes(status)
      const pageSize = 30
      const pageTotal = Math.max(1, Math.ceil(bugs.length / pageSize))
      const current = Math.min(page, pageTotal)
      const shown = bugs.slice((current - 1) * pageSize, current * pageSize)

      return h(
        'div',
        { style: { display: 'flex', flexDirection: 'column', gap: 10, minHeight: 0, flex: 1 } },
        h(
          FilterBar,
          null,
          h(Label, null, t('bugs.product')),
          h(Select, {
            value: product,
            width: 150,
            onChange: (value) => {
              setProduct(value)
              setPage(1)
            },
            options: [
              { value: 'all', label: t('bugs.product.all') },
              ...products.map((item) => ({ value: String(item.id), label: item.name })),
            ],
          }),
          h(Label, null, t('bugs.status')),
          h(Select, {
            value: status,
            width: 112,
            onChange: (value) => {
              setStatus(value)
              setPage(1)
            },
            options: [
              { value: 'unclosed', label: t('bugs.status.unclosed') },
              { value: 'all', label: t('bugs.status.all') },
              { value: 'assignedtome', label: t('bugs.status.mine') },
              { value: 'active', label: '激活' },
              { value: 'resolved', label: '已解决' },
              { value: 'closed', label: '已关闭' },
            ],
          }),
          h(Select, {
            value: severity,
            width: 106,
            onChange: (value) => {
              setSeverity(value)
              setPage(1)
            },
            options: [
              { value: '', label: `${t('field.severity')} ${t('filter.any')}` },
              ...[1, 2, 3, 4].map((value) => ({ value: String(value), label: t(`severity.${value}`) })),
            ],
          }),
          h(Select, {
            value: pri,
            width: 100,
            onChange: (value) => {
              setPri(value)
              setPage(1)
            },
            options: [
              { value: '', label: `${t('field.pri')} ${t('filter.any')}` },
              ...[1, 2, 3, 4].map((value) => ({ value: String(value), label: t(`pri.${value}`) })),
            ],
          }),
          h(Select, {
            value: type,
            width: 120,
            onChange: (value) => {
              setType(value)
              setPage(1)
            },
            options: distinctOptions(raw, t, (bug) => bug.typeText).map((option) =>
              option.value === '' ? { value: '', label: `${t('field.type')} ${t('filter.all')}` } : option,
            ),
          }),
          h(Select, {
            value: owner,
            width: 120,
            onChange: (value) => {
              setOwner(value)
              setPage(1)
            },
            options: ownerOptions(raw, t, (bug) => bug.ownerName ?? bug.assignedToName).map((option) =>
              option.value === '' ? { value: '', label: `${t('field.assignee')} ${t('filter.all')}` } : option,
            ),
          }),
          h(SearchInput, {
            value: keyword,
            onChange: (value) => {
              setKeyword(value)
              setPage(1)
            },
            placeholder: t('filter.keyword'),
          }),
          h(Select, {
            value: sort,
            width: 104,
            onChange: setSort,
            options: [
              { value: 'id', label: t('sort.id') },
              { value: 'pri', label: t('sort.pri') },
              { value: 'severity', label: t('sort.severity') },
              { value: 'deadline', label: t('sort.deadline') },
            ],
          }),
          filtered
            ? h(
                Button,
                {
                  onClick: () => {
                    setSeverity('')
                    setPri('')
                    setType('')
                    setOwner('')
                    setKeyword('')
                    setPage(1)
                  },
                },
                t('filter.clear'),
              )
            : null,
          h(
            'span',
            { style: { display: 'inline-flex', alignItems: 'center', gap: 8, marginLeft: 'auto', whiteSpace: 'nowrap' } },
            h(
              'span',
              { style: { fontSize: 11.5, color: C.dim } },
              state.kind === 'ready' ? fill(t('bugs.total'), { n: bugs.length }) : '',
            ),
            h(Button, { onClick: () => selection.replace(shown.map((bug) => bug.id)) }, t('batch.selectAll')),
            h(Button, { onClick: () => void load() }, t('panel.refresh')),
          ),
        ),
        h(SelectionBar, {
          count: selection.count,
          list: selection.list,
          shownIds: shown.map((bug) => bug.id),
          t,
          busy: false,
          onAction: (action) => setBatch(action),
          onSelectAll: (ids) => selection.replace(ids),
          onClear: () => selection.clear(),
        }),
        h(
          'div',
          { style: { display: 'flex', gap: 12, minHeight: 0, flex: 1 } },
          h(
            'div',
            { style: { display: 'flex', flexDirection: 'column', gap: 10, minWidth: 0, flex: 1, overflow: 'auto', paddingRight: 2 } },
            state.kind === 'loading' ? h(SkeletonRows, { count: 6 }) : null,
            state.kind === 'error' ? h(State, { kind: 'error', message: state.message, onRetry: () => void load(), t }) : null,
            state.kind === 'ready' && bugs.length === 0 ? h(State, { kind: 'empty', t }) : null,
            state.kind === 'ready'
              ? shown.map((bug) =>
                  h(BugRow, {
                    key: bug.id,
                    bug,
                    t,
                    active: openBug?.id === bug.id,
                    onOpen: () => setOpenBug(bug),
                    selected: selection.has(bug.id),
                    onSelect: (on) => selection.toggle(bug.id, on),
                  }),
                )
              : null,
            state.kind === 'ready' && pageTotal > 1
              ? h(
                  'div',
                  { style: { display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center', padding: '6px 0' } },
                  h(Button, { disabled: current <= 1, onClick: () => setPage(Math.max(1, current - 1)) }, t('bugs.pager.prev')),
                  h('span', { style: { fontSize: 11.5, color: C.dim } }, fill(t('bugs.pager.info'), { page: current, total: pageTotal })),
                  h(Button, { disabled: current >= pageTotal, onClick: () => setPage(Math.min(pageTotal, current + 1)) }, t('bugs.pager.next')),
                )
              : null,
          ),
          openBug === null
            ? null
            : detail?.kind === 'ready'
              ? h(BugDetail, {
                  bug: detail.bug,
                  t,
                  onClose: () => setOpenBug(null),
                  onDone: (result) => {
                    if (result?.removed === true) {
                      setOpenBug(null)
                    } else {
                      setDetailTick((value) => value + 1)
                    }
                  },
                })
              : h(
                  'div',
                  { className: 'zt-drawer', style: { width: 380, flex: 'none', border: `1px solid ${C.line}`, borderRadius: 12, background: C.layer1, alignSelf: 'flex-start' } },
                  h(State, { kind: detail?.kind === 'error' ? 'error' : 'loading', message: detail?.message, t }),
                ),
        ),
        batch === null
          ? null
          : h(BatchModal, {
              kind: 'bug',
              action: batch,
              ids: selection.list,
              t,
              onClose: () => setBatch(null),
              onDone: () => {
                setBatch(null)
                selection.clear()
              },
            }),
      )
    }

/** 我的待办页签：缺陷与任务合成一条按「逾期 → 到期 → 优先级」排序的清单。 */
    function MineTab({ t, jump, onJumped }) {
      const [state, setState] = useState({ kind: 'loading' })
      const [open, setOpen] = useState(null)
      const [detail, setDetail] = useState(null)
      const [detailTick, setDetailTick] = useState(0)
      const [kind, setKind] = useState(VIEW.mineKind || '')
      const [status, setStatus] = useState(VIEW.mineStatus || '')
      const [keyword, setKeyword] = useState(VIEW.mineKeyword || '')
      const [overdueOnly, setOverdueOnly] = useState(VIEW.mineOverdue || false)

      useEffect(() => {
        VIEW.mineKind = kind
        VIEW.mineStatus = status
        VIEW.mineKeyword = keyword
        VIEW.mineOverdue = overdueOnly
      }, [kind, status, keyword, overdueOnly])

      const load = useCallback(async () => {
        setState((previous) => (previous.kind === 'ready' ? previous : { kind: 'loading' }))
        try {
          const body = await api('/mine')
          setState({ kind: 'ready', ...body })
        } catch (error) {
          setState({ kind: 'error', message: error instanceof Error ? error.message : String(error) })
        }
      }, [])

      useEffect(() => {
        void load()
        // 写操作成功后广播刷新，页签跟着重新拉一次数据。
        return REFRESH.on(() => void load())
      }, [load])

      useEffect(() => {
        if (!jump || (jump.kind !== 'bug' && jump.kind !== 'task')) return
        setOpen({ type: jump.kind, id: jump.id })
        onJumped()
      }, [jump])

      useEffect(() => {
        if (open === null) {
          setDetail(null)
          return
        }
        let alive = true
        setDetail((previous) => (previous?.kind === 'ready' ? previous : { kind: 'loading' }))
        const path = open.kind === 'bug' ? `/bug?id=${open.id}` : `/task?id=${open.id}`
        api(path)
          .then((body) => {
            if (alive) setDetail({ kind: 'ready', type: open.kind, item: body.bug ?? body.task })
          })
          .catch((error) => {
            if (alive) setDetail({ kind: 'error', message: error instanceof Error ? error.message : String(error) })
          })
        return () => {
          alive = false
        }
      }, [open, detailTick])

      if (state.kind !== 'ready') {
        return h(
          'div',
          { style: { flex: 1 } },
          h(State, { kind: state.kind, message: state.message, onRetry: () => void load(), t }),
        )
      }

      /** 缺陷与任务合成一条清单，带上排序/筛选需要的字段。 */
      const all = [
        ...state.bugs.map((bug) => ({
          type: 'bug',
          id: bug.id,
          due: bug.deadline,
          pri: bug.pri,
          statusText: bug.statusText,
          title: bug.title,
          owner: bug.ownerName ?? bug.assignedToName,
          bug,
        })),
        ...state.tasks.map((task) => ({
          type: 'task',
          id: task.id,
          due: task.deadline,
          pri: task.pri,
          statusText: task.statusText,
          title: task.name,
          owner: task.assignedToName,
          task,
        })),
      ]

      const overdueCount = all.filter((item) => dueInfo(item.due).level === 'overdue').length

      const items = all
        .filter((item) => {
          if (kind && item.type !== kind) return false
          if (status && item.statusText !== status) return false
          if (overdueOnly && dueInfo(item.due).level !== 'overdue') return false
          return hitKeyword(keyword, item.id, item.title, item.owner)
        })
        .sort((left, right) => {
          const leftOverdue = dueInfo(left.due).level === 'overdue' ? 0 : 1
          const rightOverdue = dueInfo(right.due).level === 'overdue' ? 0 : 1
          if (leftOverdue !== rightOverdue) return leftOverdue - rightOverdue
          const leftDue = dayMs(left.due) || Number.MAX_SAFE_INTEGER
          const rightDue = dayMs(right.due) || Number.MAX_SAFE_INTEGER
          if (leftDue !== rightDue) return leftDue - rightDue
          if (left.pri !== right.pri) return left.pri - right.pri
          return right.id - left.id
        })

      const active = kind || status || keyword || overdueOnly

      return h(
        'div',
        { style: { display: 'flex', gap: 12, minHeight: 0, flex: 1 } },
        h(
          'div',
          { style: { display: 'flex', flexDirection: 'column', gap: 10, flex: 1, minWidth: 0, overflow: 'auto', paddingRight: 2 } },
          h(
            FilterBar,
            null,
            h('span', { style: { fontSize: 12.5, fontWeight: 650, color: C.text } }, t('mine.title')),
            h(Badge, null, String(items.length)),
            overdueCount > 0 ? h(Badge, { color: C.danger }, `${t('field.overdue')} ${overdueCount}`) : null,
            h(Select, {
              value: kind,
              width: 96,
              onChange: setKind,
              options: [
                { value: '', label: t('filter.all') },
                { value: 'bug', label: t('tab.bugs') },
                { value: 'task', label: t('tab.tasks') },
              ],
            }),
            h(Select, {
              value: status,
              width: 106,
              onChange: setStatus,
              options: distinctOptions(all, t, (item) => item.statusText).map((option) =>
                option.value === '' ? { value: '', label: `${t('bugs.status')} ${t('filter.all')}` } : option,
              ),
            }),
            h(SearchInput, { value: keyword, onChange: setKeyword, placeholder: t('filter.keyword') }),
            h(
              Button,
              {
                primary: overdueOnly,
                onClick: () => setOverdueOnly((value) => !value),
              },
              t('filter.overdue'),
            ),
            active
              ? h(
                  Button,
                  {
                    onClick: () => {
                      setKind('')
                      setStatus('')
                      setKeyword('')
                      setOverdueOnly(false)
                    },
                  },
                  t('filter.clear'),
                )
              : null,
          ),
          items.length === 0
            ? h(State, { kind: 'empty', t })
            : items.map((item) =>
                item.type === 'bug'
                  ? h(BugRow, {
                      key: `b${item.id}`,
                      bug: item.bug,
                      t,
                      active: open?.type === 'bug' && open.id === item.id,
                      onOpen: () => setOpen({ type: 'bug', id: item.id }),
                    })
                  : h(TaskRow, {
                      key: `t${item.id}`,
                      task: item.task,
                      t,
                      active: open?.type === 'task' && open.id === item.id,
                      onOpen: () => setOpen({ type: 'task', id: item.id }),
                      parentLabel: item.task.parent > 0 ? fill(t('tasks.belongsTo'), { id: item.task.parent }) : '',
                    }),
              ),
        ),
        open === null
          ? null
          : detail?.kind === 'ready'
            ? detail.type === 'bug'
              ? h(BugDetail, {
                    bug: detail.item,
                    t,
                    onClose: () => setOpen(null),
                    onDone: (result) => {
                      if (result?.removed === true) {
                        setOpen(null)
                      } else {
                        setDetailTick((value) => value + 1)
                      }
                    },
                  })
              : h(TaskDetail, {
                  task: detail.item,
                  t,
                  onClose: () => setOpen(null),
                  onDone: (result) => {
                    if (result?.removed === true) {
                      setOpen(null)
                    } else {
                      setDetailTick((value) => value + 1)
                    }
                  },
                  onOpenTask: (id) => setOpen({ type: 'task', id }),
                })
            : h(
                'div',
                { className: 'zt-drawer', style: { width: 380, flex: 'none', border: `1px solid ${C.line}`, borderRadius: 12, background: C.layer1, alignSelf: 'flex-start' } },
                h(State, { kind: detail?.kind === 'error' ? 'error' : 'loading', message: detail?.message, t }),
              ),
      )
    }

/** 任务页签。 */
    function TasksTab({ executions, t, jump, onJumped }) {
      const [execution, setExecution] = useState(() => VIEW.execution || String(executions[0]?.id ?? ''))
      const [status, setStatus] = useState(VIEW.taskStatus || '')
      const [pri, setPri] = useState(VIEW.taskPri || '')
      const [owner, setOwner] = useState(VIEW.taskOwner || '')
      const [keyword, setKeyword] = useState(VIEW.taskKeyword || '')
      const [sort, setSort] = useState(VIEW.taskSort || 'id')
      const [state, setState] = useState({ kind: 'loading' })
      const [openTask, setOpenTask] = useState(null)
      const [detail, setDetail] = useState(null)
      const [detailTick, setDetailTick] = useState(0)
      const selection = useSelection()
      const [batch, setBatch] = useState(null)

      useEffect(() => {
        VIEW.execution = execution
        VIEW.taskStatus = status
        VIEW.taskPri = pri
        VIEW.taskOwner = owner
        VIEW.taskKeyword = keyword
        VIEW.taskSort = sort
      }, [execution, status, pri, owner, keyword, sort])

      const load = useCallback(async () => {
        if (execution === '') return
        setState((previous) => (previous.kind === 'ready' ? previous : { kind: 'loading' }))
        try {
          const body = await api(`/tasks?execution=${execution}`)
          setState({ kind: 'ready', tasks: body.tasks ?? [] })
        } catch (error) {
          setState({ kind: 'error', message: error instanceof Error ? error.message : String(error) })
        }
      }, [execution])

      useEffect(() => {
        void load()
        // 写操作成功后广播刷新，页签跟着重新拉一次数据。
        return REFRESH.on(() => void load())
      }, [load])

      useEffect(() => {
        if (!jump || jump.kind !== 'task') return
        setOpenTask(jump.id)
        onJumped()
      }, [jump])

      useEffect(() => {
        if (openTask === null) {
          setDetail(null)
          return
        }
        let alive = true
        setDetail((previous) => (previous?.kind === 'ready' ? previous : { kind: 'loading' }))
        api(`/task?id=${openTask}`)
          .then((body) => {
            if (alive) setDetail({ kind: 'ready', task: body.task })
          })
          .catch((error) => {
            if (alive) setDetail({ kind: 'error', message: error instanceof Error ? error.message : String(error) })
          })
        return () => {
          alive = false
        }
      }, [openTask, detailTick])

      const raw = state.kind === 'ready' ? state.tasks : []

      const SORTERS = useMemo(
        () => ({
          id: (left, right) => right.id - left.id,
          pri: (left, right) => (left.pri ?? 9) - (right.pri ?? 9) || right.id - left.id,
          deadline: (left, right) => dueRank(left.deadline) - dueRank(right.deadline) || right.id - left.id,
          progress: (left, right) => (right.progress ?? 0) - (left.progress ?? 0) || right.id - left.id,
        }),
        [],
      )
      const compare = SORTERS[sort] ?? SORTERS.id

      /** 禅道的任务接口不吃 status 参数，全部在前端过滤。 */
      const matched = useMemo(
        () =>
          raw.filter((task) => {
            if (status && task.statusText !== status) return false
            if (pri && String(task.pri) !== pri) return false
            if (!hitOwner(task.assignedToName, owner)) return false
            return hitKeyword(keyword, task.id, task.name, task.assignedToName, task.executionName)
          }),
        [raw, status, pri, owner, keyword],
      )
      const matchedIds = useMemo(() => new Set(matched.map((task) => task.id)), [matched])

      /** 命中子任务时把父链补回来，避免树里出现孤儿行（补进来的父行会调暗）。 */
      const tasks = useMemo(() => {
        const byId = new Map(raw.map((task) => [task.id, task]))
        const kept = matched.slice()
        const seen = new Set(kept.map((task) => task.id))
        kept.forEach((task) => {
          let parentID = Number(task.parent ?? 0)
          let guard = 0
          while (parentID > 0 && guard < 16) {
            const parentTask = byId.get(parentID)
            if (!parentTask) break
            if (!seen.has(parentID)) {
              seen.add(parentID)
              kept.push(parentTask)
            }
            parentID = Number(parentTask.parent ?? 0)
            guard += 1
          }
        })
        return kept
      }, [raw, matched])

      const [collapsed, setCollapsed] = useState(() => new Set())
      const tree = useMemo(() => buildTaskTree(tasks, compare), [tasks, compare])

      /** 全选本页：包含父任务（父任务勾选即整棵子树，批量按 id 倒序执行，先关子任务）。 */
      const selectableIds = useMemo(() => {
        const ids = []
        const walk = (nodes) =>
          nodes.forEach((node) => {
            ids.push(node.task.id)
            walk(node.children)
          })
        walk(tree)
        return ids
      }, [tree])

      const parentIds = useMemo(() => {
        const ids = []
        const walk = (nodes) =>
          nodes.forEach((node) => {
            if (node.children.length > 0) {
              ids.push(node.task.id)
              walk(node.children)
            }
          })
        walk(tree)
        return ids
      }, [tree])

      /** 递归渲染：父行 + 缩进在竖线里的子行，视觉上是一组。 */
      const renderNodes = (nodes, depth) =>
        nodes.map((node) => {
          const kids = node.children
          const folded = collapsed.has(node.task.id)
          return h(
            'div',
            { key: node.task.id, style: { display: 'flex', flexDirection: 'column' } },
            h(TaskRow, {
              task: node.task,
              t,
              kind: depth > 0 ? 'child' : 'parent',
              active: openTask === node.task.id,
              onOpen: () => setOpenTask(node.task.id),
              selected: selection.has(node.task.id),
              onSelect: (on) => selection.toggle(node.task.id, on),
              collapsed: folded,
              childCount: kids.length,
              onToggle:
                kids.length === 0
                  ? null
                  : () =>
                      setCollapsed((previous) => {
                        const next = new Set(previous)
                        if (next.has(node.task.id)) next.delete(node.task.id)
                        else next.add(node.task.id)
                        return next
                      }),
              summary: childSummary(kids),
              dimmed: !matchedIds.has(node.task.id),
            }),
            kids.length > 0 && !folded
              ? h(
                  'div',
                  {
                    className: 'zt-kids',
                    style: {
                      position: 'relative',
                      marginLeft: 20,
                      paddingLeft: 14,
                      marginTop: 8,
                      borderLeft: `2px solid ${C.line}`,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 8,
                    },
                  },
                  h('span', {
                    style: {
                      position: 'absolute',
                      left: -2,
                      top: 0,
                      width: 2,
                      height: 16,
                      background: C.brand,
                      borderRadius: 2,
                    },
                  }),
                  renderNodes(kids, depth + 1),
                )
              : null,
          )
        })

      const filtered = status || pri || owner || keyword

      return h(
        'div',
        { style: { display: 'flex', flexDirection: 'column', gap: 10, flex: 1, minHeight: 0 } },
        h(
          FilterBar,
          null,
          h(Label, null, t('tasks.execution')),
          h(Select, {
            value: execution,
            width: 220,
            onChange: (value) => {
              setExecution(value)
              setOpenTask(null)
            },
            options: executions.map((item) => ({ value: String(item.id), label: item.name })),
          }),
          h(Select, {
            value: status,
            width: 106,
            onChange: setStatus,
            options: distinctOptions(raw, t, (task) => task.statusText).map((option) =>
              option.value === '' ? { value: '', label: `${t('bugs.status')} ${t('filter.all')}` } : option,
            ),
          }),
          h(Select, {
            value: pri,
            width: 100,
            onChange: setPri,
            options: [
              { value: '', label: `${t('field.pri')} ${t('filter.any')}` },
              ...[1, 2, 3, 4].map((value) => ({ value: String(value), label: t(`pri.${value}`) })),
            ],
          }),
          h(Select, {
            value: owner,
            width: 120,
            onChange: setOwner,
            options: ownerOptions(raw, t, (task) => task.assignedToName).map((option) =>
              option.value === '' ? { value: '', label: `${t('field.assignee')} ${t('filter.all')}` } : option,
            ),
          }),
          h(SearchInput, { value: keyword, onChange: setKeyword, placeholder: t('filter.keyword') }),
          h(Select, {
            value: sort,
            width: 104,
            onChange: setSort,
            options: [
              { value: 'id', label: t('sort.id') },
              { value: 'pri', label: t('sort.pri') },
              { value: 'deadline', label: t('sort.deadline') },
              { value: 'progress', label: t('sort.progress') },
            ],
          }),
          filtered
            ? h(
                Button,
                {
                  onClick: () => {
                    setStatus('')
                    setPri('')
                    setOwner('')
                    setKeyword('')
                  },
                },
                t('filter.clear'),
              )
            : null,
          h(
            'span',
            { style: { display: 'inline-flex', alignItems: 'center', gap: 8, marginLeft: 'auto', whiteSpace: 'nowrap' } },
            h(
              'span',
              { style: { fontSize: 11.5, color: C.dim } },
              state.kind === 'ready' ? fill(t('bugs.total'), { n: tasks.length }) : '',
            ),
            parentIds.length > 0
              ? h(
                  Button,
                  {
                    onClick: () =>
                      setCollapsed((previous) => (previous.size > 0 ? new Set() : new Set(parentIds))),
                  },
                  collapsed.size > 0 ? t('tasks.expandAll') : t('tasks.collapseAll'),
                )
              : null,
            h(Button, { onClick: () => selection.replace(selectableIds) }, t('batch.selectAll')),
            h(Button, { onClick: () => void load() }, t('panel.refresh')),
          ),
        ),
        h(SelectionBar, {
          count: selection.count,
          list: selection.list,
          shownIds: selectableIds,
          t,
          busy: false,
          onAction: (action) => setBatch(action),
          onSelectAll: (ids) => selection.replace(ids),
          onClear: () => selection.clear(),
        }),
        h(
          'div',
          { style: { display: 'flex', gap: 12, minHeight: 0, flex: 1 } },
          h(
            'div',
            { style: { display: 'flex', flexDirection: 'column', gap: 10, flex: 1, minWidth: 0, overflow: 'auto', paddingRight: 2 } },
            state.kind !== 'ready'
              ? h(State, { kind: state.kind, message: state.message, onRetry: () => void load(), t })
              : tasks.length === 0
                ? h(State, { kind: 'empty', t })
                : renderNodes(tree, 0),
          ),
          openTask === null
            ? null
            : detail?.kind === 'ready'
              ? h(TaskDetail, {
                  task: detail.task,
                  t,
                  onClose: () => setOpenTask(null),
                  onDone: (result) => {
                    if (result?.removed === true) {
                      setOpenTask(null)
                    } else {
                      setDetailTick((value) => value + 1)
                    }
                  },
                  onOpenTask: (id) => setOpenTask(id),
                })
              : h(
                  'div',
                  { className: 'zt-drawer', style: { width: 380, flex: 'none', border: `1px solid ${C.line}`, borderRadius: 12, background: C.layer1, alignSelf: 'flex-start' } },
                  h(State, { kind: detail?.kind === 'error' ? 'error' : 'loading', message: detail?.message, t }),
                ),
        ),
        batch === null
          ? null
          : h(BatchModal, {
              kind: 'task',
              action: batch,
              ids: selection.list,
              t,
              onClose: () => setBatch(null),
              onDone: () => {
                setBatch(null)
                selection.clear()
              },
            }),
      )
    }
/** 需求页签。 */
    function StoriesTab({ products, t, jump, onJumped }) {
      const [product, setProduct] = useState(() => VIEW.storyProduct || 'all')
      const [status, setStatus] = useState(VIEW.storyStatus || '')
      const [stage, setStage] = useState(VIEW.storyStage || '')
      const [pri, setPri] = useState(VIEW.storyPri || '')
      const [owner, setOwner] = useState(VIEW.storyOwner || '')
      const [keyword, setKeyword] = useState(VIEW.storyKeyword || '')
      const [sort, setSort] = useState(VIEW.storySort || 'id')
      const [state, setState] = useState({ kind: 'loading' })
      const [openStory, setOpenStory] = useState(null)
      const [detail, setDetail] = useState(null)
      const [detailTick, setDetailTick] = useState(0)
      const selection = useSelection()
      const [batch, setBatch] = useState(null)

      useEffect(() => {
        VIEW.storyProduct = product
        VIEW.storyStatus = status
        VIEW.storyStage = stage
        VIEW.storyPri = pri
        VIEW.storyOwner = owner
        VIEW.storyKeyword = keyword
        VIEW.storySort = sort
      }, [product, status, stage, pri, owner, keyword, sort])

      const load = useCallback(async () => {
        if (product === '') return
        setState((previous) => (previous.kind === 'ready' ? previous : { kind: 'loading' }))
        try {
          const body = await api(`/stories?product=${product}`)
          setState({ kind: 'ready', stories: body.stories ?? [] })
        } catch (error) {
          setState({ kind: 'error', message: error instanceof Error ? error.message : String(error) })
        }
      }, [product])

      useEffect(() => {
        void load()
        // 写操作成功后广播刷新，页签跟着重新拉一次数据。
        return REFRESH.on(() => void load())
      }, [load])

      useEffect(() => {
        if (!jump || jump.kind !== 'story') return
        setOpenStory(jump.id)
        onJumped()
      }, [jump])

      useEffect(() => {
        if (openStory === null) {
          setDetail(null)
          return
        }
        let alive = true
        setDetail((previous) => (previous?.kind === 'ready' ? previous : { kind: 'loading' }))
        api(`/story?id=${openStory}`)
          .then((body) => {
            if (alive) setDetail({ kind: 'ready', story: body.story })
          })
          .catch((error) => {
            if (alive) setDetail({ kind: 'error', message: error instanceof Error ? error.message : String(error) })
          })
        return () => {
          alive = false
        }
      }, [openStory, detailTick])

      const raw = state.kind === 'ready' ? state.stories : []

      /** 需求列表：状态 / 阶段 / 优先级 / 处理人 / 关键词全部前端过滤。 */
      const stories = useMemo(() => {
        const filtered = raw.filter((story) => {
          if (status && story.statusText !== status) return false
          if (stage && story.stageText !== stage) return false
          if (pri && String(story.pri) !== pri) return false
          if (!hitOwner(story.assignedToName, owner)) return false
          return hitKeyword(keyword, story.id, story.title, story.assignedToName, story.productName)
        })
        const SORT = {
          id: (left, right) => right.id - left.id,
          pri: (left, right) => (left.pri ?? 9) - (right.pri ?? 9) || right.id - left.id,
          estimate: (left, right) => (right.estimate ?? 0) - (left.estimate ?? 0) || right.id - left.id,
        }
        return filtered.sort(SORT[sort] ?? SORT.id)
      }, [raw, status, stage, pri, owner, keyword, sort])

      const filtered = status || stage || pri || owner || keyword

      return h(
        'div',
        { style: { display: 'flex', flexDirection: 'column', gap: 10, flex: 1, minHeight: 0 } },
        h(
          FilterBar,
          null,
          h(Label, null, t('stories.product')),
          h(Select, {
            value: product,
            width: 160,
            onChange: (value) => {
              setProduct(value)
              setOpenStory(null)
            },
            options: [
              { value: 'all', label: t('bugs.product.all') },
              ...products.map((item) => ({ value: String(item.id), label: item.name })),
            ],
          }),
          h(Select, {
            value: status,
            width: 106,
            onChange: setStatus,
            options: distinctOptions(raw, t, (story) => story.statusText).map((option) =>
              option.value === '' ? { value: '', label: `${t('bugs.status')} ${t('filter.all')}` } : option,
            ),
          }),
          h(Select, {
            value: stage,
            width: 106,
            onChange: setStage,
            options: distinctOptions(raw.filter((story) => story.stageText), t, (story) => story.stageText).map((option) =>
              option.value === '' ? { value: '', label: `${t('field.stage')} ${t('filter.all')}` } : option,
            ),
          }),
          h(Select, {
            value: pri,
            width: 100,
            onChange: setPri,
            options: [
              { value: '', label: `${t('field.pri')} ${t('filter.any')}` },
              ...[1, 2, 3, 4].map((value) => ({ value: String(value), label: t(`pri.${value}`) })),
            ],
          }),
          h(Select, {
            value: owner,
            width: 120,
            onChange: setOwner,
            options: ownerOptions(raw, t, (story) => story.assignedToName).map((option) =>
              option.value === '' ? { value: '', label: `${t('field.assignee')} ${t('filter.all')}` } : option,
            ),
          }),
          h(SearchInput, { value: keyword, onChange: setKeyword, placeholder: t('filter.keyword') }),
          h(Select, {
            value: sort,
            width: 104,
            onChange: setSort,
            options: [
              { value: 'id', label: t('sort.id') },
              { value: 'pri', label: t('sort.pri') },
              { value: 'estimate', label: t('sort.estimate') },
            ],
          }),
          filtered
            ? h(
                Button,
                {
                  onClick: () => {
                    setStatus('')
                    setStage('')
                    setPri('')
                    setOwner('')
                    setKeyword('')
                  },
                },
                t('filter.clear'),
              )
            : null,
          h(
            'span',
            { style: { display: 'inline-flex', alignItems: 'center', gap: 8, marginLeft: 'auto', whiteSpace: 'nowrap' } },
            h(
              'span',
              { style: { fontSize: 11.5, color: C.dim } },
              state.kind === 'ready' ? fill(t('bugs.total'), { n: stories.length }) : '',
            ),
            h(Button, { onClick: () => selection.replace(stories.map((item) => item.id)) }, t('batch.selectAll')),
            h(Button, { onClick: () => void load() }, t('panel.refresh')),
          ),
        ),
        h(SelectionBar, {
          count: selection.count,
          list: selection.list,
          shownIds: stories.map((item) => item.id),
          t,
          busy: false,
          onAction: (action) => setBatch(action),
          onSelectAll: (ids) => selection.replace(ids),
          onClear: () => selection.clear(),
        }),
        h(
          'div',
          { style: { display: 'flex', gap: 12, minHeight: 0, flex: 1 } },
          h(
            'div',
            { style: { display: 'flex', flexDirection: 'column', gap: 10, flex: 1, minWidth: 0, overflow: 'auto', paddingRight: 2 } },
            state.kind !== 'ready'
              ? h(State, { kind: state.kind, message: state.message, onRetry: () => void load(), t })
              : stories.length === 0
                ? h(State, { kind: 'empty', t })
                : stories.map((story) =>
                    h(StoryRow, {
                      key: story.id,
                      story,
                      t,
                      active: openStory === story.id,
                      onOpen: () => setOpenStory(story.id),
                      selected: selection.has(story.id),
                      onSelect: (on) => selection.toggle(story.id, on),
                    }),
                  ),
          ),
          openStory === null
            ? null
            : detail?.kind === 'ready'
              ? h(StoryDetail, {
                  story: detail.story,
                  t,
                  onClose: () => setOpenStory(null),
                  onDone: (result) => {
                    if (result?.removed === true) {
                      setOpenStory(null)
                    } else {
                      setDetailTick((value) => value + 1)
                    }
                  },
                })
              : h(
                  'div',
                  { className: 'zt-drawer', style: { width: 380, flex: 'none', border: `1px solid ${C.line}`, borderRadius: 12, background: C.layer1, alignSelf: 'flex-start' } },
                  h(State, { kind: detail?.kind === 'error' ? 'error' : 'loading', message: detail?.message, t }),
                ),
        ),
        batch === null
          ? null
          : h(BatchModal, {
              kind: 'story',
              action: batch,
              ids: selection.list,
              t,
              onClose: () => setBatch(null),
              onDone: () => {
                setBatch(null)
                selection.clear()
              },
            }),
      )
    }
    /** 面板主体：顶部标题 + 四个页签。 */
    function ZentaoPanel({ t }) {
      const [bootstrap, setBootstrap] = useState({ kind: 'loading' })
      const [tab, setTab] = useState('mine')
      // 登录设置抽屉：账号没配、或接口返回 401 时自动打开。
      const [settingsOpen, setSettingsOpen] = useState(false)
      // 全局搜索点中的条目：切到对应页签后由页签自己打开详情。
      const [jump, setJump] = useState(null)
      // 宽度交给外层布局（width:100% + alignSelf:stretch）。不要用 JS 量视口：
      // Electron 高 DPI 下 clientWidth / innerWidth / devicePixelRatio 三者不自洽，量出来必然偏。
      const load = useCallback(async () => {
        // 已经拿到数据就保持住：置回 loading 会把页签整棵卸载，详情抽屉、勾选和滚动位置全部丢失。
        setBootstrap((previous) => (previous.kind === 'ready' ? previous : { kind: 'loading' }))
        try {
          const body = await api('/bootstrap')
          setBootstrap({ kind: 'ready', ...body })
        } catch (error) {
          // 401 = 没登录或凭据失效，直接引导去填账号。
          if (Number(error?.status) === 401) setSettingsOpen(true)
          setBootstrap({ kind: 'error', message: error instanceof Error ? error.message : String(error) })
        }
      }, [])

      useEffect(() => {
        void load()
        // 写操作成功后广播刷新，页签跟着重新拉一次数据。
        return REFRESH.on(() => void load())
      }, [load])

      // 产品和迭代都按 ID 倒序（最新的排最前）；Host 侧已排过，这里再兜一次底。
      const byIdDesc = (list) => [...list].sort((left, right) => Number(right.id) - Number(left.id))
      const products = useMemo(
        () => (bootstrap.kind === 'ready' ? byIdDesc(bootstrap.products) : []),
        [bootstrap],
      )
      const executions = useMemo(
        () => (bootstrap.kind === 'ready' ? byIdDesc(bootstrap.executions) : []),
        [bootstrap],
      )
      // 下拉选项数据（新建 / 指派用），模块级共享，供 ActionBar / CreateButton 读取。
      USER_LIST = bootstrap.kind === 'ready' ? bootstrap.users ?? [] : []
      PRODUCT_LIST = products
      EXECUTION_LIST = executions

      const tabs = [
        { id: 'mine', label: t('tab.mine') },
        { id: 'bugs', label: t('tab.bugs') },
        { id: 'tasks', label: t('tab.tasks') },
        { id: 'stories', label: t('tab.stories') },
      ]

      return h(
        'div',
        {
          'data-dsh-zentao-panel': '',
          style: {
            display: 'flex',
            flexDirection: 'column',
            gap: 14,
            height: '100%',
            flex: '1 1 auto',
            alignSelf: 'stretch',
            minHeight: 0,
            width: '100%',
            maxWidth: '100%',
            minWidth: 0,
            overflow: 'hidden',
            position: 'relative',
            padding: '18px 20px',
            boxSizing: 'border-box',
            color: C.text,
            background: `color-mix(in srgb, ${C.layer2} 90%, transparent)`,
          },
        },
        h(
          'div',
          { className: 'zt-hero', style: { display: 'flex', alignItems: 'center', gap: 12, rowGap: 10, flexWrap: 'wrap', flex: 'none' } },
          h(
            'span',
            {
              style: {
                width: 40,
                height: 40,
                flex: 'none',
                borderRadius: 13,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: C.brand,
                background: `linear-gradient(160deg, color-mix(in srgb, ${C.brand} 18%, transparent), color-mix(in srgb, ${C.brand} 8%, transparent))`,
                border: `1px solid color-mix(in srgb, ${C.brand} 30%, transparent)`,
                boxShadow: `0 6px 16px -8px color-mix(in srgb, ${C.brand} 70%, transparent)`,
              },
            },
            h(
              'svg',
              { viewBox: '0 0 16 16', width: 18, height: 18, fill: 'none', stroke: 'currentColor', strokeWidth: 1.4, strokeLinecap: 'round', strokeLinejoin: 'round' },
              h('rect', { x: 1.75, y: 2.25, width: 12.5, height: 11.5, rx: 2 }),
              h('path', { d: 'M1.75 6h12.5' }),
              h('path', { d: 'M6 6v7.75' }),
            ),
          ),
          h(
            'span',
            { style: { display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0, flex: '1 1 160px' } },
            h('span', { style: { fontSize: 17, fontWeight: 700, letterSpacing: '-0.015em', whiteSpace: 'nowrap' } }, t('panel.title')),
            bootstrap.kind === 'ready'
              ? h(
                  'span',
                  { style: { fontSize: 11.5, color: C.dim, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' } },
                  fill(t('panel.summary'), {
                    user: bootstrap.user.realname || bootstrap.user.account,
                    p: products.length,
                    e: executions.length,
                  }),
                )
              : null,
          ),
          tab === 'bugs'
            ? h(CreateButton, { kind: 'bug', t, onDone: () => REFRESH.emit() })
            : tab === 'tasks'
              ? h(CreateButton, { kind: 'task', t, onDone: () => REFRESH.emit() })
              : tab === 'stories'
                ? h(CreateButton, { kind: 'story', t, onDone: () => REFRESH.emit() })
                : null,
          h(SearchBox, {
            t,
            onPick: (hit) => {
              setJump(hit)
              setTab(hit.kind === 'bug' ? 'bugs' : hit.kind === 'task' ? 'tasks' : 'stories')
            },
          }),
          h(Button, { onClick: () => setSettingsOpen(true) }, t('settings.open')),
          // 面板头的「刷新」要连当前页签的列表一起刷新，否则用户点了看不到新数据。
          h(
            Button,
            {
              onClick: () => {
                REFRESH.emit()
                void load()
              },
            },
            t('panel.refresh'),
          ),
        ),
        h(
          'div',
          {
            style: {
              display: 'inline-flex',
              gap: 2,
              padding: 3,
              borderRadius: 10,
              border: `1px solid ${C.line}`,
              background: C.layer2,
              alignSelf: 'flex-start',
              flex: 'none',
            },
          },
          tabs.map((item) =>
            h(
              'button',
              {
                key: item.id,
                type: 'button',
                className: 'zt-tab',
                'data-on': tab === item.id ? '1' : undefined,
                onClick: () => setTab(item.id),
              },
              item.label,
            ),
          ),
        ),
        bootstrap.kind === 'loading'
          ? h(State, { kind: 'loading', t })
          : bootstrap.kind === 'error'
            ? h(State, { kind: 'error', message: bootstrap.message, onRetry: () => void load(), t })
            : tab === 'bugs'
              ? h(BugsTab, { bootstrap, products, t, jump, onJumped: () => setJump(null) })
              : tab === 'mine'
                ? h(MineTab, { t, jump, onJumped: () => setJump(null) })
                : tab === 'tasks'
                  ? h(TasksTab, { executions, t, jump, onJumped: () => setJump(null) })
                  : h(StoriesTab, { products, t, jump, onJumped: () => setJump(null) }),
        settingsOpen
          ? h(SettingsDrawer, {
              t,
              onClose: () => setSettingsOpen(false),
              onSaved: () => {
                setSettingsOpen(false)
                void load()
              },
            })
          : null,
      )
    }

    /** 左侧栏入口图标（只画字形，行本身由宿主管）。 */
    function ZentaoIcon({ size }) {
      return h(
        'svg',
        {
          'data-dsh-panel-entry': PANEL_ID,
          viewBox: '0 0 16 16',
          width: size,
          height: size,
          fill: 'none',
          stroke: 'currentColor',
          strokeWidth: 1.5,
          strokeLinecap: 'round',
          strokeLinejoin: 'round',
          'aria-hidden': 'true',
        },
        h('rect', { x: 1.75, y: 2.25, width: 12.5, height: 11.5, rx: 2 }),
        h('path', { d: 'M1.75 6h12.5' }),
        h('path', { d: 'M6 6v7.75' }),
      )
    }

    return {
      inject: ['slots', 'locale'],
      apply(ctx) {
        ctx.effect(() => {
          try {
            return ctx.locale.register(NS, { zh, en })
          } catch {
            return () => {}
          }
        }, 'zentao-panel: dictionaries')

        // 面板样式（hover / 选中态 / 滚动条），卸载时随 effect 一起清理。
        ctx.effect(() => {
          const style = document.createElement('style')
          style.setAttribute('data-dsh-zentao-panel', '')
          style.textContent = PANEL_CSS
          document.head.appendChild(style)
          return () => style.remove()
        }, 'zentao-panel: styles')

        const t = ctx.locale.bind(NS)

        // 取不到 uiWorkspace 时（例如精简宿主），「转为会话」降级为复制到剪贴板。
        try {
          UI_WORKSPACE = ctx.get('uiWorkspace') ?? null
        } catch {
          UI_WORKSPACE = null
        }

        ctx.effect(() => {
          const disposers = [
            ctx.slots.inject('sidebar.panellist', () =>
              ctx.slots.register(
                { name: 'sidebar.panellist', id: PANEL_ID, order: PANEL_ORDER, label: () => t('entry.label') },
                ZentaoIcon,
              ),
            ),
            ctx.slots.inject('main', () =>
              ctx.slots.register({ name: 'main', key: PANEL_ID }, () => h(ZentaoPanel, { t })),
            ),
          ]
          return () => {
            for (const dispose of disposers) dispose()
          }
        }, 'zentao-panel: placement')
      },
    }
  },
})