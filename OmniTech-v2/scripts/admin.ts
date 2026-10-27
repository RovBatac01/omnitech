import './load-env';
import { createInterface } from 'node:readline/promises';
import { createUser, listUsers, resetPassword } from '../src/lib/auth';
import { closeDatabase } from '../src/lib/db';

async function hidden(question:string):Promise<string> {
  if(!process.stdin.isTTY)throw new Error('A terminal is required for a hidden password prompt. For automation only, set OMNITECH_ADMIN_PASSWORD in the process environment.');
  process.stdout.write(question);process.stdin.setRawMode(true);process.stdin.resume();process.stdin.setEncoding('utf8');
  return new Promise((resolve,reject)=>{let value='';const cleanup=()=>{process.stdin.off('data',onData);process.stdin.setRawMode(false);process.stdin.pause();process.stdout.write('\n');};
    function onData(chunk:string){for(const c of chunk){if(c==='\u0003'){cleanup();reject(new Error('Cancelled.'));return;}if(c==='\r'||c==='\n'){cleanup();resolve(value);return;}if(c==='\u007f'||c==='\b'){if(value.length){value=Array.from(value).slice(0,-1).join('');process.stdout.write('\b \b');}}else if(c>=' '&&value.length<128){value+=c;process.stdout.write('*');}}}
    process.stdin.on('data',onData);
  });
}
async function main() {
  const command=process.argv[2]||'create-owner';
  if(!['create-owner','reset-password'].includes(command))throw new Error('Usage: npm run admin -- create-owner OR npm run admin -- reset-password email@example.com');
  if(command==='create-owner'&&listUsers().length)throw new Error('An administrator already exists. Sign in and use Administrators to add accounts, or use reset-password from this trusted local console.');
  let name=process.env.OMNITECH_ADMIN_NAME||'',email=process.env.OMNITECH_ADMIN_EMAIL||process.argv[3]||'';
  if(!email||(command==='create-owner'&&!name)) {
    const prompt=createInterface({input:process.stdin,output:process.stdout});
    if(!email)email=(await prompt.question('Administrator email: ')).trim();
    if(command==='create-owner'&&!name)name=(await prompt.question('Administrator name: ')).trim();prompt.close();
  }
  let password=process.env.OMNITECH_ADMIN_PASSWORD || '';
  if(!process.env.OMNITECH_ADMIN_PASSWORD) {
    for(;;) {
      password=await hidden('New password / passphrase (12–128 characters): ');
      const confirmation=await hidden('Confirm new password: ');
      if(password!==confirmation) {console.log('The passwords do not match. Please try again. Your email and name are kept.');continue;}
      if(password.length<12||password.length>128) {console.log('Use 12–128 characters. Please try again.');continue;}
      break;
    }
  }
  if(command==='create-owner') {await createUser({name,email,password,role:'owner'});console.log('Owner account created. Open /admin/login and sign in with the email and password you chose.');}
  else {await resetPassword(email,password);console.log('Password reset. Existing sessions for this account were signed out.');}
}
main().catch(error=>{console.error(error instanceof Error?error.message:'Setup failed.');process.exitCode=1;}).finally(closeDatabase);
