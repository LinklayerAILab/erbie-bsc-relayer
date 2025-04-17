import { ethers } from 'ethers';
import Config from './config';
import { Transaction, syncDatabase } from './dbService';
import { processBscTransaction } from './bscProcessor';
import * as fs from 'fs';
import * as path from 'path';
import log from './logService';

async function listenErbieEvents() {
    // Load ABI from file
    const abiPath = path.resolve(__dirname, '../abi/erbieBridge.json');
    const abiJson = JSON.parse(fs.readFileSync(abiPath, 'utf8'));

    const provider = new ethers.JsonRpcProvider(Config.erbieRPCUrl);
    const bridgeContract = new ethers.Contract(
        Config.erbieBridgeAddress,
        abiJson.abi,
        provider
    );

    bridgeContract.on("TokenLocked", async (user, tokenAddress, amount, lockId, timestamp, event) => {
        log.info(`TokenLocked event detected: lockId=${lockId}, user=${user}, amount=${amount}, timestamp=${timestamp}`);

        // 从事件对象中获取交易哈希
        let erbieTxHash = '';

        // 首先尝试从log属性中获取transactionHash
        if (event && event.log && event.log.transactionHash) {
            erbieTxHash = event.log.transactionHash;
            log.info(`Found transactionHash in event.log: ${erbieTxHash}`);
        }
        // 如果log中没有，看事件对象本身是否有transactionHash
        else if (event && event.transactionHash) {
            erbieTxHash = event.transactionHash;
            log.info(`Found transactionHash in event: ${erbieTxHash}`);
        }
        // 都没有，则生成一个唯一ID
        else {
            erbieTxHash = `tx_${Date.now()}_${lockId}`;
            log.info(`Generated transactionHash: ${erbieTxHash}`);
        }

        try {
            await Transaction.create({
                lockId: typeof lockId === 'object' ? lockId.toNumber() : lockId,
                user,
                tokenAddress,
                amount: amount.toString(),
                erbieTxHash: erbieTxHash,
                bscTxHash: null,
                status: 'pending',
                error: null,
                ackStatus: 0,
                retryCount: 0,
            });

            log.info(`ErbieChain transaction saved to database: lockId=${lockId}, erbieTxHash=${erbieTxHash}`);

            // BSC Transaction Processor
            await processBscTransaction(user, tokenAddress, amount, typeof lockId === 'object' ? lockId.toNumber() : lockId, erbieTxHash);

        } catch (error: any) {
            log.error(`Error processing ErbieChain event: lockId=${lockId}`, error);

            // 尝试更新状态（如果记录已存在）
            await Transaction.update(
                {
                    status: 'failed',
                    error: error.message,
                },
                {
                    where: { lockId: typeof lockId === 'object' ? lockId.toNumber() : lockId },
                }
            );
        }
    });

    log.info("Listening for TokenLocked events on ErbieChain...");
}

export default listenErbieEvents;