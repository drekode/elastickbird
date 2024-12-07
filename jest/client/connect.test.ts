import ElastickBird from "../../lib/elastickbird";

test("Connect method is a function", () => {
  const connect = ElastickBird.connect;
  expect(connect).toBeInstanceOf(Function);
});

test("Connect without specifiying a node should throw missing node option", () => {
  const connect = ElastickBird.connect;
  expect(() => connect({})).toThrow("Missing node(s) option");
});

test("Connect using an invalid node URL should throw invalid URL error", () => {
  const connect = ElastickBird.connect;
  expect(() => connect({ node: "test-node-url" })).toThrow("Invalid URL");
});
