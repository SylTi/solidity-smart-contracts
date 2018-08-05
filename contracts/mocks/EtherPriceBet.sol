pragma solidity ^0.4.24;


contract Oracle {
  // solium-disable-next-line max-len
  function getPrice(uint timestamp) public returns (uint) { return 1300; } // fake oracle
}


contract EtherPriceBet {

  Oracle public  oracle;
  uint public resultTime;
  address public user1;
  address public user2;

  constructor() public {
    user1 = 0xdf08f82de32b8d460adbe8d72043e3a7e25a3b39;
    user2 = 0x6704fbfcd5ef766b287262fa2281c105d57246a6;

    oracle = new Oracle();
    resultTime = 1516051749 + 4 weeks;
  }

  function execute() public payable {
    require(now > resultTime);
    if (oracle.getPrice(resultTime) >= 1200)
      selfdestruct(user1);
    else
      selfdestruct(user2);
  }
}