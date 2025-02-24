import { ethers } from 'ethers';
import Config from './config';
import { Transaction } from './dbService';

async function listenBscEvents() {
    try {
        const provider = new ethers.JsonRpcProvider(Config.bscRpcUrl);
        const bridgeContract = new ethers.Contract(
            Config.bscLLAContractAddress,
            [],  // ABI will be added here
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