import { Schema, connect } from "../../lib/elastickbird";

const ELASTICSEARCH_URL = (global as any).ELASTICSEARCH_URL as string;

test("Schema instance is an object", () => {
  const ExampleModel = new Schema({ alias: "example" });
  expect(ExampleModel).toBeInstanceOf(Object);
});

test("Create index without establishing the connection, should throw client not connected error", () => {
  const ExampleModel = new Schema({ alias: "example" });
  expect(() => ExampleModel.createIndex()).toThrow("Client not connected");
});

test("Create the index", async () => {
  const ExampleModel = new Schema({ alias: "example" });
  connect({ node: ELASTICSEARCH_URL });
  await ExampleModel.createIndex();
  console.log("que onda")
});
