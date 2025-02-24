import { ethers } from 'ethers';
import Config from './config';
import { Transaction } from './dbService';



const LLA_ABI = [
    "function mint(address to, uint256 amount) external"
];

async function processBscTransaction(user: string,
    tokenAddress: string,
    amount: ethers.BigNumberish,
    lockId: number,
    erbieTxHash: string) {

    try {
        const provider = new ethers.JsonRpcProvider(Config.bscRpcUrl);
        const wallet = new ethers.Wallet(Config.bscPrivateKey, provider);
        const llacontract = new ethers.Contract(tokenAddress, LLA_ABI, wallet);

        // Call BSC LLA contract, mint the amount to the user
        const tx = await llacontract.mint(user, amount);
        console.log(`BSC transaction submitted: lockId=${lockId}, hash=${tx.hash}`);

        // Wait for the transaction to be mined
        const receipt = await tx.wait();
        console.log(`BSC transaction confirmed: lockId=${lockId}, blockNumber=${receipt.blockNumber}`);

        // Update the transaction status in the database
        await Transaction.update({
            status: 'success',
            bscTxHash: tx.hash,
            erbieTxHash: erbieTxHash
        }, {
            where: {
                lockId: lockId
            }
        });

        console.log(`Database updated with BSC transaction details: lockId=${lockId}`);

    } catch (error: any) {
        console.error(`Error processing BSC transaction: lockId=${lockId}, error=${error.message}`);
        // update the transaction status in the database
        await Transaction.update({
            status: 'failed',
            error: error.message
        }, {
            where: {
                lockId: lockId
            }
        });

        // Do we need to transfer the tokens in the bridge contract back to the user
    }
}

export { processBscTransaction };