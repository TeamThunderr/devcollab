const { Client } = require('pg');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('--- WIPE RENDER DATABASE ---');
rl.question('Paste your Render "External Database URL": ', (url) => {
  if (!url) {
    console.log('Canceled.');
    process.exit(0);
  }

  console.log('Connecting to remote database...');
  const client = new Client({ 
    connectionString: url.trim(), 
    ssl: { rejectUnauthorized: false } 
  });

  client.connect()
    .then(() => {
      console.log('Connected! Wiping database...');
      return client.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public;');
    })
    .then(() => { 
        console.log('✅ Database completely wiped!'); 
        process.exit(0); 
    })
    .catch(e => { 
        console.error('❌ Error:', e.message); 
        process.exit(1); 
    });
});
