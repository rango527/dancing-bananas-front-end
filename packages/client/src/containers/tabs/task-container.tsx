/* eslint-disable react-hooks/rules-of-hooks */
import { useState, useContext, useEffect, useReducer } from 'react';
import { formatUSD, formatNumber } from 'util/formats';
import { resolveLogo } from 'components/token-with-logo';
import classNames from 'classnames';

import { Level, LevelTask } from 'types/game';
import gameData from 'constants/gameData.json';
import { storage } from 'util/localStorage';

import './task-container.scss';

import pngSearch from 'styles/images/search.png';
import pngDancingBanana from 'styles/images/dancing-banana.png';
import pngArrowLeft from 'styles/images/left-arrow.png';
import pngTickBlack from 'styles/images/tick-black.png';

const TaskContainer = ({
    onBack,
    onLevelUp,
}: {
    onBack: () => void;
    onLevelUp: () => void;
}): JSX.Element | null => {
    const taskStatus = storage.getTaskStatus();
    const taskCompleted = storage.getLevelTaskCompleted();
    const level = storage.getLevel();
    const gameLevels: Level[] = gameData.game;
    const currentLevel: Level = gameLevels[Number(level) - 1];

    return (
        <div className='task-container'>
            <div className='task-container-head'>
                <img
                    className='back-image'
                    src={pngArrowLeft}
                    onClick={(e) => onBack()}
                />
                <img className='head-image' src={pngSearch} />
            </div>
            <div className='task-container-card'>
                <p className='task-title'>
                    LEVEL {level}: {currentLevel.description}
                </p>
                <p className='task-sub-title'>
                    YOU MUST COMPLETED THESE TASK <br />
                    FOR LEVEL UP
                </p>
                <div className='task-content'>
                    {taskStatus.map((task: LevelTask, index: number) => {
                        if (task.complete === false) {
                            return (
                                <button
                                    key={`level-task-${index}`}
                                    className='task-item active'
                                    onClick={(e) => onBack()}
                                >
                                    {task.taskName}
                                </button>
                            );
                        }
                        if (task.complete === true) {
                            return (
                                <button
                                    key={`level-task-${index}`}
                                    className='task-item'
                                >
                                    TASK COMPLETED
                                    <img
                                        src={pngTickBlack}
                                        style={{ marginLeft: 15 }}
                                        width='10'
                                    />
                                </button>
                            );
                        }

                        return null;
                    })}
                </div>
                <div className='reward-divider'>
                    <div className='line'></div>
                    <span>REWARDS</span>
                    <div className='line'></div>
                </div>
                <button
                    className={classNames('level-up-button', {
                        disabled: taskCompleted === false,
                    })}
                    onClick={(e) => {
                        if (taskCompleted === true) {
                            onLevelUp();
                        }
                    }}
                >
                    <span>LEVEL UP!</span>
                    <div className='level-up-cost'>
                        <img src={pngDancingBanana} />
                        <span>X2</span>
                    </div>
                </button>
            </div>
        </div>
    );
};

export default TaskContainer;
