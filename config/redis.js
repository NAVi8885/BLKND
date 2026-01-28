const  {createClient} = require('redis')

const client = createClient({
    username: 'default',
    password: process.env.REDIS_PASS,
    socket: {
        host: process.env.REDIS_HOST,
        port: process.env.REDIS_PORT,
        reconnectStrategy: retries => Math.min(retries * 50, 1000),
        connectTimeout: 10000
    }
});

client.on('error', err => console.log('Redis Client Error', err));

(async () => {
    try {
        await client.connect();
        console.log('✅ Redis Connected Successfully');
    } catch (err) {
        console.error('❌ Redis Connection Failed:', err);
    }
})();


module.exports = {client};