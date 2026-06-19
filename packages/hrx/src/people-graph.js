export const HRX_PEOPLE_GRAPH_EDGE_TYPES = Object.freeze(["employee_org", "employee_manager", "employee_matter"]);

function requiredString(input, field) {
  const value = input?.[field];
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${field} is required`);
  return value.trim();
}

export function createPeopleGraphEdge(input = {}) {
  const edgeType = requiredString(input, "edge_type");
  if (!HRX_PEOPLE_GRAPH_EDGE_TYPES.includes(edgeType)) {
    throw new TypeError(`edge_type must be one of ${HRX_PEOPLE_GRAPH_EDGE_TYPES.join(", ")}`);
  }
  if (Object.hasOwn(input, "client_name") || Object.hasOwn(input, "client_id")) {
    throw new TypeError("People graph edge must not include client detail");
  }
  return Object.freeze({
    tenant_id: requiredString(input, "tenant_id"),
    edge_id: requiredString(input, "edge_id"),
    edge_type: edgeType,
    from_employee_id: requiredString(input, "from_employee_id"),
    to_ref: requiredString(input, "to_ref"),
    effective_from: requiredString(input, "effective_from"),
  });
}

export function createInMemoryPeopleGraph(seed = []) {
  const edges = [...seed].map(createPeopleGraphEdge);
  return Object.freeze({
    add(input) {
      const edge = createPeopleGraphEdge(input);
      edges.push(edge);
      return edge;
    },
    list(query = {}) {
      return Object.freeze(
        edges
          .filter((edge) => !query.tenant_id || edge.tenant_id === query.tenant_id)
          .filter((edge) => !query.from_employee_id || edge.from_employee_id === query.from_employee_id)
          .map((edge) => Object.freeze({ ...edge })),
      );
    },
  });
}
