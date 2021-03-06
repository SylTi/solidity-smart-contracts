import ether from './helpers/ether';
import assertRevert from './helpers/assertRevert';
import { soliditySha3 } from 'web3-utils';
import { hexToBytes } from 'web3-utils';


const BigNumber = web3.BigNumber;

require('chai')
  .use(require('chai-as-promised'))
  .use(require('chai-bignumber')(BigNumber))
  .should();

var MultiSig = artifacts.require('../contracts/MultiSig.sol');
var ECRecoveryLib = artifacts.require('openzeppelin-solidity/contracts/ECRecovery.sol');
var Token = artifacts.require('../contracts/mocks/Token.sol');

function createSignatures(hash, usedAccounts) {
  let signatures = [];
  usedAccounts.forEach(account => {
    signatures.push(web3.eth.sign(account, hash));
  });
  return signatures;
}

function getVRS(signature) {
  const r = signature.slice(0,66); //0x already there
  const s = '0x' + signature.slice(66,130);
  const v = '0x' + signature.slice(130,132);

  let  v_decimal = web3.toDecimal(v);
  if (v_decimal < 27)
    v_decimal += 27;
  return [v_decimal, r, s];
}

function getVRSArray(signatures) {
  let res = [[], [], []];
  signatures.forEach(signature => {
    let vrs = getVRS(signature);
    res[0].push(vrs[0]);
    res[1].push(vrs[1]);
    res[2].push(vrs[2]);
  });
  return res;
}

