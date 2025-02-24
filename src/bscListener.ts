import { ethers } from 'ethers';
import Config from './config';
import { Transaction } from './dbService';

const LLA_ABI = [
    "event CrossedSuccess(uint256 indexed lockId, bool success)"
];

async function listenBscEvents() {
    const provider = new ethers.JsonRpcProvider(Config.bscRpcUrl);
    const llaContract = new ethers.Contract(
        Config.bscLLAContractAddress,
        LLA_ABI,
        provider
    );

    // Listen for CrossedSuccess events
    llaContract.on("CrossedSuccess", async (lockId, success, event) => {
        console.log(`CrossedSuccess event detected: lockId=${lockId}, success=${success}`);

        try {
            const transaction = await Transaction.findByPk(lockId.toNumber());
            if (!transaction) {
                console.error(`Transaction not found for lockId=${lockId}`);
                return;
            }

            // Update acknowledgment status
            await transaction.update({
                ackStatus: success ? 1 : 2
            });

            console.log(`Transaction ack status updated: lockId=${lockId}, success=${success}`);

        } catch (error: any) {
            console.error(`Error processing CrossedSuccess event: lockId=${lockId}, error=${error.message}`);
        }
    });

    console.log("Listening for CrossedSuccess events on BSC...");
}

export default listenBscEvents;