const  {createClient} = require('redis')

const client = createClient({
    username: 'default',
    password: process.env.REDIS_PASS,
    socket: {
        host: 'redis-11845.crce276.ap-south-1-3.ec2.cloud.redislabs.com',
        port: 11845
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