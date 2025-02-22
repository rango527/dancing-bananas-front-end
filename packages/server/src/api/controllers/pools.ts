import { celebrate, Joi, Segments } from 'celebrate';
import {
    endOfDay,
    endOfHour,
    startOfDay,
    startOfHour,
    subWeeks,
} from 'date-fns';
import { Request, Router } from 'express';
import { EthNetwork } from '@sommelier/shared-types';

import { HTTPError } from 'api/util/errors';
import { memoConfig, UniswapV3Fetchers } from 'services/uniswap-v3';
import {
    GetEthPriceResult,
    GetPoolDailyDataResult,
    GetPoolHourlyDataResult,
    GetPoolOverviewResult,
    GetTopPoolsResult,
} from '@sommelier/shared-types/src/api'; // how do we export at root level?
// import { memoize } from 'util/memoizer-redis';
// import { hourMs, secondMs } from 'util/date';
// import shortLinks from 'services/short-links';
import catchAsyncRoute from 'api/util/catch-async-route';
import config from '@config';
// import validateEthAddress from 'api/util/validate-eth-address';
import {
    poolIdParamsSchema,
    poolIdValidator,
    networkSchema,
    networkValidator,
} from 'api/util/validators';
import { getUser, getDefaultUser, saveUser } from 'api/util/user-redis';

// poolToPair(pool: Pool): IUniswapPair {
// const totalSupply = '0'; // TODO
// const feesUSD:string = <any> new BigNumber(pool.uncollectedFeesUSD + pool.collectedFeesUSD).toString();

type Path = {
    network: EthNetwork;
};

type PoolPath = Path & {
    poolId: string;
};

// GET /ethPrice
async function getEthPrice(
    req: Request<Path, unknown, unknown, unknown>,
): Promise<GetEthPriceResult> {
    const { network } = req.params;
    const fetcher = UniswapV3Fetchers.get(network);

    return fetcher.getEthPrice();
}

// GET /pools
// should gen the query types from the joi schema?
type GetTopPoolsQuery = {
    count: number;
    sort: 'volumeUSD' | 'liquidity';
};

type GetRandomPoolsQuery = {
    sort: 'volumeUSD' | 'liquidity';
    wallet: string | '';
};

const getTopPoolsValidator = celebrate({
    [Segments.QUERY]: Joi.object().keys({
        // If you change the default values for count or sort, you'll ned to update
        // the cache warming work in packages/workers
        count: Joi.number().min(1).max(1000).default(100),
        sort: Joi.string().valid('volumeUSD', 'liquidity').default('volumeUSD'),
        old: Joi.string().default(''),
    }),
    [Segments.PARAMS]: networkSchema,
});

const getRandomPoolsValidator = celebrate({
    [Segments.QUERY]: Joi.object().keys({
        // If you change the default values for count or sort, you'll ned to update
        // the cache warming work in packages/workers
        sort: Joi.string().valid('volumeUSD', 'liquidity').default('volumeUSD'),
        wallet: Joi.string().default(''),
    }),
    [Segments.PARAMS]: networkSchema,
});

async function getTopPools(
    req: Request<Path, unknown, unknown, GetTopPoolsQuery>,
): Promise<GetTopPoolsResult> {
    const { network } = req.params;
    const fetcher = UniswapV3Fetchers.get(network);

    // TODO: add override for route.get()
    // Request<any, any, any, ParsedQs> query must be a ParsedQs
    // We should add a union type for all validated queries
    // or find a better TS integration with Celebrate
    const { count, sort }: GetTopPoolsQuery = <any>req.query;
    return fetcher.getTopPools(count, sort);
}

async function getCurrentPool(
    req: Request<Path, unknown, unknown, GetRandomPoolsQuery>,
): Promise<string> {
    const { wallet }: GetRandomPoolsQuery = <any>req.query;

    let userInfo = await getUser(wallet);

    const defaultPoolId = '0x8ad599c3a0ff1de082011efddc58f1908eb6e6d8'; // usdc/weth

    if (wallet !== '0x' && userInfo === null) {
        userInfo = getDefaultUser();
        userInfo.address = wallet;
        userInfo.lastPoolIds = [defaultPoolId];

        await saveUser(wallet, userInfo);
    }

    if (userInfo === null) {
        return defaultPoolId;
    }

    return userInfo.lastPoolIds.length > 0
        ? userInfo.lastPoolIds[0]
        : defaultPoolId;
}

async function getRandomPool(
    req: Request<Path, unknown, unknown, GetRandomPoolsQuery>,
): Promise<string> {
    const { network } = req.params;
    const fetcher = UniswapV3Fetchers.get(network);

    // TODO: add override for route.get()
    // Request<any, any, any, ParsedQs> query must be a ParsedQs
    // We should add a union type for all validated queries
    // or find a better TS integration with Celebrate
    const { sort, wallet }: GetRandomPoolsQuery = <any>req.query;

    let userInfo = await getUser(wallet);

    let lastPoolId = '';
    if (userInfo !== null) {
        lastPoolId =
            userInfo.lastPoolIds.length > 0 ? userInfo.lastPoolIds[0] : '';
    }

    // console.log('lastPoolId', lastPoolId);

    const data = await fetcher.getTopPools(30, sort);
    const findIndex = data.findIndex(
        (d) => lastPoolId !== '' && d.id.toString() === lastPoolId.toString(),
    );

    const nextIndex = Math.floor(Math.random() * 30); //(findIndex + 1) % data.length;
    const nextPool = data[nextIndex];

    if (userInfo) {
        userInfo.lastPoolIds = [nextPool.id];
    } else {
        if (wallet !== '0x') {
            userInfo = getDefaultUser();
            userInfo.address = wallet;
            userInfo.lastPoolIds = [nextPool.id];
        }
    }
    console.log('next pool id ---------------------------', nextPool.id);
    if (wallet && wallet !== '' && wallet !== '0x' && userInfo !== null) {
        try {
            await saveUser(wallet, userInfo);
        } catch (err) {
            console.log(err);
        }
    }

    return nextPool.id;
}

