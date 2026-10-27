import { existsSync } from 'node:fs';
import { join } from 'node:path';
import type { CmsAnnouncement, CmsEntry, CmsProject, CmsService, ContentKind, SiteSettings, PublicationStatus } from '@/types/cms';
import { ApiError } from './security';
import { getDb, newId, nowIso, uploadDirectory } from './db';
import { getServiceBySlug, listContent } from './cms';

export const emailPattern=/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/;
export const uuidPattern=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function bad(key:string,message:string):never {throw new ApiError(400,'Please review the highlighted information.',{[key]:message});}
export function text(input:Record<string,unknown>,key:string,max=500,required=false,min=1) {
  const raw=input[key];if(raw!==undefined && typeof raw!=='string')bad(key,'Enter text for this field.');
  const value=(typeof raw==='string'?raw:'').trim();
  if(required && value.length<min)bad(key,`Enter at least ${min} character${min===1?'':'s'}.`);
  if(value.length>max)bad(key,`Use ${max} characters or fewer.`);
  if(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(value))bad(key,'Remove unsupported control characters.');
  return value;
}
function single(input:Record<string,unknown>,key:string,max=500,required=false,min=1) {const v=text(input,key,max,required,min);if(/[\r\n]/.test(v))bad(key,'Use one line of text.');return v;}
function bool(input:Record<string,unknown>,key:string,fallback=false) {if(input[key]===undefined)return fallback;if(typeof input[key]!=='boolean')bad(key,'Choose yes or no.');return input[key] as boolean;}
function strings(input:Record<string,unknown>,key:string,maxItems=30,maxLength=300):string[] {
  const value=input[key]??[];if(!Array.isArray(value)||value.length>maxItems)bad(key,`Provide up to ${maxItems} items.`);
  const entries=(value as unknown[]).map(entry=>{if(typeof entry!=='string'||entry.trim().length>maxLength||/[\u0000-\u001f\u007f]/.test(entry))bad(key,`Each item must be text of up to ${maxLength} characters.`);return (entry as string).trim();}).filter(Boolean);
  return [...new Set(entries)];
}
export function safeUrl(value:string,key:string,localOnly=false) {
  if(!value)return '';
  if(/^\/media\/[a-f0-9-]+\.(webp|png|jpe?g|vtt)$/i.test(value)) {
    if(localOnly) {
      const filename=value.slice('/media/'.length),asset=getDb().prepare('SELECT mime FROM uploads WHERE name=?').get(filename) as {mime:string}|undefined;
      if(!asset||!existsSync(join(uploadDirectory(),filename)))bad(key,'This upload is unavailable. Upload the file again.');
      const expected=key==='captionsUrl'?'text/vtt':'image/';
      if(!asset.mime.startsWith(expected))bad(key,key==='captionsUrl'?'Choose an uploaded WebVTT captions file.':'Choose an uploaded PNG, JPEG, or WebP image.');
    }
    return value;
  }
  if(localOnly)bad(key,'Choose a file uploaded through this admin panel.');
  if(value.startsWith('/')&&!value.startsWith('//')&&!value.includes('\\')&&!/[\u0000-\u0020]/.test(value))return value;
  try{const url=new URL(value);if(url.protocol==='https:'&&!url.username&&!url.password)return url.toString();}catch{}
  bad(key,'Enter an HTTPS address or a website path beginning with /.');
}
function date(input:Record<string,unknown>,key:string) {const value=single(input,key,50);if(!value)return '';const n=Date.parse(value);if(!Number.isFinite(n))bad(key,'Enter a valid date and time.');return new Date(n).toISOString();}
function base(input:Record<string,unknown>,existing?:CmsEntry) {
  const slug=single(input,'slug',100,true);if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug))bad('slug','Use lowercase letters, numbers, and single hyphens.');
  const sortOrder=input.sortOrder??0;if(!Number.isInteger(sortOrder)||Number(sortOrder)<0||Number(sortOrder)>100000)bad('sortOrder','Enter a whole number from 0 to 100,000.');
  const status=input.status??'draft';if(status!=='draft'&&status!=='published')bad('status','Choose draft or published.');
  return {id:existing?.id||newId(),slug,title:single(input,'title',200,true),status:status as PublicationStatus,sortOrder:Number(sortOrder),featured:bool(input,'featured'),updatedAt:nowIso()};
}
export function validateContent(kind:ContentKind,input:Record<string,unknown>,existing?:CmsEntry):CmsEntry {
  const common=base(input,existing);let item:CmsEntry;
  const duplicate=getDb().prepare('SELECT id FROM content WHERE kind=? AND slug=? AND id<>?').get(kind,common.slug,common.id);
  if(duplicate)bad('slug','This address is already used. Choose a different slug.');
  if(kind==='services') {
    const aliases=strings(input,'aliases',20,100);if(existing&&existing.slug!==common.slug&&!aliases.includes(existing.slug))aliases.push(existing.slug);
    if(aliases.some(value=>!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value)))bad('aliases','Use valid lowercase slugs for old service addresses.');
    const candidates=new Set([common.slug,...aliases]);
    if(listContent<CmsService>('services').some(other=>other.id!==common.id&&[other.slug,...other.aliases].some(value=>candidates.has(value))))bad('slug','This slug or an alias is already used by another service.');
    item={...common,short:single(input,'short',100)||common.title,icon:single(input,'icon',40)||'cpu',description:text(input,'description',5000,true),details:strings(input,'details'),outcome:text(input,'outcome',3000),official:bool(input,'official',true),category:single(input,'category',100,true),filterCategory:single(input,'filterCategory',100)||single(input,'category',100),shortDescription:text(input,'shortDescription',500,true),benefits:strings(input,'benefits'),aliases} satisfies CmsService;
  } else if(kind==='projects') {
    const serviceSlugs=strings(input,'serviceSlugs',30,100);if(!serviceSlugs.length)bad('serviceSlugs','Select at least one service category.');
    const all=listContent<CmsService>('services');if(serviceSlugs.some(slug=>!all.some(service=>service.slug===slug)))bad('serviceSlugs','Select categories from the current service catalog.');
    const projectType=input.projectType??'completed';if(projectType!=='concept'&&projectType!=='completed')bad('projectType','Choose concept or completed.');
    const imageUrl=safeUrl(single(input,'imageUrl',1000),'imageUrl',true),imageAlt=single(input,'imageAlt',300);if(imageUrl&&!imageAlt)bad('imageAlt','Describe the project image for visitors who cannot see it.');
    const videoUrl=safeUrl(single(input,'videoUrl',2000),'videoUrl'),captionsUrl=safeUrl(single(input,'captionsUrl',1000),'captionsUrl',true),transcript=text(input,'transcript',20000);
    if(captionsUrl&&!captionsUrl.endsWith('.vtt'))bad('captionsUrl','Upload a WebVTT captions file.');
    if(videoUrl&&common.status==='published'&&(!captionsUrl||!transcript))bad('captionsUrl','Published videos need captions and a text transcript.');
    const completedAt=single(input,'completedAt',20);if(completedAt&&(!/^\d{4}-\d{2}-\d{2}$/.test(completedAt)||Number.isNaN(Date.parse(completedAt))))bad('completedAt','Use a valid completion date (YYYY-MM-DD).');
    item={...common,description:text(input,'description',3000,true),serviceSlugs,stack:strings(input,'stack',30,100),creativeTypes:strings(input,'creativeTypes',20,100),projectType,imageUrl,imageAlt,visualType:single(input,'visualType',40)||'website',opportunity:text(input,'opportunity',12000,true),approach:text(input,'approach',12000,true),demonstration:text(input,'demonstration',12000,true),client:single(input,'client',200),completedAt,videoUrl,captionsUrl,transcript} satisfies CmsProject;
  } else {
    const type=input.type??'announcement';if(type!=='announcement'&&type!=='promotion')bad('type','Choose announcement or promotion.');
    const imageUrl=safeUrl(single(input,'imageUrl',1000),'imageUrl',true),imageAlt=single(input,'imageAlt',300);if(imageUrl&&!imageAlt)bad('imageAlt','Describe the announcement image.');
    const ctaUrl=safeUrl(single(input,'ctaUrl',2000),'ctaUrl'),ctaLabel=single(input,'ctaLabel',120);if(ctaUrl&&!ctaLabel)bad('ctaLabel','Enter a descriptive label for the link.');
    const startsAt=date(input,'startsAt'),endsAt=date(input,'endsAt');if(startsAt&&endsAt&&startsAt>=endsAt)bad('endsAt','Choose an end date after the start date.');
    item={...common,type,summary:text(input,'summary',1000,true),body:text(input,'body',20000,true),imageUrl,imageAlt,ctaUrl,ctaLabel,startsAt,endsAt} satisfies CmsAnnouncement;
  }
  return item;
}
export function validateSettings(input:Record<string,unknown>,current:SiteSettings):SiteSettings {
  const merged={...current,...input} as Record<string,unknown>;
  const result:SiteSettings={
    businessName:single(merged,'businessName',200,true),tagline:single(merged,'tagline',200),logoUrl:safeUrl(single(merged,'logoUrl',1000),'logoUrl',true),logoAlt:single(merged,'logoAlt',300),
    logoLightUrl:safeUrl(single(merged,'logoLightUrl',1000),'logoLightUrl',true),logoLightAlt:single(merged,'logoLightAlt',300),
    logoDarkUrl:safeUrl(single(merged,'logoDarkUrl',1000),'logoDarkUrl',true),logoDarkAlt:single(merged,'logoDarkAlt',300),
    defaultTheme:(merged.defaultTheme??'system') as SiteSettings['defaultTheme'],contactEmail:single(merged,'contactEmail',254,true),phone:single(merged,'phone',50),address:text(merged,'address',500),
    heroEyebrow:single(merged,'heroEyebrow',200),heroTitle:single(merged,'heroTitle',200,true),heroAccent:single(merged,'heroAccent',200),heroDescription:text(merged,'heroDescription',1500,true),aboutTitle:single(merged,'aboutTitle',200,true),aboutDescription:text(merged,'aboutDescription',8000,true),mission:text(merged,'mission',8000,true),vision:text(merged,'vision',8000,true),ctaTitle:single(merged,'ctaTitle',300,true),ctaDescription:text(merged,'ctaDescription',1500),analyticsEnabled:bool(merged,'analyticsEnabled',true),accessibilityEmail:single(merged,'accessibilityEmail',254,true),inquiryRetentionDays:Number(merged.inquiryRetentionDays),socialLinks:[]
  };
  if(!emailPattern.test(result.contactEmail))bad('contactEmail','Enter a valid contact email.');if(!emailPattern.test(result.accessibilityEmail))bad('accessibilityEmail','Enter a valid accessibility contact email.');
  if(result.logoUrl&&!result.logoAlt)bad('logoAlt','Describe your logo.');
  if(result.logoLightUrl&&!result.logoLightAlt)bad('logoLightAlt','Describe the logo shown in light mode.');
  if(result.logoDarkUrl&&!result.logoDarkAlt)bad('logoDarkAlt','Describe the logo shown in dark mode.');
  if(!['light','dark','system'].includes(result.defaultTheme))bad('defaultTheme','Choose Light, Dark, or Follow device.');
  if(!Number.isInteger(result.inquiryRetentionDays)||result.inquiryRetentionDays<30||result.inquiryRetentionDays>3650)bad('inquiryRetentionDays','Choose 30 to 3,650 days.');
  const links=merged.socialLinks??[];if(!Array.isArray(links)||links.length>10)bad('socialLinks','Add up to 10 social links.');
  result.socialLinks=links.map((v:unknown)=>{if(!v||typeof v!=='object')bad('socialLinks','Provide a label and link.');const link=v as Record<string,unknown>;return{label:single(link,'label',80,true),url:safeUrl(single(link,'url',2000,true),'socialLinks')};});
  return result;
}
export function validateRecipients(value:unknown):string[] {
  if(!Array.isArray(value)||value.length<1||value.length>10)bad('recipients','Add between 1 and 10 notification recipients.');
  const recipients=value.map((item:unknown)=>{if(typeof item!=='string'||item.length>254||!emailPattern.test(item.trim())||/[\r\n]/.test(item))bad('recipients','Every recipient must have a valid email address.');return(item as string).trim().toLowerCase();});
  return [...new Set(recipients)];
}
export function validateInquiry(input:Record<string,unknown>) {
  if(text(input,'website',300))throw new ApiError(400,'Unable to accept this inquiry.');
  const name=single(input,'name',100,true,2),email=single(input,'email',254,true).toLowerCase(),phone=single(input,'phone',32),company=single(input,'company',150),subject=single(input,'subject',150),message=text(input,'message',5000,true,20);
  if(!emailPattern.test(email))bad('email','Enter a valid email address, such as name@example.com.');
  const preferredContactMethod=input.preferredContactMethod===undefined?'email':input.preferredContactMethod;if(preferredContactMethod!=='email'&&preferredContactMethod!=='phone')bad('preferredContactMethod','Choose email or phone.');
  const digits=phone.replace(/\D/g,'').length;if(phone&&(!/^[+()\d .-]+$/.test(phone)||digits<7||digits>20))bad('phone','Include a valid phone number with country or area code.');if(preferredContactMethod==='phone'&&!phone)bad('phone','Enter a phone number so we can call you.');
  const requestedService=single(input,'service',100),service=requestedService?getServiceBySlug(requestedService)?.slug:'';
  if(requestedService&&!service)bad('service','Select a currently available service.');
  if(input.consent!==true)bad('consent','Agree to the privacy notice so we can respond to your inquiry.');
  const submissionId=single(input,'submissionId',80,true);if(!uuidPattern.test(submissionId))bad('submissionId','Refresh the page and submit again.');
  return {name,email,phone,company,subject,message,preferredContactMethod,service:service||'',submissionId};
}
