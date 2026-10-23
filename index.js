/**
 * Host half of the MCP panel bundle.
 * It only reads state: the configured dsh-mcp-client rows and the tools service,
 * including a fixed heuristic price of each tool schema.
 */

const MCP_CLIENT_NAME = '@deepseek-ai/dsh-mcp-client';
const LAZY_TOOLS_NAMES = ['mcp-lazy-tools', '@satanfire/dsh-mcp-lazy-tools', '@local/mcp-lazy-tools'];
/** Any package whose name ends with this is the same policy under another scope. */
const LAZY_TOOLS_SUFFIX = '/mcp-lazy-tools';
const LIST_PATH = '/api/dsh-mcp-panel/list';
const TOOL_PATH = '/api/dsh-mcp-panel/tool';
const PUBLIC_PREFIX = 'mcp__';
const TOOL_SUFFIX = '__';

/** Fixed text density of the Host token meter (`dsh-token-meter/estimate`). */
const CHARS_PER_TOKEN = 4;

/**
 * Word parts that mark a credential when they stand alone.
 */
const SECRET_WORDS = new Set([
  'auth', 'authorization', 'bearer', 'cookie', 'credential', 'credentials', 'key', 'keys',
  'passwd', 'password', 'pwd', 'secret', 'secrets', 'session', 'sig', 'signature',
  'token', 'tokens',
]);

/** Prefixes that make a suffixed name a credential: `api` + `key`, `access` + `token`. */
const SECRET_QUALIFIERS = new Set([
  'access', 'account', 'admin', 'api', 'apikey', 'auth', 'aws', 'azure', 'bearer',
  'client', 'credential', 'github', 'gitlab', 'google', 'master', 'openai', 'personal',
  'private', 'public', 'refresh', 'secret', 'security', 'service', 'session', 'signing',
  'stripe', 'user',
]);

/** A literal credential is recognizable by its own shape, whatever the flag name. */
const CREDENTIAL_SHAPE = /^(?:gh[posur]_|github_pat_|glpat-|sk-|sk_live_|sk_test_|xox[baprs]-|AKIA|ASIA|AIza|ya29\.|eyJ|gsk_|hf_|rk_live_|rk_test_)/;

/**
 * True when a bare word is a credential name.
 * A plain word matches directly. A compound word matches when a credential
 * suffix follows a qualifier, so `apikey` and `clientsecret` match while
 * `keyword`, `monkey` and `passwordless` do not.
 */
function isSecretWord(part) {
  if (part === '') return false;
  const word = part.toLowerCase();
  if (SECRET_WORDS.has(word)) return true;
  for (const suffix of SECRET_WORDS) {
    if (word.length <= suffix.length || !word.endsWith(suffix)) continue;
    const head = word.slice(0, word.length - suffix.length);
    if (SECRET_QUALIFIERS.has(head)) return true;
    // A squashed name such as `xamzsecuritytoken` keeps a qualifier as its tail.
    for (const qualifier of SECRET_QUALIFIERS) {
      if (head.length > qualifier.length && head.endsWith(qualifier)) return true;
    }
  }
  return false;
}

/**
 * True when one key, flag or header name denotes a credential.
 * Word matching keeps `--api-key` while letting `--monkey` and `--author` pass.
 * The same test covers compounded names such as `apikey` or `clientsecret`.
 */
function isSecretKey(name) {
  for (const part of String(name).split(/[^A-Za-z0-9]+/)) {
    if (isSecretWord(part)) return true;
    for (const segment of part.split(/(?=[A-Z])/)) {
      if (segment !== part && isSecretWord(segment)) return true;
    }
  }
  return false;
}

/** True when a value looks like a literal credential, whatever its label says. */
function looksSecret(value) {
  return CREDENTIAL_SHAPE.test(value);
}

/**
 * A credential recognized inside a longer header value.
 * The left boundary stops free text such as `disk-space` or `task-sk-queue`
 * from matching. The length floor stops lookalike prose (`ghp_lookalike`)
 * from matching. Both keep `CREDENTIAL_SHAPE`, which is anchored, untouched.
 */
