import Redis from 'ioredis';

const CLUSTER_ENDPOINT = 'cluster.endpoint.com';
const CLUSTER_NAME = 'cluster_name';
const WAIT_LIST = 'wait_list_name';

const QUEUE_SIZE = 1000;
const START_OF_TIME = 0;
const END_OF_TIME = Date.now() + 400000; // Randomly chosen time in the future

const portAndHost = (shard, node) => ({
    port: 6379,
    host: `${CLUSTER_NAME}-${shard}-${node}.${CLUSTER_ENDPOINT}`,
});

const processTickets = async (redis, tickets) => {
    const ticketPromises = await redis.mget(...tickets);
    const invalidTickets = tickets.filter((_, index) => !ticketPromises[index]);

    // TODO zrem 대신 레인지 삭제등을 사용할 수 있도록 변경. 현재 timecomplextiy O(long(N)*M)
    if (invalidTickets.length > 0) {
        await redis.zrem(WAIT_LIST, ...invalidTickets);
    }
};
export const handler = async () => {
    const redis = new Redis.Cluster([portAndHost('0001', '001')]);

    try {
        await processTickets(redis);
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await redis.disconnect();
    }
};
