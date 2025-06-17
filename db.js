// lib/connectToDB.js
const { MongoClient } = require("mongodb");

const uri = process.env.MONGODB_URI;
const options = {};

let client;
let db;

if (!uri) throw new Error("⚠️ MONGODB_URI not defined in environment variables");

async function connectToDB() {
  if (db) return db; // reuse existing DB connection

  if (!client) {
    client = new MongoClient(uri, options);
    await client.connect();
    console.log("mongodb connected successfully");
  }

  db = client.db("neon-meme-marketplace"); // your DB name from URI
  return db;
}

module.exports = connectToDB;
