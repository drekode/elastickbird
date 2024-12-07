import { Schema } from "../../lib/elastickbird";

test("Schema instance is an object", () => {
  const ExampleModel = new Schema();
  expect(ExampleModel).toBeInstanceOf(Object);
});
