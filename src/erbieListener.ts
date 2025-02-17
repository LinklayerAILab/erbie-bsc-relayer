import { ethers } from 'ethers';
import Config from './config';
import { Transaction, syncDatabase } from './dbService';
import { processBscTransaction } from './bscProcessor';

async function listenErbieEvents() {
    const provider = new ethers.JsonRpcProvider(Config.erbieRPCUrl);
    const bridgeContract = new ethers.Contract(
        Config.erbieBridgeAddress,
        [
            "event TokenLocked(address indexed user, address tokenAddress, uint256 amount, uint256 lockId, uint256 timestamp)"
        ],
        provider
    );

    bridgeContract.on("TokenLocked", async (user, tokenAddress, amount, lockId, timestamp, event) => {
        console.log(`TokenLocked event detected: lockId=${lockId}, user=${user}, amount=${amount}`);

        const erbieTxHash = event.transactionHash;

        try {
            await Transaction.create({
                lockId: lockId.toNumber(),
                user,
                tokenAddress,
                amount: amount.toString(),
                erbieTxHash,
                bscTxHash: null,
                status: 'pending',
                error: null,
            });

            console.log(`ErbieChain transaction saved to database: lockId=${lockId}`);

            // BSC Transaction Processor
            await processBscTransaction(user, tokenAddress, amount, lockId.toNumber(), erbieTxHash);

        } catch (error: any) {
            console.error(`Error processing ErbieChain event: lockId=${lockId}, error=${error.message}`);
            await Transaction.update(
                {
                    status: 'failed',
                    error: error.message,
                },
                {
                    where: { lockId: lockId.toNumber() },
                }
            );
        }
    });

    console.log("Listening for TokenLocked events on ErbieChain...");
}

export default listenErbieEvents;