import dotenv from 'dotenv';
import { connectDB } from './database/mongodb';
import { PORT } from './config';
import app from './app';

dotenv.config();

async function startServer() {
    await connectDB();
    app.listen(PORT, () => {
        console.log(`server on http://localhost:${PORT}`);
    });
}

startServer();