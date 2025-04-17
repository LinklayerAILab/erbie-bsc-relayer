import { ethers } from 'ethers';
import Config from './config';
import { Transaction } from './dbService';
import * as fs from 'fs';
import * as path from 'path';
import log from './logService';

async function listenBscEvents() {
    try {
        // Load ABI from file
        const abiPath = path.resolve(__dirname, '../abi/bscBridge.json');
        const abiJson = JSON.parse(fs.readFileSync(abiPath, 'utf8'));

        const provider = new ethers.JsonRpcProvider(Config.bscRpcUrl);
        const bridgeContract = new ethers.Contract(
            Config.bscLLAContractAddress,
            abiJson.abi,
            provider
        );

        log.info('Listening for TokenMinted events on BSC...');

        bridgeContract.on("TokenMinted", async (user: string, amount: bigint, txHash: string, event: ethers.EventLog) => {
            try {
                log.info(`TokenMinted event detected: user=${user}, amount=${amount}, txHash=${txHash}`);

                // Find transaction by erbieTxHash
                const transaction = await Transaction.findOne({
                    where: { erbieTxHash: txHash }
                });

                if (!transaction) {
                    log.info(`No transaction found for txHash=${txHash}`);
                    return;
                }

                // Update transaction status
                await transaction.update({
                    ackStatus: 1 // Success
                });

                log.info(`Transaction status updated: lockId=${transaction.lockId}, txHash=${txHash}`);

            } catch (error: any) {
                log.error(`Error processing TokenMinted event: txHash=${txHash}`, error);
            }
        });

        provider.on('error', (error: Error) => {
            log.error('BSC provider error', error);
        });

    } catch (error: any) {
        log.error('Error setting up BSC event listener', error);
    }
}

export default listenBscEvents;