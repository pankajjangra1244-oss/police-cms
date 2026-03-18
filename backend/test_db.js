const { Client } = require('pg'); 
const regions = ['ap-south-1', 'us-east-1', 'eu-central-1', 'ap-southeast-1', 'us-west-1', 'eu-west-1', 'eu-west-2', 'sa-east-1', 'ca-central-1', 'ap-northeast-1', 'ap-northeast-2', 'ap-southeast-2']; 
const pass = 'Pankaj%4036085260'; 

async function test() { 
  for (const r of regions) { 
    const uri = `postgresql://postgres.juuilissjirdpjmbhgqf:${pass}@aws-0-${r}.pooler.supabase.com:6543/postgres`; 
    console.log('Trying', r); 
    const c = new Client({ connectionString: uri, connectionTimeoutMillis: 5000 }); 
    try { 
      await c.connect(); 
      console.log('SUCCESS:', uri); 
      await c.end(); 
      return; 
    } catch (e) { 
      if (e.code === 'ENOTFOUND') { 
        // ignore 
      } else { 
        console.log('  Failed to auth:', e.message); 
      } 
    } 
  } 
  console.log('ALL_FAILED'); 
} 
test();
