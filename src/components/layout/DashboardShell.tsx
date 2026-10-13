"use client"

import { useEffect } from "react"
import { Group, Panel, Separator } from "react-resizable-panels"
import { CommentDraftAccount } from "@/components/comments/comment-drafts"
import { useTabsStore } from "@/stores/tabs"
import { useChatStore } from "@/stores/chat"
import { Button } from "@/components/ui/button"
import { useDesktopCommands } from "@/lib/desktop/use-command-target"
import { ChatPanel } from "./ChatPanel"
import { ContentTabs } from "./ContentTabs"
import { SidebarTree } from "./SidebarTree"
import { useSidebarDrawer } from "./useSidebarDrawer"

function ResizeHandle() { return <Separator className="workspace-resize-handle transition-colors" /> }

export function DashboardShell({ user }: { user: { id: string; name: string; email: string; avatarUrl?: string } }) {
  const drawer = useSidebarDrawer()
  const { showContent, hideContent, showChat } = drawer
  useDesktopCommands({ "view.sidebar": drawer.toggleSidebar, "view.content": drawer.toggleContent })
  useEffect(() => useChatStore.subscribe((state, previous) => { if (state.chatFocusNonce !== previous.chatFocusNonce) showChat() }), [showChat])
  useEffect(() => useTabsStore.subscribe((state, previous) => {
    if (state.activeTabId && (state.activeTabId !== previous.activeTabId || state.activationNonce !== previous.activationNonce)) showContent()
    else if (state.tabs.length === 0 && previous.tabs.length > 0) hideContent()
  }), [hideContent, showContent])

  return <CommentDraftAccount userId={user.id}>
    <div ref={drawer.rootRef} className="dashboard-shell flex h-dvh flex-col overflow-hidden" data-narrow-pane={drawer.mode === "narrow" ? drawer.narrowPane : undefined} data-drawer-mode={drawer.mode} data-sidebar-phase={drawer.phase} data-sidebar-underlay={drawer.underlay}>
      <nav aria-label="创作工作区" className="hidden shrink-0 gap-1 border-b border-border bg-background px-2 py-1 max-[900px]:flex">
        <Button size="sm" variant="ghost" aria-pressed={drawer.narrowPane === "sidebar"} onClick={() => drawer.selectPane("sidebar")}>作品目录</Button>
        <Button size="sm" variant="ghost" aria-pressed={drawer.narrowPane === "chat"} onClick={() => drawer.selectPane("chat")}>返回对话</Button>
        <Button size="sm" variant="ghost" aria-pressed={drawer.narrowPane === "content"} disabled={!drawer.contentMounted} onClick={() => drawer.selectPane("content")}>查看内容</Button>
      </nav>
      <Group orientation="horizontal" className="workspace-group min-h-0 flex-1" groupRef={drawer.groupRef} elementRef={drawer.groupElementRef} defaultLayout={drawer.registrationLayout} onLayoutChanged={drawer.onLayoutChanged}>
        <Panel id="sidebar" defaultSize={260} minSize={drawer.sidebarVisible && !drawer.sidebarAnimating && drawer.mode === "wide" ? 200 : 0} maxSize={drawer.mode === "narrow" || drawer.sidebarAnimating ? "100%" : 420} groupResizeBehavior="preserve-pixel-size" elementRef={drawer.sidebarElementRef} className="workspace-sidebar h-full">
          <div className="sidebar-drawer-viewport" aria-hidden={drawer.interactionPaused || undefined} inert={drawer.interactionPaused}>
            <div className="sidebar-drawer-inner" ref={drawer.innerRef}>
              <SidebarTree user={user} onToggleSidebar={drawer.toggleSidebar} interactionPaused={drawer.interactionPaused} />
            </div>
          </div>
        </Panel>
        {drawer.sidebarDividerVisible && <ResizeHandle />}
        <Panel id="chat" defaultSize={560} minSize={drawer.chatVisible && !drawer.chatAnimating && !drawer.contentAnimating && !drawer.sidebarAnimating && drawer.mode === "wide" ? 420 : 0} groupResizeBehavior="preserve-pixel-size" className="workspace-chat h-full" inert={drawer.underlayInert || !drawer.chatVisible} aria-hidden={drawer.underlayInert || !drawer.chatVisible || undefined}>
          <ChatPanel key={user.id} userId={user.id} contentHidden={!drawer.contentVisible} onShowContent={() => { drawer.showContent(); drawer.selectPane("content") }} sidebarHidden={drawer.sidebarHidden} onShowSidebar={drawer.toggleSidebar} />
        </Panel>
        {drawer.contentMounted && <>
          {drawer.contentDividerVisible && <ResizeHandle />}
          <Panel id="content" defaultSize={0} minSize={drawer.contentAnimating || drawer.chatAnimating || drawer.sidebarAnimating || drawer.mode === "narrow" ? 0 : "30%"} className="workspace-content h-full" inert={drawer.underlayInert} aria-hidden={drawer.underlayInert || undefined}>
            <ContentTabs fullscreen={!drawer.chatVisible} onToggleFullscreen={drawer.toggleFullscreen} onToggleContent={drawer.toggleContent} sidebarHidden={drawer.sidebarHidden && !drawer.chatVisible} onShowSidebar={drawer.toggleSidebar} />
          </Panel>
        </>}
      </Group>
    </div>
  </CommentDraftAccount>
}
