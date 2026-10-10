export class Canvas {
  style = { touchAction: 'pan-y' };
  attributes = new Map<string,string>();
  listeners = new Map<string, EventListener>();
  captures = new Set<number>();
  focused = false;
  getAttribute(key: string) { return this.attributes.get(key) ?? null; }
  setAttribute(key: string,value: string) { this.attributes.set(key,value); }
  removeAttribute(key: string) { this.attributes.delete(key); }
  addEventListener(type: string,fn: EventListener) { this.listeners.set(type,fn); }
  removeEventListener(type: string) { this.listeners.delete(type); }
  getBoundingClientRect() { return {left:100,top:50,width:400,height:300}; }
  setPointerCapture(id: number) { this.captures.add(id); }
  hasPointerCapture(id: number) { return this.captures.has(id); }
  releasePointerCapture(id: number) { this.captures.delete(id); }
  focus() { this.focused = true; }
  send(type: string,x=300,y=200,extra: Record<string,unknown>={}) {
    let prevented=false,stopped=false;
    this.listeners.get(type)?.({type,pointerId:1,button:0,clientX:x,clientY:y,preventDefault:()=>{prevented=true;},stopImmediatePropagation:()=>{stopped=true;},...extra} as unknown as Event);
    return {prevented,stopped};
  }
}
