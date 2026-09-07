import { createWsRelayServer } from '@trystero-p2p/ws-relay/server';
import { createServer } from 'vite';
const relay=createWsRelayServer({port:8787});
const vite=await createServer({server:{host:'0.0.0.0',port:5173,strictPort:true}});
await vite.listen();vite.printUrls();
console.log('Local WebRTC signaling relay: ws://localhost:8787 (game data stays peer-to-peer)');
process.on('SIGINT',async()=>{await vite.close();relay.close?.();process.exit(0);});
