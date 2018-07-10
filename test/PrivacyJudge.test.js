import { increaseTimeTo, duration } from './helpers/increaseTime';
import latestTime from './helpers/latestTime';
import ether from './helpers/ether';
import assertRevert from './helpers/assertRevert';
import { soliditySha3 } from 'web3-utils';

const BigNumber = web3.BigNumber;

require('chai')
  .use(require('chai-as-promised'))
  .use(require('chai-bignumber')(BigNumber))
  .should();

var PrivacyJudge = artifacts.require('../contracts/PrivacyJudge.sol');
var ECRecoveryLib = artifacts.require('openzeppelin-solidity/contracts/ECRecovery.sol');

contract('PrivacyJudge', function (accounts) {
  let privacyJudge;
  // eslint-disable-next-line max-len
  const etherBetBytecode = '0x6060604052341561000f57600080fd5b73df08f82de32b8d460adbe8d72043e3a7e25a3b39600260006101000a81548173ffffffffffffffffffffffffffffffffffffffff021916908373ffffffffffffffffffffffffffffffffffffffff160217905550736704fbfcd5ef766b287262fa2281c105d57246a6600360006101000a81548173ffffffffffffffffffffffffffffffffffffffff021916908373ffffffffffffffffffffffffffffffffffffffff1602179055506100c1610126565b604051809103906000f08015156100d757600080fd5b6000806101000a81548173ffffffffffffffffffffffffffffffffffffffff021916908373ffffffffffffffffffffffffffffffffffffffff160217905550635a820725600181905550610135565b60405160cd806104d083390190565b61038c806101446000396000f30060606040526004361061006d576000357c0100000000000000000000000000000000000000000000000000000000900463ffffffff16806361461954146100725780637dc0d1d01461007c57806393a92e8b146100d1578063ac1717b0146100fa578063b9edb1af1461014f575b600080fd5b61007a6101a4565b005b341561008757600080fd5b61008f6102e9565b604051808273ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16815260200191505060405180910390f35b34156100dc57600080fd5b6100e461030e565b6040518082815260200191505060405180910390f35b341561010557600080fd5b61010d610314565b604051808273ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16815260200191505060405180910390f35b341561015a57600080fd5b61016261033a565b604051808273ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16815260200191505060405180910390f35b600154421115156101b457600080fd5b6104b06000809054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1663e75722306001546000604051602001526040518263ffffffff167c010000000000000000000000000000000000000000000000000000000002815260040180828152602001915050602060405180830381600087803b151561025157600080fd5b6102c65a03f1151561026257600080fd5b505050604051805190501015156102ae57600260009054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16ff5b600360009054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16ff5b6000809054906101000a900473ffffffffffffffffffffffffffffffffffffffff1681565b60015481565b600260009054906101000a900473ffffffffffffffffffffffffffffffffffffffff1681565b600360009054906101000a900473ffffffffffffffffffffffffffffffffffffffff16815600a165627a7a723058202ecf8135ff63f9fd333dbb97b08bd169ece509593feb8d74cb9f372f4b1c4d8e00296060604052341561000f57600080fd5b60b08061001d6000396000f300606060405260043610603f576000357c0100000000000000000000000000000000000000000000000000000000900463ffffffff168063e7572230146044575b600080fd5b3415604e57600080fd5b606260048080359060200190919050506078565b6040518082815260200191505060405180910390f35b600061051490509190505600a165627a7a72305820cb7058c8de6d7537174a9ef58ca8ffc2aaf12c35336e9e5cc726a7d96c86c6710029';
  const value = ether(42);

  before(async function () {
    const ecRecoveryLib = await ECRecoveryLib.new();
    PrivacyJudge.link('ECRecovery', ecRecoveryLib.address);
    privacyJudge = await PrivacyJudge.new();
    await privacyJudge.sendTransaction({value: value, from: accounts[0]});
    await privacyJudge.sendTransaction({value: value, from: accounts[1]});
  });

  it('recover using web3.eth.sign()', async function () {
    const hash = soliditySha3(privacyJudge.address, etherBetBytecode);
    const signature = web3.eth.sign(accounts[0], hash);
    
    
    ether(84).should.be.bignumber.equal(web3.eth.getBalance(privacyJudge.address));
    const currentBalance = web3.eth.getBalance(accounts[0]);
    let settlingTime = latestTime() + duration.weeks(5);
    await increaseTimeTo(settlingTime);
    await privacyJudge.executeContract(etherBetBytecode, signature, {from: accounts[1]});
    const afterBalance = web3.eth.getBalance(accounts[0]);
    
    afterBalance.should.be.bignumber.greaterThan(currentBalance);
  });

});
