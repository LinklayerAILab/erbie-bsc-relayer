import { ethers } from 'ethers';
import Config from './config';
import { Transaction } from './dbService';
import * as fs from 'fs';
import * as path from 'path';
import log from './logService';

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
        const bscBridgeContract = new ethers.Contract(Config.bscBridgeContractAddress, bscBridgeAbi, wallet);

        // 正确转换erbieTxHash为bytes32
        let txHashBytes32;
        
        // 如果交易哈希是标准的0x开头的哈希
        if (erbieTxHash.startsWith('0x') && erbieTxHash.length === 66) {
            // 转换为bytes32（正好32字节）
            txHashBytes32 = erbieTxHash;
        } 
        // 如果是生成的ID或者其他非标准哈希
        else {
            // 使用keccak256哈希函数创建一个32字节的哈希
            txHashBytes32 = ethers.keccak256(ethers.toUtf8Bytes(erbieTxHash));
        }
        
        log.info(`Converting erbieTxHash to bytes32: original=${erbieTxHash}, converted=${txHashBytes32}`);

        // 调用BSC桥接合约的mintLLA方法
        const tx = await bscBridgeContract.mintLLA(user, amount, txHashBytes32);
        log.info(`BSC transaction submitted: lockId=${lockId}, hash=${tx.hash}`);

        // Wait for the transaction to be mined
        const receipt = await tx.wait();
        log.info(`BSC transaction confirmed: lockId=${lockId}, blockNumber=${receipt.blockNumber}`);

        // Update the transaction status in the database
        await Transaction.update({
            status: 'success',
            bscTxHash: tx.hash
        }, {
            where: {
                lockId: lockId
            }
        });

        log.info(`Database updated with BSC transaction details: lockId=${lockId}`);

    } catch (error: any) {
        log.error(`Error processing BSC transaction: lockId=${lockId}`, error);
        // 限制错误消息长度，防止数据库错误
        const truncatedError = error.message ? error.message.substring(0, 200) : 'Unknown error';
        
        // update the transaction status in the database
        await Transaction.update({
            status: 'failed',
            error: truncatedError
        }, {
            where: {
                lockId: lockId
            }
        });
    }
}

export { processBscTransaction };