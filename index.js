/**
 * 禅道面板 Host 半边。
 *
 * 职责：拿账号密码向禅道 OpenAPI v2 换 token（内存缓存，401 时自动重登），
 * 把面板要用的数据收敛成精简 JSON，通过 webServer 暴露同源只读路由
 * `/zentao-panel/api/*` 给 Web 页面里的 Client 半边取数。
 *
 * 为什么不让前端直连禅道：token 必须留在 Host 侧，浏览器同源请求也避开了 CORS。
 */

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { homedir } from 'node:os'

/**
 * 地址 / 账号 / 密码一律不写进插件代码：首次启动是空的，
 * 由用户在面板「设置」里填写后落到 profile 数据目录（见 ACCOUNT_FILE）。
 * 这里保留空默认值只是为了给 AccountStore 一个同形状的兜底。
 */
const DEFAULT_BASE_URL = ''
const DEFAULT_ACCOUNT = ''
const DEFAULT_PASSWORD = ''
/** 本插件所有 HTTP 路由的公共前缀。 */
const ROUTE_PREFIX = '/zentao-panel/api'
/** 单次禅道请求超时（毫秒）。 */
const REQUEST_TIMEOUT_MS = 60000
/** 「我的待办」聚合结果缓存时长（毫秒），避免每次刷新打十几次禅道。 */
const MINE_TTL_MS = 60000
/** 产品/迭代列表缓存时长（毫秒）。 */
const LIST_TTL_MS = 5 * 60 * 1000

/** 账号密码落在 profile 数据目录里，不进插件配置文件。 */
const PROFILE_DIR = process.env.DSH_PROFILE_DIR || join(homedir(), '.dsh', 'profiles', 'desktop')
/** 凭据文件路径（仅本机可读）。 */
const ACCOUNT_FILE = join(PROFILE_DIR, 'data', 'dsh-zentao-panel', 'account.json')
/** 请求体上限，防止被塞爆内存。 */
const MAX_BODY_BYTES = 64 * 1024

/** 只允许本机回环访问，避免把带 token 的代理暴露给局域网。 */
const LOOPBACK_HOSTS = new Set(['127.0.0.1', '::1', '::ffff:127.0.0.1', 'localhost'])

/** 缺陷状态码 → 中文。 */
const BUG_STATUS_TEXT = { active: '激活', resolved: '已解决', closed: '已关闭', postponed: '已延期' }
/** 缺陷严重程度码 → 中文（禅道 1 最高）。 */
const SEVERITY_TEXT = { 1: '致命', 2: '严重', 3: '一般', 4: '建议' }
/** 优先级码 → 中文。 */
const PRI_TEXT = { 1: '紧急', 2: '高', 3: '中', 4: '低' }
/** 任务状态码 → 中文。 */
const TASK_STATUS_TEXT = { wait: '未开始', doing: '进行中', done: '已完成', pause: '已暂停', cancelled: '已取消', closed: '已关闭' }
/** 需求状态码 → 中文。 */
const STORY_STATUS_TEXT = { draft: '草稿', active: '激活', reviewing: '评审中', changed: '已变更', closed: '已关闭' }
/** 各对象可执行的动作及其接口契约（字段白名单 + 数字字段）。 */
const ACTION_SPEC = {
  bug: {
    resolve: {
      collection: 'bugs',
      suffix: '/resolve',
      method: 'PUT',
      fields: ['resolution', 'resolvedDate', 'resolvedBuild', 'assignedTo', 'comment'],
    },
    close: { collection: 'bugs', suffix: '/close', method: 'PUT', fields: ['comment'] },
    activate: {
      collection: 'bugs',
      suffix: '/activate',
      method: 'PUT',
      fields: ['openedBuild', 'assignedTo', 'comment'],
    },
    edit: {
      collection: 'bugs',
      suffix: '',
      method: 'PUT',
      fields: ['title', 'severity', 'pri', 'type', 'steps', 'project', 'execution', 'story'],
      numeric: ['severity', 'pri', 'project', 'execution', 'story'],
    },
    delete: { collection: 'bugs', suffix: '', method: 'DELETE', fields: [] },
  },
  task: {
    start: {
      collection: 'tasks',
      suffix: '/start',
      method: 'PUT',
      fields: ['realStarted', 'consumed', 'left', 'assignedTo', 'comment'],
      numeric: ['consumed', 'left'],
    },
    finish: {
      collection: 'tasks',
      suffix: '/finish',
      method: 'PUT',
      fields: ['currentConsumed', 'realStarted', 'finishedDate', 'assignedTo', 'consumed', 'comment'],
      numeric: ['currentConsumed', 'consumed'],
    },
    close: { collection: 'tasks', suffix: '/close', method: 'PUT', fields: ['comment'] },
    activate: {
      collection: 'tasks',
      suffix: '/activate',
      method: 'PUT',
      fields: ['left', 'assignedTo', 'comment'],
      numeric: ['left'],
    },
    edit: {
      collection: 'tasks',
      suffix: '',
      method: 'PUT',
      fields: ['name', 'assignedTo', 'pri', 'estimate', 'estStarted', 'deadline', 'desc'],
      numeric: ['pri', 'estimate'],
    },
    delete: { collection: 'tasks', suffix: '', method: 'DELETE', fields: [] },
  },
  story: {
    edit: {
      collection: 'stories',
      suffix: '',
      method: 'PUT',
      fields: ['title', 'pri', 'estimate', 'assignedTo'],
      numeric: ['pri', 'estimate'],
    },
    change: {
      collection: 'stories',
      suffix: '/change',
      method: 'PUT',
      fields: ['title', 'reviewer', 'spec', 'verify'],
    },
    close: {
      collection: 'stories',
      suffix: '/close',
      method: 'PUT',
      fields: ['closedReason', 'comment'],
    },
    activate: {
      collection: 'stories',
      suffix: '/activate',
      method: 'PUT',
      fields: ['assignedTo', 'comment'],
    },
    delete: { collection: 'stories', suffix: '', method: 'DELETE', fields: [] },
  },
}

/** 各对象的新建接口契约。 */
const CREATE_SPEC = {
  bug: {
    collection: 'bugs',
    fields: ['productID', 'title', 'openedBuild', 'project', 'execution', 'severity', 'pri', 'type', 'steps', 'story'],
    numeric: ['productID', 'project', 'execution', 'severity', 'pri', 'story'],
    required: ['productID', 'title'],
  },
  task: {
    collection: 'tasks',
    fields: ['name', 'executionID', 'type', 'assignedTo', 'estStarted', 'deadline', 'pri', 'estimate', 'desc', 'story'],
    numeric: ['executionID', 'pri', 'estimate', 'story'],
    required: ['name', 'executionID'],
  },
  story: {
    collection: 'stories',
    fields: ['productID', 'title', 'pri', 'estimate', 'spec', 'verify', 'assignedTo', 'category', 'source'],
    numeric: ['productID', 'pri', 'estimate'],
    required: ['productID', 'title'],
  },
}

/**
 * 从表单里挑出白名单字段，数字字段转成数字，空字符串视为未填。
 * @param {Record<string, unknown>} input - 前端提交的值。
 * @param {string[]} fields - 允许的字段。
 * @param {string[]} [numeric] - 需要转数字的字段。
 */
function pickFields(input, fields, numeric) {
  const result = {}
  for (const key of fields) {
    const raw = input?.[key]
    if (raw === undefined || raw === null || raw === '') continue
    if (numeric?.includes(key)) {
      const value = Number(raw)
      if (!Number.isFinite(value)) continue
      result[key] = value
    } else {
      result[key] = raw
    }
  }
  return result
}

