export class Input {
 keys=new Set<string>();pressed=new Set<string>();mouseX=0;mouseY=0;looking=false;enabled=false;spark=false;
 constructor(canvas:HTMLCanvasElement){
  window.addEventListener('keydown',e=>{if((e.target as HTMLElement).matches('input,button,select,textarea'))return;if(['Space','Tab','ArrowUp','ArrowDown'].includes(e.code))e.preventDefault();if(!this.keys.has(e.code))this.pressed.add(e.code);this.keys.add(e.code);});
  window.addEventListener('keyup',e=>this.keys.delete(e.code));
  window.addEventListener('blur',()=>this.clear());
  document.addEventListener('visibilitychange',()=>{if(document.hidden)this.clear();});
  canvas.addEventListener('contextmenu',e=>e.preventDefault());
  canvas.addEventListener('pointerdown',e=>{if(!this.enabled)return;if(e.button===2)this.looking=true;if(e.button===0)this.spark=true;});
  window.addEventListener('pointerup',e=>{if(e.button===2)this.looking=false;});
  window.addEventListener('pointermove',e=>{if(this.enabled&&(this.looking||document.pointerLockElement===canvas)){this.mouseX+=e.movementX;this.mouseY+=e.movementY;}});
 }
 axis(a:string,b:string){return (this.keys.has(b)?1:0)-(this.keys.has(a)?1:0);}
 once(k:string){const yes=this.pressed.has(k);this.pressed.delete(k);return yes;}
 clear(){this.keys.clear();this.pressed.clear();this.looking=false;this.spark=false;this.mouseX=this.mouseY=0;}
}