const CREDENTIAL_IN_TEXT = /(?<![A-Za-z0-9_.-])(?:gh[posur]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}|glpat-[A-Za-z0-9_-]{20,}|sk[-_](?:live[-_]|test[-_])?[A-Za-z0-9_-]{20,}|xox[baprs]-[A-Za-z0-9-]{10,}|(?:AKIA|ASIA)[0-9A-Z]{16}|AIza[0-9A-Za-z_-]{35}|ya29\.[0-9A-Za-z_-]+|eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+|gsk_[A-Za-z0-9]{20,}|hf_[A-Za-z0-9]{20,}|rk_(?:live|test)_[A-Za-z0-9]{10,})/;

/**
 * A whole header value that is one literal credential, in two families.
 * The floor is deliberately low: a real key is often short (`ghp_abc123`),
 * so the `{20,}` floor of `CREDENTIAL_IN_TEXT` is wrong here.
 *
 * The first family must also mix digits and letters. A random key is drawn
 * from a full alphabet, while prose that merely starts like a key is not:
 * `ghp_lookalike` and `sk-learn-pipeline` stay visible. The second family
 * has one fixed alphabet, so the mix test cannot apply: `AKIA…` ids are
 * upper case and a `glpat-` key can be letters only.
 *
 * Known boundary: a short sample behind a vendor prefix is masked, because
 * the prefix alone is evidence and the shorter string is the more dangerous
 * one. `glpat-example` and `ya29.something` therefore hide, while prose
 * shaped like `ghp_lookalike` or `sk-learn-pipeline` stays visible. Both
 * families over-mask on purpose.
 */
const HEADER_CREDENTIAL_MIXED = /^(?:gh[posur]_[A-Za-z0-9]{6,}|github_pat_[A-Za-z0-9_]{6,}|sk[-_](?:live[-_]|test[-_])?[A-Za-z0-9_-]{6,}|xox[baprs]-[A-Za-z0-9-]{6,}|AIza[A-Za-z0-9_-]{6,}|ya29\.[A-Za-z0-9_-]{10,}|eyJ[A-Za-z0-9_-]{8,}|gsk_[A-Za-z0-9]{6,}|hf_[A-Za-z0-9]{6,}|rk_(?:live|test)_[A-Za-z0-9]{6,})$/;
const HEADER_CREDENTIAL_PLAIN = /^(?:sk[-_](?:live|test)[-_][A-Za-z0-9_-]{6,}|glpat-[A-Za-z0-9_-]{3,}|(?:AKIA|ASIA)[A-Z0-9]{4,})$/;
const HAS_DIGIT = /[0-9]/;
const HAS_LETTER = /[A-Za-z]/;
const HAS_UPPER = /[A-Z]/;
const HAS_LOWER = /[a-z]/;

/** A short base64 value with padding: `Basic dXNlcjpwYXNzd29yZA==` is common. */
const BASE64_PADDED = /[A-Za-z0-9+/]{12,}={1,2}(?![A-Za-z0-9+/=])/;

/** True when a whole value is one literal credential. */
function isWholeCredential(value) {
  if (HEADER_CREDENTIAL_PLAIN.test(value)) return true;
  if (!HEADER_CREDENTIAL_MIXED.test(value)) return false;
  return HAS_DIGIT.test(value) && HAS_LETTER.test(value);
}

/**
 * A value written as `<scheme> <payload>` (RFC 7235).
 * The scheme word is not checked against a list. Real configs also send
 * `Negotiate`, `NTLM`, `Hawk`, `DPoP`, `SSWS` or a vendor scheme, and the
 * closed list that this replaced let all of them through.
 *
 * The payload decides, not the scheme word. A payload is secret when it
 * holds a compact opaque token or a vendor-shaped literal. The same pair is
 * also looked for after the first word, because a comment marker or a
 * `Digest` field list moves the pair away from the start of the value.
 * Prose after a scheme word always fails both tests: `token expired`,
 * `basic setup guide` and `bearer of good news` carry no such token,
 * so they stay visible.
 */
