import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { createHash } from "node:crypto"
import { test } from "node:test"
import { transformSync } from "esbuild"
import * as jsx from "react/jsx-runtime"
import { renderToStaticMarkup } from "react-dom/server"
import { PROVIDER_PRESETS, presetsFor } from "../../desktop/shared/model-catalog"

test("IP-01: image menu has exactly Volcengine and OpenAI with stable saved IDs and endpoints", () => {
  const presets = presetsFor("IMAGE")
  assert.deepEqual(presets.map(({ id, name }) => ({ id, name })), [{ id: "bytedance", name: "火山引擎" }, { id: "openai", name: "OpenAI" }])
  assert.equal(presets[0].protocol, "openai")
  assert.equal(presets[0].imageEndpoint, "https://ark.cn-beijing.volces.com/api/v3")
  ;(presets[0].sources as string[]).push("isolated-copy")
  assert.ok(!PROVIDER_PRESETS.find(item => item.id === "bytedance")!.sources.includes("isolated-copy"))
})

test("IP-02: text menu retains every existing provider and custom while showing Volcengine", () => {
  assert.deepEqual(presetsFor("TEXT").map(item => item.id), ["deepseek", "alibaba", "moonshot", "zai", "xiaomi", "minimax", "tencent", "bytedance", "openai", "anthropic", "google", "xai", "custom"])
  assert.equal(presetsFor("TEXT").find(item => item.id === "bytedance")!.name, "火山引擎")
})

function logo(props: Record<string, string>) {
  const module = { exports: {} as { ProviderLogo: (props: Record<string, string>) => any } }
  new Function("module", "exports", "require", transformSync(readFileSync(new URL("../../src/components/chat/provider-logos.tsx", import.meta.url), "utf8"), { loader: "tsx", format: "cjs", jsx: "automatic" }).code)(module, module.exports, (name: string) => {
    if (name === "react/jsx-runtime") return jsx
    if (name === "lucide-react") return { Boxes: () => null }
    if (name === "@/lib/utils") return { cn: (...items: unknown[]) => items.filter(Boolean).join(" ") }
    throw Error(`Unexpected dependency ${name}`)
  })
  return renderToStaticMarkup(module.exports.ProviderLogo(props))
}

test("IP-03: legacy and brand aliases use local Volcengine provider art and retain model family art", () => {
  for (const provider of ["bytedance", "volcengine", "VOLCENGINE"]) {
    const markup = logo({ provider, variant: "provider" })
    assert.match(markup, /src="\/brands\/providers\/volcengine.svg"/)
    assert.match(markup, /alt="火山引擎"/)
  }
  assert.match(logo({ provider: "bytedance", variant: "model" }), /src="\/brands\/models\/bytedance.svg"/)
})

test("IP-03: Volcengine SVG is self contained and matches recorded package provenance", () => {
  const asset = readFileSync(new URL("../../public/brands/providers/volcengine.svg", import.meta.url))
  assert.match(asset.toString(), /<title>Volcengine<\/title>/)
  assert.doesNotMatch(asset.toString(), /<script|<image|(?:href|src)=|url\(/i)
  const provenance = JSON.parse(readFileSync(new URL("../../design/provider-logo-provenance.json", import.meta.url), "utf8"))
  const entry = provenance.assets.find((item: any) => item.target === "public/brands/providers/volcengine.svg")
  assert.equal(entry.packageAsset, "volcengine-color.svg")
  assert.equal(entry.sha256, createHash("sha256").update(asset).digest("hex"))
})
