export type Rect={x:number;y:number;width:number;height:number};
export type MapBlock=Rect&{id:string;name:string;accent:string;bottom:number;top:number;kind:'building'|'crate'|'barrier'|'planter'|'monument'|'rail'|'deck'};
export type Surface=Rect&{id:string;elevation:number;ramp?:{axis:'x'|'y';from:number;to:number};style:'deck'|'stairs'|'ramp'};
export type District={id:string;name:string;x:number;y:number;accent:string};
export type MapDefinition={id:string;name:string;bounds:{width:number;height:number};plaza:Rect;blocks:MapBlock[];surfaces:Surface[];spawns:{x:number;y:number;elevation?:number}[];districts:District[];environment:{base:string;fog:string;accent:string}};