const AUTH_SCHEME = /^[A-Za-z][A-Za-z0-9+/-]*[ \t]+(\S.*)$/;

/**
 * A compact run that could be a base64 or base62 credential.
 * Shortest accepted length is 24, the floor where a random key stops
 * looking like an ordinary word.
 * It has no `g` state to leak: `matchAll` clones the pattern per call.
 */
const OPAQUE_TOKEN = /[A-Za-z0-9_+/=.-]{24,}/g;

/**
 * True when an opaque token looks random: a digit mix or a case mix.
 * A case mix alone is weaker evidence, so it needs the full 24-character
 * floor even where the caller accepts a shorter payload; otherwise prose
 * such as `ProductionConfiguration` reads as a credential.
 */
function isOpaqueToken(token, floor) {
  if (HAS_DIGIT.test(token) && HAS_LETTER.test(token)) return token.length >= floor;
  return token.length >= 24 && HAS_UPPER.test(token) && HAS_LOWER.test(token);
}

/** True when some compact token in the text is a plausible opaque credential. */
function hasOpaqueToken(text) {
  for (const [token] of text.matchAll(OPAQUE_TOKEN)) {
    if (isOpaqueToken(token, 24)) return true;
  }
  return false;
}

/**
 * A compact token that follows a scheme word anywhere in a value.
 * The anchored `AUTH_SCHEME` test only looks at the start, so a comment
 * marker or a `Digest` field list put the pair out of reach.
 * The floor is 16 here, not 24: after a scheme word the token is a payload
 * by grammar, so it needs less evidence than a bare value does. Prose still
 * fails, because it has no single 16-character token with a digit or a case
 * mix (`token expired`, `basic setup guide`).
 * It has no `g` state to leak: `matchAll` clones the pattern per call.
 */
const AUTH_PAIR = /[A-Za-z][A-Za-z0-9+/-]*[ \t]+([A-Za-z0-9_+/=.-]{16,})/g;

/** True when some scheme word in the text is followed by an opaque credential. */
function hasAuthPayload(text) {
  for (const [, token] of text.matchAll(AUTH_PAIR)) {
    if (isOpaqueToken(token, 16)) return true;
  }
  return false;
}

/** True when the payload of a `<scheme> <payload>` value carries a credential. */
function authSchemeIsSecret(value) {
  const scheme = AUTH_SCHEME.exec(value);
  if (scheme !== null) {
    if (CREDENTIAL_SHAPE.test(scheme[1].trim())) return true;
    if (hasOpaqueToken(scheme[1])) return true;
  }
  return hasAuthPayload(value);
}

/**
 * True when a header value carries a credential.
 * The header name is not enough: `X-Custom` says nothing, yet its value may
 * hold a token. Four shapes are recognized — a whole value that is one
 * credential, an auth scheme whose payload carries a token, a credential
 * literal inside longer text, and a `name=value` pair that is a cookie.
 * A cookie pair is reported even when its name is innocent, because
 * `session_id=…` hides a session token behind a neutral name.
 *
 * Known boundary: a bare opaque string under a non-sensitive name stays
 * visible. `X-Consent-Id: <32 hex>` is indistinguishable from a benign
 * `X-Request-Id` or W3C `X-Trace-Id` on every axis — name, length, position
 * and shape. A rule that masks one masks the others, so this case is left
 * alone on purpose, not by oversight.
 */