/** 缺陷类型码 → 中文。 */
const BUG_TYPE_TEXT = {
  codeerror: '代码错误',
  config: '配置相关',
  install: '安装部署',
  security: '安全相关',
  performance: '性能问题',
  standard: '标准规范',
  automation: '测试脚本',
  designdefect: '设计缺陷',
  others: '其他',
}
/** 需求阶段码 → 中文。 */
const STORY_STAGE_TEXT = {
  wait: '未开始',
  planned: '已计划',
  // 禅道里这个值在不同版本写成 projeted / projected，两个都收。
  projeted: '已立项',
  projected: '已立项',
  developing: '研发中',
  developed: '研发完毕',
  testing: '测试中',
  tested: '测试完毕',
  verified: '已验收',
  released: '已发布',
  closed: '已关闭',
}
/** 操作历史里的动作码 → 中文。 */
const ACTION_TEXT = {
  opened: '创建',
  edited: '编辑',
  assigned: '指派',
  resolved: '解决',
  closed: '关闭',
  activated: '激活',
  started: '开始',
  finished: '完成',
  paused: '暂停',
  resumed: '恢复',
  changed: '变更',
  commented: '备注',
  reviewed: '评审',
  confirmed: '确认',
  deleted: '删除',
  undeleted: '还原',
  undeletedby: '还原',
  syncdocs: '同步文档',
}
/** 缺陷解决方案码 → 中文。 */
const RESOLUTION_TEXT = {
  fixed: '已修复',
  notrepro: '无法重现',
  bydesign: '设计如此',
  duplicate: '重复缺陷',
  external: '外部原因',
  postponed: '延期处理',
  willnotfix: '不予解决',
  tostory: '转为需求',
}

/**
 * 判断请求是否来自本机（回环地址或 localhost Host 头）。
 * @param {import('node:http').IncomingMessage} req - HTTP 请求。
 * @returns {boolean} 允许访问时为 true。
 */
function isLoopback(req) {
  const remote = req.socket?.remoteAddress ?? ''
  if (LOOPBACK_HOSTS.has(remote)) return true
  const host = String(req.headers.host ?? '').replace(/:\d+$/, '')
  return LOOPBACK_HOSTS.has(host)
}

/**
 * 写一个 JSON 响应。
 * @param {import('node:http').ServerResponse} res - HTTP 响应。
 * @param {number} status - 状态码。
 * @param {unknown} payload - 响应体。
 */
function writeJson(res, status, payload) {
  res.writeHead(status, {
    'cache-control': 'no-store',
    'content-type': 'application/json; charset=utf-8',
  })
  res.end(JSON.stringify(payload))
}

