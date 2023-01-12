import Redis from 'ioredis'
const CLUSTER_ENDPOINT = 'cluster.endpoint.com'
const CLUSTER_NAME = 'cluster_name'
const WAIT_LIST = 'wait_list_name'

const USER_CAPACITY = 1000;
const RETRY_DELAY = 1000; //ms
const RETRY_TIMES = 3;

const jsonString = (count, status) => {
    return JSON.stringify({
        "waitCount": count,
        "status": status,
    })
}

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

const getBody = (rankingOfUser) => {
    return (rankingOfUser < USER_CAPACITY) ?
        jsonString(0, "OK") :
        jsonString(rankingOfUser + 1 - USER_CAPACITY, "WAIT")
}

const retryFunctionWithRedis = async (redis, func) => {
    for (let i = 0; i < RETRY_TIMES; i++) {
        const result = await Promise.race([
            promiseDelay(RETRY_DELAY),
            func,
        ])
        if (!isNaN(result) && result >= 0) {
            return result
        }
    }
    return 0
}


export const handler = async (event) => {
    const redis = new Redis.Cluster([
        portAndHost("0001", "001")
    ]);

    const userId = JSON.parse(event.body).userId

    if(!userId) return

    return retryFunctionWithRedis(redis, redis.zrank(WAIT_LIST, userId)).then(
        (rankingOfUser) => {
            redis.disconnect()
            const body = getBody(rankingOfUser)
            return {
                statusCode: 200,
                body: body
            };
        })
};
