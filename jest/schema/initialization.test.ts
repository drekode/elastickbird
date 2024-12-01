import ElastickBird from "../../lib/elastickbird";

test("Schema instance is an object", () => {
    const Example = new ElastickBird.Schema();
    expect(Example).toBeInstanceOf(Object);
});