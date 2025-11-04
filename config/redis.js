// const redis = require('redis');


// const client = redis.createClient();

// client.on('errr', err => console.log('Redis client error',err));

// const connectRedis = async () => {
//     await client.connect();
// }

// module.exports = connectRedis;


const  {createClient} = require('redis')

const client = createClient({
    username: 'default',
    password: process.env.REDIS_PASS,
    socket: {
        host: 'redis-17384.c301.ap-south-1-1.ec2.redns.redis-cloud.com',
        port: 17384
    }
});

client.on('error', err => console.log('Redis Client Error', err));

const connectRedis = async () => {
    await client.connect();
    await client.set('check', 'redis connnection check: passed');
    const check = await client.get('check');
    console.log(check);
}


module.exports = connectRedis;