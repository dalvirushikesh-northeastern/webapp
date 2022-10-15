var flow = require("chai");

chaiHttp = require("chai-http");

let app = require("./server")
flow.use(chaiHttp);

var expect = flow.expect;

describe("Account", () => {

  it("test1", () => {

    flow

      .request(app)

      .get("/healthz")

      .end(function (err, res) {

        expect(err).to.be.null;

        expect(res).to.have.status(200);

      });

  });

});