import curation from '../../public/data/curated.json';
import type {Place,Plan} from '../types';
// Source records and prior user choices stay recoverable. This is not a closure.
export const EXCLUDED_SUGGESTIONS=new Set(curation.excluded_slugs);
export const isSuggested=(p:Place|string)=>!EXCLUDED_SUGGESTIONS.has(typeof p==='string'?p:p.slug);
export const preserveArchivedAssignments=(previous:Plan,next:Plan):Plan=>({...Object.fromEntries(Object.entries(previous).filter(([slug])=>!isSuggested(slug))),...next});
export const hasCoordinates=(p:Place):p is Place&{lat:number;lng:number}=>typeof p.lat==='number'&&Number.isFinite(p.lat)&&typeof p.lng==='number'&&Number.isFinite(p.lng);
