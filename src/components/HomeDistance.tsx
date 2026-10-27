import distances from '../../public/data/home-distances.json';
import home from '../../public/data/home.json';
type Distance={straight_line_km:number|null;transit_url:string;walking_url:string;maps_url:string};
export const DEFAULT_HOME_ADDRESS=home.address;
export default function HomeDistance({slug,address=home.address}:{slug:string;address?:string}){
 const entry=(distances as Record<string,Distance>)[slug];if(!entry)return null;
 const sameHome=address.replace(/, Japan$/,'')===home.address.replace(/, Japan$/,'');
 const route=(base:string)=>{const u=new URL(base);u.searchParams.set('origin',address);return u.toString();};
 return <section className="home-distance"><h3>From home</h3>{sameHome&&entry.straight_line_km!==null?<strong>About {entry.straight_line_km.toFixed(1)} km ({(entry.straight_line_km/1.609344).toFixed(1)} mi) straight-line</strong>:<strong>Check the route from your address</strong>}<p>{sameHome&&entry.straight_line_km!==null?'Approximate geographic distance, not the walking or train route. Actual journeys are longer and include station access and transfers.':'No verified point-to-point distance is available for this option or edited home address.'} Live travel times are in Maps.</p><div><a href={route(entry.transit_url)} target="_blank" rel="noopener noreferrer">Transit from home</a><a href={route(entry.walking_url)} target="_blank" rel="noopener noreferrer">Walking route</a></div><small>Home near Kita-Ikebukuro, not Ikebukuro Station. <a href={home.source_url} target="_blank" rel="noopener noreferrer">Home address geocode: Japan GSI</a>, checked {home.checked_date}. Venue coordinates are supplied archive points, not newly surveyed entrances.</small></section>;
}
