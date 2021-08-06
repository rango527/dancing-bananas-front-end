import { useEffect, useState } from 'react';
import useWebSocket from 'react-use-websocket';
import redis from 'util/redis';

import { debug } from 'util/debug';
import { EthGasPrices } from '@sommelier/shared-types';
import config from 'config/app';

export const ethGasPriceTopic = 'ethGas:getGasPrices';
export const gasPriceTopicRex = /^ethGas:getGasPrices/;

export function useEthGasPrices(): EthGasPrices | null {
    const [gasPrices, setGasPrices] = useState<EthGasPrices | null>(null);

    const [isSubscribed, setIsSubscribed] = useState<boolean>(false);
    const { sendJsonMessage, lastJsonMessage } = useWebSocket(config.wsApi);

    useEffect(() => {
        console.log('useEthGasPrices effect 1');
        if (!isSubscribed) {
            sendJsonMessage({
                op: 'subscribe',
                topics: ['ethGas:getGasPrices'],
            });
            setIsSubscribed(true);
        }
        console.log('useEthGasPrices effect 1 end');
    }, [isSubscribed, sendJsonMessage]);

    useEffect(() => {
        // console.log("useEthGasPrices effect 2 start");
        // //redis.connect();
        // console.log("status", redis.status);

        // redis.get("gasprices", function (err, result) {
        //     if (err) {
        //         console.log(err);
        //     } else {
        //         console.log("no error");
        //         return result;
        //     }
        // });

        // if no message, bail
        if (!lastJsonMessage) return;

        console.log('useEthGasPrices effect 2 end');
        // if no topic, bail
        const { topic } = lastJsonMessage;
        if (!topic) return;

        // check if we have the gas price topic
        if (gasPriceTopicRex.test(topic)) {
            const {
                data: newGasPrices,
            }: { data: EthGasPrices } = lastJsonMessage;

            // ensure the price actually changed before setting
            if (isChangedPrice(gasPrices, newGasPrices)) {
                setGasPrices(newGasPrices);
            }

            //redis.set("test", "data");//, "EX", 120);
            debug.gasPrices = newGasPrices;
        }

        console.log('test');
        console.log(lastJsonMessage);
        console.log('test');
        if (gasPrices) {
            // redis.set("gasprices", gasPrices, "EX", 120);
        }
    }, [lastJsonMessage, gasPrices]);

    return gasPrices;
}

export function isChangedPrice(
    oldPrices: EthGasPrices | null,
    prices?: EthGasPrices | null,
): boolean {
    return (
        prices?.safeLow !== oldPrices?.safeLow ||
        prices?.standard !== oldPrices?.standard ||
        prices?.fast !== oldPrices?.fast ||
        prices?.fastest !== oldPrices?.fastest
    );
}
