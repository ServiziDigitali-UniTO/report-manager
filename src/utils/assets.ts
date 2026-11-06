import {appUrl} from '../services/bridge';
export function publicAsset(name:string){return new URL(name,appUrl()).href;}
