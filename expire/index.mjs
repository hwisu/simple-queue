import Redis from 'ioredis'

const CLUSTER_ENDPOINT = 'cluster.endpoint.com'
const CLUSTER_NAME = 'cluster_name'
const WAIT_LIST = 'wait_list_name'

const QUEUE_SIZE = 1000
const START_OF_TIME = 0
const END_OF_TIME = Date.now() + 400000

const portAndHost = (shard, node) => {
    return {
        port: 6379,
        host: `${CLUSTER_NAME}-${shard}-${node}.${CLUSTER_ENDPOINT}`,
    }
}

const sleep = (ms) => {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}

const searchQueueWithRange = async (search_range, redis) => {
    const search_start = search_range * QUEUE_SIZE
    const search_end = (search_range + 1) * QUEUE_SIZE

    const tickets = await redis.zrangebyscore(WAIT_LIST, START_OF_TIME, END_OF_TIME, 'WITHSCORES', 'LIMIT', search_start, search_end);

    await checkTickets(tickets, redis)

}

const checkTickets = async (tickets, redis) => {
    // for each ticket, rem users if ticket user does not exist in the refresh pool
    // TODO : load bulk
    return tickets.forEach((ticket, index) => {
        if (index % 2 === 0) {
            redis.get(ticket).then((user) => {
                if (!user) {
                    redis.zrem(WAIT_LIST, ticket);
                }
            });
        }
    });
}

export const handler = async (event) => {
    // It is almost brute force algorithm. Might need some adjustment if you have high volume of traffic
    const redis = new Redis.Cluster([
        portAndHost("0001", "001")
    ]);
    for (let iteration = 0; iteration < 5; iteration++) {
        for (let search_range = 0; search_range < 12; search_range++) {
            // load all tickets between search_start and search_end
            await searchQueueWithRange(search_range, redis)
        }
        await sleep(10000)
    }
    await redis.disconnect()
};
