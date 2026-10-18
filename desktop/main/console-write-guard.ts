// A packaged launch usually has no attached console, so process.stdout and
// process.stderr are dead pipes. Any console.* write — including Electron's
// internal replyWithError logging when an IPC handler rejects — then raises
// EPIPE as an uncaught exception and shows the "JavaScript error in the main
// process" dialog. Swallow broken-pipe errors on those streams so logging can
// never crash the main process.
const ignoreBrokenPipe=(error:NodeJS.ErrnoException)=>{
  if(error?.code!=="EPIPE")throw error
}
for(const stream of [process.stdout,process.stderr])stream?.on("error",ignoreBrokenPipe)
