/* eslint-disable no-console */

async function main() {
  const res = await fetch("http://127.0.0.1:8000/openapi.json");
  if (!res.ok) {
    console.error("Failed to fetch openapi:", res.status);
    process.exit(1);
  }
  const o = await res.json();
  const schemas = (o.components && o.components.schemas) || {};

  function refName(schema) {
    if (!schema || !schema["$ref"]) return null;
    const parts = String(schema["$ref"]).split("/");
    return parts[parts.length - 1];
  }

  const analyzeSchema =
    o.paths["/api/analyze"].post.requestBody.content["application/json"].schema;
  const analyzeRef = refName(analyzeSchema);
  console.log("analyze schema ref:", analyzeRef || "(inline)");
  console.log(
    JSON.stringify(analyzeRef ? schemas[analyzeRef] : analyzeSchema, null, 2),
  );

  const analyze200 =
    o.paths["/api/analyze"].post.responses &&
    o.paths["/api/analyze"].post.responses["200"];
  if (
    analyze200 &&
    analyze200.content &&
    analyze200.content["application/json"]
  ) {
    const rSchema = analyze200.content["application/json"].schema;
    const rRef = refName(rSchema);
    console.log("analyze 200 response schema ref:", rRef || "(inline)");
    console.log(JSON.stringify(rRef ? schemas[rRef] : rSchema, null, 2));
  }

  const uploadSchema =
    o.paths["/api/upload"].post.requestBody.content["multipart/form-data"]
      .schema;
  const uploadRef = refName(uploadSchema);
  console.log("upload schema ref:", uploadRef || "(inline)");
  console.log(
    JSON.stringify(uploadRef ? schemas[uploadRef] : uploadSchema, null, 2),
  );

  if (o.paths["/api/analysis/{task_id}"]) {
    const analysisGet = o.paths["/api/analysis/{task_id}"].get;
    const analysis200 = analysisGet.responses && analysisGet.responses["200"];
    if (
      analysis200 &&
      analysis200.content &&
      analysis200.content["application/json"]
    ) {
      const rSchema = analysis200.content["application/json"].schema;
      const rRef = refName(rSchema);
      console.log("analysis GET 200 response schema ref:", rRef || "(inline)");
      console.log(JSON.stringify(rRef ? schemas[rRef] : rSchema, null, 2));
    }
  }
}

main().catch((e) => {
  console.error(String(e));
  process.exit(1);
});
