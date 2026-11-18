const bcrypt = require('bcryptjs');
const { MongoClient } = require('mongodb');

async function resetPassword() {
  const uri = "mongodb://localhost:27017";
  const client = new MongoClient(uri);

  try {
    await client.connect();
    const db = client.db("corenetwork_db");
    
    // Generate a fresh hash
    const newHash = bcrypt.hashSync('Admin@123', 10);
    console.log("Generated Hash:", newHash);

    // Update the user
    const result = await db.collection("users").updateOne(
      { email: "kingarinzin@acc.org.bt" },
      { $set: { password: newHash } }
    );
    
    console.log("Update Result:", result);
  } finally {
    await client.close();
  }
}

resetPassword();
