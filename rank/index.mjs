import Redis from 'ioredis';

const CLUSTER_ENDPOINT = 'cluster.endpoint.com';
const CLUSTER_NAME = 'cluster_name';
const WAIT_LIST = 'wait_list_name';
const USER_CAPACITY = 1000;

const jsonString = (count, status) => JSON.stringify({ waitCount: count, status });

const portAndHost = (shard, node) => ({ port: 6379, host: `${CLUSTER_NAME}-${shard}-${node}.${CLUSTER_ENDPOINT}` });

const getUserId = (event) => {
    const userId = JSON.parse(event.body)?.userId;
    return userId || null;
};

const handleError = (error) => {
    console.error('Error:', error);
    return { statusCode: 500, body: 'Internal Server Error' };
};

const buildResponse = (statusCode, body) => ({ statusCode, body });

export const handler = async (event) => {
    const redis = new Redis.Cluster([portAndHost("0001", "001")]);

    const userId = getUserId(event);

    if (!userId) {
        redis.disconnect();
        return buildResponse(400, 'Missing userId');
    }

    try {
        const rankingOfUser = await redis.zrank(WAIT_LIST, userId);

        const waitCount = rankingOfUser < USER_CAPACITY ? 0 : rankingOfUser + 1 - USER_CAPACITY;
        const status = rankingOfUser < USER_CAPACITY ? 'OK' : 'WAIT';
        const responseBody = jsonString(waitCount, status);

        return buildResponse(200, responseBody);
    } catch (error) {
        return handleError(error);
    } finally {
        redis.disconnect();
    }
};
