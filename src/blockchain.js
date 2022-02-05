const crypto = require('crypto');
const EC = require('elliptic').ec;
const ec = new EC('secp256k1');
const debug = require('debug')('blockchain');

class Transaction {
    /**
     * @param {string} sender
     * @param {string} recipient
     * @param {number} amount
     */
    constructor(sender, recipient, amount) {
        this.sender = sender;
        this.recipient = recipient;
        this.amount = amount;
        this.signature = null;
        this.timestamp = new Date().getTime();
    }

    /**
     * create a SHA256 hash of the transaction
     *
     * @returns {string}
     */
    calculateHash() {
        return crypto.createHash('sha256').update(this.sender + this.recipient + this.amount + this.timestamp).digest('hex');
    }

    /**
     * sign the transaction with the private key
     *
     * @param {string} privateKey
     */

    signTransaction(privateKey) {
        if(privateKey === this.sender) {
            const key = ec.keyFromPrivate(privateKey, 'hex');
            const hash = this.calculateHash();
            const signature = key.sign(hash);
            this.signature = signature.toDER('hex');
        } else {
            debug('You cannot sign transactions for other wallets');
        }
    }

    /**
     * verify the transaction signature
     *
     * @returns {boolean}
     */

    isValid() {
        if(this.signature === null) {
            debug('No signature in this transaction');
            return false;
        }
        const publicKey = ec.keyFromPublic(this.sender, 'hex');
        return publicKey.verify(this.calculateHash(), this.signature);
    }
}

class Block {
    /**
     * @param {number} index
     * @param {string} previousHash
     * @param {Transaction[]} transactions
     * @param {number} timestamp
     * @param {string} hash
     * @param {number} nonce
     */

    constructor(index, previousHash, transactions, timestamp, hash, nonce) {
        this.index = index;
        this.previousHash = previousHash;
        this.transactions = transactions;
        this.timestamp = timestamp;
        this.hash = hash;
        this.nonce = nonce;
    }

    /**
     * create a SHA256 hash of the block
     *
     * @returns {string}
     */

    calculateHash() {
        return crypto.createHash('sha256').update(this.index + this.previousHash + this.timestamp + this.nonce).digest('hex');
    }

    /**
     * mine the block
     *
     * @param {number} difficulty
     */

    mineBlock(difficulty) {
        while (this.hash.substring(0, difficulty) !== Array(difficulty + 1).join('1')) {
            this.nonce++;
            this.hash = this.calculateHash();
        }
        debug('Block mined: ' + this.hash);
    }

    /**
     * check if the block is valid
     *
     * @returns {boolean}
     */

    hasValidTransactions() {
        for(const tx of this.transactions) {
            if(!tx.isValid()) {
                return false;
            }
        }
        return true;
    }
}

class Blockchain {
    constructor() {
        this.chain = [this.createGenesisBlock()]
        this.difficulty = 4;
        this.pendingTransactions = [];
        this.mineReward =  100;
    }

    /**
     *
     * @returns {Block}
     */
    createGenesisBlock() {
        return new Block(0, '0', [], new Date().getTime(), '0', 0);
    }

    /**
     * Returns the last block in the chain
     * new block and we need to the hash of the previous block
     *
     * @returns {Block}
     */

    getLatestBlock() {
        return this.chain[this.chain.length - 1];
    }
    /**
     * take all the pending transactions and add them to the block
     * start the mining process
     * Add a transaction to send the mining reward to the miner
     *
     * @param  {string} miningRewardAddress
     */

    minePendingTransactions(miningRewardAddress) {
        const rewardTx = new Transaction(null, miningRewardAddress, this.mineReward);
        this.pendingTransactions.push(rewardTx);
        const block = new Block(this.getLatestBlock().index + 1, this.getLatestBlock().hash, this.pendingTransactions, new Date().getTime(), null, 0);
        block.mineBlock(this.difficulty);
        debug('Block successfully mined!');
        this.chain.push(block);
        this.pendingTransactions = [];
    }

    /**
     * add a new transaction to the pending transactions
     *
     * @param {Transaction} transaction
     */

    addTransaction(transaction) {
        if(!transaction.isValid()) {
            debug('Cannot add invalid transaction to chain');
            return;
        }

        if (transaction.amount <= 0) {
            debug('Cannot add a transaction with negative amount');
            return;
        }

        if (this.getBalanceOfAddress(transaction.sender) < transaction.amount) {
            debug('Sender does not have enough balance');
            return;
        }

        this.pendingTransactions.push(transaction);
        debug('Transaction successfully added to pending transactions: ' + JSON.stringify(transaction));
    }

    /**
     * get the balance of an address
     *
     * @param {string} address
     * @returns {number}
     */

    getBalanceOfAddress(address) {
        let balance = 0;
        for (const block of this.chain) {
            for (const trans of block.transactions) {
                if (trans.sender === address) {
                    balance -= trans.amount;
                }

                if (trans.recipient === address) {
                    balance +=trans.amount;
                }
            }
            }
        debug('getBalanceOfAddress:' + JSON.stringify(balance));
        return balance;
    }

    getAllTransactionForWallet(address) {
        const txs = [];
        for (const block of this.chain) {
            for (const tx of block.transactions) {
                if (tx.sender === address || tx.recipient === address) {
                    txs.push(tx);
                }
            }
        }
        debug('getAllTransactionForWallet:' + JSON.stringify(txs.length));
        return txs;
    }

    /**
     * check if the blockchain is valid
     *
     * @returns {boolean}
     */

    isChainValid() {
        //check if the genesis block hasn't been tampered with by
        //comparing the output of createGenesisBlock with the first block in the chain
        const realGenesis = JSON.stringify(this.createGenesisBlock());

        if (realGenesis !== JSON.stringify(this.chain[0])) {
            debug('The genesis block has been tampered with');
            return false;
        }

        //loop through all the blocks in the chain
        //signature is valid

        for (let i = 1; i < this.chain.length; i++) {
            const currentBlock = this.chain[i];
            const previousBlock = this.chain[i - 1];

            if (!currentBlock.hasValidTransactions()) {
                debug('Block #' + currentBlock.index + ' has invalid transactions');
                return false;
            }

            if (currentBlock.hash !== currentBlock.calculateHash()) {
                debug('Block #' + currentBlock.index + ' has invalid hash');
                return false;
            }

            if (currentBlock.previousHash !== previousBlock.hash) {
                debug('Block #' + currentBlock.index + ' has invalid previous hash');
                return false;
            }
        }
        return true;
    }

}

module.exports = Blockchain;
module.exports.Block = Block;
module.exports.Transaction = Transaction;