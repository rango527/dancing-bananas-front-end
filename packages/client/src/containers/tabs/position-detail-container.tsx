/* eslint-disable react-hooks/rules-of-hooks */
import { useState, useContext, useEffect, useReducer } from 'react';
import { formatUSD, formatNumber } from 'util/formats';
import { resolveLogo } from 'components/token-with-logo';
import pngX from 'styles/images/X-119.png';
import classNames from 'classnames';
import { CollectFeeBasketData } from 'types/states';
import { storage } from 'util/localStorage';

import './position-manager-container.scss';

import { IconShop } from 'components/icon';

import pngChevronDown from 'styles/images/chevron-down.png';
import pngChevronUp from 'styles/images/chevron-up.png';
import pngMonkeyHappy from 'styles/images/monkey-happy.png';
import pngTokenCRV from 'styles/images/tokens/CRV.png';
import pngTokenETH from 'styles/images/tokens/ETH.png';
import pngMoney from 'styles/images/money.png';

import pngArrowLeft_1 from 'styles/images/left-arrow-1.png';
import pngChevronRight from 'styles/images/chevron-right.png';

import { V3PositionData } from '@sommelier/shared-types/src/api';
import BigNumber from 'bignumber.js';

const PositionDetailContainer = ({
    positionData,
    positionType,
    onBack,
    onClose,
    onCollectFee,
}: {
    positionData: V3PositionData | null;
    positionType: 'positive' | 'negative';
    onBack: () => void;
    onClose: () => void;
    onCollectFee: () => void;
}): JSX.Element | null => {
    const [detailOpen, setDetailOpen] = useState<boolean>(true);
    const handleCollectFee = () => {
        if (positionData === null) {
            return;
        }
        const pool = positionData.position.pool;
        console.log('liquidity: ', positionData.position.liquidity);
        const basketInfo: CollectFeeBasketData = {
            poolId: pool.id,
            positionId: positionData.position.id,
            poolName: `${pool.token0.symbol}-${pool.token1.symbol}`,
            token0Address: pool.token0.id,
            token0Name: pool.token0.symbol,
            token1Address: pool.token1.id,
            token1Name: pool.token1.symbol,
            volumeUSD: pool.volumeUSD,
            actionType: 'collect',
            collectAsWeth: false,
            fee: new BigNumber(positionData.stats.uncollectedFeesUSD).toFixed(
                2,
            ),
            liquidity: new BigNumber(positionData.stats.usdAmount).toFixed(0),
        };
        storage.addFeeBasketData(basketInfo);
        onCollectFee();
    };
    const getTotalGains = () => {
        const currentLiquidity =
            positionData?.stats?.usdAmount !== undefined
                ? new BigNumber(positionData?.stats?.usdAmount)
                : new BigNumber(0);
        const feeCollected =
            positionData?.stats?.collectedFeesUSD !== undefined
                ? new BigNumber(positionData?.stats?.collectedFeesUSD)
                : new BigNumber(0);
        const feeUnCollected =
            positionData?.stats?.uncollectedFeesUSD !== undefined
                ? new BigNumber(positionData?.stats?.uncollectedFeesUSD)
                : new BigNumber(0);
        const entryLiquidity =
            positionData?.stats?.entryUsdAmount !== undefined
                ? new BigNumber(positionData?.stats?.entryUsdAmount)
                : new BigNumber(0);

        const gains = currentLiquidity
            .plus(feeCollected)
            .plus(feeUnCollected)
            .minus(entryLiquidity);

        return formatUSD(gains.toString());
    };

    return (
        <div className='position-detail-container'>
            <img
                className='close-image'
                src={pngX}
                onClick={(e) => onClose()}
            />
            <div className='position-detail-header'>
                <img src={pngArrowLeft_1} onClick={(e) => onBack()} />
                <span>DANCING BANANA POSITIONS</span>
                <img height='10' src={pngChevronRight} />
                <span className='green'>{`${positionData?.position?.pool?.token0?.symbol}/${positionData?.position?.pool?.token1?.symbol}`}</span>
            </div>
            <div className='position-detail-unlock'>
                <button>
                    <IconShop fill='#fff' />
                    <div>
                        UNLOCK MORE
                        <br />
                        ADVANCED FEATURES
                    </div>
                </button>
            </div>
            <div className='position-detail-info'>
                <div className='position-detail-token'>
                    <div className='position-item-token'>
                        <div style={{ height: 52 }}>
                            {resolveLogo(
                                positionData?.position?.pool?.token0?.id,
                                '52px',
                            )}
                        </div>
                        <span>
                            {positionData?.position?.pool?.token0?.symbol}
                        </span>
                    </div>
                    <div className='position-item-token'>
                        <div style={{ height: 52 }}>
                            {resolveLogo(
                                positionData?.position?.pool?.token1?.id,
                                '52px',
                            )}
                        </div>
                        <span>
                            {positionData?.position?.pool?.token1?.symbol}
                        </span>
                    </div>
                </div>
                <div className='position-detail-separator'></div>
                <div className='position-detail-type'>
                    <img src={pngMonkeyHappy} />
                    <span
                        className={classNames({
                            green: positionType === 'positive',
                            red: positionType === 'negative',
                        })}
                    >
                        {/* {positionType === 'positive' ? '+ ' : '- '} */}
                        {formatUSD(
                            positionData?.stats?.totalFeesUSD !== undefined
                                ? new BigNumber(
                                      positionData?.stats?.totalFeesUSD,
                                  ).toString()
                                : 0,
                        )}
                    </span>
                </div>
            </div>
            <div className='position-detail-stats'>
                <div className='position-detail-stats-header'>
                    <span>POSITION DETAILS</span>
                    <img
                        src={detailOpen ? pngChevronUp : pngChevronDown}
                        onClick={(e) => setDetailOpen(!detailOpen)}
                    />
                </div>
                {detailOpen && (
                    <div className='position-detail-stats-wrapper'>
                        <div className='position-detail-stats-row'>
                            <div className='position-detail-stats-property'>
                                CURRENT LIQUIDITY
                            </div>
                            <div className='position-detail-stats-value'>
                                {formatUSD(
                                    positionData?.stats?.usdAmount !== undefined
                                        ? new BigNumber(
                                              positionData?.stats?.usdAmount,
                                          ).toString()
                                        : 0,
                                )}
                            </div>
                        </div>
                        <div className='position-detail-stats-row'>
                            <div className='position-detail-stats-property'>
                                FEES COLLECTED
                            </div>
                            <div className='position-detail-stats-value'>
                                {formatUSD(
                                    positionData?.stats?.collectedFeesUSD !==
                                        undefined
                                        ? new BigNumber(
                                              positionData?.stats?.collectedFeesUSD,
                                          ).toString()
                                        : 0,
                                )}
                            </div>
                        </div>
                        <div className='position-detail-stats-row'>
                            <div className='position-detail-stats-property'>
                                -INITIAL LIQUIDITY
                            </div>
                            <div className='position-detail-stats-value'>
                                {formatUSD(
                                    positionData?.stats?.entryUsdAmount !==
                                        undefined
                                        ? new BigNumber(
                                              positionData?.stats?.entryUsdAmount,
                                          ).toString()
                                        : 0,
                                )}
                            </div>
                        </div>
                        <div className='position-detail-stats-row'>
                            <div className='position-detail-stats-property'>
                                TOTAL GAINS
                            </div>
                            <div className='position-detail-stats-value green'>
                                {getTotalGains()}
                            </div>
                        </div>
                        <div className='position-detail-stats-action'>
                            <button
                                className='btn-collect-fee'
                                onClick={handleCollectFee}
                            >
                                COLLECT FEES AND LIQUIDITY
                                <img
                                    src={pngMoney}
                                    style={{ marginLeft: 15 }}
                                    width='30'
                                />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default PositionDetailContainer;
