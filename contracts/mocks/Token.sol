pragma solidity ^0.4.24;

import "openzeppelin-solidity/contracts/token/ERC20/StandardToken.sol";


contract Token is StandardToken {

  constructor(address _beneficiary) public {
    balances[_beneficiary] = 10000 * 1 ether;
  }
}