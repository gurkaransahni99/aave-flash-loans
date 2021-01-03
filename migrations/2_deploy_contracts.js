const Exploit = artifacts.require("Exploit");

module.exports = deployer => {
  deployer.deploy(Exploit);
};
