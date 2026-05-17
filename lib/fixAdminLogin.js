const path = require("path")
require("dotenv").config({ path: path.join(__dirname, "..", ".env") })

const { getDb } = require("./handlers/_db")
const bcrypt = require("bcryptjs")

const fix = async () => {
  const db = await getDb()

  // Find existing main_admin
  const admin = await db.collection("users").findOne({
    role: "main_admin",
  })

  if (!admin) {
    console.log("❌ No main_admin found in users collection")
    process.exit(1)
  }

  console.log("Found admin:", admin.email, admin.user_id)

  // Add admin@kalia.com as secondary email and ensure password hash works.
  const newHash = await bcrypt.hash("Hanumanji22@", 10)

  await db.collection("users").updateOne(
    { _id: admin._id },
    {
      $set: {
        email_aliases: ["admin@kalia.com"],
        password_hash: newHash,
        updated_at: new Date(),
      },
    }
  )

  // Also insert a separate admin@kalia.com user that points to same account.
  const existing = await db.collection("users").findOne({ email: "admin@kalia.com" })

  if (!existing) {
    await db.collection("users").insertOne({
      user_id: admin.user_id || admin.userId || admin._id,
      email: "admin@kalia.com",
      username: admin.username || "admin_kalia",
      full_name: admin.full_name || admin.name || "Abhishek Kalia",
      role: "main_admin",
      password_hash: newHash,
      password: newHash,
      balance: admin.balance || 0,
      is_active: true,
      is_admin: true,
      original_user_id: admin._id,
      created_at: new Date(),
      updated_at: new Date(),
    })
    console.log("✅ Created admin@kalia.com login")
  } else {
    await db.collection("users").updateOne(
      { email: "admin@kalia.com" },
      {
        $set: {
          role: "main_admin",
          password_hash: newHash,
          password: newHash,
          user_id: admin.user_id || admin.userId || admin._id,
          updated_at: new Date(),
        },
      }
    )
    console.log("✅ Updated admin@kalia.com password")
  }

  console.log("✅ Login fix complete!")
  console.log("Login with: admin@kalia.com / Hanumanji22@")
  process.exit(0)
}

fix().catch((err) => {
  console.error("Error:", err.message)
  process.exit(1)
})

