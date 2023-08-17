import Redis from 'ioredis';

const CLUSTER_ENDPOINT = 'cluster.endpoint.com';
const CLUSTER_NAME = 'cluster_name';
const WAIT_LIST = 'wait_list_name';

const portAndHost = (shard, node) => ({
    port: 6379,
    host: `${CLUSTER_NAME}-${shard}-${node}.${CLUSTER_ENDPOINT}`,
});

const addToWaitList = async (redis, userId) => {
    const now = Date.now();
    await redis.zadd(WAIT_LIST, 'LT', now, userId);
};

const setTokenWithExpiration = async (redis, userId) => {
    return await redis.set(userId, 'OK', 'EX', 20);
};

export const handler = async (event) => {
    const redis = new Redis.Cluster([
        portAndHost("0001", "001")
    ]);

    const userId = JSON.parse(event.body)?.userId;

    if (!userId) {
        await redis.disconnect();
        return { statusCode: 400, body: 'Missing userId' };
    }

    try {
        await addToWaitList(redis, userId);
        const setResponse = await setTokenWithExpiration(redis, userId);
        return { statusCode: 200, body: setResponse };
    } catch (error) {
        console.error('Error:', error);
        return { statusCode: 500, body: 'Internal Server Error' };
    } finally {
        await redis.disconnect();
    }
};
