import Redis from 'ioredis'

const CLUSTER_ENDPOINT = 'cluster.endpoint.com'
const CLUSTER_NAME = 'cluster_name'
const WAIT_LIST = 'wait_list_name'

const RETRY_TIMES = 3;
const RETRY_DELAY = 500;

const portAndHost = (shard, node) => {
    return {
        port: 6379,
        host: `${CLUSTER_NAME}-${shard}-${node}.${CLUSTER_ENDPOINT}`,
    }
}

const promiseDelay = async (ms) => {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}

const retryFunctionWithRedis = async (redis, func) => {
    for (let i = 0; i < RETRY_TIMES; i++) {
        const result = await Promise.race([
            promiseDelay(RETRY_DELAY),
            func,
        ])
        if (result === "OK") {
            return {statusCode: 200}
        }
    }
    return {
        statusCode: 201,
    };
}

export const handler = async (event) => {
    const redis = new Redis.Cluster([
        portAndHost("0001", "001")
    ]);

    const userId = JSON.parse(event.body).userId
    const now = Date.now()

    // add user to waitlist
    await retryFunctionWithRedis(redis, redis.zadd(WAIT_LIST, 'LT', now, userId));

    // set token that will expire
    retryFunctionWithRedis(redis, redis.set(userId, 'OK', 'EX', 20)).then(
        (result) => {
            redis.disconnect()
            return result
        })
};
