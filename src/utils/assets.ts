export function publicAsset(name:string){return new URL(import.meta.env.BASE_URL+name,document.baseURI).href;}
