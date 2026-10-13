export const PROJECT_REPOSITORY_URL = 'https://github.com/mySingleLive/xaanink-desktop'
export const PROJECT_STAR_HINT = '将在浏览器打开 GitHub，点击仓库右上角 Star 即可支持。'
export const PROJECT_STAR_COPY = {
 settings: {title:'喜欢玄印写作？',message:'在 GitHub 点亮一颗 Star，让更多创作者遇见玄印。',label:'去 GitHub 点亮 Star'},
 welcome: {message:'愿玄印陪你写下更多灵感。如果喜欢，欢迎用一颗 Star 支持我们。',label:'给玄印一颗 Star'},
 about: {message:'你的每一颗 Star，都是玄印继续打磨的动力。',label:'在 GitHub 支持玄印'},
} as const

// Keep packaging SemVer intact; only zero-patch alpha releases use the short UI label.
export function displayAppVersion(version: string): string {
 return version.replace(/^(\d+\.\d+)\.0(-alpha(?:\.\d+)?)$/, '$1$2')
}
