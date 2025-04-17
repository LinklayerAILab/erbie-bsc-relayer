import { ethers } from 'ethers';
import Config from './config';
import { Transaction } from './dbService';
import * as fs from 'fs';
import * as path from 'path';

// 加载BSC桥接合约ABI
const abiPath = path.resolve(__dirname, '../abi/bscBridge.json');
const bscBridgeAbi = JSON.parse(fs.readFileSync(abiPath, 'utf8')).abi;

async function processBscTransaction(user: string,
    tokenAddress: string,
    amount: ethers.BigNumberish,
    lockId: number,
    erbieTxHash: string) {

    try {
        const provider = new ethers.JsonRpcProvider(Config.bscRpcUrl);
        const wallet = new ethers.Wallet(Config.bscPrivateKey, provider);
        const bscBridgeContract = new ethers.Contract(Config.bscLLAContractAddress, bscBridgeAbi, wallet);

        // 将erbieTxHash转换为bytes32格式
        // 如果erbieTxHash已经是十六进制字符串，直接使用，否则进行转换
        const txHashBytes32 = erbieTxHash.startsWith('0x')
            ? ethers.zeroPadValue(erbieTxHash, 32)
            : ethers.zeroPadValue(ethers.keccak256(ethers.toUtf8Bytes(erbieTxHash)), 32);

        // 调用BSC桥接合约的mintLLA方法
        const tx = await bscBridgeContract.mintLLA(user, amount, txHashBytes32);
        console.log(`BSC transaction submitted: lockId=${lockId}, hash=${tx.hash}`);

        // Wait for the transaction to be mined
        const receipt = await tx.wait();
        console.log(`BSC transaction confirmed: lockId=${lockId}, blockNumber=${receipt.blockNumber}`);

        // Update the transaction status in the database
        await Transaction.update({
            status: 'success',
            bscTxHash: tx.hash
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
    }
}

export { processBscTransaction };