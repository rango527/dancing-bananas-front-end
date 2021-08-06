import config from 'config/app';
import Redis from 'ioredis';

//let redis: Redis.Redis;
const { host, port, db, password } = config.redis;

const redisConfig: Record<string, any> = { host, port, db };
// if (password != null && password.length > 0) {
//     redisConfig = { ...redisConfig, password };
// }

console.log('before redis create');
const redis = new Redis(redisConfig);
console.log('after redis create');
//console.log(redis.status);
//redis.connect();
//redis.set("test", "data").then(r => console.log("done"));//, "EX", 120);
// } catch (e) {
//     console.error(
//         `Error connecting to redis at ${host}:${port}: ${e.message as string}`,
//     );
//     throw e;
// }

redis.on('connect', function () {
    console.log('REDIS CONNECTED');
});
redis.on('error', function (test) {
    console.log('REDIS ERROR', test);
});

export default redis;
