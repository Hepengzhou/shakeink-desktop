import assert from "node:assert/strict"
import { existsSync, readFileSync } from "node:fs"
import { test } from "node:test"
import ts from "typescript"

// CT-50：顶栏标题使用侧栏同款 NavigationLabel 渐变淡出，不再用 truncate 省略号
const chatPanelSource = readFileSync("src/components/layout/ChatPanel.tsx", "utf8")
const tree = ts.createSourceFile("ChatPanel.tsx", chatPanelSource, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)

function literalClasses(node: ts.JsxElement): string {
  const attribute = node.openingElement.attributes.properties.find(p => ts.isJsxAttribute(p) && p.name.getText(tree) === "className")
  if (!attribute || !ts.isJsxAttribute(attribute) || !attribute.initializer) return ""
  if (ts.isStringLiteral(attribute.initializer)) return attribute.initializer.text
  const classes: string[] = []
  const collect = (value: ts.Node) => { if (ts.isStringLiteralLike(value)) classes.push(value.text); ts.forEachChild(value, collect) }
  if (ts.isJsxExpression(attribute.initializer) && attribute.initializer.expression) collect(attribute.initializer.expression)
  return classes.join(" ")
}

test("CT-50: chat header title is the shared NavigationLabel fade, never truncate ellipsis", () => {
  assert.match(chatPanelSource, /import \{ NavigationLabel \} from "\.\/NavigationLabel"/)
  const elements: ts.JsxElement[] = []
  const visit = (node: ts.Node) => { if (ts.isJsxElement(node)) elements.push(node); ts.forEachChild(node, visit) }
  visit(tree)
  const header = elements.find(node => /\bdesktop-drag\b/.test(literalClasses(node)) && /\bh-11\b/.test(literalClasses(node)))!
  assert(header, "真实头部必须可定位")
  const headerText = header.getText(tree)
  assert.ok(headerText.includes("新会话"), "空态/兜底文案行为保留")
  const title = elements.find(node => node.openingElement.tagName.getText(tree) === "NavigationLabel" && headerText.includes(node.getText(tree)) && node.pos >= header.pos && node.end <= header.end)
  assert(title, "头部标题必须由 NavigationLabel 渲染")
  const classes = literalClasses(title)
  assert.match(classes, /\bflex-1\b/)
  assert.match(classes, /text-\[13px\]/)
  assert.match(classes, /\bfont-medium\b/)
  assert.doesNotMatch(classes, /\btruncate\b/, "省略号截断被渐变淡出取代")
  const legacySpan = elements.find(node => node.pos >= header.pos && node.end <= header.end && node.openingElement.tagName.getText(tree) === "span" && /\btruncate\b/.test(literalClasses(node)))
  assert.equal(legacySpan, undefined, "头部不再存在 truncate 标题 span")
})

// CT-51：回合成功收口处以守卫触发后台标题请求并失效会话列表缓存
test("CT-51: turn finish requests a background title only for succeeded/waiting_user", () => {
  const file = "src/components/chat/use-agent-chat.ts"
  const text = readFileSync(file, "utf8")
  assert.match(text, /import \{ conversationTitleRequester \} from "\.\/conversation-title"/)
  const source = ts.createSourceFile("use-agent-chat.ts", text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
  let call: ts.CallExpression | undefined
  const visit = (node: ts.Node) => {
    if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression)
      && node.expression.name.getText(source) === "request"
      && node.expression.expression.getText(source) === "conversationTitleRequester") call = node
    ts.forEachChild(node, visit)
  }
  visit(source)
  assert(call, "必须调用 conversationTitleRequester.request")
  let owner: ts.Node = call, ifStatement: ts.IfStatement | undefined, finish: ts.VariableDeclaration | undefined
  while (owner.parent) {
    owner = owner.parent
    if (!ifStatement && ts.isIfStatement(owner)) ifStatement = owner
    if (ts.isVariableDeclaration(owner) && owner.name.getText(source) === "finish") finish = owner
  }
  assert(finish, "调用点必须在 finish 收口函数内")
  assert(ifStatement, "调用点必须受状态条件保护")
  const literals: string[] = []
  const collectLiterals = (node: ts.Node) => { if (ts.isStringLiteralLike(node)) literals.push(node.text); ts.forEachChild(node, collectLiterals) }
  collectLiterals(ifStatement!.expression)
  assert.deepEqual([...literals].sort(), ["succeeded", "waiting_user"], "仅成功/等待用户两种收口触发")
  assert.match(ifStatement!.expression.getText(source), /\bstatus\b/)
  assert.ok(call!.getText(source).includes('"chat-conversations"'), "changed 后失效会话列表缓存")
  assert.ok(call!.getText(source).includes("conversationId"), "请求携带当前会话 id")
})

// CT-52：新端点按生成器惯例登记
test("CT-52: title endpoint is registered in migration map and generated route table", () => {
  const generated = readFileSync("desktop/service/routes.generated.ts", "utf8")
  const row = generated.split("\n").find(line => line.includes("/api/chat/conversations/[id]/title"))
  assert(row, "routes.generated.ts 必须登记新端点")
  assert.match(row!, /scope: "conversation"/)
  assert.match(row!, /"POST"/)
  assert.ok(existsSync("desktop/handlers/chat/conversations/[id]/title/route.ts"), "handler 文件必须存在")
  const map = readFileSync("docs/migration-map.json", "utf8")
  assert.ok(map.includes('"path": "src/app/api/chat/conversations/[id]/title/route.ts"'), "migration-map 含新增行")
  assert.ok(map.includes('"local": "desktop/handlers/chat/conversations/[id]/title/route.ts"'))
})