contract('MultiSig', function (accounts) {
  let multiSig;
  let token;
  let owners = [accounts[0], accounts[1], accounts[2]].sort();
  const value = ether(5);
  let nonce = 0;
  let multiSigAddress;

  before(async function () {
    const ecRecoveryLib = await ECRecoveryLib.new();
    MultiSig.link('ECRecovery', ecRecoveryLib.address);
    multiSig = await MultiSig.new(2, owners);
    multiSigAddress = multiSig.address;
    await multiSig.sendTransaction({value: value, from: accounts[0]});
    token = await Token.new(multiSigAddress);
  });

  beforeEach(async function () {
    nonce = (await multiSig.nonce()).toNumber() + 1;
  });

  describe('when spending ethers', function () {
    it('should spend ether with valid 2 of 3', async function () {
      const signers = [accounts[0], accounts[1]].sort();
      const data = "t";
      const amountToSpend = ether(1);
      const hash = soliditySha3(multiSigAddress, accounts[3], amountToSpend, data, nonce);
      const signatures = createSignatures(hash, signers);
      const previousBalance = web3.eth.getBalance(accounts[3]);
      let vrs = getVRSArray(signatures);
      await multiSig.payEther(accounts[3], amountToSpend, data, nonce, vrs[0], vrs[1], vrs[2], {from: accounts[3]});
      const afterBalance = web3.eth.getBalance(accounts[3]);
      afterBalance.should.be.bignumber.greaterThan(previousBalance);
    });

    it('should spend ether with another valid 2 of 3', async function () {
      const signers = [accounts[0], accounts[2]].sort();
      const data = "t";
      const amountToSpend = ether(1);
      const hash = soliditySha3(multiSigAddress, accounts[3], amountToSpend, data, nonce);
      const signatures = createSignatures(hash, signers);
      const previousBalance = web3.eth.getBalance(accounts[3]);
      let vrs = getVRSArray(signatures);
      await multiSig.payEther(accounts[3], amountToSpend, data, nonce, vrs[0], vrs[1], vrs[2], {from: accounts[3]});
      const afterBalance = web3.eth.getBalance(accounts[3]);
      afterBalance.should.be.bignumber.greaterThan(previousBalance);
    });

    it('should fail to spend ether when using twice the same nonce with valid signature', async function () {
      const signers = [accounts[0], accounts[1]].sort();
      const data = "t";
      const amountToSpend = ether(1);
      nonce = nonce-1;
      const hash = soliditySha3(multiSigAddress, accounts[3], amountToSpend, data, nonce);
      const signatures = createSignatures(hash, signers);
      let vrs = getVRSArray(signatures);
      await assertRevert(multiSig.payEther(accounts[3], amountToSpend, data, nonce, vrs[0], vrs[1], vrs[2], {from: accounts[3]}));
    });

    it('should fail to spend ether with valid signatures and signers in the wrong order', async function () {
      const signers = [accounts[0], accounts[1]];
      const data = "t";
      const amountToSpend = ether(1);
      const hash = soliditySha3(multiSigAddress, accounts[3], amountToSpend, data, nonce);
      const signatures = createSignatures(hash, signers);
      let vrs = getVRSArray(signatures);
      await assertRevert(multiSig.payEther(accounts[3], amountToSpend, data, nonce, vrs[0], vrs[1], vrs[2], {from: accounts[3]}));
    });

    it('should fail to spend ether with the same signature used twice', async function () {
      const signers = [accounts[0], accounts[0]];
      const data = "t";
      const amountToSpend = ether(1);
      const hash = soliditySha3(multiSigAddress, accounts[3], amountToSpend, data, nonce);
      const signatures = createSignatures(hash, signers);
      let vrs = getVRSArray(signatures);
      await assertRevert(multiSig.payEther(accounts[3], amountToSpend, data, nonce, vrs[0], vrs[1], vrs[2], {from: accounts[3]}));
    });

    it('should fail to spend ether with only 1 of 3 signatures', async function () {
      const signers = [accounts[0]];
      const data = "t";
      const amountToSpend = ether(1);
      const hash = soliditySha3(multiSigAddress, accounts[3], amountToSpend, data, nonce);
      const signatures = createSignatures(hash, signers);
      let vrs = getVRSArray(signatures);
      await assertRevert(multiSig.payEther(accounts[3], amountToSpend, data, nonce, vrs[0], vrs[1], vrs[2], {from: accounts[3]}));
    });

    it('should fail to spend with a mix of valid and invalid signatures', async function () {
      const signers = [accounts[0], accounts[3]].sort();
      const data = "t";
      const amountToSpend = ether(1);
      const hash = soliditySha3(multiSigAddress, accounts[3], amountToSpend, data, nonce);
      const signatures = createSignatures(hash, signers);
      let vrs = getVRSArray(signatures);
      await assertRevert(multiSig.payEther(accounts[3], amountToSpend, data, nonce, vrs[0], vrs[1], vrs[2], {from: accounts[3]}));
    });
  });

  describe('when spending tokens', function () {
    it('should spend tokens with valid 2 of 3', async function () {
      const signers = [accounts[0], accounts[1]].sort();
      const data = "t";
      const amountToSpend = ether(1);
      const hash = soliditySha3(multiSigAddress, token.address, accounts[3], amountToSpend, data, nonce);
      const signatures = createSignatures(hash, signers);
      const previousBalance = await token.balanceOf(accounts[3]);
      let vrs = getVRSArray(signatures);
      await multiSig.payToken(token.address, accounts[3], amountToSpend, data, nonce, vrs[0], vrs[1], vrs[2], {from: accounts[3]});
      const afterBalance = await token.balanceOf(accounts[3]);
      afterBalance.should.be.bignumber.greaterThan(previousBalance);
    });

    it('should fail to spend tokens with valid signatures in the wrong order', async function () {
      const signers = [accounts[0], accounts[1]].sort().reverse();
      const data = "t";
      const amountToSpend = ether(1);
      const hash = soliditySha3(multiSigAddress, token.address, accounts[3], amountToSpend, data, nonce);
      const signatures = createSignatures(hash, signers);
      let vrs = getVRSArray(signatures);
      await assertRevert(multiSig.payToken(token.address, accounts[3], amountToSpend, data, nonce, vrs[0], vrs[1], vrs[2], {from: accounts[3]}));
    });

    it('should fail to spend tokens with only 1 of 3 signatures', async function () {
      const signers = [accounts[0]];
      const data = "t";
      const amountToSpend = ether(1);
      const hash = soliditySha3(multiSigAddress, token.address, accounts[3], amountToSpend, data, nonce);
      const signatures = createSignatures(hash, signers);
      let vrs = getVRSArray(signatures);
      await assertRevert(multiSig.payToken(token.address, accounts[3], amountToSpend, data, nonce, vrs[0], vrs[1], vrs[2], {from: accounts[3]}));
    });

    it('should fail to spend tokens with a mix of valid and invalid signatures', async function () {
      const signers = [accounts[0], accounts[3]].sort();
      const data = "t";
      const amountToSpend = ether(1);
      const hash = soliditySha3(multiSigAddress, token.address, accounts[3], amountToSpend, data, nonce);
      const signatures = createSignatures(hash, signers);
      let vrs = getVRSArray(signatures);
      await assertRevert(multiSig.payToken(token.address, accounts[3], amountToSpend, data, nonce, vrs[0], vrs[1], vrs[2], {from: accounts[3]}));
    });
  });
  // it('should fail', async function () {
  //   await assertRevert(MultiSig.new(2, owners.reverse()));
  // });
});
