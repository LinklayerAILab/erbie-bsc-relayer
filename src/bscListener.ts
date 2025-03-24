import { ethers } from 'ethers';
import Config from './config';
import { Transaction } from './dbService';
import * as fs from 'fs';
import * as path from 'path';

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

        console.log('Listening for CrossedSuccess events on BSC...');

        bridgeContract.on("CrossedSuccess", async (lockId: bigint, success: boolean, event: ethers.EventLog) => {
            try {
                console.log(`CrossedSuccess event detected: lockId=${lockId}, success=${success}`);

                const transaction = await Transaction.findByPk(Number(lockId));
                if (!transaction) {
                    console.log(`No transaction found for lockId=${lockId}`);
                    return;
                }

                // Update transaction status
                await transaction.update({
                    ackStatus: success ? 1 : 2
                });

                console.log(`Transaction status updated: lockId=${lockId}, success=${success}`);

            } catch (error: any) {
                console.error(`Error processing CrossedSuccess event: lockId=${lockId}, error=${error.message}`);
            }
        });

        provider.on('error', (error: Error) => {
            console.error('BSC provider error:', error);
        });

    } catch (error: any) {
        console.error('Error setting up BSC event listener:', error.message);
    }
}

export default listenBscEvents;