// GET /pools/:id
async function getPoolOverview(
    req: Request<PoolPath, unknown, unknown, unknown>,
): Promise<GetPoolOverviewResult> {
    const { poolId, network } = req.params;
    const fetcher = UniswapV3Fetchers.get(network);

    return fetcher.getPoolOverview(poolId);
}

// GET /pools/:id/historical/daily
type GetHistoricalDataQuery = {
    startDate: Date;
    endDate?: Date;
};
const getHistoricalDataValidator = celebrate({
    [Segments.PARAMS]: poolIdParamsSchema,
    [Segments.QUERY]: Joi.object().keys({
        startDate: Joi.date().required(),
        endDate: Joi.date().greater(Joi.ref('startDate')),
    }),
});

async function getHistoricalDailyData(
    req: Request<PoolPath, unknown, unknown, GetHistoricalDataQuery>,
): Promise<GetPoolDailyDataResult> {
    const { poolId, network } = req.params;
    const fetcher = UniswapV3Fetchers.get(network);

    // TODO: Fix type
    const { startDate, endDate } = req.query;
    const start = startOfDay(startDate);
    const end = endOfDay(endDate ?? new Date());

    return fetcher.getHistoricalDailyData(poolId, start, end);
}

// GET /pools/:id/historical/hourly
async function getHistoricalHourlyData(
    req: Request<PoolPath, unknown, unknown, GetHistoricalDataQuery>,
): Promise<GetPoolHourlyDataResult> {
    const { poolId, network } = req.params;
    const fetcher = UniswapV3Fetchers.get(network);

    const { startDate, endDate }: GetHistoricalDataQuery = <any>req.query;
    if (startDate < subWeeks(new Date(), 1)) {
        throw new HTTPError(
            400,
            `"startDate" must fall within the window of 1 week.`,
        );
    }
    const start = startOfHour(startDate);
    const end = endOfHour(endDate ?? new Date());

    return fetcher.getHistoricalHourlyData(poolId, start, end);
}

const baseUrl = config.pools.shortLinkBaseUrl;
// const getByPool = memoize(shortLinks.getByPool.bind(shortLinks));
// async function getShortUrl(
//     req: Request<PoolPath, unknown, unknown, unknown>,
// ): Promise<string> {
//     const { poolId, network } = req.params;
//     let key: string;
//     try {
//         key = await getByPool(poolId);
//     } catch (error) {
//         key = await shortLinks.generateShort(network, poolId);
//     }
//
//     return `${baseUrl}/${key}`;
// }

const route = Router();
const cacheConfig = { public: true };
// sMaxAge: 5 min in seconds
const poolConfig = {
    maxAge: 30,
    sMaxAge: memoConfig.getTopPools.ttl / 1000,
    ...cacheConfig,
};
// TODO: Revisit
const historyConfig = { maxAge: 5 * 60, sMaxAge: 60 * 60, ...cacheConfig };
route.get(
    '/:network/ethPrice',
    networkValidator,
    catchAsyncRoute(getEthPrice, poolConfig),
);

route.get(
    '/:network/randomPool',
    getRandomPoolsValidator,
    // sMaxAge != memoizer ttl here because we have the cache warmer, we want the cdn to revalidate more often
    catchAsyncRoute(getRandomPool, poolConfig),
);

route.get(
    '/:network/currentPool',
    getRandomPoolsValidator,
    // sMaxAge != memoizer ttl here because we have the cache warmer, we want the cdn to revalidate more often
    catchAsyncRoute(getCurrentPool, poolConfig),
);

route.get(
    '/:network/pools',
    getTopPoolsValidator,
    // sMaxAge != memoizer ttl here because we have the cache warmer, we want the cdn to revalidate more often
    catchAsyncRoute(getTopPools, poolConfig),
);

route.get(
    '/:network/pools/:poolId',
    poolIdValidator,
    // sMaxAge != memoizer ttl here because we have the cache warmer, we want the cdn to revalidate more often
    catchAsyncRoute(getPoolOverview, poolConfig),
);

route.get(
    '/:network/pools/:poolId/historical/daily',
    getHistoricalDataValidator,
    catchAsyncRoute(getHistoricalDailyData, historyConfig),
);

route.get(
    '/:network/pools/:poolId/historical/hourly',
    getHistoricalDataValidator,
    catchAsyncRoute(getHistoricalHourlyData, historyConfig),
);

// route.get(
//     '/:network/pools/:poolId/shorts',
//     poolIdValidator,
//     catchAsyncRoute(getShortUrl, {
//         public: true,
//         immutable: true,
//         maxAge: hourMs / secondMs,
//     }),
// );

export default route;
