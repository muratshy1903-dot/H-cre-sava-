import {spawn} from 'node:child_process';
if(Number(process.versions.node.split('.')[0])<24){console.error('Node.js 24 veya daha yenisi gerekli.');process.exit(1)}
// Local launch always stays on loopback. Production uses server/index.js and its own environment.
process.env.HOST='127.0.0.1';
process.env.PORT='3000';
process.env.PUBLIC_ORIGIN='http://127.0.0.1:3000';
process.env.TRUST_PROXY='0';
const {startServer}=await import('../server/index.js');
const server=startServer();
server.once('error',error=>{console.error(error.code==='EADDRINUSE'?'3000 numarali port kullanimda. Diger Agarm penceresini kapatip tekrar dene.':error.message);process.exitCode=1});
server.once('listening',()=>{
 const url='http://127.0.0.1:3000';
 console.log('\nAgarm calisiyor: '+url+'\nBu pencereyi kapatirsan oyun sunucusu durur.\nDurdurmak icin Ctrl+C.');
 if(process.platform==='win32'&&process.env.AGARM_NO_BROWSER!=='1'){
  const browser=spawn('cmd.exe',['/d','/c','start','',url],{stdio:'ignore',windowsHide:true});
  browser.on('error',()=>console.log('Tarayicida adresi kendin ac: '+url));
 }
});
const stop=()=>{server.shutdown(()=>process.exit(0));setTimeout(()=>process.exit(1),5000).unref()};
process.once('SIGINT',stop);process.once('SIGTERM',stop);
