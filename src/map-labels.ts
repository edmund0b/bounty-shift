import type {MapDefinition} from '../shared/maps/types';
import {PLAZA_BUILDINGS} from '../shared/maps/central-plaza-layout';
import {SCORCHED_SITES} from '../shared/maps/scorched-layout';
import {AERIE_SITES} from '../shared/maps/aerie-layout';
const footprints={central_plaza:PLAZA_BUILDINGS,scorched_point:SCORCHED_SITES,aerie_sky_port:AERIE_SITES};

// Only presentation aliases live here; names and world anchors come from the existing districts.
const shortNames:Record<string,Record<string,string>>={
 central_plaza:{center:'PLAZA',hq:'BOUNTY',apartments:'APTS',club:'CLUB',store:'STORE',parking:'PARKING',noodles:'NOODLES',electronics:'TECH',warehouse:'WHSE',transit:'TRANSIT',maintenance:'MAINT.'},
 scorched_point:{crucible:'CORE',mining:'MINING',residential:'RUINS',research:'RESEARCH',workshop:'WORKSHOP',store:'MARKET',power:'POWER',warehouse:'WHSE'},
 aerie_sky_port:{hub:'HUB',arrival:'ARRIVAL',mall:'MALL',observation:'DOME',control:'CONTROL',residential:'SPIRE',hangar:'HANGAR',garden:'GARDEN'},
 outlaws_canyon:{pit:'PIT',bridge:'BRIDGE',outpost:'OUTPOST',cave:'CAVE',floor:'FLOOR',tower:'TOWER'},
 vikings_fjord:{square:'VILLAGE',longhouse:'LONGHOUSE',tower:'TOWER',docks:'DOCKS',ice:'ICE BRIDGE',cave:'CAVERN',cliff:'CLIFF'},
};
export type LocationLabel={id:string;fullName:string;shortName:string;x:number;y:number;lines:string[];fontSize:number;width:number;height:number};
const smallLocations:Record<string,Record<string,string>>={
 central_plaza:{center:'PLAZA',hq:'HQ',club:'CLUB'},scorched_point:{crucible:'CORE',residential:'RUINS',power:'POWER'},
 aerie_sky_port:{hub:'HUB',mall:'MALL',observation:'DOME'},outlaws_canyon:{pit:'PIT',cave:'CAVE',tower:'TOWER'},
 vikings_fjord:{square:'SQUARE',docks:'DOCKS',ice:'ICE'},
};
export function mapLocationLabels(map:MapDefinition,expanded:boolean,small=false):LocationLabel[]{
 const placed:LocationLabel[]=[];
 small=small&&!expanded;
 for(const location of map.districts){
  if(small&&!smallLocations[map.id]?.[location.id])continue;
  const shortName=(small?smallLocations[map.id]?.[location.id]:shortNames[map.id]?.[location.id])??location.name;
  // Font units scale with the SVG world coordinates, preserving north-up positioning.
  let fontSize=small?190:expanded?68:100;
  const text=expanded?location.name:shortName;
  const lines=text.split(' ');
  // Building footprint controls available line length without copying its coordinates.
  const building=(footprints[map.id as keyof typeof footprints]??[]).find(b=>b.id===location.id);
  const maxWidth=building?Math.max(240,building.width-35):small?750:560;
  const longest=Math.max(...lines.map(s=>s.length));
  fontSize=Math.min(fontSize,maxWidth/(longest*.61));
  const label={id:location.id,fullName:location.name,shortName,x:location.x,y:location.y,lines,fontSize,width:longest*fontSize*.61+18,height:lines.length*fontSize*1.12+12};
  // Crowded secondary text is omitted instead of overlapping; anchors never drift to another site.
  if(!placed.some(p=>Math.abs(p.x-label.x)<(p.width+label.width)/2&&Math.abs(p.y-label.y)<(p.height+label.height)/2))placed.push(label);
 }
 return placed;
}
