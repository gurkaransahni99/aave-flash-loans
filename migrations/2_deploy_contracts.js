const Exploit = artifacts.require("Exploit");
const FlashLoan = artifacts.require("FlashLoan")

module.exports = deployer => {
  deployer.deploy(Exploit, "0xB53C1a33016B2DC2fF3653530bfF1848a515c8c5");
  deployer.deploy(FlashLoan, "0xB53C1a33016B2DC2fF3653530bfF1848a515c8c5")
};
