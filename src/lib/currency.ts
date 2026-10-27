export const FX_REFERENCE={jpyPerUsd:157.71185649,checkedAt:'2026-10-27T03:00:00Z',source:'https://www.xe.com/currencyconverter/convert/?Amount=1&From=USD&To=JPY'};
export function convertMoney(amount:number,from:'JPY'|'USD',rate=FX_REFERENCE.jpyPerUsd){if(!Number.isFinite(amount)||amount<0||!Number.isFinite(rate)||rate<=0)return null;return from==='JPY'?amount/rate:amount*rate;}
export function splitMoney(total:number,people:number){return Number.isFinite(total)&&total>=0&&Number.isInteger(people)&&people>0?total/people:null;}
