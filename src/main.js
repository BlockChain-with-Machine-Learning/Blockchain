const {Blockchain, Transaction} = require('./blockchain');
const EC = require('elliptic').ec;
const ec = new EC('secp256k1');

//Our private key goes here
const myKey = ec.keyFromPrivate('1a40fab3dfe3fba317d6ebc88f2cefca134cb6943a6b80fb2814bcac57a8714d');
const myWalletAddress = myKey.getPublic('hex');

const bc = new Blockchain();

bc.minePendingTransactions(myWalletAddress);

//create a transaction
const tx1 = new Transaction(myWalletAddress, 'address2', 100);
tx1.signTransaction(myKey);
bc.addTransaction(tx1);

//mine block
bc.minePendingTransactions(myWalletAddress);

//crating a new transaction
const tx2 = new Transaction(myWalletAddress, 'address1', 50);
tx2.signTransaction(myKey);
bc.addTransaction(tx2);

//mine block
bc.minePendingTransactions(myWalletAddress);

console.log('\n\nBalance of myWalletAddress is ', bc.getBalanceOfAddress(myWalletAddress));

// bc.chain[1].transactions[0].amount = 1;

console.log('\nIs chain valid? ', bc.isChainValid() ? 'Yes' : 'No');