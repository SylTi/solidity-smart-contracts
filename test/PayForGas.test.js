import ether from './helpers/ether';
import assertRevert from './helpers/assertRevert';
import { getMethodId } from './helpers/signatureUtils';

const BigNumber = web3.BigNumber;

require('chai')
  .use(require('chai-as-promised'))
  .use(require('chai-bignumber')(BigNumber))
  .should();

var RepayableMock = artifacts.require('../contracts/mocks/RepayableMock.sol');

contract('PayForGas: RepayableMock', function (accounts) {
  let mock;
  const from = accounts[0];
  
  describe('when maxGasPrice = 0', function() {
    const maxGas = 0;
    before(async function () {
      mock = await RepayableMock.new(maxGas);
      await mock.sendTransaction({value: ether(1), from: accounts[0]});
    });
    describe('when the constract has funds', function () {
      it('you should get your gas back',
        async function () {
          const previousBalance =  web3.eth.getBalance(from);
          // const gasEstimate = await mock.storeFree.estimateGas(1);
          // const gasPrice = web3.eth.gasPrice.toNumber();
          // console.log('gasEstimate:', gasEstimate);
          await mock.storeFree(1, { from });
          const balance =  web3.eth.getBalance(from);
          const stored = await mock.stored();
          assert.equal(stored, 1);
          assert.equal(previousBalance.toNumber(), balance.toNumber());
        }
      );

      it('you shouldn\'t get your gas back',
        async function () {
          const previousBalance =  web3.eth.getBalance(from);
          await mock.storePay(2, { from });
          const balance =  web3.eth.getBalance(from);
          console.log("prev:", previousBalance, "\nnow:", balance);
          const stored = await mock.stored();
          assert.equal(stored, 2);
          assert.notEqual(previousBalance, balance);
        }
      );
    });
    describe('when the constract is unfunded ', function () {
      it('function calls that refund gas should fail',
        async function () {
          await mock.reclaimEther();
          await assertRevert(mock.storeFree(3, { from }));
          const stored = await mock.stored();
          assert.equal(stored, 2);
        }
      );
      it('function call without refund should still work',
        async function () {
          await mock.storePay(3, { from });
          const stored = await mock.stored();
          assert.equal(stored, 3);
        }
      );
    });
  });
});