function headerValueIsSecret(value) {
  const trimmed = value.trim();
  if (isWholeCredential(trimmed)) return true;
  if (authSchemeIsSecret(trimmed)) return true;
  if (CREDENTIAL_IN_TEXT.test(value)) return true;
  // `Basic dXNlcjpwYXNzd29yZA==` is shorter than the opaque floor, and the
  // padding is the only signal that it is base64 rather than a word.
  if (BASE64_PADDED.test(value)) return true;
  // A short vendor literal can sit next to other words: after a fold join the
  // header value becomes `1 ghp_ab12cd`, so the whole-value test misses it.
  for (const word of value.split(/[\s,;"'()[\]]+/)) {
    if (word === '') continue;
    if (isWholeCredential(word)) return true;
  }
  for (const pair of value.split(';')) {
    const inner = /^\s*([^=]+?)\s*=\s*(\S.*)$/.exec(pair);
    if (inner === null) continue;
    if (isSecretKey(inner[1])) return true;
    const innerValue = inner[2].trim().replace(/^"|"$/g, '');
    if (innerValue.includes(':') || innerValue.includes(' ')) continue;
    if (isWholeCredential(innerValue)) return true;
  }
  return false;
}

/**
 * Read all loader entries. `loader.entries()` is a generator, so the rows are
 * pulled one at a time and the count is capped: a bogus iterable that claims a
 * huge length would otherwise abort the whole process, which `try/catch`
 * cannot intercept.
 */
const MAX_ENTRIES = 10000;

function readEntries(ctx) {
  const loader = ctx.get('loader');
  if (loader === undefined || typeof loader.entries !== 'function') return [];
  try {
    const iterated = loader.entries();
    if (iterated === null || typeof iterated !== 'object') return [];
    if (typeof iterated[Symbol.iterator] !== 'function') return [];
    if (Number.isSafeInteger(iterated.length)) {
      if (iterated.length < 0 || iterated.length > MAX_ENTRIES) return [];
      return Array.from(iterated);
    }
    const rows = [];
    for (const row of iterated) {
      if (rows.length >= MAX_ENTRIES) return [];
      rows.push(row);
    }
    return rows;
  } catch {
    return [];
  }
}

/** Loader fiber state numbers, copied from the shipped plugin inventory. */
const FIBER_PHASE = {
  0: 'pending',
  1: 'loading',
  2: 'active',
  3: 'failed',
  4: null,
  5: 'unloading',
};

/** Project one Loader entry into the panel view of an MCP server row. */
function serverFromEntry(entry) {
  const options = entry?.options ?? {};
  const config = options.config ?? {};
  return {
    id: String(entry?.id ?? ''),
    name: String(options.name ?? ''),
    serverName: typeof config.serverName === 'string' ? config.serverName : null,
    transport: typeof config.transport === 'string' ? config.transport : null,
    target: describeTarget(config),
    disabled: entry?.disabled === true,
    phase: entry?.fiber === undefined ? null : FIBER_PHASE[entry.fiber.state] ?? null,
  };
}

/** Describe where one server connects, without leaking credential values. */
function describeTarget(config) {
  if (config.transport === 'streamable-http') {
    const headers = config.headers;
    const headerNames = headers === undefined || headers === null || typeof headers !== 'object'
      ? []
      : Object.keys(headers);
    const isUrl = typeof config.url === 'string';
    const safeUrl = isUrl ? redactUrl(config.url) : null;
    return {
      url: safeUrl,
      headerNames,
      redacted: isUrl && safeUrl !== config.url,
    };
  }
  const rawArgs = Array.isArray(config.args) ? config.args.map((value) => String(value)) : [];
  let redacted = false;
  const args = [];
  let maskNext = false;
  for (const value of rawArgs) {
    const masked = redactArgument(value);
    if (masked !== value) {
      redacted = true;
      args.push(masked);
      maskNext = false;
      continue;
    }
    if (maskNext && !value.startsWith('-')) {
      args.push('***');
      redacted = true;
      maskNext = false;
      continue;
    }
    args.push(value);
    maskNext = maskNext || isSecretFlag(value);
  }
  return {
    command: typeof config.command === 'string' ? config.command : null,
    args,
    redacted,
  };
}

/** True when one argument is a credential flag that expects a separate value. */
function isSecretFlag(value) {
  if (!value.startsWith('-') || value.includes('=')) return false;
  return isSecretKey(value.replace(/^--?/, ''));
}

/**
 * One HTTP header written as `Name: value`, optionally indented and
 * optionally behind a `//` or `#` comment marker.
 * Group 1 keeps the prefix (indent and marker), group 2 is the name,
 * group 3 is the value. The indent is required: real configs often write
 * `--header " Authorization: Bearer …"` with a leading space or tab.
 */
const HEADER_LINE = /^([ \t]*(?:(?:\/\/|#)[ \t]*)?)([A-Za-z0-9._-]+)[ \t]*:[ \t]*(\S.*)$/;

/**
 * Mask one logical header line, or return `null` when it is not secret.
 * The name may be a credential (`Authorization:`) or the value may be one
 * under an innocent name (`X-Custom: ghp_…`). Both must be masked.
 * A value behind `//` or `#` is tested too, not skipped: a commented sample
 * still shows its credential on screen, so the old comment exemption was a
 * bypass rather than a courtesy.
 */
function maskHeaderLine(line) {
  const head = HEADER_LINE.exec(line);
  if (head === null) return null;
  if (!isSecretKey(head[2]) && !headerValueIsSecret(head[3])) return null;
  return `${head[1]}${head[2]}: ***`;
}

/**
 * Mask every credential-bearing HTTP header in one argument.
 * A real argument often holds several headers joined by newlines, so the
 * `Name: value` test must run per line. An indented line after a header is
 * a folded continuation (RFC 7230), so it is also tested joined to that
 * header.
 *
 * Every physical line is tested on its own, and the folded form is tested
 * *in addition*. Masking happens when either test hits, so folding can only
 * add coverage. The previous version tested the folded form instead, and a
 * continuation that was itself a complete header then escaped the test.
 * Returns `null` when no line is secret, so the caller can keep falling through.
 */
function redactHeaderLines(value) {
  // A bare CR is a real line break in mis-quoted configs, so it splits too.
  const physical = value.split(/\r\n|\r|\n/);
  const logical = [];
  for (let index = 0; index < physical.length; index += 1) {
    const line = physical[index];
    const previous = logical[logical.length - 1];
    if (/^[ \t]/.test(line) && previous !== undefined && HEADER_LINE.test(previous.line)) {
      logical.push({ line: `${previous.line} ${line.trim()}`, parts: [...previous.parts, index] });
      continue;
    }
    logical.push({ line, parts: [index] });
  }
  const mask = new Array(physical.length).fill(null);
  let changed = false;
  /** Record the masked text for one physical line, unless it is already set. */
  const cover = (index) => {
    if (mask[index] !== null) return;
    mask[index] = maskHeaderLine(physical[index]) ?? '***';
    changed = true;
  };
  for (let index = 0; index < physical.length; index += 1) {
    // A line that is secret on its own stays covered, even when a fold join
    // would hide it (a `//`-prefixed value disables the folded test).
    if (maskHeaderLine(physical[index]) !== null) cover(index);
  }
  for (const entry of logical) {
    if (maskHeaderLine(entry.line) === null) continue;
    // The credential is often the continuation, not the header, so every
    // physical line of a secret logical line is covered.
    for (const index of entry.parts) cover(index);
  }
  if (!changed) return null;
  return physical.map((line, index) => mask[index] ?? line).join('\n');
}

/**
 * Mask every inline credential in one argument. It covers `--flag=value`,
 * `KEY=value`, `--env=KEY=value`, `--header=Name: value`, a bare HTTP header
 * written as `Name: value` (indented or on any line), a full URL, and a value
 * that is a literal credential by shape. A bare `--flag value` pair is masked
 * by the caller.
 */
function redactArgument(value) {
  // A URL is tested first: it may contain `=` in its query, which would
  // otherwise be mistaken for a `KEY=value` pair.
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(value)) return redactUrl(value);
  const headers = redactHeaderLines(value);
  if (headers !== null) return headers;
  const assignment = /^([^=]+)=(.*)$/.exec(value);
  if (assignment !== null) {
    if (isSecretKey(assignment[1].replace(/^--?/, ''))) return `${assignment[1]}=***`;
    const inner = redactArgument(assignment[2]);
    if (inner !== assignment[2]) return `${assignment[1]}=${inner}`;
  }
  if (looksSecret(value.trim())) return '***';
  return value;
}

/** Mask the userinfo and every credential-looking query value in one URL. */
function redactUrl(value) {
  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    return value;
  }
  let changed = false;
  if (parsed.username !== '' || parsed.password !== '') {
    if (parsed.username !== '') parsed.username = '***';
    if (parsed.password !== '') parsed.password = '***';
    changed = true;
  }
  for (const key of Array.from(parsed.searchParams.keys())) {
    if (!isSecretKey(key)) continue;
    if (parsed.searchParams.get(key) === '***') continue;
    parsed.searchParams.set(key, '***');
    changed = true;
  }
  return changed ? parsed.toString() : value;
}

/** Collect every configured MCP server row from the Loader. */
function readServers(ctx) {
  const servers = [];
  for (const entry of readEntries(ctx)) {
    if (entry?.options?.name !== MCP_CLIENT_NAME) continue;
    if (entry.options.group) continue;
    servers.push(serverFromEntry(entry));
  }
  return servers;
}

/**
 * Attribute one public tool name to a configured server, by longest prefix.
 *
 * dsh-mcp-client builds the public name with `publicToolName(serverName,
 * rawName)`, which appends a hash when it replaces characters or truncates to
 * 64 chars. The library docs state the public name is never parsed to recover
 * its identity, so a non-greedy split mis-attributes any server name that
 * contains `__`. Matching the known configured names instead is exact, and
 * returns null when no name matches rather than guessing.
 */
function attributeServer(publicName, serverNames) {
  if (!publicName.startsWith(PUBLIC_PREFIX)) return null;
  let best = null;
  for (const name of serverNames) {
    if (!publicName.startsWith(`${PUBLIC_PREFIX}${name}${TOOL_SUFFIX}`)) continue;
    if (best === null || name.length > best.length) best = name;
  }
  return best;
}

/**
 * Collect every MCP tool the tools service currently exposes.
 *
 * Pass the configured server names so each tool carries the server it belongs
 * to. Tools that match no configured name keep `server: null` and are reported
 * as unattributed.
 */
function readTools(ctx, serverNames) {
  const tools = ctx.get('tools');
  if (tools === undefined || typeof tools.schemas !== 'function') return { tools: [], truncated: false };
  let schemas;
  try {
    schemas = tools.schemas();
  } catch {
    return { tools: [], truncated: false };
  }
  const list = [];
  let truncated = false;
  for (const schema of Array.isArray(schemas) ? schemas : []) {
    const name = String(schema?.name ?? '');
    if (!name.startsWith(PUBLIC_PREFIX)) continue;
    if (list.length >= 2000) {
      truncated = true;
      break;
    }
    const server = attributeServer(name, serverNames);
    const tool = {
      name,
      server,
      rawName: server === null ? null : name.slice(`${PUBLIC_PREFIX}${server}${TOOL_SUFFIX}`.length),
      description: typeof schema.description === 'string' ? schema.description : '',
      parameters: schema.parameters ?? null,
      deferLoading: schema.deferLoading === true,
    };
    list.push({ ...tool, tokens: estimateToolTokens(tool) });
  }
  return { tools: list, truncated };
}

/**
 * Heuristic price of one tool schema, in tokens.
 * The Host token meter prices tool schemas with the same fixed density
 * (4 characters per token), so this estimate matches its accounting.
 */
function estimateToolTokens(tool) {
  let json;
  try {
    json = JSON.stringify({ name: tool.name, description: tool.description, parameters: tool.parameters });
  } catch {
    return 0;
  }
  return json === undefined ? 0 : Math.ceil(json.length / CHARS_PER_TOKEN);
}

/** Report whether the lazy-tools policy is mounted, which hides MCP tools per agent. */
function readLazyPolicy(ctx, lazyNames) {
  for (const entry of readEntries(ctx)) {
    const name = entry?.options?.name;
    if (typeof name !== 'string' || !(lazyNames.has(name) || name.endsWith(LAZY_TOOLS_SUFFIX))) continue;
    if (entry.options.group) continue;
    if (entry.disabled === true) continue;
    if (entry?.fiber?.state !== 2) continue;
    return true;
  }
  return false;
}

/** One read-only snapshot for the panel. */
function snapshot(ctx, lazyNames) {
  const servers = readServers(ctx);
  const serverNames = [];
  for (const server of servers) {
    if (server.serverName !== null) serverNames.push(server.serverName);
  }
  const { tools, truncated } = readTools(ctx, serverNames);
  const byServer = new Map();
  const unattributed = [];
  for (const tool of tools) {
    if (tool.server === null) {
      unattributed.push(tool);
      continue;
    }
    const group = byServer.get(tool.server);
    if (group === undefined) byServer.set(tool.server, [tool]);
    else group.push(tool);
  }
  const rows = servers.map((server) => ({
    ...server,
    tools: byServer.get(server.serverName ?? '') ?? [],
    tokens: 0,
  }));
  for (const row of rows) row.tokens = row.tools.reduce((sum, tool) => sum + tool.tokens, 0);
  // A tool whose name matches no configured server is still shown, so the
  // panel never hides a live tool just because its name could not be mapped.
  if (unattributed.length > 0) {
    rows.push({
      id: 'tools-unattributed',
      name: null,
      serverName: null,
      transport: null,
      target: null,
      disabled: false,
      phase: 'tools-only',
      tools: unattributed,
      tokens: unattributed.reduce((sum, tool) => sum + tool.tokens, 0),
    });
  }
  return {
    servers: rows,
    toolCount: tools.length,
    toolTokens: tools.reduce((sum, tool) => sum + tool.tokens, 0),
    truncated,
    lazyTools: readLazyPolicy(ctx, lazyNames),
    generatedAt: Date.now(),
  };
}

/** Read one JSON body, tolerating an absent or malformed payload. */
async function readJson(request) {
  try {
    const value = await request.json();
    return value !== null && typeof value === 'object' ? value : {};
  } catch {
    return {};
  }
}

/** Answer one panel read with a JSON response. */
function json(value, status = 200) {
  return new Response(JSON.stringify(value), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  });
}

/**
 * Register the read-only panel routes on the shared Connection Fetch channel.
 * Exact Fetch routes keep their own lifetime and never touch another route.
 */
function registerRoutes(ctx, endpoints) {
  ctx.inject(['connection'], (scoped) => {
    const connection = scoped.connection;
    if (connection === undefined) return;
    const fetch = connection.fetch;
    if (fetch === undefined || typeof fetch.register !== 'function') return;
    scoped.effect(() => fetch.register({
      path: LIST_PATH,
      methods: ['POST'],
      requestBody: 'buffered',
      fetch: () => Promise.resolve(json(endpoints.list())),
    }), 'dsh-mcp-panel: list route');
    scoped.effect(() => fetch.register({
      path: TOOL_PATH,
      methods: ['POST'],
      requestBody: 'buffered',
      fetch: async (request) => {
        const payload = await readJson(request);
        const name = typeof payload.name === 'string' ? payload.name : '';
        if (name === '') return json({ error: 'name is required' }, 400);
        const found = endpoints.tool(name);
        if (found === null) return json({ error: `no MCP tool named ${JSON.stringify(name)}` }, 404);
        return json(found);
      },
    }), 'dsh-mcp-panel: tool route');
  });
}

/** Read one full tool definition, including its parameter schema. */
function readToolRecord(ctx, name) {
  const servers = readServers(ctx);
  const serverNames = [];
  for (const server of servers) {
    if (server.serverName !== null) serverNames.push(server.serverName);
  }
  const { tools } = readTools(ctx, serverNames);
  return tools.find((tool) => tool.name === name) ?? null;
}

/**
 * Mount the read-only MCP panel host half.
 * @param ctx - the plugin Context.
 */
export function apply(ctx, config) {
  // The lazy-tools policy is optional; accept its common package names or a
  // deployment-provided one through the plugin config.
  const lazyNames = new Set(LAZY_TOOLS_NAMES);
  if (Array.isArray(config?.lazyToolsNames)) {
    for (const name of config.lazyToolsNames) if (typeof name === 'string') lazyNames.add(name);
  }
  registerRoutes(ctx, {
    list: () => snapshot(ctx, lazyNames),
    tool: (name) => readToolRecord(ctx, name),
  });
}
