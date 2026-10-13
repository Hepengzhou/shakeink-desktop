import assert from 'node:assert/strict'
import {test} from 'node:test'
import {projectSidebarLayout,composeSidebarLayout,springProgress} from '../../src/lib/desktop/sidebar-layout'

test('SN-12 settled target respects actual Group pixels and all three terminal minima',()=>{
 const sizes=projectSidebarLayout({width:900,sidebarVisible:true,contentVisible:true,chatVisible:true,sidebar:260/900*100,content:50,chat:40})
 assert(sizes.sidebar>=200/900*100-1e-8);assert(sizes.sidebar<=420/900*100+1e-8)
 assert(sizes.chat>=420/900*100-1e-8);assert(sizes.content>=30)
 assert(Math.abs(sizes.sidebar+sizes.chat+sizes.content-100)<1e-8)
})
test('SN-12 hidden panels transfer their space and preserve normalized target intent',()=>{
 assert.deepEqual(projectSidebarLayout({width:1280,sidebarVisible:false,contentVisible:false,chatVisible:false,sidebar:20,content:40,chat:40}),{sidebar:0,chat:100,content:0})
 assert.deepEqual(projectSidebarLayout({width:1280,sidebarVisible:false,contentVisible:true,chatVisible:false,sidebar:20,content:40,chat:40}),{sidebar:0,chat:0,content:100})
})
test('SN-12 one frame compositor preserves latest axis while sidebar moves',()=>{
 for(const s of [0,4,12,20]){const content=composeSidebarLayout(s,'content',35,true);assert.equal(content.content,35);assert.equal(content.chat,65-s);const fullscreen=composeSidebarLayout(s,'chat',0,true);assert.equal(fullscreen.chat,0);assert.equal(fullscreen.content,100-s)}
 assert.deepEqual(composeSidebarLayout(12,'content',0,false),{sidebar:12,chat:88,content:0})
})
test('SN-12 critical spring is monotonic, exact and does not overshoot',()=>{
 let previous=0
 for(let i=0;i<=100;i++){const p=springProgress(i/100);assert(p>=previous);assert(p<=1);previous=p}
 assert.equal(springProgress(0),0);assert.equal(springProgress(1),1)
})
