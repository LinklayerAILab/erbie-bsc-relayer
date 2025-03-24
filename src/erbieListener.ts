import { ethers } from 'ethers';
import Config from './config';
import { Transaction, syncDatabase } from './dbService';
import { processBscTransaction } from './bscProcessor';
import * as fs from 'fs';
import * as path from 'path';

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
        console.log(`TokenLocked event detected: lockId=${lockId}, user=${user}, amount=${amount}`);

        const erbieTxHash = event.transactionHash;

        try {
            await Transaction.create({
                lockId: typeof lockId === 'object' ? lockId.toNumber() : lockId,
                user,
                tokenAddress,
                amount: amount.toString(),
                erbieTxHash,
                bscTxHash: null,
                status: 'pending',
                error: null,
                ackStatus: 0,
                retryCount: 0,
            });

            console.log(`ErbieChain transaction saved to database: lockId=${lockId}`);

            // BSC Transaction Processor
            await processBscTransaction(user, tokenAddress, amount, typeof lockId === 'object' ? lockId.toNumber() : lockId, erbieTxHash);

        } catch (error: any) {
            console.error(`Error processing ErbieChain event: lockId=${lockId}, error=${error.message}`);
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

    console.log("Listening for TokenLocked events on ErbieChain...");
}

export default listenErbieEvents;