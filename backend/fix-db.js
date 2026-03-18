const Datastore = require('@seald-io/nedb');
const axios = require('axios');
const db = new Datastore({filename:'d:/case management/backend/data/complaints.db', autoload:true});

async function fix() {
  const docs = await db.findAsync({ $or: [{latitude:null}, {latitude:{$exists:false}}] });
  for(let d of docs) {
    if(!d.location) continue;
    console.log('Fixing:', d.location);
    try {
      const parts = d.location.split(',').map(s=>s.trim().replace(/distt/ig,'').trim());
      const fb = parts.length > 1 ? parts[parts.length-1] : d.location.split(' ')[0];
      console.log('Query:', fb);
      const r = await axios.get('https://nominatim.openstreetmap.org/search', {
        params: { q: fb, format: 'json', limit: 1 },
        headers: { 'User-Agent': 'PoliceCMS-CaseManagementApp/1.0 (admin@policecms.gov)' }
      });
      if(r.data.length) {
        await db.updateAsync({_id:d._id}, {$set: {latitude: parseFloat(r.data[0].lat), longitude: parseFloat(r.data[0].lon)}});
        console.log('Fixed:', r.data[0].lat, r.data[0].lon);
      } else {
        console.log('No results for', fb);
      }
    } catch(e) {
      console.error(e.message);
    }
  }
  console.log('Done');
  process.exit(0);
}
fix();
