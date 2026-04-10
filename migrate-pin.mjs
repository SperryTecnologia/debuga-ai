import mysql from 'mysql2/promise';

const conn = await mysql.createConnection(process.env.DATABASE_URL);

try {
  await conn.execute("ALTER TABLE `conversations` ADD `isPinned` boolean DEFAULT false NOT NULL");
  console.log("Added isPinned column");
} catch (e) {
  if (e.code === 'ER_DUP_FIELDNAME') {
    console.log("isPinned column already exists, skipping");
  } else {
    throw e;
  }
}

try {
  await conn.execute("ALTER TABLE `conversations` ADD `isArchived` boolean DEFAULT false NOT NULL");
  console.log("Added isArchived column");
} catch (e) {
  if (e.code === 'ER_DUP_FIELDNAME') {
    console.log("isArchived column already exists, skipping");
  } else {
    throw e;
  }
}

await conn.end();
console.log("Migration complete!");
