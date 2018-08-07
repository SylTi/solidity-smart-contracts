pragma solidity ^0.4.24;

import "openzeppelin-solidity/contracts/math/SafeMath.sol";
import "openzeppelin-solidity/contracts/ownership/Ownable.sol";

/**
 * @title PayForGas
 * @author SylTi
 * @dev allow for the contract to pay for his own gas cost by reimbursing gas usage by users
 * The balance of the contract must never be empty or it will become unfonctionnal untill it's replenished
 * You must add the repayable modifier as the first modifier of each method you which to make free to use for the users
 * A function using the repayable modifier must be called directly by the user, otherwise the proxy contract will receive the gas repayment, not the user.
 * Be careful, this kind of construct could possibly be exploited by miner, by creating high gasPrice transaction, they will mine themself.
 */


contract PayForGas is Ownable {
  using SafeMath for uint256;

  bool repayableLock;
  uint256 maxGasPrice;

  modifier isRepayingGas {
    if (!repayableLock) {
      uint256 startGas = gasleft();
      repayableLock = true;
      _;
      uint256 gasPrice;

      if (maxGasPrice > 0)
        gasPrice = tx.gasprice < maxGasPrice ? tx.gasprice : maxGasPrice;
      else
        gasPrice = tx.gasprice;

      uint256 gasUsed = startGas.sub(gasleft());
      uint256 amount = gasPrice.mul(gasUsed.add(35203)); //magic number accounting for all the gas needed after gasleft() call
      msg.sender.transfer(amount);
      repayableLock = false;
      return ;
    } 
    _;
  }

  constructor(uint256 _maxGasPrice) public {
    maxGasPrice = _maxGasPrice;
  }

  function () external payable {

  }

  function reclaimEther() external onlyOwner {
    owner.transfer(address(this).balance);
  }
}