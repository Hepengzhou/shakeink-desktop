"use client"
import {useRef,useState} from 'react'
import {ExternalLink,Star} from 'lucide-react'
import {Button} from '@/components/ui/button'
import {PROJECT_STAR_COPY,PROJECT_STAR_HINT} from '@desktop/shared/project-info'

export function ProjectStarPrompt({surface}:{surface:'settings'|'welcome'}) {
 const copy=PROJECT_STAR_COPY[surface]
 const locked=useRef(false)
 const [pending,setPending]=useState(false),[error,setError]=useState('')
 async function openRepository(){
  if(locked.current)return
  locked.current=true;setPending(true);setError('')
  try{
   if(!window.desktop)throw Error('Desktop unavailable')
   await window.desktop.openProjectRepository()
  }catch{setError('无法打开浏览器，请稍后重试。')}
  finally{locked.current=false;setPending(false)}
 }
 return <div className={`desktop-project-star desktop-project-star-${surface}${surface==='settings'?' desktop-setting-row':''}`}>
  <div className="desktop-project-star-copy">
   {surface==='settings'&&<strong><Star size={17} aria-hidden="true"/>{PROJECT_STAR_COPY.settings.title}</strong>}
   <p>{copy.message}</p>
   <small>{PROJECT_STAR_HINT}</small>
   {error&&<p role="alert" className="desktop-project-star-error">{error}</p>}
  </div>
  <Button type="button" variant="outline" disabled={pending} aria-busy={pending} onClick={()=>void openRepository()}>
   {surface==='welcome'&&<Star size={16} aria-hidden="true"/>}{copy.label}<ExternalLink size={14} aria-hidden="true"/>
  </Button>
 </div>
}
