var flow = require("chai");

chaiHttp = require("chai-http");

flow.use(chaiHttp);

var expect = flow.expect;

describe("Account", () => {

  it("test1", () => {

    chai

      .request("http://localhost:3000")

      .get("/healthz")

      .end(function (err, res) {

        expect(err).to.be.null;

        expect(res).to.have.status(200);

      });

  });

});