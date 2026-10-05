export type Rect={x:number;y:number;width:number;height:number};
export type Footprint=Rect&{shape?:'ellipse'};
export type MapBlock=Footprint&{id:string;name:string;accent:string;bottom:number;top:number;kind:'building'|'crate'|'barrier'|'planter'|'monument'|'rail'|'deck'};
export type Surface=Footprint&{id:string;elevation:number;ramp?:{axis:'x'|'y';from:number;to:number};style:'deck'|'stairs'|'ramp'};
export type District={id:string;name:string;x:number;y:number;accent:string};
export type Decoration={kind:'tank'|'pipe'|'rock'|'stack'|'lavafall'|'vent'|'dome'|'shuttle'|'cart'|'barrel';x:number;y:number;elevation?:number;width:number;height:number;depth:number};
export type MapEnvironment={base:string;fog:string;accent:string;theme?:'industrial'|'sky_port'|'canyon'|'fjord';lava?:string;cloudColor?:string;cloudShade?:string;lighting?:{sky:string;ground:string;sun:string;points:{color:string;x:number;y:number;z:number;intensity:number;distance:number}[]}};
export type MapDefinition={id:string;name:string;bounds:{width:number;height:number};plaza:Footprint;blocks:MapBlock[];surfaces:Surface[];ground?:Footprint[];spawns:{x:number;y:number;elevation?:number}[];districts:District[];minimapLabels?:{text:string;x:number;y:number}[];decorations?:Decoration[];environment:MapEnvironment;variants?:Readonly<Record<string,MapEnvironment>>};
