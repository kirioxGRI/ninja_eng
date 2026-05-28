const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://neondb_owner:npg_EQWV1wGg3FiS@ep-long-mud-aqwrt5lq.c-8.us-east-1.aws.neon.tech/neondb?sslmode=require',
  ssl: { rejectUnauthorized: false }
});

const excludedIds = [
  908, 1590, 1600, 1602, 1704, 1710, 1711, 1799, 1826, 1930, 1979, 4407
];

async function run() {
  await client.connect();
  
  // Construct the query excluding the specific IDs and the range 2901-2999
  const query = `
    SELECT id, palabra 
    FROM public.word_list 
    WHERE id NOT IN (${excludedIds.join(',')}) 
      AND NOT (id >= 2901 AND id <= 2999) 
    ORDER BY id ASC 
    LIMIT 100
  `;
  
  const res = await client.query(query);
  console.log(JSON.stringify(res.rows, null, 2));
  
  await client.end();
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