/** 去掉 HTML 标签，把禅道富文本步骤转成纯文本（前端只渲染文本，不解析 HTML）。 */
function stripHtml(value) {
  if (typeof value !== 'string') return ''
  return value
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

/** 把禅道返回的时间值收敛成字符串。 */
function textOf(value) {
  if (value === null || value === undefined) return ''
  if (typeof value === 'object') {
    const parts = Object.values(value)
      .flat()
      .map((item) => String(item ?? '').trim())
      .filter((item) => item !== '')
    return parts.join('；')
  }
  return String(value)
}

/**
 * 禅道 OpenAPI 客户端：负责登录换 token、401 自动重登与常用查询。
 */
/**
 * 账号密码存储：读写 profile 下的 account.json（权限 600）。
 * 文件不存在时回落到插件配置里的默认值，方便首次使用。
 */
class AccountStore {
  /**
   * @param {string} file - 凭据文件绝对路径。
   * @param {{ baseUrl: string, account: string, password: string }} defaults - 插件配置里的默认值。
   */
  constructor(file, defaults) {
    this.file = file
    this.defaults = defaults
    /** @type {{ baseUrl: string, account: string, password: string, stored: boolean } | undefined} */
    this.value = undefined
  }

  /** 读取当前凭据（带内存缓存）。 */
  read() {
    if (this.value !== undefined) return this.value
    let stored = {}
    try {
      stored = JSON.parse(readFileSync(this.file, 'utf8')) ?? {}
    } catch {
      stored = {}
    }
    const account = String(stored.account ?? '').trim()
    // loggedOut：用户主动退出登录后不再回落到插件配置里的默认密码。
    const loggedOut = stored.loggedOut === true
    const password = loggedOut ? '' : String(stored.password ?? '')
    this.value = {
      baseUrl: String(stored.baseUrl ?? '').trim().replace(/\/+$/, '') || this.defaults.baseUrl,
      account: account || this.defaults.account,
      // 退出登录后不回落到默认密码，否则「退出」等于没退。
      password: loggedOut ? '' : password || this.defaults.password,
      // 是否真的落过盘（用于界面提示「当前用的是默认账号」）。
      stored: Boolean(account && password),
    }
    return this.value
  }

  /**
   * 覆写凭据。
   * @param {{ baseUrl: string, account: string, password: string }} next - 已验证过的凭据。
   */
  save(next) {
    const payload = { baseUrl: next.baseUrl, account: next.account, password: next.password, loggedOut: false }
    mkdirSync(dirname(this.file), { recursive: true })
    writeFileSync(this.file, JSON.stringify(payload, null, 2), { mode: 0o600 })
    this.value = { ...payload, stored: true }
  }

  /** 退出登录：保留地址与账号，只抹掉密码。 */
  clear() {
    try {
      const current = this.read()
      mkdirSync(dirname(this.file), { recursive: true })
      writeFileSync(
        this.file,
        JSON.stringify(
          { baseUrl: current.baseUrl, account: current.account, password: '', loggedOut: true },
          null,
          2,
        ),
        { mode: 0o600 },
      )
    } catch {
      // 退出登录失败不阻塞界面。
    }
    this.value = undefined
  }
}

/**
 * 读取并解析 JSON 请求体（超限直接截断）。
 * @param {any} req - Node 请求对象。
 * @returns {Promise<any>} 解析结果，非法 JSON 返回空对象。
 */
function readJsonBody(req) {
  return new Promise((resolve) => {
    let raw = ''
    req.on('data', (chunk) => {
      raw += chunk
      if (raw.length > MAX_BODY_BYTES) req.destroy()
    })
    req.on('end', () => {
      try {
        resolve(JSON.parse(raw || '{}'))
      } catch {
        resolve({})
      }
    })
    req.on('error', () => resolve({}))
  })
}

class ZentaoClient {
  /**
   * @param {{ baseUrl?: string, account?: string, password?: string }} config - 插件配置。
   */
  constructor(config, store) {
    /** @type {AccountStore | undefined} 凭据存储（临时探测客户端不传）。 */
    this.store = store
    /** @type {{ baseUrl: string, account: string, password: string }} */
    this.defaults = {
      baseUrl: String(config?.baseUrl ?? DEFAULT_BASE_URL).replace(/\/+$/, ''),
      account: String(config?.account ?? DEFAULT_ACCOUNT),
      password: String(config?.password ?? DEFAULT_PASSWORD),
    }
    /** @type {{ token: string, user: Record<string, unknown> } | undefined} */
    this.session = undefined
    /** 登录互斥，避免并发请求同时登录。 */
    this.loginPromise = undefined
    /** @type {{ at: number, value: unknown } | undefined} */
    this.mineCache = undefined
    /** @type {Map<string, string> | undefined} */
    this.userNames = undefined
    /** @type {{ at: number, value: Array<{ id: number, name: string }> } | undefined} */
    this.productsCache = undefined
    /** @type {{ at: number, value: Array<Record<string, unknown>> } | undefined} */
    this.executionsCache = undefined
    /** @type {{ at: number, value: Array<{ account: string, realname: string }> } | undefined} */
    this.usersCache = undefined
    /** @type {Map<string, { at: number, value: unknown }>} 全局搜索结果缓存 */
    this.searchCache = new Map()
  }

  /** 当前生效的配置（有 store 时以文件为准）。 */
  get settings() {
    return this.store ? this.store.read() : this.defaults
  }

  get baseUrl() {
    return this.settings.baseUrl
  }

  get account() {
    return this.settings.account
  }

  get password() {
    return this.settings.password
  }

  /** 清空会话与各类缓存（换账号、退出登录时调用）。 */
  reset() {
    this.session = undefined
    this.loginPromise = undefined
    this.mineCache = undefined
    this.userNames = undefined
    this.productsCache = undefined
    this.executionsCache = undefined
    this.usersCache = undefined
    this.searchCache = new Map()
  }

  /**
   * 登录换取 token。
   * @returns {Promise<{ token: string, user: Record<string, unknown> }>} 会话信息。
   */
  async login() {
    // 代码里不存地址和账号，没配置就明确提示去设置里填。
    if (this.baseUrl === '' || this.account === '' || this.password === '') {
      throw Object.assign(new Error('还没有配置禅道地址或账号，请点右上角「设置」填写后保存'), { status: 401 })
    }
    const response = await fetch(`${this.baseUrl}/users/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ account: this.account, password: this.password }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    })
    const body = await response.text()
    let payload
    try {
      payload = JSON.parse(body)
    } catch {
      throw new Error(`禅道登录返回非 JSON（HTTP ${response.status}）：${body.slice(0, 120)}`)
    }
    if (!response.ok || payload.status !== 'success' || typeof payload.token !== 'string') {
      const detail = textOf(payload.error) || body.slice(0, 120)
      const error = new Error(`禅道登录失败（HTTP ${response.status}）：${detail}`)
      // 401 让前端识别成「需要重新填账号」。
      error.status = 401
      throw error
    }
    return { token: payload.token, user: payload.user ?? {} }
  }

  /**
   * 取当前会话，没有则登录。
   * @returns {Promise<{ token: string, user: Record<string, unknown> }>} 会话信息。
   */
  async ensureSession() {
    if (this.session !== undefined) return this.session
    if (this.loginPromise === undefined) {
      this.loginPromise = this.login().then(
        (session) => {
          this.session = session
          this.loginPromise = undefined
          return session
        },
        (error) => {
          this.loginPromise = undefined
          throw error
        },
      )
    }
    return this.loginPromise
  }

  /**
   * 带 token 请求禅道；遇到 401 自动重登重试一次。
   * @param {string} path - 以 / 开头的相对路径（可带 query）。
   * @param {{ method?: string, body?: any }} [options] - 写操作时传方法与请求体。
   * @returns {Promise<any>} 解析后的 JSON。
   */
  async request(path, options) {
    const session = await this.ensureSession()
    const call = async (token) => {
      /** @type {any} */
      const init = {
        headers: { token },
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      }
      if (options?.method && options.method !== 'GET') {
        init.method = options.method
        init.headers['content-type'] = 'application/json'
        if (options.body !== undefined) init.body = JSON.stringify(options.body)
      }
      const response = await fetch(`${this.baseUrl}${path}`, init)
      const body = await response.text()
      let payload
      let empty = false
      if (body === '') {
        // 禅道在会话刚失效/并发重置时可能返回 200 空体，交给上层重登重试。
        empty = true
        payload = {}
      } else {
        try {
          payload = JSON.parse(body)
        } catch {
          throw new Error(`禅道接口返回非 JSON（${path}，HTTP ${response.status}）`)
        }
      }
      return { response, payload, empty }
    }
    let result = await call(session.token)
    if (result.response.status === 401 || result.empty || result.payload?.status === 'fail') {
      // 会话失效或并发重置：丢掉旧会话重登一次再试。
      this.session = undefined
      const fresh = await this.ensureSession()
      result = await call(fresh.token)
    }
    if (result.empty) {
      throw Object.assign(new Error(`禅道接口返回空响应（${path}）`), { status: 502 })
    }
    if (!result.response.ok || result.payload?.status === 'fail' || result.payload?.status === 'failed') {
      const upstreamStatus = result.response.status
      const forbidden = upstreamStatus === 403 || textOf(result.payload?.error).includes('Access not allowed')
      const detail =
        textOf(result.payload?.error) ||
        textOf(result.payload?.reason) ||
        textOf(result.payload?.message) ||
        `HTTP ${result.response.status}`
      const label = forbidden
        ? `当前禅道账号没有该操作权限（${path}）：${detail}`
        : `禅道接口错误（${path}）：${detail}`
      throw Object.assign(new Error(label), { status: forbidden ? 403 : 502 })
    }
    return result.payload
  }

  /**
   * 取详情对象：禅道登录后紧接的首次详情请求偶发返回无关结构，
   * 这里缺键时重试一次，仍缺才判定不存在。
   * @param {string} path - 详情接口路径。
   * @param {string} key - 期望的对象键（bug | task | story）。
   */
  async detail(path, key) {
    let payload = await this.request(path)
    if (payload?.[key] === undefined || payload?.[key] === null) {
      // 并发请求把会话撞掉时，详情接口会短暂返回无关结构：重登后再取一次。
      await new Promise((resolve) => setTimeout(resolve, 300))
      this.reset()
      payload = await this.request(path)
    }
    if (payload?.[key] === undefined || payload?.[key] === null) {
      throw Object.assign(new Error(`未找到对象（${path}）`), { status: 404 })
    }
    return payload
  }

  /** 产品列表（5 分钟缓存，面板每次刷新都要用名称补全产品标题）。 */
  async products() {
    const now = Date.now()
    if (this.productsCache !== undefined && now - this.productsCache.at < LIST_TTL_MS) return this.productsCache.value
    const payload = await this.request('/products')
    const value = (Array.isArray(payload.products) ? payload.products : [])
      .filter((item) => item && item.status !== 'closed')
      .map((item) => ({ id: Number(item.id), name: String(item.name ?? '') }))
      // 产品按 ID 倒序（最新的排最前）。
      .sort((left, right) => right.id - left.id)
    this.productsCache = { at: now, value }
    return value
  }

  /** 迭代列表（5 分钟缓存）。 */
  async executions() {
    const now = Date.now()
    if (this.executionsCache !== undefined && now - this.executionsCache.at < LIST_TTL_MS) {
      return /** @type {any} */ (this.executionsCache.value)
    }
    const payload = await this.request('/executions?status=all&limit=100')
    const value = (Array.isArray(payload.executions) ? payload.executions : [])
      .map((item) => ({
        id: Number(item.id),
        name: String(item.name ?? ''),
        project: Number(item.project ?? 0),
        status: String(item.status ?? ''),
        begin: textOf(item.begin),
        end: textOf(item.end),
      }))
      .filter((item) => item.id > 0)
      // 迭代按 ID 倒序（最新的排最前）。
      .sort((left, right) => right.id - left.id)
    this.executionsCache = { at: now, value }
    return value
  }

  /** 账号 → 真实姓名 映射（结果缓存）。 */
  async names() {
    if (this.userNames !== undefined) return this.userNames
    const map = new Map()
    try {
      const payload = await this.request('/users')
      for (const user of Array.isArray(payload.users) ? payload.users : []) {
        const account = String(user?.account ?? '')
        if (account === '') continue
        map.set(account, String(user.realname || account))
      }
    } catch {
      // 拿不到用户表不影响主流程，退化成显示账号。
    }
    this.userNames = map
    return map
  }

  /**
   * 产品下的缺陷列表。
   * @param {number} product - 产品 ID。
   * @param {string} browseType - 浏览类型：all / unclosed / assignedtome。
   * @param {number} page - 页码，从 1 开始。
   * @param {number} limit - 每页条数。
   */
  async bugs(product, browseType, page, limit) {
    const [names, products] = await Promise.all([this.names(), this.products()])
    const nameOf = (id) => products.find((item) => item.id === Number(id))?.name ?? ''
    // product=all 时把各产品的缺陷聚合起来（禅道没有跨产品的缺陷接口）。
    const targets = product === 'all' ? products.map((item) => item.id) : [Number(product)]
    const query = new URLSearchParams({
      browseType,
      pageID: product === 'all' ? '1' : String(page),
      // 前端要整批筛选，这里一次取满（禅道上限 1000）。
      recPerPage: String(Math.min(1000, Math.max(Number(limit) || 30, product === 'all' ? 1000 : 30))),
      orderBy: 'id_desc',
    })
    const pages = await Promise.all(
      targets.map((id) =>
        this.request(`/products/${id}/bugs?${query.toString()}`).catch(() => ({ bugs: [] })),
      ),
    )
    const merged = pages.flatMap((payload) => (Array.isArray(payload.bugs) ? payload.bugs : []))
    const list = merged
      .map((bug) => normalizeBug({ ...bug, productName: bug.productName || nameOf(bug.product) }, names))
      .sort((left, right) => Number(right.id) - Number(left.id))
    if (product === 'all') {
      const start = (page - 1) * limit
      return {
        bugs: list.slice(start, start + limit),
        pager: { recTotal: list.length, recPerPage: limit, pageID: page, pageTotal: Math.max(1, Math.ceil(list.length / limit)) },
      }
    }
    return { bugs: list, pager: pages[0]?.pager ?? {} }
  }

  /**
   * 缺陷详情。
   * @param {number} id - 缺陷 ID。
   */
  async bug(id) {
    const payload = await this.detail(`/bugs/${id}`, 'bug')
    const names = await this.names()
    const bug = payload.bug
    let productName = String(bug.productName ?? '')
    if (productName === '' && Number(bug.product ?? 0) > 0) {
      const products = await this.products().catch(() => [])
      productName = products.find((item) => item.id === Number(bug.product))?.name ?? ''
    }
    const normalized = normalizeBug({ ...bug, productName }, names, true)
    normalized.actions = (Array.isArray(payload.actions) ? payload.actions : []).map((action) => normalizeAction(action, names))
    return normalized
  }

  /**
   * 迭代下的任务。
   * @param {number} execution - 迭代 ID。
   */
  async tasks(execution) {
    const payload = await this.request(`/executions/${execution}/tasks?limit=200`)
    const [names, executions] = await Promise.all([this.names(), this.executions().catch(() => [])])
    const executionName = executions.find((item) => item.id === Number(execution))?.name ?? ''
    const list = (Array.isArray(payload.tasks) ? payload.tasks : [])
      .filter((task) => task && Number(task.deleted ?? 0) === 0)
      .map((task) => normalizeTask({ ...task, executionName: task.executionName || executionName }, names))
    return { tasks: list }
  }

  /**
   * 产品下的需求。
   * @param {number} product - 产品 ID。
   */
  async stories(product) {
    const [names, products] = await Promise.all([this.names(), this.products()])
    const nameOf = (id) => products.find((item) => item.id === Number(id))?.name ?? ''
    // product=all 时聚合全部产品的需求（禅道没有跨产品需求接口）。
    const targets = product === 'all' ? products.map((item) => item.id) : [Number(product)]
    const pages = await Promise.all(
      targets.map((id) =>
        this.request(`/products/${id}/stories?browseType=all&limit=100`).catch(() => ({ stories: [] })),
      ),
    )
    const list = pages
      .flatMap((payload) => (Array.isArray(payload.stories) ? payload.stories : []))
      .filter((story) => story && Number(story.deleted ?? 0) === 0)
      .map((story) => normalizeStory({ ...story, productName: story.productName || nameOf(story.product) }, names))
      .sort((left, right) => Number(right.id) - Number(left.id))
    return { stories: list }
  }

  /**
   * 任务详情。
   * @param {number} id - 任务 ID。
   */
  async task(id) {
    const payload = await this.detail(`/tasks/${id}`, 'task')
    const names = await this.names()
    const task = payload.task ?? payload
    let executionName = String(task.executionName ?? '')
    if (executionName === '' && Number(task.execution ?? 0) > 0) {
      const executions = await this.executions().catch(() => [])
      executionName = executions.find((item) => item.id === Number(task.execution))?.name ?? ''
    }
    const normalized = normalizeTask({ ...task, executionName }, names, true)
    normalized.actions = (Array.isArray(payload.actions) ? payload.actions : []).map((action) => normalizeAction(action, names))
    return normalized
  }

  /**
   * 需求详情。
   * @param {number} id - 需求 ID。
   */
  async story(id) {
    const payload = await this.detail(`/stories/${id}`, 'story')
    const names = await this.names()
    const normalized = normalizeStory(payload.story ?? payload, names, true)
    normalized.actions = (Array.isArray(payload.actions) ? payload.actions : []).map((action) => normalizeAction(action, names))
    return normalized
  }

  /** 用户列表（指派下拉用，5 分钟缓存）。 */
  async users() {
    const now = Date.now()
    if (this.usersCache !== undefined && now - this.usersCache.at < LIST_TTL_MS) return this.usersCache.value
    const payload = await this.request('/users?limit=500')
    const value = (Array.isArray(payload.users) ? payload.users : [])
      .filter((item) => item && !item.deleted)
      .map((item) => ({ account: String(item.account ?? ''), realname: String(item.realname ?? item.account ?? '') }))
      .filter((item) => item.account)
      .sort((left, right) => left.account.localeCompare(right.account))
    this.usersCache = { at: now, value }
    return value
  }

  /**
   * 执行一个业务动作（解决/关闭/激活/编辑/删除）。
   * @param {string} kind - bug | task | story。
   * @param {number} id - 对象 ID。
   * @param {string} action - 动作名。
   * @param {Record<string, unknown>} fields - 表单值（只取白名单字段）。
   */
  async act(kind, id, action, fields) {
    const spec = ACTION_SPEC[kind]?.[action]
    if (!spec) throw Object.assign(new Error(`不支持的操作：${kind}/${action}`), { status: 400 })
    const body = pickFields(fields, spec.fields, spec.numeric)
    if (kind === 'bug' && action === 'resolve' && !body.resolvedBuild) body.resolvedBuild = 'trunk'
    if (kind === 'task' && action === 'finish' && typeof body.finishedDate === 'string' && body.finishedDate.length <= 10) {
      const now = new Date()
      const pad = (value) => String(value).padStart(2, '0')
      const stamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`
      if (!body.realStarted || String(body.realStarted).slice(0, 10) === body.finishedDate) body.finishedDate = stamp
    }
    const payload = await this.request(`/${spec.collection}/${id}${spec.suffix}`, {
      method: spec.method,
      body: spec.method === 'DELETE' ? undefined : body,
    })
    return { ok: true, kind, id, action, result: payload }
  }

  /**
   * 新建对象。
   * @param {string} kind - bug | task | story。
   * @param {Record<string, unknown>} fields - 表单值。
   */
  async create(kind, fields) {
    const spec = CREATE_SPEC[kind]
    if (!spec) throw Object.assign(new Error(`不支持的新建类型：${kind}`), { status: 400 })
    const body = pickFields(fields, spec.fields, spec.numeric)
    for (const key of spec.required) {
      if (body[key] === undefined || body[key] === '') {
        throw Object.assign(new Error(`缺少必填字段：${key}`), { status: 400 })
      }
    }
    const payload = await this.request(`/${spec.collection}`, { method: 'POST', body })
    return { ok: true, kind, result: payload }
  }

  /**
   * 删除对象。
   * @param {string} kind - bug | task | story。
   * @param {number} id - 对象 ID。
   */
  async remove(kind, id) {
    const spec = CREATE_SPEC[kind]
    if (!spec) throw Object.assign(new Error(`不支持的删除类型：${kind}`), { status: 400 })
    const payload = await this.request(`/${spec.collection}/${id}`, { method: 'DELETE' })
    return { ok: true, kind, id, result: payload }
  }

  /**
   * 批量执行同一动作。
   * 逐条串行调用（禅道对并发写不友好），返回成功数与失败明细。
   * @param {string} kind - bug | task | story。
   * @param {number[]} ids - 对象 ID 列表。
   * @param {string} action - 动作名（resolve / close / activate / delete ...）。
   * @param {Record<string, unknown>} fields - 动作字段。
   * @returns {Promise<{kind: string, action: string, total: number, ok: number, failed: Array<{id: number, error: string}>}>} 结果。
   */
  /**
   * 批量指派：禅道没有统一的指派端点，需求改派还必须带 title，
   * 所以按对象类型分派到 edit（需求先读一次详情拿 title）。
   * @param {'bug'|'task'|'story'} kind 对象类型
   * @param {number} id 对象 ID
   * @param {string} account 目标账号
   * @returns {Promise<object>} 禅道返回结果
   */
  async assign(kind, id, account) {
    const target = String(account ?? '').trim()
    if (target === '') throw Object.assign(new Error('缺少必填字段：assignedTo'), { status: 400 })
    if (kind === 'story') {
      const payload = await this.detail(`/stories/${id}`, 'story')
      return this.act('story', id, 'edit', { title: payload.story.title, assignedTo: target })
    }
    return this.act(kind, id, 'edit', { assignedTo: target })
  }

  async batchAct(kind, ids, action, fields) {
    const list = Array.isArray(ids)
      ? ids.map((item) => Number(item)).filter((item) => Number.isFinite(item) && item > 0)
      : []
    if (list.length === 0) throw Object.assign(new Error('没有选中任何对象'), { status: 400 })
    if (list.length > 100) throw Object.assign(new Error('一次最多批量处理 100 条'), { status: 400 })
    const failed = []
    let ok = 0
    for (const id of list) {
      try {
        if (action === 'assign') await this.assign(kind, id, (fields ?? {}).assignedTo)
        else await this.act(kind, id, action, fields ?? {})
        ok += 1
      } catch (error) {
        failed.push({ id, error: error instanceof Error ? error.message : String(error) })
      }
    }
    return { kind, action, total: list.length, ok, failed }
  }

  /**
   * 全局搜索：在可见产品 / 迭代范围内按关键词匹配缺陷、任务、需求。
   * 禅道没有统一的搜索接口，只能各自拉一遍再本地过滤，结果缓存 60 秒。
   * @param {string} keyword 关键词（编号 / 标题 / 处理人）
   * @param {number} limit 每类最多返回条数
   * @returns {Promise<{keyword: string, bugs: object[], tasks: object[], stories: object[]}>}
   */
  async search(keyword, limit = 15) {
    const needle = String(keyword ?? '').trim()
    const size = Math.min(50, Math.max(1, Number(limit) || 15))
    if (needle === '') return { keyword: '', bugs: [], tasks: [], stories: [] }

    const cacheKey = `${needle}::${size}`
    const cached = this.searchCache.get(cacheKey)
    if (cached !== undefined && Date.now() - cached.at < MINE_TTL_MS) return cached.value

    const [products, executions, names] = await Promise.all([this.products(), this.executions(), this.names()])
    const lower = needle.toLowerCase()
    const hit = (...fields) => fields.some((field) => String(field ?? '').toLowerCase().includes(lower))

    const [bugPayloads, taskPayloads, storyPayloads] = await Promise.all([
      Promise.all(
        products.map((item) =>
          this.request(`/products/${item.id}/bugs?browseType=all&pageID=1&recPerPage=500&orderBy=id_desc`).catch(() => ({})),
        ),
      ),
      Promise.all(
        executions
          .slice(0, 12)
          .map((item) => this.request(`/executions/${item.id}/tasks?limit=200`).catch(() => ({}))),
      ),
      Promise.all(
        products.map((item) => this.request(`/products/${item.id}/stories?browseType=all&limit=200`).catch(() => ({}))),
      ),
    ])

    const bugs = bugPayloads
      .flatMap((payload) => (Array.isArray(payload.bugs) ? payload.bugs : []))
      .map((bug) => normalizeBug(bug, names))
      .filter((bug) => hit(bug.id, bug.title, bug.ownerName, bug.assignedToName, bug.productName))
      .sort((left, right) => Number(right.id) - Number(left.id))
      .slice(0, size)

    const tasks = taskPayloads
      .flatMap((payload) => (Array.isArray(payload.tasks) ? payload.tasks : []))
      .map((task) => normalizeTask(task, names))
      .filter((task) => hit(task.id, task.name, task.assignedToName, task.executionName))
      .sort((left, right) => Number(right.id) - Number(left.id))
      .slice(0, size)

    const stories = storyPayloads
      .flatMap((payload) => (Array.isArray(payload.stories) ? payload.stories : []))
      .map((story) => normalizeStory(story, names))
      .filter((story) => hit(story.id, story.title, story.assignedToName, story.productName))
      .sort((left, right) => Number(right.id) - Number(left.id))
      .slice(0, size)

    const value = { keyword: needle, bugs, tasks, stories }
    this.searchCache.set(cacheKey, { at: Date.now(), value })
    return value
  }

  async mine() {
    const now = Date.now()
    if (this.mineCache !== undefined && now - this.mineCache.at < MINE_TTL_MS) {
      return { .../** @type {any} */ (this.mineCache.value), cached: true }
    }
    const [products, executions, names] = await Promise.all([this.products(), this.executions(), this.names()])
    const account = String((await this.ensureSession()).user?.account ?? this.account)

    const bugResults = await Promise.all(
      products.map(async (product) => {
        try {
          const payload = await this.request(
            `/products/${product.id}/bugs?browseType=assignedtome&recPerPage=100&pageID=1`,
          )
          return (Array.isArray(payload.bugs) ? payload.bugs : [])
            .map((bug) => normalizeBug({ ...bug, productName: product.name }, names))
            .filter((bug) => bug.status !== 'closed')
        } catch {
          return []
        }
      }),
    )

    const taskResults = await Promise.all(
      executions.map(async (execution) => {
        try {
          const payload = await this.request(`/executions/${execution.id}/tasks?limit=200`)
          return (Array.isArray(payload.tasks) ? payload.tasks : [])
            .filter((task) => String(task?.assignedTo ?? '') === account)
            .map((task) => normalizeTask({ ...task, executionName: execution.name }, names))
        } catch {
          return []
        }
      }),
    )

    const value = {
      account,
      bugs: bugResults.flat().sort((a, b) => b.id - a.id),
      tasks: taskResults.flat().filter((task) => task.status !== 'done' && task.status !== 'closed'),
    }
    this.mineCache = { at: now, value }
    return { ...value, cached: false }
  }
}

/**
 * 把禅道缺陷对象收敛成面板用的精简结构。
 * @param {any} bug - 禅道原始缺陷。
 * @param {Map<string, string>} names - 账号 → 姓名。
 * @param {boolean} [withDetail] - 是否带上步骤详情。
 */
function normalizeBug(bug, names, withDetail = false) {
  const assignee = String(bug.assignedTo ?? '')
  const openedBy = String(bug.openedBy ?? '')
  const resolvedBy = String(bug.resolvedBy ?? '')
  const type = String(bug.type ?? '')
  const resolution = String(bug.resolution ?? '')
  const normalized = {
    id: Number(bug.id ?? 0),
    title: String(bug.title ?? ''),
    severity: Number(bug.severity ?? 3),
    severityText: SEVERITY_TEXT[Number(bug.severity ?? 3)] ?? '一般',
    pri: Number(bug.pri ?? 3),
    priText: PRI_TEXT[Number(bug.pri ?? 3)] ?? '中',
    status: String(bug.status ?? ''),
    statusText: BUG_STATUS_TEXT[String(bug.status ?? '')] ?? String(bug.status ?? ''),
    type,
    typeText: BUG_TYPE_TEXT[type] ?? type,
    assignedTo: assignee,
    // 禅道把已关闭缺陷的指派字段写成字符串 "closed"，统一替换成占位符。
    assignedToName: assignee === 'closed' ? '—' : (names.get(assignee) ?? assignee),
    assignedDate: textOf(bug.assignedDate),
    openedBy,
    openedByName: names.get(openedBy) ?? openedBy,
    openedDate: textOf(bug.openedDate),
    product: Number(bug.product ?? 0),
    productName: String(bug.productName ?? ''),
    executionName: String(bug.executionName ?? ''),
    projectName: String(bug.projectName ?? ''),
    moduleTitle: String(bug.moduleTitle ?? ''),
    storyTitle: String(bug.storyTitle ?? ''),
    openedBuild: String(bug.openedBuild ?? ''),
    deadline: textOf(bug.deadline),
    resolvedBy,
    resolvedByName: resolvedBy ? (names.get(resolvedBy) ?? resolvedBy) : '',
    // 「处理人」展示用：已关闭缺陷的 assignedTo 被写成 "closed"，真正的负责人是解决者。
    ownerName:
      String(bug.status ?? '') === 'closed'
        ? resolvedBy
          ? (names.get(resolvedBy) ?? resolvedBy)
          : ''
        : assignee === 'closed'
          ? ''
          : (names.get(assignee) ?? assignee),
    resolvedDate: textOf(bug.resolvedDate),
    resolution,
    resolutionText: RESOLUTION_TEXT[resolution] ?? resolution,
    confirmed: Number(bug.confirmed ?? 0),
    keywords: String(bug.keywords ?? ''),
  }
  if (withDetail) {
    normalized.steps = stripHtml(bug.steps)
    normalized.os = String(bug.os ?? '')
    normalized.browser = String(bug.browser ?? '')
    normalized.fileCount = Array.isArray(bug.files) ? bug.files.length : 0
  }
  return normalized
}

/**
 * 把禅道任务对象收敛成面板用的精简结构。
 * @param {any} task - 禅道原始任务。
 * @param {Map<string, string>} names - 账号 → 姓名。
 */
function normalizeTask(task, names, withDetail = false) {
  const assignee = String(task.assignedTo ?? '')
  const openedBy = String(task.openedBy ?? '')
  const finishedBy = String(task.finishedBy ?? '')
  const normalized = {
    id: Number(task.id ?? 0),
    name: String(task.name ?? ''),
    status: String(task.status ?? ''),
    statusText: TASK_STATUS_TEXT[String(task.status ?? '')] ?? String(task.status ?? ''),
    pri: Number(task.pri ?? 3),
    priText: PRI_TEXT[Number(task.pri ?? 3)] ?? '中',
    progress: Number(task.progress ?? 0),
    estimate: Number(task.estimate ?? 0),
    consumed: Number(task.consumed ?? 0),
    left: Number(task.left ?? 0),
    deadline: textOf(task.deadline),
    estStarted: textOf(task.estStarted),
    realStarted: textOf(task.realStarted),
    finishedDate: textOf(task.finishedDate),
    assignedTo: assignee,
    assignedToName: String(task.assignedToRealName ?? '') || names.get(assignee) || assignee,
    openedBy,
    openedByName: names.get(openedBy) ?? openedBy,
    openedDate: textOf(task.openedDate),
    execution: Number(task.execution ?? 0),
    executionName: String(task.executionName ?? ''),
    fromBug: Number(task.fromBug ?? 0),
    childCount: Array.isArray(task.children) ? task.children.length : 0,
    finishedBy,
    finishedByName: finishedBy ? (names.get(finishedBy) ?? finishedBy) : '',
  }
  if (withDetail) {
    normalized.desc = stripHtml(task.desc)
    normalized.storyID = Number(task.story ?? 0)
    normalized.storyTitle = String(task.storyTitle ?? '')
    normalized.storySpec = stripHtml(task.storySpec)
    normalized.storyVerify = stripHtml(task.storyVerify)
    normalized.closedReason = String(task.closedReason ?? '')
  }
  return normalized
}

/**
 * 把禅道需求对象收敛成面板用的精简结构。
 * @param {any} story - 禅道原始需求。
 * @param {Map<string, string>} names - 账号 → 姓名。
 * @param {boolean} [withDetail] - 是否带上需求描述与验收标准。
 */
function normalizeStory(story, names, withDetail = false) {
  const assignee = String(story.assignedTo ?? '')
  const openedBy = String(story.openedBy ?? '')
  const stage = String(story.stage ?? '')
  const normalized = {
    id: Number(story.id ?? 0),
    title: String(story.title ?? ''),
    status: String(story.status ?? ''),
    statusText: STORY_STATUS_TEXT[String(story.status ?? '')] ?? String(story.status ?? ''),
    stage,
    // 未知阶段不要原样吐英文给界面。
    stageText: STORY_STAGE_TEXT[stage] ?? '',
    pri: Number(story.pri ?? 3),
    priText: PRI_TEXT[Number(story.pri ?? 3)] ?? '中',
    estimate: Number(story.estimate ?? 0),
    assignedTo: assignee,
    // 已关闭需求的指派字段同样会被禅道写成字符串 "closed"。
    assignedToName: assignee === 'closed' ? '—' : (names.get(assignee) ?? assignee),
    openedBy,
    openedByName: names.get(openedBy) ?? openedBy,
    openedDate: textOf(story.openedDate),
    product: Number(story.product ?? 0),
    productName: String(story.productName ?? ''),
    category: String(story.category ?? ''),
    source: String(story.source ?? ''),
    taskCount: Array.isArray(story.tasks) ? story.tasks.length : 0,
    reviewedBy: String(story.reviewedBy ?? ''),
  }
  if (withDetail) {
    normalized.spec = stripHtml(story.spec)
    normalized.verify = stripHtml(story.verify)
    normalized.closedReason = String(story.closedReason ?? '')
  }
  return normalized
}

/**
 * 当前账号视图（绝不回显密码）。
 * @param {ZentaoClient} client - 禅道客户端。
 */
async function configView(client) {
  const settings = client.store ? client.store.read() : { baseUrl: client.baseUrl, account: client.account, password: client.password, stored: false }
  let user = client.session?.user
  let error = ''
  if (!user && settings.password) {
    try {
      user = (await client.ensureSession()).user
    } catch (failure) {
      error = failure instanceof Error ? failure.message : String(failure)
    }
  }
  return {
    baseUrl: settings.baseUrl,
    account: settings.account,
    hasPassword: Boolean(settings.password),
    stored: Boolean(settings.stored),
    loggedIn: Boolean(user),
    user: user ? { account: String(user.account ?? settings.account), realname: String(user.realname ?? '') } : null,
    error,
  }
}

/**
 * 校验账号并保存，保存前先真登录一次，失败不落盘。
 * @param {ZentaoClient} client - 禅道客户端。
 * @param {any} input - 请求体 { baseUrl, account, password }。
 */
async function saveConfig(client, input) {
  const baseUrl = String(input?.baseUrl ?? '').trim().replace(/\/+$/, '')
  const account = String(input?.account ?? '').trim()
  const password = String(input?.password ?? '')
  if (!baseUrl || !account || !password) {
    throw Object.assign(new Error('禅道地址、账号、密码都要填'), { status: 400 })
  }
  // 先用临时客户端试登录，避免把错的密码写进文件。
  const probe = new ZentaoClient({ baseUrl, account, password })
  let session
  try {
    session = await probe.login()
  } catch (failure) {
    throw Object.assign(new Error(failure instanceof Error ? failure.message : String(failure)), { status: 401 })
  }
  client.store?.save({ baseUrl, account, password })
  client.reset()
  client.session = session
  return {
    ok: true,
    user: { account: String(session.user?.account ?? account), realname: String(session.user?.realname ?? '') },
  }
}

/**
 * 归一化一条操作历史（禅道详情接口自带 actions）。
 * @param {Record<string, any>} action - 禅道原始历史项。
 * @param {Map<string, string>} names - 账号 → 姓名。
 */
function normalizeAction(action, names) {
  const actor = String(action.actor ?? '')
  const code = String(action.action ?? '')
  const files = Array.isArray(action.files) ? action.files : []
  return {
    id: Number(action.id ?? 0),
    code,
    text: ACTION_TEXT[code] ?? code,
    actor,
    actorName: names.get(actor) ?? (actor === 'system' ? '系统' : actor),
    date: textOf(action.date),
    comment: stripHtml(action.comment),
    files: files.map((file) => ({
      id: Number(file.id ?? 0),
      title: String(file.title ?? file.name ?? ''),
      size: Number(file.size ?? 0),
    })),
  }
}

/**
 * 把禅道读写能力注册成模型可见的工具，让会话里能直接查/改禅道。
 * @param {any} ctx - 插件上下文（需要 webServer 之外的 tools 服务）。
 * @param {ZentaoClient} client - 禅道客户端（与面板共用登录态与缓存）。
 * @returns {Array<() => void>} 各工具的注销函数。
 */
function registerTools(ctx, client) {
  /** 统一的可空字符串取值。 */
  const pick = (args, key) => {
    const value = args?.[key]
    return value === undefined || value === null || value === '' ? '' : String(value)
  }
  /** 按处理人与关键词过滤（禅道列表接口不支持这些条件）。 */
  const filterItems = (items, owner, keyword) => {
    let list = items
    if (owner !== '') {
      const needle = owner.toLowerCase()
      list = list.filter((item) => {
        const name = String(item.ownerName ?? item.assignedToName ?? '')
        if (needle === 'none') return name === '' || name === '—'
        return name.toLowerCase().includes(needle) || String(item.assignedTo ?? '').toLowerCase().includes(needle)
      })
    }
    if (keyword !== '') {
      const needle = keyword.toLowerCase()
      list = list.filter((item) => `${item.title ?? ''} ${item.name ?? ''}`.toLowerCase().includes(needle))
    }
    return list
  }
  /** 给模型看的一句话摘要。 */
  const summarize = (label, items) => {
    const head = items
      .slice(0, 8)
      .map((item) => {
        const state = item.statusText || item.stageText || ''
        return `#${item.id} ${item.title || item.name || ''}${state ? ` [${state}]` : ''}`
      })
      .join('\n')
    return `${label} 共 ${items.length} 条${head ? `\n${head}${items.length > 8 ? '\n…' : ''}` : ''}`
  }
  /** 工具输出统一 schema：至少带一句 summary。 */
  const output = {
    schema: {
      type: 'object',
      properties: { summary: { type: 'string', description: '一句话结果摘要' } },
      additionalProperties: true,
    },
    render: (_args, value) => [{ type: 'text', text: String(value?.summary ?? JSON.stringify(value)) }],
  }
  const badRequest = (message) => Object.assign(new Error(message), { status: 400 })
  const disposers = []
  const register = (definition) => disposers.push(ctx.tools.register(definition))

  register({
    name: 'zentao_list',
    description:
      '禅道列表查询。object 选 products（产品）/ executions（迭代）/ bugs（缺陷）/ tasks（任务）/ stories（需求）。' +
      '查缺陷或需求时 product 传产品 ID 或 all（全部产品）；查任务时 execution 传迭代 ID，不传则返回指派给我的未完成任务。' +
      'status 支持 unclosed/all/active/resolved/closed 或 task 的 wait/doing/done；owner 传姓名片段或 none（未指派）；keyword 匹配标题。',
    parameters: {
      type: 'object',
      properties: {
        object: { type: 'string', enum: ['products', 'executions', 'bugs', 'tasks', 'stories'], description: '要查询的对象类型' },
        product: { type: 'string', description: '产品 ID，或 all 表示全部产品' },
        execution: { type: 'string', description: '迭代（执行）ID，查任务时使用' },
        status: { type: 'string', description: '状态过滤；留空按未关闭处理' },
        owner: { type: 'string', description: '处理人姓名或账号片段；none 表示未指派' },
        keyword: { type: 'string', description: '标题关键词' },
        limit: { type: 'number', description: '最多返回条数，默认 30，上限 200' },
      },
      required: ['object'],
      additionalProperties: false,
    },
    output,
    execute: async (args) => {
      const object = pick(args, 'object')
      const limit = Math.min(200, Math.max(1, Number(args?.limit) || 30))
      const owner = pick(args, 'owner')
      const keyword = pick(args, 'keyword')
      const status = pick(args, 'status')
      if (object === 'products') {
        const items = await client.products()
        return { object, total: items.length, items, summary: summarize('产品', items) }
      }
      if (object === 'executions') {
        const items = await client.executions()
        return { object, total: items.length, items, summary: summarize('迭代', items) }
      }
      if (object === 'bugs') {
        const product = pick(args, 'product') || 'all'
        const serverView =
          status === '' || status === 'unclosed'
            ? 'unclosed'
            : status === 'all' || status === 'assignedtome'
              ? status
              : 'all'
        const payload = await client.bugs(product, serverView, 1, 1000)
        let items = Array.isArray(payload.bugs) ? payload.bugs : []
        if (status !== '' && status !== 'all' && status !== 'unclosed' && status !== 'assignedtome') {
          items = items.filter((item) => item.status === status)
        }
        items = filterItems(items, owner, keyword).slice(0, limit)
        return { object, total: items.length, items, summary: summarize('缺陷', items) }
      }
      if (object === 'tasks') {
        const execution = pick(args, 'execution')
        let items = []
        if (execution !== '') {
          const payload = await client.tasks(Number(execution))
          items = Array.isArray(payload.tasks) ? payload.tasks : []
        } else {
          const payload = await client.mine()
          items = Array.isArray(payload.tasks) ? payload.tasks : []
        }
        if (status !== '' && status !== 'all') items = items.filter((item) => item.status === status)
        items = filterItems(items, owner, keyword).slice(0, limit)
        return { object, total: items.length, items, summary: summarize('任务', items) }
      }
      if (object === 'stories') {
        const product = pick(args, 'product') || 'all'
        const payload = await client.stories(product)
        let items = Array.isArray(payload.stories) ? payload.stories : []
        if (status !== '' && status !== 'all') items = items.filter((item) => item.status === status)
        items = filterItems(items, owner, keyword).slice(0, limit)
        return { object, total: items.length, items, summary: summarize('需求', items) }
      }
      throw badRequest('object 只能是 products/executions/bugs/tasks/stories')
    },
  })

  register({
    name: 'zentao_get',
    description:
      '读取禅道单个对象的完整详情与操作历史（actions：谁在什么时候做了什么、评论、附件）。object 取 bug/task/story，id 传对象编号。改之前先读，确认当前状态。',
    parameters: {
      type: 'object',
      properties: {
        object: { type: 'string', enum: ['bug', 'task', 'story'], description: '对象类型' },
        id: { type: 'number', description: '对象编号，例如 260' },
      },
      required: ['object', 'id'],
      additionalProperties: false,
    },
    output,
    execute: async (args) => {
      const object = pick(args, 'object')
      const id = Number(args?.id)
      if (!Number.isFinite(id) || id <= 0) throw badRequest('id 必须是正整数')
      const item =
        object === 'bug'
          ? await client.bug(id)
          : object === 'task'
            ? await client.task(id)
            : object === 'story'
              ? await client.story(id)
              : undefined
      if (item === undefined) throw badRequest('object 只能是 bug/task/story')
      const actions = Array.isArray(item.actions) ? item.actions : []
      const title = item.title || item.name || ''
      return {
        object,
        id,
        item,
        actions,
        summary: `${object} #${id} ${title} [${item.statusText ?? ''}]，历史 ${actions.length} 条`,
      }
    },
  })

  register({
    name: 'zentao_create',
    description:
      '在禅道新建对象，会产生真实数据。kind=bug 必填 productID 与 title；kind=task 必填 name 与 executionID（可加 assignedTo/estimate/deadline/pri/desc）；kind=story 必填 productID 与 title（可加 pri/estimate/spec/verify/assignedTo）。',
    parameters: {
      type: 'object',
      properties: {
        kind: { type: 'string', enum: ['bug', 'task', 'story'], description: '要新建的对象类型' },
        fields: { type: 'object', additionalProperties: true, description: '字段键值，按 kind 的必填项传' },
      },
      required: ['kind', 'fields'],
      additionalProperties: false,
    },
    output,
    execute: async (args) => {
      const kind = pick(args, 'kind')
      const fields = args?.fields !== null && typeof args?.fields === 'object' ? args.fields : {}
      const result = await client.create(kind, fields)
      return { kind, result, summary: `已新建 ${kind}：${JSON.stringify(result?.result ?? result)}` }
    },
  })

  register({
    name: 'zentao_act',
    description:
      '对禅道对象执行写操作，会产生真实变更。kind=bug 支持 resolve/close/activate/edit/delete；kind=task 支持 start/finish/close/activate/edit/delete；kind=story 支持 edit/change/close/activate/delete。' +
      'fields 里可以带 comment（会写进禅道操作历史）。resolve 必填 resolution（fixed/notrepro/bydesign/duplicate/external/postponed/willnotfix/tostory）；task 的 start 必填 realStarted，finish 必填 currentConsumed/realStarted/finishedDate；story 的 change 必填 reviewer，close 必填 closedReason。',
    parameters: {
      type: 'object',
      properties: {
        kind: { type: 'string', enum: ['bug', 'task', 'story'], description: '对象类型' },
        id: { type: 'number', description: '对象编号' },
        action: { type: 'string', description: '动作：resolve/close/activate/edit/delete/start/finish/change' },
        fields: { type: 'object', additionalProperties: true, description: '动作参数，例如 { comment, resolution }' },
      },
      required: ['kind', 'id', 'action'],
      additionalProperties: false,
    },
    output,
    execute: async (args) => {
      const kind = pick(args, 'kind')
      const action = pick(args, 'action')
      const id = Number(args?.id)
      if (!Number.isFinite(id) || id <= 0) throw badRequest('id 必须是正整数')
      if (action === '') throw badRequest('action 不能为空')
      const fields = args?.fields !== null && typeof args?.fields === 'object' ? args.fields : {}
      const result = await client.act(kind, id, action, fields)
      return { kind, id, action, result, summary: `已对 ${kind} #${id} 执行 ${action}` }
    },
  })

  return disposers
}

/**
 * 构建本插件注册到 webServer 的只读路由表。
 * @param {ZentaoClient} client - 禅道客户端。
 * @returns {Array<{ kind: 'exact', path: string, handler: (req: any, res: any) => Promise<void> }>} 路由。
 */
function buildRoutes(client) {
  /**
   * 统一包装：回环校验 + 异常转 JSON 错误。
   * @param {(url: URL) => Promise<unknown>} run - 业务处理。
   */
  const handler = (run) => async (req, res) => {
    if (!isLoopback(req)) {
      writeJson(res, 403, { error: 'forbidden: loopback-only' })
      return
    }
    const url = new URL(req.url ?? '/', 'http://localhost')
    try {
      writeJson(res, 200, await run(url, req))
    } catch (error) {
      // 业务错误可以自带 status（如 401 未登录、400 参数不全），默认按网关错误处理。
      const status = Number(error?.status) || 502
      writeJson(res, status, { error: error instanceof Error ? error.message : String(error) })
    }
  }

  /** 读取必填数字型 query 参数。 */
  const numberParam = (url, name) => {
    const raw = url.searchParams.get(name)
    const value = Number(raw)
    if (!Number.isFinite(value) || value <= 0) throw new Error(`缺少或非法的参数 ${name}`)
    return value
  }

  return [
    {
      kind: 'exact',
      path: `${ROUTE_PREFIX}/bootstrap`,
      handler: handler(async () => {
        const [session, products, executions, users] = await Promise.all([
          client.ensureSession(),
          client.products(),
          client.executions(),
          client.users().catch(() => []),
        ])
        return {
          user: {
            account: String(session.user?.account ?? ''),
            realname: String(session.user?.realname ?? session.user?.account ?? ''),
          },
          products,
          executions,
          users,
        }
      }),
    },
    {
      kind: 'exact',
      path: `${ROUTE_PREFIX}/bugs`,
      handler: handler(async (url) => {
        // product 允许 'all'：聚合全部产品的缺陷（禅道没有跨产品缺陷接口）。
        const rawProduct = url.searchParams.get('product') ?? ''
        const product = rawProduct === 'all' ? 'all' : numberParam(url, 'product')
        const status = url.searchParams.get('status') ?? 'unclosed'
        const allowed = new Set(['all', 'unclosed', 'assignedtome'])
        const browseType = allowed.has(status) ? status : 'unclosed'
        const page = Number(url.searchParams.get('page') ?? '1') || 1
        // 允许前端一次取全量（禅道 recPerPage 上限 1000）。
        const limit = Math.min(Number(url.searchParams.get('limit') ?? '30') || 30, 1000)
        return client.bugs(product, browseType, page, limit)
      }),
    },
    {
      kind: 'exact',
      path: `${ROUTE_PREFIX}/bug`,
      handler: handler(async (url) => ({ bug: await client.bug(numberParam(url, 'id')) })),
    },
    {
      kind: 'exact',
      path: `${ROUTE_PREFIX}/task`,
      handler: handler(async (url) => ({ task: await client.task(numberParam(url, 'id')) })),
    },
    {
      kind: 'exact',
      path: `${ROUTE_PREFIX}/story`,
      handler: handler(async (url) => ({ story: await client.story(numberParam(url, 'id')) })),
    },
    {
      kind: 'exact',
      path: `${ROUTE_PREFIX}/mine`,
      handler: handler(async () => client.mine()),
    },
    {
      kind: 'exact',
      path: `${ROUTE_PREFIX}/tasks`,
      handler: handler(async (url) => client.tasks(numberParam(url, 'execution'))),
    },
    {
      kind: 'exact',
      path: `${ROUTE_PREFIX}/stories`,
      handler: handler(async (url) => {
        // product 允许 'all'（聚合全部产品需求）。
        const rawProduct = url.searchParams.get('product') ?? ''
        return client.stories(rawProduct === 'all' ? 'all' : numberParam(url, 'product'))
      }),
    },
    {
      kind: 'exact',
      path: `${ROUTE_PREFIX}/search`,
      handler: handler(async (url) =>
        client.search(url.searchParams.get('keyword') ?? '', url.searchParams.get('limit') ?? 15),
      ),
    },
    {
      kind: 'exact',
      path: `${ROUTE_PREFIX}/users`,
      handler: handler(async () => ({ users: await client.users() })),
    },
    {
      kind: 'exact',
      path: `${ROUTE_PREFIX}/action`,
      handler: handler(async (_url, req) => {
        if (req.method !== 'POST') throw Object.assign(new Error('method not allowed'), { status: 405 })
        const input = await readJsonBody(req)
        return client.act(
          String(input.kind ?? ''),
          Number(input.id),
          String(input.action ?? ''),
          input.fields && typeof input.fields === 'object' ? input.fields : {},
        )
      }),
    },
    {
      kind: 'exact',
      path: `${ROUTE_PREFIX}/create`,
      handler: handler(async (_url, req) => {
        if (req.method !== 'POST') throw Object.assign(new Error('method not allowed'), { status: 405 })
        const input = await readJsonBody(req)
        return client.create(
          String(input.kind ?? ''),
          input.fields && typeof input.fields === 'object' ? input.fields : {},
        )
      }),
    },
    {
      kind: 'exact',
      path: `${ROUTE_PREFIX}/delete`,
      handler: handler(async (_url, req) => {
        if (req.method !== 'POST') throw Object.assign(new Error('method not allowed'), { status: 405 })
        const input = await readJsonBody(req)
        return client.remove(String(input.kind ?? ''), Number(input.id))
      }),
    },
    {
      kind: 'exact',
      path: `${ROUTE_PREFIX}/batch`,
      handler: handler(async (_url, req) => {
        if (req.method !== 'POST') throw Object.assign(new Error('method not allowed'), { status: 405 })
        const input = await readJsonBody(req)
        return client.batchAct(
          String(input.kind ?? ''),
          Array.isArray(input.ids) ? input.ids : [],
          String(input.action ?? ''),
          input.fields && typeof input.fields === 'object' ? input.fields : {},
        )
      }),
    },
    {
      kind: 'exact',
      path: `${ROUTE_PREFIX}/config`,
      handler: handler(async (_url, req) => {
        if (req.method === 'GET') return configView(client)
        if (req.method === 'POST') return saveConfig(client, await readJsonBody(req))
        throw Object.assign(new Error('method not allowed'), { status: 405 })
      }),
    },
    {
      kind: 'exact',
      path: `${ROUTE_PREFIX}/logout`,
      handler: handler(async (_url, req) => {
        if (req.method !== 'POST') throw Object.assign(new Error('method not allowed'), { status: 405 })
        client.reset()
        client.store?.clear()
        return { ok: true }
      }),
    },
  ]
}

/** 插件名（Loader 行名）。 */
export const name = 'zentao-panel'
/** 依赖的 Host 服务。 */
export const inject = ['webServer', 'tools']

/**
 * 挂载禅道面板的 Host 半边。
 * @param {any} ctx - Host 插件上下文。
 * @param {any} config - Loader 传入的插件配置。
 */
export function apply(ctx, config) {
  const store = new AccountStore(ACCOUNT_FILE, {
    baseUrl: String(config?.baseUrl ?? DEFAULT_BASE_URL).replace(/\/+$/, ''),
    account: String(config?.account ?? DEFAULT_ACCOUNT),
    password: String(config?.password ?? DEFAULT_PASSWORD),
  })
  const client = new ZentaoClient(config ?? {}, store)
  ctx.effect(() => {
    const disposers = buildRoutes(client).map((route) => ctx.webServer.register(route))
    return () => {
      for (const dispose of disposers) dispose()
    }
  }, 'zentao-panel: routes')
  ctx.effect(() => {
    const disposers = registerTools(ctx, client)
    return () => {
      for (const dispose of disposers) dispose()
    }
  }, 'zentao-panel: tools')
}