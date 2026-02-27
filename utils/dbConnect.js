import mongoose from 'mongoose';
import dotenv from 'dotenv'

dotenv.config();

let MONGODB_URI = process.env.MONGODB_URI

// If no MONGODB_URI provided, we'll use an in-memory MongoDB for local testing
let inMemoryServer;
if (!MONGODB_URI) {
    try {
        const { MongoMemoryServer } = await import('mongodb-memory-server');
        inMemoryServer = await MongoMemoryServer.create();
        MONGODB_URI = inMemoryServer.getUri();
        console.log('Using in-memory MongoDB for tests');
    } catch (e) {
        throw new Error('MONGODB_URI not set and mongodb-memory-server not available. Install it or set MONGODB_URI.');
    }
}

/**
 * Global is used here to maintain a cached connection across hot reloads
 * in development. This prevents connections growing exponentially
 * during API Route usage.
 */
let cached = global.mongoose

if (!cached) {
    cached = global.mongoose = { conn: null, promise: null }
}
const dbConnect = async () => {
    if (cached.conn) {
        return cached.conn
    }

    if (!cached.promise) {
        const opts = {
            bufferCommands: false
        }

        cached.promise = mongoose.connect(MONGODB_URI, opts).then((mongoose) => {
            console.log("connection successful")
            return mongoose
        })
    }

    try {
        cached.conn = await cached.promise
    } catch (e) {
        cached.promise = null
        throw e
    }

    return cached.conn
}

export default dbConnect