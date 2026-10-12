# AI 首屏 v3 · 主题背景生成记录

生成方式：内置 `image_gen`，三张图分别发起独立生成调用；无参考输入图，不使用CLI、API Key或外部图像服务。原图生成后按原始字节复制到本目录 `assets/`，不裁切、不重绘；HTML负责最终卡片裁切。

状态：三张图已分别完成内置生成并复制到项目。全部为1942×809px（约2.4:1）的不透明PNG；源图和项目文件的SHA-256一致，未进行图像后处理。

## 产物与来源

| 主题 | 项目文件 | 原始字节数 | SHA-256 |
| --- | --- | ---: | --- |
| 仙侠 | `assets/theme-xianxia-v3.png` | 2166463 | `fceea47553865e181e94cb9743d958d8cd72b9d8a1f546144187031ff8ed0f1d` |
| 历史 | `assets/theme-history-v3.png` | 2051956 | `534ac60dc6b420c1caa4e0eec8082cf0b591da46fc471004cfdb08adfa5d2e6d` |
| 科幻 | `assets/theme-scifi-v3.png` | 1905789 | `18b77ede8a1f8066fbbfca0ebfa795a589ec212789c88a5ff6847004f66e17c8` |

内置工具返回的原始文件保留在默认生成目录，复制来源分别为：

- 仙侠：`C:\Users\Administrator\.codex\generated_images\01a12fbe-2974-78f2-b1b8-89ba18959cf9\exec-358c4363-5d3c-44f7-ba12-7d253c7b4607.png`
- 历史：`C:\Users\Administrator\.codex\generated_images\01a12fbe-2974-78f2-b1b8-89ba18959cf9\exec-6ec896de-24bc-4c35-88aa-2ea859c49aca.png`
- 科幻：`C:\Users\Administrator\.codex\generated_images\01a12fbe-2974-78f2-b1b8-89ba18959cf9\exec-41f321a5-0290-48f1-a119-df5d00f1a042.png`

三次请求均未传入参考图，`transparent_background`均为`false`。下方为对应实际提交的完整最终提示词，每张独立调用；没有拼图拆分或由一张图派生其余主题。

已直接检查工具返回画面：三张主题可辨、艺术语言一致，画面无可见文字/标识/水印，左下自然暗部适合后续HTML文字覆盖。PNG尺寸、格式、透明通道及复制哈希已用本地命令核验。本记录只证明创意资产生成与保存，不代替最终卡片裁切、文字对比度或正式产品验收。

## theme-xianxia-v3.png

```text
Use case: stylized-concept.
Asset type: A standalone, full-bleed horizontal background illustration for a refined desktop AI writing app's genre card, displayed at about 260 x 108 pixels.
Style/medium: Restrained cinematic editorial environment illustration, elegant broad shapes, subtle atmospheric depth, finely controlled soft lighting, matte surfaces, low visual noise. Sophisticated and calm rather than game-poster spectacle. This is one artwork, not a UI mockup, contact sheet, collage, or set of cards.
Composition/framing: A wide landscape canvas, ideally 2.4:1, at least 3:2. Keep the essential subject and horizon within the central horizontal band so a 2.3:1 center crop preserves them. Place the main scene interest toward the middle-right. Keep the lower-left quarter naturally dark, quiet, and uncluttered for HTML text that will be added later; do not draw a panel or hard gradient box. The scene must read clearly at a small card size.
Constraints: Entire image is artwork with no border, no rounded corners, no UI, no text, no letters, no numbers, no logo, no watermark. No people or characters, no glossy toy-like 3D, no oversaturated neon, no noisy micro-details, no starburst highlights. Opaque background.
Primary request: A Chinese xianxia fantasy landscape: majestic layered teal-green mountains emerging above a sea of mist, with one small, elegant immortal palace nestled on a distant ridge toward the right.
Lighting/mood: Serene early-morning light softly grazes the cloud sea and the palace roofline. Deep jade and blue-green shadows, pale cool mist, a very small restrained warm light in the palace. Strong sweeping mountain silhouettes and expansive stillness; the palace is a subtle focal point, not an oversized foreground object.
```

## theme-history-v3.png

```text
Use case: stylized-concept.
Asset type: A standalone, full-bleed horizontal background illustration for a refined desktop AI writing app's genre card, displayed at about 260 x 108 pixels.
Style/medium: Restrained cinematic editorial environment illustration, elegant broad shapes, subtle atmospheric depth, finely controlled soft lighting, matte surfaces, low visual noise. Sophisticated and calm rather than game-poster spectacle. This is one artwork, not a UI mockup, contact sheet, collage, or set of cards.
Composition/framing: A wide landscape canvas, ideally 2.4:1, at least 3:2. Keep the essential subject and horizon within the central horizontal band so a 2.3:1 center crop preserves them. Place the main scene interest toward the middle-right. Keep the lower-left quarter naturally dark, quiet, and uncluttered for HTML text that will be added later; do not draw a panel or hard gradient box. The scene must read clearly at a small card size.
Constraints: Entire image is artwork with no border, no rounded corners, no UI, no text, no letters, no numbers, no logo, no watermark. No people or characters, no glossy toy-like 3D, no oversaturated neon, no noisy micro-details, no starburst highlights. Opaque background.
Primary request: A historical Chinese imperial capital seen from above its palace rooftops: an elegant rhythm of traditional tiled eaves and grand palace roofs receding toward a distant walled city, with the most recognizable palace grouping toward the right.
Lighting/mood: Restrained amber late-afternoon light, warm muted ochre rooftops, deep brown foreground shadows, soft golden haze between layers. Majestic yet quiet, historically grounded architectural silhouettes rather than ornate fantasy. Lower-left roofs remain in rich, low-detail shadow.
```

## theme-scifi-v3.png

```text
Use case: stylized-concept.
Asset type: A standalone, full-bleed horizontal background illustration for a refined desktop AI writing app's genre card, displayed at about 260 x 108 pixels.
Style/medium: Restrained cinematic editorial environment illustration, elegant broad shapes, subtle atmospheric depth, finely controlled soft lighting, matte surfaces, low visual noise. Sophisticated and calm rather than game-poster spectacle. This is one artwork, not a UI mockup, contact sheet, collage, or set of cards.
Composition/framing: A wide landscape canvas, ideally 2.4:1, at least 3:2. Keep the essential subject and horizon within the central horizontal band so a 2.3:1 center crop preserves them. Place the main scene interest toward the middle-right. Keep the lower-left quarter naturally dark, quiet, and uncluttered for HTML text that will be added later; do not draw a panel or hard gradient box. The scene must read clearly at a small card size.
Constraints: Entire image is artwork with no border, no rounded corners, no UI, no text, no letters, no numbers, no logo, no watermark. No people or characters, no glossy toy-like 3D, no oversaturated neon, no noisy micro-details, no starburst highlights. Opaque background.
Primary request: A deep-blue science-fiction vista of a distant planet and an elegant orbital architectural structure: a graceful ring-like station or sparse orbital building arcs along the middle-right, with a large faraway planet softly lit beyond it.
Lighting/mood: Quiet deep navy space, muted indigo planetary atmosphere, restrained silver-blue edge light, extremely sparse stars. Monumental, plausible, calm and cinematic. Broad readable planetary and architectural forms, no vehicles in the foreground, no busy technical greebles. Lower-left is spacious dark navy.
```

